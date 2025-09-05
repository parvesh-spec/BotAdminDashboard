import { users, botUsers, welcomeMessages, type User, type UpsertUser, type BotUser, type InsertBotUser, type WelcomeMessage, type InsertWelcomeMessage } from "@shared/schema";
import { db } from "./db";
import { eq, like, sql, count, desc, and } from "drizzle-orm";

interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: UpsertUser): Promise<User>;
  upsertUser(upsertUser: UpsertUser): Promise<User>;
  
  // Bot user methods  
  getBotUsers(filters: { search?: string; source?: string; page: number; limit: number }): Promise<{ users: BotUser[]; total: number }>;
  getBotUserStats(): Promise<{ total: number; active: number; inactive: number; todayJoined: number }>;
  createBotUser(userData: InsertBotUser): Promise<BotUser>;
  updateBotUserActivity(telegramId: string): Promise<void>;
  getBotUserSources(): Promise<string[]>;
  
  // Welcome message methods
  getWelcomeMessage(source?: string): Promise<WelcomeMessage | undefined>;
  getAllWelcomeMessages(): Promise<WelcomeMessage[]>;
  upsertWelcomeMessage(messageData: InsertWelcomeMessage): Promise<WelcomeMessage>;
  deleteWelcomeMessage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async upsertUser(upsertUser: UpsertUser): Promise<User> {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, upsertUser.id!));

    if (existingUser) {
      const [updatedUser] = await db
        .update(users)
        .set({ ...upsertUser, updatedAt: new Date() })
        .where(eq(users.id, upsertUser.id!))
        .returning();
      return updatedUser;
    } else {
      return this.createUser(upsertUser);
    }
  }

  async getBotUsers(filters: { search?: string; source?: string; page: number; limit: number }): Promise<{ users: BotUser[]; total: number }> {
    const { search, source, page, limit } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        sql`(${botUsers.username} ILIKE ${`%${search}%`} OR ${botUsers.firstName} ILIKE ${`%${search}%`} OR ${botUsers.lastName} ILIKE ${`%${search}%`})`
      );
    }
    
    if (source) {
      whereConditions.push(eq(botUsers.source, source));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [usersResult, totalResult] = await Promise.all([
      db.select()
        .from(botUsers)
        .where(whereClause)
        .orderBy(desc(botUsers.joinedAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(botUsers)
        .where(whereClause)
    ]);

    return {
      users: usersResult,
      total: totalResult[0]?.count || 0
    };
  }

  async getBotUserStats(): Promise<{ total: number; active: number; inactive: number; todayJoined: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalResult, activeResult, inactiveResult, todayJoinedResult] = await Promise.all([
      db.select({ count: count() }).from(botUsers),
      db.select({ count: count() }).from(botUsers).where(eq(botUsers.isActive, 'active')),
      db.select({ count: count() }).from(botUsers).where(eq(botUsers.isActive, 'inactive')),
      db.select({ count: count() }).from(botUsers).where(sql`${botUsers.joinedAt} >= ${today}`)
    ]);

    return {
      total: totalResult[0]?.count || 0,
      active: activeResult[0]?.count || 0,
      inactive: inactiveResult[0]?.count || 0,
      todayJoined: todayJoinedResult[0]?.count || 0
    };
  }

  async createBotUser(userData: InsertBotUser): Promise<BotUser> {
    const [user] = await db
      .insert(botUsers)
      .values(userData)
      .returning();
    return user;
  }

  async updateBotUserActivity(telegramId: string): Promise<void> {
    await db
      .update(botUsers)
      .set({ 
        lastActiveAt: new Date(),
        messageCount: sql`${botUsers.messageCount} + 1`
      })
      .where(eq(botUsers.telegramId, telegramId));
  }

  async getBotUserSources(): Promise<string[]> {
    const result = await db
      .selectDistinct({ source: botUsers.source })
      .from(botUsers)
      .orderBy(botUsers.source);
    
    return result.map(row => row.source);
  }

  async getWelcomeMessage(source?: string): Promise<WelcomeMessage | undefined> {
    const targetSource = source || "default";
    
    // Try to find source-specific message first
    const [specificMessage] = await db
      .select()
      .from(welcomeMessages)
      .where(eq(welcomeMessages.source, targetSource))
      .limit(1);
    
    if (specificMessage) {
      return specificMessage;
    }
    
    // Fallback to default message
    const [defaultMessage] = await db
      .select()
      .from(welcomeMessages)
      .where(eq(welcomeMessages.source, "default"))
      .limit(1);
    
    return defaultMessage || undefined;
  }

  async getAllWelcomeMessages(): Promise<WelcomeMessage[]> {
    return await db
      .select()
      .from(welcomeMessages)
      .orderBy(welcomeMessages.source);
  }

  async upsertWelcomeMessage(messageData: InsertWelcomeMessage): Promise<WelcomeMessage> {
    // Check if a message for this source already exists
    const existingMessage = await db
      .select()
      .from(welcomeMessages)
      .where(eq(welcomeMessages.source, messageData.source || "default"))
      .limit(1);
    
    if (existingMessage.length > 0) {
      // Update existing message
      const [updatedMessage] = await db
        .update(welcomeMessages)
        .set({ 
          ...messageData, 
          updatedAt: new Date() 
        })
        .where(eq(welcomeMessages.id, existingMessage[0].id))
        .returning();
      return updatedMessage;
    } else {
      // Create new message
      const [newMessage] = await db
        .insert(welcomeMessages)
        .values(messageData)
        .returning();
      return newMessage;
    }
  }

  async deleteWelcomeMessage(id: string): Promise<void> {
    await db
      .delete(welcomeMessages)
      .where(eq(welcomeMessages.id, id));
  }
}

export const storage = new DatabaseStorage();