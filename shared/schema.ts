import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for admin authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bot users table for tracking Telegram bot users
export const botUsers = pgTable("bot_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: varchar("telegram_id").notNull().unique(),
  username: varchar("username"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  source: varchar("source").notNull(), // Direct, Referral, Social Media, Advertisement, etc.
  fbclid: varchar("fbclid"), // Facebook Click ID for attribution tracking
  campusFreeChannel: varchar("campus_free_channel").default("notjoined"), // notjoined, joined, left
  channelJoinedAt: timestamp("channel_joined_at"), // When user actually joined the channel
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  isActive: varchar("is_active").default("active"), // active, inactive
  messageCount: integer("message_count").default(0),
});

// Welcome message configuration
export const welcomeMessages = pgTable("welcome_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: varchar("source").notNull().default("default"), // "default", "facebookads", "referral", etc.
  message: text("message").notNull(),
  isEnabled: varchar("is_enabled").default("true").notNull(),
  title: varchar("title").default("Default Welcome Message"),
  buttonText: varchar("button_text"), // Optional inline button text
  buttonLink: text("button_link"), // Optional inline button link
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Click tracking for button links
export const linkClicks = pgTable("link_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  welcomeMessageId: varchar("welcome_message_id").references(() => welcomeMessages.id),
  telegramUserId: varchar("telegram_user_id"),
  originalUrl: text("original_url").notNull(),
  fbclid: varchar("fbclid"), // Facebook Click ID passed through for attribution
  fbc: varchar("fbc"), // Facebook Browser Cookie for server-side events
  fbp: varchar("fbp"), // Facebook Pixel Cookie for server-side events
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const insertBotUserSchema = createInsertSchema(botUsers).omit({
  id: true,
  joinedAt: true,
});

export const insertWelcomeMessageSchema = createInsertSchema(welcomeMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLinkClickSchema = createInsertSchema(linkClicks).omit({
  id: true,
  clickedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type BotUser = typeof botUsers.$inferSelect;
export type InsertBotUser = z.infer<typeof insertBotUserSchema>;
export type WelcomeMessage = typeof welcomeMessages.$inferSelect;
export type InsertWelcomeMessage = z.infer<typeof insertWelcomeMessageSchema>;
export type LinkClick = typeof linkClicks.$inferSelect;
export type InsertLinkClick = z.infer<typeof insertLinkClickSchema>;

// Auth types for frontend
export type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
