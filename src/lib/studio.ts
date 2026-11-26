import { desc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { activities, channelConnections, ideas, projects, studioSettings } from "@/db/schema";
import { createProjectBlueprint, seedIdeas } from "@/lib/content-engine";
import type { Activity, ChannelState, Idea, MonetizationSettings, Project, StudioSettings, StudioState } from "@/lib/types";

export const STUDIO_ID = "main";
export const DEFAULT_MONETIZATION: MonetizationSettings = {
  subscribers: 0,
  shortsViews90d: 0,
  watchHours365d: 0,
  publicUploads90d: 0,
  twoStepVerification: false,
  advancedFeatures: false,
  adsenseReady: false,
  originalContent: true,
};

const { videoData: _videoData, ...projectSummaryFields } = getTableColumns(projects);
type ProjectRow = Omit<typeof projects.$inferSelect, "videoData">;

export function serializeProject(row: ProjectRow): Project {
  return {
    ...row,
    ideaId: row.ideaId,
    hasVideo: row.renderSize > 0 && Boolean(row.renderMime),
    scheduledAt: row.scheduledAt?.toISOString() || null,
    publishedAt: row.publishedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeIdea(row: typeof ideas.$inferSelect): Idea {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function serializeSettings(row: typeof studioSettings.$inferSelect): StudioSettings {
  return { ...row, monetization: { ...DEFAULT_MONETIZATION, ...row.monetization }, updatedAt: row.updatedAt.toISOString() };
}

function serializeActivity(row: typeof activities.$inferSelect): Activity {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function logActivity(kind: typeof activities.$inferInsert.kind, message: string, projectId?: string) {
  await db.insert(activities).values({ kind, message, projectId: projectId || null });
}

export async function ensureStudio() {
  const existing = await db.select().from(studioSettings).where(eq(studioSettings.id, STUDIO_ID)).limit(1);
  if (!existing.length) {
    await db.insert(studioSettings).values({ id: STUDIO_ID, monetization: DEFAULT_MONETIZATION }).onConflictDoNothing();
    const curated = seedIdeas();
    await db.insert(ideas).values(curated.map(({ id: _id, createdAt: _createdAt, score: _score, ...idea }) => idea));
    const firstProjects = curated.slice(0, 2).map((idea, index) => ({ ...createProjectBlueprint(idea, index === 0 ? "lime" : "coral"), ideaId: null }));
    const inserted = await db.insert(projects).values(firstProjects).returning({ id: projects.id, title: projects.title });
    await db.insert(activities).values([
      { kind: "system" as const, message: "Studio disiapkan. Empat agen siap menerima brief." },
      ...inserted.map((project) => ({ kind: "script" as const, message: `Storyboard awal “${project.title}” disusun.`, projectId: project.id })),
    ]);
  }
}

export async function getChannelState(): Promise<ChannelState> {
  const rows = await db.select().from(channelConnections).where(eq(channelConnections.id, STUDIO_ID)).limit(1);
  const connection = rows[0];
  return {
    configured: Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET),
    connected: Boolean(connection),
    channelTitle: connection?.channelTitle || null,
    channelId: connection?.channelId || null,
    expiresAt: connection?.expiryDate?.toISOString() || null,
  };
}

export async function getStudioState(): Promise<StudioState> {
  await ensureStudio();
  const [settingsRows, ideaRows, projectRows, activityRows, channel] = await Promise.all([
    db.select().from(studioSettings).where(eq(studioSettings.id, STUDIO_ID)).limit(1),
    db.select().from(ideas).orderBy(desc(ideas.createdAt)).limit(40),
    db.select(projectSummaryFields).from(projects).orderBy(desc(projects.updatedAt)).limit(50),
    db.select().from(activities).orderBy(desc(activities.createdAt)).limit(30),
    getChannelState(),
  ]);
  return {
    settings: serializeSettings(settingsRows[0]),
    ideas: ideaRows.map(serializeIdea),
    projects: projectRows.map(serializeProject),
    activities: activityRows.map(serializeActivity),
    channel,
    aiMode: process.env.OPENAI_API_KEY ? "openai" : "local",
  };
}
