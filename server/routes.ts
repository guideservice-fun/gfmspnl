import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords, initializeAdmin } from "./auth";
import { 
  sendAccessApprovedEmail, 
  sendAccessRejectedEmail, 
  sendTaskAssignedEmail, 
  sendReportSubmittedEmail 
} from "./email";

// Set up multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype.split("/")[1]);
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error("Only images and videos are allowed"));
  },
});

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Unauthorized");
  }
  next();
}

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user?.isAdmin) {
    return res.status(403).send("Forbidden");
  }
  next();
}

// Store WebSocket clients
const clients = new Set<WebSocket>();

function broadcastMessage(type: string, data: any) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize admin user
  await initializeAdmin();
  
  // Setup authentication
  setupAuth(app);

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // =====================
  // Access Requests
  // =====================
  
  app.post("/api/access-requests", async (req, res) => {
    try {
      const { username, email, name, password } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).send("Username already taken");
      }
      
      // Check if request already exists
      const existingRequest = await storage.getAccessRequestByUsername(username);
      if (existingRequest) {
        return res.status(400).send("Access request already submitted");
      }
      
      const hashedPassword = await hashPassword(password);
      const request = await storage.createAccessRequest({
        username,
        email,
        name,
        password: hashedPassword,
      });
      
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/access-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllAccessRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/access-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getAccessRequest(requestId);
      
      if (!request) {
        return res.status(404).send("Request not found");
      }
      
      if (request.status !== "pending") {
        return res.status(400).send("Request already processed");
      }
      
      // Create user from request
      await storage.createUser({
        username: request.username,
        password: request.password, // Already hashed
        email: request.email,
        name: request.name,
        isAdmin: false,
        isApproved: true,
        avatar: null,
        roleId: null,
      });
      
      // Update request status
      await storage.updateAccessRequestStatus(requestId, "approved");
      
      // Send email notification
      if (request.email) {
        sendAccessApprovedEmail(request.email, request.username);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/access-requests/:id/reject", requireAdmin, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getAccessRequest(requestId);
      
      if (!request) {
        return res.status(404).send("Request not found");
      }
      
      await storage.updateAccessRequestStatus(requestId, "rejected");
      
      // Send email notification
      if (request.email) {
        sendAccessRejectedEmail(request.email, request.username);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Users
  // =====================
  
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter out passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/users/:id/role", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { roleId } = req.body;
      
      await storage.assignRoleToUser(userId, roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/user/profile", requireAuth, upload.single("avatar"), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, email } = req.body;
      
      const updateData: any = { name, email };
      
      if (req.file) {
        updateData.avatar = `/uploads/${req.file.filename}`;
      }
      
      const updated = await storage.updateUser(userId, updateData);
      if (!updated) {
        return res.status(404).send("User not found");
      }
      
      const userWithRole = await storage.getUserWithRole(userId);
      res.json(userWithRole);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { oldPassword, newPassword } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).send("User not found");
      }
      
      const isValid = await comparePasswords(oldPassword, user.password);
      if (!isValid) {
        return res.status(400).send("Current password is incorrect");
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Roles
  // =====================
  
  app.get("/api/roles", requireAuth, async (req, res) => {
    try {
      const roles = await storage.getAllRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const { name, color } = req.body;
      const role = await storage.createRole({ name, color });
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const roleId = parseInt(req.params.id);
      await storage.deleteRole(roleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Messages (Chat)
  // =====================
  
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/messages/stats", requireAuth, async (req, res) => {
    try {
      // For now, just return 0 unread (could implement proper read tracking later)
      res.json({ unreadCount: 0 });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/messages", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const senderId = req.user!.id;
      const { content, messageType } = req.body;
      
      let mediaUrl = null;
      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
      }
      
      const message = await storage.createMessage({
        senderId,
        content: content || null,
        messageType: messageType || "text",
        mediaUrl,
      });
      
      // Broadcast to all connected clients
      broadcastMessage("new_message", message);
      
      res.status(201).json(message);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).send("Message not found");
      }
      
      // Only allow deleting own messages or admin
      if (message.senderId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).send("Forbidden");
      }
      
      await storage.deleteMessage(messageId);
      
      // Broadcast to all connected clients
      broadcastMessage("delete_message", { id: messageId });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Tasks
  // =====================
  
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { my } = req.query;
      
      if (my === "my") {
        // Get only tasks assigned to the current user
        const tasks = await storage.getTasksByUser(req.user!.id);
        res.json(tasks);
      } else if (req.user!.isAdmin) {
        // Admin sees all tasks
        const tasks = await storage.getAllTasks();
        res.json(tasks);
      } else {
        // Regular users see their assigned tasks
        const tasks = await storage.getTasksByUser(req.user!.id);
        res.json(tasks);
      }
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/tasks", requireAdmin, async (req, res) => {
    try {
      const { title, description, priority, assignedTo, dueDate } = req.body;
      
      const task = await storage.createTask({
        title,
        description: description || null,
        priority: priority || "medium",
        status: "pending",
        assignedTo: assignedTo || null,
        createdBy: req.user!.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      
      // Send email notification to assigned user
      if (assignedTo) {
        const assignedUser = await storage.getUser(assignedTo);
        if (assignedUser?.email) {
          sendTaskAssignedEmail(
            assignedUser.email,
            assignedUser.name || assignedUser.username,
            title,
            description || "",
            dueDate
          );
        }
      }
      
      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).send("Task not found");
      }
      
      // Only allow updating if admin or assignee
      if (task.assignedTo !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).send("Forbidden");
      }
      
      const updated = await storage.updateTask(taskId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Attendance
  // =====================
  
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      if (req.user!.isAdmin) {
        const records = await storage.getAllAttendance();
        res.json(records);
      } else {
        const records = await storage.getUserAttendance(req.user!.id);
        res.json(records);
      }
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/attendance/today", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const record = await storage.getTodayAttendance(req.user!.id, today);
      res.json(record || null);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/attendance/clock-in", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const existing = await storage.getTodayAttendance(req.user!.id, today);
      
      if (existing) {
        return res.status(400).send("Already clocked in today");
      }
      
      const record = await storage.createAttendance({
        userId: req.user!.id,
        clockIn: new Date(),
        clockOut: null,
        date: today,
      });
      
      res.status(201).json(record);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/attendance/clock-out", requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const existing = await storage.getTodayAttendance(req.user!.id, today);
      
      if (!existing) {
        return res.status(400).send("Not clocked in today");
      }
      
      if (existing.clockOut) {
        return res.status(400).send("Already clocked out today");
      }
      
      const updated = await storage.updateAttendance(existing.id, {
        clockOut: new Date(),
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // Work Reports
  // =====================
  
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      if (req.user!.isAdmin) {
        const reports = await storage.getAllWorkReports();
        res.json(reports);
      } else {
        const reports = await storage.getUserWorkReports(req.user!.id);
        res.json(reports);
      }
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.get("/api/reports/stats", requireAuth, async (req, res) => {
    try {
      if (req.user!.isAdmin) {
        const reports = await storage.getAllWorkReports();
        const pendingCount = reports.filter((r) => r.status === "pending").length;
        res.json({ pendingCount });
      } else {
        const reports = await storage.getUserWorkReports(req.user!.id);
        const pendingCount = reports.filter((r) => r.status === "pending").length;
        res.json({ pendingCount });
      }
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { title, content } = req.body;
      
      const report = await storage.createWorkReport({
        userId: req.user!.id,
        title,
        content,
      });
      
      // Send email notification to admin
      const admins = await storage.getAdmins();
      const submitter = req.user!;
      for (const admin of admins) {
        if (admin.email) {
          sendReportSubmittedEmail(
            admin.email,
            submitter.name || submitter.username,
            title,
            content
          );
        }
      }
      
      res.status(201).json(report);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/reports/:id", requireAdmin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status } = req.body;
      
      await storage.updateWorkReportStatus(reportId, status);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // =====================
  // WebSocket Server
  // =====================
  
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("WebSocket client connected");
    
    ws.on("close", () => {
      clients.delete(ws);
      console.log("WebSocket client disconnected");
    });
    
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  return httpServer;
}
