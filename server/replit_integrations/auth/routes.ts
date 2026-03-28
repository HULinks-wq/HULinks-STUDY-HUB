import type { Express } from "express";
import { db } from "../../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";

const TRIAL_DAYS = 2;

export function hasActiveAccess(user: any): boolean {
  if (user.isPremium || user.tier === "premium") return true;
  if (user.trialEndDate && new Date(user.trialEndDate) > new Date()) return true;
  return false;
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { name, studentNumber, course, password } = req.body;

      if (!name || !studentNumber || !course || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existing = await db.select().from(users).where(eq(users.studentNumber, studentNumber)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ message: "A student account with that number already exists" });
      }

      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await db.insert(users).values({
        name,
        studentNumber,
        course,
        passwordHash,
        tier: "freemium",
        trialStartDate: now,
        trialEndDate: trialEndDate,
        isPremium: false,
      }).returning();

      (req.session as any).userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({
        ...safeUser,
        hasActiveAccess: hasActiveAccess(safeUser),
        trialActive: true,
        trialDaysLeft: TRIAL_DAYS,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { studentNumber, password } = req.body;

      if (!studentNumber || !password) {
        return res.status(400).json({ message: "Student number and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.studentNumber, studentNumber)).limit(1);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid student number or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid student number or password" });
      }

      (req.session as any).userId = user.id;
      const { passwordHash: _, ...safeUser } = user;
      const now = new Date();
      const trialActive = !!(user.trialEndDate && new Date(user.trialEndDate) > now);
      const trialDaysLeft = trialActive
        ? Math.ceil((new Date(user.trialEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      res.json({ ...safeUser, hasActiveAccess: hasActiveAccess(safeUser), trialActive, trialDaysLeft });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user;
      const now = new Date();
      const trialActive = !!(user.trialEndDate && new Date(user.trialEndDate) > now);
      const trialDaysLeft = trialActive
        ? Math.ceil((new Date(user.trialEndDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      res.json({ ...safeUser, hasActiveAccess: hasActiveAccess(safeUser), trialActive, trialDaysLeft });
    } catch (error) {
      console.error("Fetch user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { name, studentNumber, course, tier, isPremium } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (name !== undefined) updateData.name = name;
      if (studentNumber !== undefined) updateData.studentNumber = studentNumber;
      if (course !== undefined) updateData.course = course;
      if (tier !== undefined) updateData.tier = tier;
      if (isPremium !== undefined) updateData.isPremium = isPremium;

      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.json({ ...safeUser, hasActiveAccess: hasActiveAccess(safeUser) });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}
