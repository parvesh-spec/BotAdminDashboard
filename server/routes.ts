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
      const { fbclid, fbc, fbp } = req.query;
      
      // Get the welcome message to find the original URL
      const messages = await storage.getAllWelcomeMessages();
      const message = messages.find(m => m.id === messageId);
      
      if (!message || !message.buttonLink) {
        return res.status(404).json({ message: "Link not found" });
      }

      // Track the click with fbclid, fbc, and fbp
      await storage.trackLinkClick({
        welcomeMessageId: messageId,
        telegramUserId: userId,
        originalUrl: message.buttonLink,
        fbclid: fbclid as string || null,
        fbc: fbc as string || null,
        fbp: fbp as string || null,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
      });

      console.log(`📊 Link clicked: ${message.source} -> ${message.buttonLink} by user ${userId}${fbclid ? ` [fbclid: ${fbclid}]` : ''}${fbc ? ` [fbc: ${fbc}]` : ''}${fbp ? ` [fbp: ${fbp}]` : ''}`);

      // Prepare final URL with Facebook parameters
      let finalUrl = message.buttonLink;
      const urlParams = new URLSearchParams();
      
      if (fbclid) urlParams.append('fbclid', fbclid as string);
      if (fbc) urlParams.append('fbc', fbc as string);
      if (fbp) urlParams.append('fbp', fbp as string);
      
      if (urlParams.toString()) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl += `${separator}${urlParams.toString()}`;
      }

      // If this is a direct redirect (not requesting Facebook Pixel tracking page)
      if (req.query.direct === 'true') {
        return res.redirect(finalUrl);
      }

      // Completely invisible Facebook Pixel page with instant redirect
      const trackingPageHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title></title>
    
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
    
    // Fire pixel and redirect immediately
    fbq('init', '${process.env.FACEBOOK_PIXEL_ID}');
    fbq('track', 'PageView');
    
    // Instant redirect after pixel fires
    setTimeout(function() {
        window.location.href = '${finalUrl}${fbclid ? (finalUrl.includes('?') ? '&' : '?') + 'fbclid=' + fbclid : ''}';
    }, 50); // Ultra-fast redirect
    </script>
    <noscript>
    <img height="1" width="1" style="display:none" 
         src="https://www.facebook.com/tr?id=${process.env.FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1"/>
    </noscript>
    
    <style>
        html, body { 
            margin: 0; 
            padding: 0;
            background: #fff;
            overflow: hidden;
        }
    </style>
</head>
<body>
    <script>
        // Background data processing
        setTimeout(function() {
            function getCookie(name) {
                let nameEQ = name + "=";
                let ca = document.cookie.split(';');
                for(let i = 0; i < ca.length; i++) {
                    let c = ca[i];
                    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
                }
                return null;
            }
            
            const fbc = getCookie('_fbc');
            const fbp = getCookie('_fbp');
            
            // Background AJAX - no waiting
            fetch('/api/update-click-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: '${messageId}',
                    userId: '${userId}',
                    fbclid: '${fbclid || ''}',
                    fbc: fbc || '',
                    fbp: fbp || '',
                    userAgent: navigator.userAgent
                })
            }).catch(err => console.log('Background save failed:', err));
        }, 500); // Background processing after 500ms
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

  // Complete click data capture after Facebook Pixel loads
  app.post("/api/update-click-data", async (req, res) => {
    try {
      const { messageId, userId, fbclid, fbc, fbp, userAgent, finalUrl } = req.body;
      
      if (!messageId || !userId) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      // Update the recent click record with all Facebook data
      await storage.updateCompleteClickData(messageId, userId, {
        fbclid: fbclid || null,
        fbc: fbc || null,
        fbp: fbp || null,
        userAgent: userAgent || null,
      });
      
      console.log(`📊 Complete data saved: User ${userId} | fbclid: ${fbclid ? 'YES' : 'NO'} | fbc: ${fbc ? 'YES' : 'NO'} | fbp: ${fbp ? 'YES' : 'NO'}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating click data:", error);
      res.status(500).json({ message: "Failed to update data" });
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
