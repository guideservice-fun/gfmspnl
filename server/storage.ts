import { 
  users, 
  roles,
  accessRequests,
  messages,
  tasks,
  attendance,
  workReports,
  type User, 
  type InsertUser,
  type Role,
  type InsertRole,
  type AccessRequest,
  type InsertAccessRequest,
  type Message,
  type InsertMessage,
  type Task,
  type InsertTask,
  type Attendance,
  type InsertAttendance,
  type WorkReport,
  type InsertWorkReport,
  type UserWithRole,
  type MessageWithSender,
  type TaskWithUsers,
  type AttendanceWithUser,
  type WorkReportWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserWithRole(id: number): Promise<UserWithRole | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<UserWithRole[]>;
  getAdmins(): Promise<User[]>;
  
  // Roles
  getRole(id: number): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  assignRoleToUser(userId: number, roleId: number | null): Promise<void>;
  
  // Access Requests
  getAccessRequest(id: number): Promise<AccessRequest | undefined>;
  getAccessRequestByUsername(username: string): Promise<AccessRequest | undefined>;
  getAllAccessRequests(): Promise<AccessRequest[]>;
  createAccessRequest(request: InsertAccessRequest): Promise<AccessRequest>;
  updateAccessRequestStatus(id: number, status: string): Promise<void>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getAllMessages(): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getAllTasks(): Promise<TaskWithUsers[]>;
  getTasksByUser(userId: number): Promise<TaskWithUsers[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  
  // Attendance
  getAttendance(id: number): Promise<Attendance | undefined>;
  getTodayAttendance(userId: number, date: string): Promise<Attendance | undefined>;
  getAllAttendance(): Promise<AttendanceWithUser[]>;
  getUserAttendance(userId: number): Promise<AttendanceWithUser[]>;
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  
  // Work Reports
  getWorkReport(id: number): Promise<WorkReport | undefined>;
  getAllWorkReports(): Promise<WorkReportWithUser[]>;
  getUserWorkReports(userId: number): Promise<WorkReportWithUser[]>;
  createWorkReport(report: InsertWorkReport): Promise<WorkReport>;
  updateWorkReportStatus(id: number, status: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserWithRole(id: number): Promise<UserWithRole | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        role: true,
      },
    });
    return result || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async getAllUsers(): Promise<UserWithRole[]> {
    const result = await db.query.users.findMany({
      with: {
        role: true,
      },
      orderBy: [desc(users.id)],
    });
    return result;
  }

  async getAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, true));
  }

  // Roles
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getAllRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async deleteRole(id: number): Promise<void> {
    // First remove the role from all users
    await db.update(users).set({ roleId: null }).where(eq(users.roleId, id));
    // Then delete the role
    await db.delete(roles).where(eq(roles.id, id));
  }

  async assignRoleToUser(userId: number, roleId: number | null): Promise<void> {
    await db.update(users).set({ roleId }).where(eq(users.id, userId));
  }

  // Access Requests
  async getAccessRequest(id: number): Promise<AccessRequest | undefined> {
    const [request] = await db.select().from(accessRequests).where(eq(accessRequests.id, id));
    return request || undefined;
  }

  async getAccessRequestByUsername(username: string): Promise<AccessRequest | undefined> {
    const [request] = await db.select().from(accessRequests).where(eq(accessRequests.username, username));
    return request || undefined;
  }

  async getAllAccessRequests(): Promise<AccessRequest[]> {
    return await db.select().from(accessRequests).orderBy(desc(accessRequests.requestedAt));
  }

  async createAccessRequest(request: InsertAccessRequest): Promise<AccessRequest> {
    const [newRequest] = await db.insert(accessRequests).values(request).returning();
    return newRequest;
  }

  async updateAccessRequestStatus(id: number, status: string): Promise<void> {
    await db.update(accessRequests).set({ status }).where(eq(accessRequests.id, id));
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getAllMessages(): Promise<MessageWithSender[]> {
    const result = await db.query.messages.findMany({
      with: {
        sender: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [messages.createdAt],
    });
    return result as MessageWithSender[];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.update(messages).set({ isDeleted: true }).where(eq(messages.id, id));
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getAllTasks(): Promise<TaskWithUsers[]> {
    const result = await db.query.tasks.findMany({
      with: {
        assignee: {
          with: {
            role: true,
          },
        },
        creator: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(tasks.createdAt)],
    });
    return result as TaskWithUsers[];
  }

  async getTasksByUser(userId: number): Promise<TaskWithUsers[]> {
    const result = await db.query.tasks.findMany({
      where: eq(tasks.assignedTo, userId),
      with: {
        assignee: {
          with: {
            role: true,
          },
        },
        creator: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(tasks.createdAt)],
    });
    return result as TaskWithUsers[];
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return updated || undefined;
  }

  // Attendance
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(eq(attendance.id, id));
    return record || undefined;
  }

  async getTodayAttendance(userId: number, date: string): Promise<Attendance | undefined> {
    const [record] = await db.select().from(attendance).where(
      and(eq(attendance.userId, userId), eq(attendance.date, date))
    );
    return record || undefined;
  }

  async getAllAttendance(): Promise<AttendanceWithUser[]> {
    const result = await db.query.attendance.findMany({
      with: {
        user: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(attendance.clockIn)],
    });
    return result as AttendanceWithUser[];
  }

  async getUserAttendance(userId: number): Promise<AttendanceWithUser[]> {
    const result = await db.query.attendance.findMany({
      where: eq(attendance.userId, userId),
      with: {
        user: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(attendance.clockIn)],
    });
    return result as AttendanceWithUser[];
  }

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [newRecord] = await db.insert(attendance).values(record).returning();
    return newRecord;
  }

  async updateAttendance(id: number, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [updated] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return updated || undefined;
  }

  // Work Reports
  async getWorkReport(id: number): Promise<WorkReport | undefined> {
    const [report] = await db.select().from(workReports).where(eq(workReports.id, id));
    return report || undefined;
  }

  async getAllWorkReports(): Promise<WorkReportWithUser[]> {
    const result = await db.query.workReports.findMany({
      with: {
        user: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(workReports.createdAt)],
    });
    return result as WorkReportWithUser[];
  }

  async getUserWorkReports(userId: number): Promise<WorkReportWithUser[]> {
    const result = await db.query.workReports.findMany({
      where: eq(workReports.userId, userId),
      with: {
        user: {
          with: {
            role: true,
          },
        },
      },
      orderBy: [desc(workReports.createdAt)],
    });
    return result as WorkReportWithUser[];
  }

  async createWorkReport(report: InsertWorkReport): Promise<WorkReport> {
    const [newReport] = await db.insert(workReports).values(report).returning();
    return newReport;
  }

  async updateWorkReportStatus(id: number, status: string): Promise<void> {
    await db.update(workReports).set({ status }).where(eq(workReports.id, id));
  }
}

export const storage = new DatabaseStorage();
