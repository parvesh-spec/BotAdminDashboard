import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBotUserSchema, insertWelcomeMessageSchema, insertLinkClickSchema } from "@shared/schema";
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
  app.get("/api/welcome-messages", isAuthenticated, async (req, res) => {
    try {
      const welcomeMessages = await storage.getAllWelcomeMessages();
      res.json(welcomeMessages);
    } catch (error) {
      console.error("Error fetching welcome messages:", error);
      res.status(500).json({ message: "Failed to fetch welcome messages" });
    }
  });

  app.get("/api/welcome-message/:source?", isAuthenticated, async (req, res) => {
    try {
      const { source } = req.params;
      const welcomeMessage = await storage.getWelcomeMessage(source);
      if (!welcomeMessage) {
        // Return default welcome message if none exists
        res.json({
          message: "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
          isEnabled: "true",
          source: source || "default",
          title: `${source || "Default"} Welcome Message`
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

  app.delete("/api/welcome-message/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWelcomeMessage(id);
      res.json({ message: "Welcome message deleted successfully" });
    } catch (error) {
      console.error("Error deleting welcome message:", error);
      res.status(500).json({ message: "Failed to delete welcome message" });
    }
  });

  // Link redirect and tracking endpoint with Facebook Pixel
  app.get("/r/:messageId/:userId", async (req, res) => {
    try {
      const { messageId, userId } = req.params;
      const { fbclid } = req.query;
      
      // Get the welcome message to find the original URL
      const messages = await storage.getAllWelcomeMessages();
      const message = messages.find(m => m.id === messageId);
      
      if (!message || !message.buttonLink) {
        return res.status(404).json({ message: "Link not found" });
      }

      // Track the click with fbclid
      await storage.trackLinkClick({
        welcomeMessageId: messageId,
        telegramUserId: userId,
        originalUrl: message.buttonLink,
        fbclid: fbclid as string || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      });

      console.log(`📊 Link clicked: ${message.source} -> ${message.buttonLink} by user ${userId}${fbclid ? ` [fbclid: ${fbclid}]` : ''}`);

      // Prepare final URL with fbclid parameter if available
      let finalUrl = message.buttonLink;
      if (fbclid) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}fbclid=${fbclid}`;
      }

      // If this is a direct redirect (not requesting Facebook Pixel tracking page)
      if (req.query.direct === 'true') {
        return res.redirect(finalUrl);
      }

      // Serve Facebook Pixel tracking page with auto-redirect
      const trackingPageHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    
    <!-- Facebook Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', 'YOUR_PIXEL_ID'); // Replace with actual Facebook Pixel ID
    fbq('track', 'PageView');
    
    // Custom event for bot link clicks
    fbq('trackCustom', 'BotLinkClick', {
        source: '${message.source}',
        button_text: '${message.buttonText || 'N/A'}',
        telegram_user_id: '${userId}',
        fbclid: '${fbclid || 'N/A'}'
    });
    </script>
    <noscript>
    <img height="1" width="1" style="display:none" 
         src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"/>
    </noscript>
    <!-- End Facebook Pixel Code -->
    
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0; 
            background: #f8f9fa;
        }
        .container { 
            text-align: center; 
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #1877f2;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .redirect-text {
            color: #65676b;
            margin-bottom: 1rem;
        }
        .redirect-link {
            color: #1877f2;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div class="redirect-text">Redirecting you to your destination...</div>
        <p><a href="${finalUrl}" class="redirect-link">Click here if you're not redirected automatically</a></p>
    </div>
    
    <script>
        // Auto redirect after tracking
        setTimeout(function() {
            window.location.href = '${finalUrl}';
        }, 1000);
    </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(trackingPageHtml);
      
    } catch (error) {
      console.error("Error tracking link click:", error);
      res.status(500).json({ message: "Failed to redirect" });
    }
  });

  // Get link click stats
  app.get("/api/link-stats/:messageId?", isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const stats = await storage.getLinkClickStats(messageId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching link stats:", error);
      res.status(500).json({ message: "Failed to fetch link stats" });
    }
  });

  // Get detailed link clicks with pagination
  app.get("/api/link-clicks/:messageId", isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await storage.getLinkClicks(
        messageId,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching link clicks:", error);
      res.status(500).json({ message: "Failed to fetch link clicks" });
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
