import { customType, bigint, boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { IdeaStatus, MonetizationSettings, ProjectStatus, Scene } from "@/lib/types";

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const studioSettings = pgTable("studio_settings", {
  id: text("id").primaryKey(),
  channelName: text("channel_name").notNull().default("Kanal Baru"),
  niche: text("niche").notNull().default("Produktivitas"),
  audience: text("audience").notNull().default("Pekerja muda Indonesia, 20–35 tahun"),
  tone: text("tone").notNull().default("Tajam, hangat, tanpa clickbait"),
  postingTime: text("posting_time").notNull().default("19:30"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  autoPublish: boolean("auto_publish").notNull().default(false),
  monetization: jsonb("monetization").$type<MonetizationSettings>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideas = pgTable("ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  angle: text("angle").notNull(),
  rationale: text("rationale").notNull(),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  points: jsonb("points").$type<string[]>().notNull().default([]),
  cta: text("cta").notNull(),
  score: integer("score").notNull().default(75),
  niche: text("niche").notNull(),
  source: text("source").notNull().default("Mesin editorial lokal"),
  status: text("status").$type<IdeaStatus>().notNull().default("fresh"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  niche: text("niche").notNull(),
  script: text("script").notNull(),
  scenes: jsonb("scenes").$type<Scene[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: text("status").$type<ProjectStatus>().notNull().default("draft"),
  theme: text("theme").$type<"lime" | "coral" | "violet" | "blue">().notNull().default("lime"),
  music: boolean("music").notNull().default(true),
  captions: boolean("captions").notNull().default(true),
  privacy: text("privacy").$type<"public" | "unlisted" | "private">().notNull().default("public"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  youtubeVideoId: text("youtube_video_id"),
  youtubeUrl: text("youtube_url"),
  renderMime: text("render_mime"),
  renderSize: integer("render_size").notNull().default(0),
  videoData: bytea("video_data"),
  error: text("error"),
  views: bigint("views", { mode: "number" }).notNull().default(0),
  likes: bigint("likes", { mode: "number" }).notNull().default(0),
  comments: bigint("comments", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  kind: text("kind").$type<"idea" | "script" | "render" | "schedule" | "publish" | "system" | "error">().notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelConnections = pgTable("channel_connections", {
  id: text("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  channelTitle: text("channel_title"),
  channelId: text("channel_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
