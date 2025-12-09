import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Hardcoded admin credentials
const ADMIN_USERNAME = "grovefanreal";
const ADMIN_PASSWORD = "Grovefan@2207";

export async function initializeAdmin() {
  // Check if admin already exists
  const existingAdmin = await storage.getUserByUsername(ADMIN_USERNAME);
  if (!existingAdmin) {
    // Create admin user
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);
    await storage.createUser({
      username: ADMIN_USERNAME,
      password: hashedPassword,
      email: "admin@grovefan.com",
      name: "Admin",
      isAdmin: true,
      isApproved: true,
      avatar: null,
      roleId: null,
    });
    console.log("Admin user created");
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // Check if user is approved (admin is always approved)
        if (!user.isApproved && !user.isAdmin) {
          return done(null, false, { message: "Account pending approval" });
        }
        
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).send(info?.message || "Invalid credentials");
      }
      req.login(user, async (err) => {
        if (err) return next(err);
        const userWithRole = await storage.getUserWithRole(user.id);
        res.status(200).json(userWithRole);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userWithRole = await storage.getUserWithRole(req.user!.id);
    res.json(userWithRole);
  });
}
