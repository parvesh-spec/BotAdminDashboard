import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBotUserSchema, insertWelcomeMessageSchema } from "@shared/schema";
import { telegramBot } from "./telegramBot";

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

  // Welcome Message API Routes
  app.get("/api/welcome-message", isAuthenticated, async (req, res) => {
    try {
      const welcomeMessage = await storage.getWelcomeMessage();
      if (!welcomeMessage) {
        // Return default welcome message if none exists
        res.json({
          message: "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
          isEnabled: "true"
        });
      } else {
        res.json(welcomeMessage);
      }
    } catch (error) {
      console.error("Error fetching welcome message:", error);
      res.status(500).json({ message: "Failed to fetch welcome message" });
    }
  });

  app.put("/api/welcome-message", isAuthenticated, async (req, res) => {
    try {
      const messageData = insertWelcomeMessageSchema.parse(req.body);
      const welcomeMessage = await storage.upsertWelcomeMessage(messageData);
      res.json(welcomeMessage);
    } catch (error) {
      console.error("Error updating welcome message:", error);
      res.status(400).json({ message: "Failed to update welcome message" });
    }
  });

  app.post("/api/welcome-message/test", isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get the admin user's chat ID (this is a simplified approach)
      // In a real implementation, you might want to store admin's telegram chat ID
      res.json({ 
        message: "To test the welcome message, send /start to your bot in Telegram. The bot is now active and will respond to new users!" 
      });
    } catch (error) {
      console.error("Error sending test message:", error);
      res.status(500).json({ message: "Failed to send test message" });
    }
  });

  // Telegram Webhook Routes
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const update = req.body;
      console.log("Received Telegram update:", JSON.stringify(update, null, 2));
      
      await telegramBot.processUpdate(update);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Bot management routes
  app.post("/api/telegram/setup-webhook", isAuthenticated, async (req, res) => {
    try {
      // Get the current domain from the request
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;
      
      const result = await telegramBot.setWebhook(webhookUrl);
      res.json({ ...result, webhookUrl });
    } catch (error) {
      console.error("Error setting up webhook:", error);
      res.status(500).json({ message: "Failed to set up webhook" });
    }
  });

  app.get("/api/telegram/bot-info", isAuthenticated, async (req, res) => {
    try {
      const botInfo = await telegramBot.getMe();
      res.json(botInfo);
    } catch (error) {
      console.error("Error getting bot info:", error);
      res.status(500).json({ message: "Failed to get bot info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
