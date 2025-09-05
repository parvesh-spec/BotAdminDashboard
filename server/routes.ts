import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBotUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // User is already attached by isAuthenticated middleware
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Bot Users API Routes
  app.get("/api/bot-users", isAuthenticated, async (req, res) => {
    try {
      const { search, source, page = 1, limit = 10 } = req.query;
      const users = await storage.getBotUsers({
        search: search as string,
        source: source as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching bot users:", error);
      res.status(500).json({ message: "Failed to fetch bot users" });
    }
  });

  app.get("/api/bot-users/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getBotUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bot user stats:", error);
      res.status(500).json({ message: "Failed to fetch bot user stats" });
    }
  });

  app.post("/api/bot-users", async (req, res) => {
    try {
      const userData = insertBotUserSchema.parse(req.body);
      const user = await storage.createBotUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating bot user:", error);
      res.status(400).json({ message: "Failed to create bot user" });
    }
  });

  app.patch("/api/bot-users/:telegramId/activity", async (req, res) => {
    try {
      const { telegramId } = req.params;
      await storage.updateBotUserActivity(telegramId);
      res.json({ message: "User activity updated" });
    } catch (error) {
      console.error("Error updating user activity:", error);
      res.status(500).json({ message: "Failed to update user activity" });
    }
  });

  app.get("/api/bot-users/sources", isAuthenticated, async (req, res) => {
    try {
      const sources = await storage.getBotUserSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      res.status(500).json({ message: "Failed to fetch sources" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
