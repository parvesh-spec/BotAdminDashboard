import { storage } from "./storage";

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramBot {
  private token: string;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN!;
    if (!this.token) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }
  }

  async sendMessage(chatId: number, text: string, options: any = {}) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          ...options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram API error: ${error.description}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async sendWelcomeMessage(chatId: number, firstName: string) {
    try {
      const welcomeMessageConfig = await storage.getWelcomeMessage();
      
      let message = "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!";
      
      if (welcomeMessageConfig && welcomeMessageConfig.isEnabled === "true") {
        message = welcomeMessageConfig.message;
      }

      // Personalize the message
      const personalizedMessage = message.replace(/\{firstName\}/g, firstName);

      await this.sendMessage(chatId, personalizedMessage);
    } catch (error) {
      console.error("Error sending welcome message:", error);
      // Send a fallback message
      await this.sendMessage(chatId, `Welcome ${firstName}! 🤖`);
    }
  }

  async handleStart(message: TelegramMessage) {
    const user = message.from;
    const chatId = message.chat.id;

    try {
      // Check if user already exists
      const existingUsers = await storage.getBotUsers({
        search: user.id.toString(),
        source: "",
        page: 1,
        limit: 1
      });

      if (existingUsers.users.length === 0) {
        // Create new user
        await storage.createBotUser({
          telegramId: user.id.toString(),
          username: user.username || null,
          firstName: user.first_name,
          lastName: user.last_name || null,
          source: "Direct", // Default source for /start command
        });

        console.log(`New user registered: ${user.first_name} (${user.id})`);
      } else {
        // Update existing user activity
        await storage.updateBotUserActivity(user.id.toString());
        console.log(`Existing user started bot: ${user.first_name} (${user.id})`);
      }

      // Send welcome message
      await this.sendWelcomeMessage(chatId, user.first_name);

    } catch (error) {
      console.error("Error handling start command:", error);
      await this.sendMessage(chatId, "Welcome! There was an issue with registration, but you can still use the bot.");
    }
  }

  async handleHelp(message: TelegramMessage) {
    const chatId = message.chat.id;
    const helpText = `
🤖 <b>Bot Commands</b>

/start - Start the bot and get welcome message
/help - Show this help message
/stats - Get your usage statistics

<i>More features coming soon!</i>
    `;

    await this.sendMessage(chatId, helpText);
  }

  async handleStats(message: TelegramMessage) {
    const user = message.from;
    const chatId = message.chat.id;

    try {
      const userStats = await storage.getBotUsers({
        search: user.id.toString(),
        source: "",
        page: 1,
        limit: 1
      });

      if (userStats.users.length > 0) {
        const userInfo = userStats.users[0];
        const joinedDate = new Date(userInfo.joinedAt).toLocaleDateString();
        const lastActive = userInfo.lastActiveAt 
          ? new Date(userInfo.lastActiveAt).toLocaleDateString()
          : "Today";

        const statsText = `
📊 <b>Your Statistics</b>

👤 Name: ${userInfo.firstName} ${userInfo.lastName || ''}
📅 Joined: ${joinedDate}
🕒 Last Active: ${lastActive}
💬 Messages Sent: ${userInfo.messageCount}
📊 Status: ${userInfo.isActive === 'active' ? 'Active' : 'Inactive'}
        `;

        await this.sendMessage(chatId, statsText);
      } else {
        await this.sendMessage(chatId, "No statistics available. Please send /start first.");
      }
    } catch (error) {
      console.error("Error getting user stats:", error);
      await this.sendMessage(chatId, "Sorry, I couldn't retrieve your statistics right now.");
    }
  }

  async handleMessage(message: TelegramMessage) {
    const user = message.from;
    const text = message.text || "";

    // Update user activity for any message
    try {
      await storage.updateBotUserActivity(user.id.toString());
    } catch (error) {
      console.error("Error updating user activity:", error);
    }

    // Handle commands
    if (text.startsWith("/start")) {
      await this.handleStart(message);
    } else if (text.startsWith("/help")) {
      await this.handleHelp(message);
    } else if (text.startsWith("/stats")) {
      await this.handleStats(message);
    } else {
      // Handle regular messages
      const responses = [
        "Thanks for your message! 😊",
        "I'm a simple bot, but I'm here to help! Use /help to see what I can do.",
        "Hello! How can I assist you today?",
        "I received your message! For available commands, type /help.",
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      await this.sendMessage(message.chat.id, randomResponse);
    }
  }

  async processUpdate(update: TelegramUpdate) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      }
    } catch (error) {
      console.error("Error processing update:", error);
    }
  }

  async setWebhook(webhookUrl: string) {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message"],
        }),
      });

      const result = await response.json();
      if (result.ok) {
        console.log("Webhook set successfully:", webhookUrl);
      } else {
        console.error("Error setting webhook:", result.description);
      }
      return result;
    } catch (error) {
      console.error("Error setting webhook:", error);
      throw error;
    }
  }

  async deleteWebhook() {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
        method: "POST",
      });

      const result = await response.json();
      console.log("Webhook deleted:", result);
      return result;
    } catch (error) {
      console.error("Error deleting webhook:", error);
      throw error;
    }
  }

  async getMe() {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error getting bot info:", error);
      throw error;
    }
  }
}

export const telegramBot = new TelegramBot();