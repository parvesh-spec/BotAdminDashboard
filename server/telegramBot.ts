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

interface TelegramChatMember {
  user: TelegramUser;
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked';
  until_date?: number;
}

interface TelegramChatMemberUpdate {
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  from: TelegramUser;
  date: number;
  old_chat_member: TelegramChatMember;
  new_chat_member: TelegramChatMember;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  chat_member?: TelegramChatMemberUpdate;
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

  async sendWelcomeMessage(chatId: number, firstName: string, source?: string, telegramUserId?: string, fbclid?: string | null) {
    try {
      const welcomeMessageConfig = await storage.getWelcomeMessage(source);
      
      let message = "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!";
      
      if (welcomeMessageConfig && welcomeMessageConfig.isEnabled === "true") {
        message = welcomeMessageConfig.message;
      }

      // Personalize the message
      const personalizedMessage = message.replace(/\{firstName\}/g, firstName);

      // Create inline keyboard if button text and link are provided
      let reply_markup;
      if (welcomeMessageConfig?.buttonText && welcomeMessageConfig?.buttonLink) {
        // Create tracked URL for click analytics with fbclid parameter
        let trackingUrl = `${process.env.REPL_URL || 'https://2635970f-1194-40c9-a633-2b7dc8587abe-00-3cb1axvzvtdyu.spock.replit.dev'}/r/${welcomeMessageConfig.id}/${telegramUserId || chatId}`;
        
        // Add fbclid parameter to tracking URL if available
        if (fbclid) {
          trackingUrl += `?fbclid=${fbclid}`;
        }
        
        reply_markup = {
          inline_keyboard: [[
            {
              text: welcomeMessageConfig.buttonText,
              url: trackingUrl
            }
          ]]
        };
      }

      await this.sendMessage(chatId, personalizedMessage, reply_markup ? { reply_markup } : {});
    } catch (error) {
      console.error("Error sending welcome message:", error);
      // Send a fallback message
      await this.sendMessage(chatId, `Welcome ${firstName}! 🤖`);
    }
  }

  async handleStart(message: TelegramMessage) {
    const user = message.from;
    const chatId = message.chat.id;
    const text = message.text || "";

    try {
      // Extract source and fbclid from start command parameter
      // Format: /start or /start facebookads or /start facebookads_fbclid=abc123 etc
      const parts = text.split(" ");
      let source = "Direct"; // Default source
      let fbclid = null; // Facebook Click ID
      
      if (parts.length > 1 && parts[1].trim()) {
        const parameter = parts[1].trim();
        
        // Check if parameter contains fbclid
        if (parameter.includes('_fbclid=')) {
          const [sourceParam, fbclidParam] = parameter.split('_fbclid=');
          source = sourceParam;
          fbclid = fbclidParam;
          console.log(`📊 User source detected: ${source} with fbclid: ${fbclid}`);
        } else {
          source = parameter;
          console.log(`📊 User source detected: ${source}`);
        }
      }

      // Try to create new user, if already exists, update activity
      try {
        await storage.createBotUser({
          telegramId: user.id.toString(),
          username: user.username || null,
          firstName: user.first_name,
          lastName: user.last_name || null,
          source: source,
          fbclid: fbclid,
        });
        console.log(`✅ New user registered: ${user.first_name} (${user.id}) from ${source}${fbclid ? ` [fbclid: ${fbclid}]` : ''}`);
      } catch (createError: any) {
        // If user already exists (duplicate key error), update their activity
        if (createError.code === '23505' || createError.message?.includes('duplicate key')) {
          await storage.updateBotUserActivity(user.id.toString(), fbclid);
          console.log(`🔄 Existing user restarted bot: ${user.first_name} (${user.id}) from ${source}${fbclid ? ` [fbclid: ${fbclid}]` : ''}`);
        } else {
          throw createError; // Re-throw if it's a different error
        }
      }

      // Send welcome message
      await this.sendWelcomeMessage(chatId, user.first_name, source, user.id.toString(), fbclid);

    } catch (error) {
      console.error("❌ Error handling start command:", error);
      await this.sendMessage(chatId, `Welcome ${user.first_name}! 🤖`);
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

  async handleChatMemberUpdate(chatMemberUpdate: TelegramChatMemberUpdate) {
    const CAMPUS_CHANNEL_ID = "-1001930548228";
    
    // Only process updates for our specific channel
    if (chatMemberUpdate.chat.id.toString() !== CAMPUS_CHANNEL_ID) {
      return;
    }

    const userId = chatMemberUpdate.new_chat_member.user.id.toString();
    const oldStatus = chatMemberUpdate.old_chat_member.status;
    const newStatus = chatMemberUpdate.new_chat_member.status;
    
    console.log(`📺 Channel update: User ${userId} | ${oldStatus} -> ${newStatus}`);

    try {
      // Check if user exists in our bot users table
      const botUser = await storage.getBotUserByTelegramId(userId);
      
      if (!botUser) {
        console.log(`⚠️ User ${userId} not found in bot users - skipping channel tracking`);
        return;
      }

      // Determine channel status based on membership status
      let channelStatus: 'notjoined' | 'joined' | 'left';
      
      if (newStatus === 'member' || newStatus === 'administrator' || newStatus === 'creator') {
        channelStatus = 'joined';
        
        // User joined channel - fire Facebook conversion event
        if (oldStatus === 'left' || oldStatus === 'kicked') {
          console.log(`🎉 User ${userId} joined campus channel - firing conversion event`);
          await this.fireChannelJoinConversion(userId);
        }
      } else if (newStatus === 'left' || newStatus === 'kicked') {
        channelStatus = 'left';
      } else {
        return; // Skip other status changes
      }

      // Update channel status in database
      await storage.updateChannelStatus(userId, channelStatus);
      console.log(`📊 Updated channel status: User ${userId} -> ${channelStatus}`);

    } catch (error) {
      console.error("Error handling chat member update:", error);
    }
  }

  async fireChannelJoinConversion(telegramUserId: string) {
    try {
      // Get user's click data only if they clicked within last 2 minutes
      const clickData = await storage.getRecentClickData(telegramUserId, 2);
      
      if (!clickData || !clickData.fbc || !clickData.fbp) {
        console.log(`⚠️ No recent click data (last 2 minutes) for user ${telegramUserId} - skipping conversion event`);
        return;
      }

      console.log(`✅ User ${telegramUserId} has recent activity - firing conversion event`);

      // Prepare Facebook Conversion API payload
      const conversionData = {
        data: [{
          event_name: 'Contact',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: `${process.env.REPL_URL || 'https://2635970f-1194-40c9-a633-2b7dc8587abe-00-3cb1axvzvtdyu.spock.replit.dev'}/telegram-channel-join`,
          user_data: {
            fbc: clickData.fbc,
            fbp: clickData.fbp,
          },
          custom_data: {
            content_name: 'Campus Free Channel Join',
            content_category: 'Channel Membership'
          }
        }]
      };

      // Send to Facebook Conversion API
      const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.FACEBOOK_PIXEL_ID}/events?access_token=${process.env.FACEBOOK_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`🚀 Facebook conversion fired: User ${telegramUserId} | Contact event`);
      } else {
        const error = await response.text();
        console.error('Facebook conversion API error:', error);
      }

    } catch (error) {
      console.error('Error firing channel join conversion:', error);
    }
  }

  async processUpdate(update: TelegramUpdate) {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.chat_member) {
        await this.handleChatMemberUpdate(update.chat_member);
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
          allowed_updates: ["message", "chat_member"],
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