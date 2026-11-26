import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { channelConnections, projects, studioSettings } from "@/db/schema";
import { logActivity, STUDIO_ID } from "@/lib/studio";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://www.googleapis.com/youtube/v3";

export function youtubeConfigured() {
  return Boolean(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
}

export async function getValidAccessToken() {
  if (!youtubeConfigured()) throw new Error("YOUTUBE_CLIENT_ID dan YOUTUBE_CLIENT_SECRET belum dikonfigurasi.");
  const rows = await db.select().from(channelConnections).where(eq(channelConnections.id, STUDIO_ID)).limit(1);
  const connection = rows[0];
  if (!connection) throw new Error("Kanal YouTube belum terhubung.");
  if (connection.expiryDate && connection.expiryDate.getTime() > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) throw new Error("Sesi YouTube kedaluwarsa. Hubungkan ulang kanal.");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Token YouTube tidak dapat diperbarui. Hubungkan ulang kanal.");
  const token = await response.json() as { access_token: string; expires_in?: number };
  await db.update(channelConnections).set({
    accessToken: token.access_token,
    expiryDate: new Date(Date.now() + (token.expires_in || 3600) * 1000),
    updatedAt: new Date(),
  }).where(eq(channelConnections.id, STUDIO_ID));
  return token.access_token;
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  if (!youtubeConfigured()) throw new Error("Kredensial YouTube belum dikonfigurasi.");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Penukaran token gagal: ${detail.slice(0, 240)}`);
  }
  const token = await response.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  let channelTitle: string | null = null;
  let channelId: string | null = null;
  const channelResponse = await fetch(`${API_ROOT}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (channelResponse.ok) {
    const channel = await channelResponse.json() as { items?: { id: string; snippet?: { title?: string } }[] };
    channelTitle = channel.items?.[0]?.snippet?.title || null;
    channelId = channel.items?.[0]?.id || null;
  }
  const existing = await db.select().from(channelConnections).where(eq(channelConnections.id, STUDIO_ID)).limit(1);
  const refreshToken = token.refresh_token || existing[0]?.refreshToken || null;
  await db.insert(channelConnections).values({
    id: STUDIO_ID,
    accessToken: token.access_token,
    refreshToken,
    expiryDate: new Date(Date.now() + (token.expires_in || 3600) * 1000),
    channelTitle,
    channelId,
  }).onConflictDoUpdate({
    target: channelConnections.id,
    set: { accessToken: token.access_token, refreshToken, expiryDate: new Date(Date.now() + (token.expires_in || 3600) * 1000), channelTitle, channelId, updatedAt: new Date() },
  });
  await logActivity("system", `Kanal YouTube ${channelTitle || "berhasil"} terhubung.`);
  return channelTitle;
}

export async function uploadProjectToYouTube(projectId: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const project = rows[0];
  if (!project) throw new Error("Proyek tidak ditemukan.");
  if (!project.videoData || !project.renderMime) throw new Error("Render video terlebih dahulu sebelum mengunggah.");
  if (project.status === "publishing") throw new Error("Proyek ini sedang diunggah.");
  if (project.status === "published" && project.youtubeVideoId) return { id: project.youtubeVideoId, url: project.youtubeUrl };
  await db.update(projects).set({ status: "publishing", error: null, updatedAt: new Date() }).where(eq(projects.id, projectId));
  try {
    const accessToken = await getValidAccessToken();
    const metadata = {
      snippet: { title: project.title.slice(0, 100), description: project.description.slice(0, 4900), tags: project.tags.slice(0, 15), categoryId: "22" },
      status: { privacyStatus: project.privacy, selfDeclaredMadeForKids: false },
    };
    const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": project.renderMime,
        "X-Upload-Content-Length": String(project.videoData.byteLength),
      },
      body: JSON.stringify(metadata),
    });
    if (!start.ok) {
      const detail = await start.text();
      throw new Error(`YouTube menolak sesi unggah (${start.status}): ${detail.slice(0, 300)}`);
    }
    const uploadUrl = start.headers.get("location");
    if (!uploadUrl) throw new Error("YouTube tidak mengirim URL unggah resumable.");
    const bytes = new Uint8Array(project.videoData);
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const uploaded = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": project.renderMime, "Content-Length": String(bytes.byteLength) },
      body,
    });
    if (!uploaded.ok) {
      const detail = await uploaded.text();
      throw new Error(`Unggahan gagal (${uploaded.status}): ${detail.slice(0, 300)}`);
    }
    const result = await uploaded.json() as { id?: string };
    if (!result.id) throw new Error("Respons YouTube tidak memuat ID video.");
    const url = `https://youtu.be/${result.id}`;
    await db.update(projects).set({ status: "published", youtubeVideoId: result.id, youtubeUrl: url, publishedAt: new Date(), scheduledAt: null, error: null, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await logActivity("publish", `“${project.title}” berhasil diunggah ke YouTube.`, projectId);
    return { id: result.id, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unggahan YouTube gagal.";
    await db.update(projects).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await logActivity("error", `Unggahan “${project.title}” gagal: ${message}`, projectId);
    throw error;
  }
}

export async function runDueUploads() {
  const settings = await db.select({ autoPublish: studioSettings.autoPublish }).from(studioSettings).where(eq(studioSettings.id, STUDIO_ID)).limit(1);
  if (!settings[0]?.autoPublish) return [];
  const due = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.status, "scheduled"), isNotNull(projects.scheduledAt), lte(projects.scheduledAt, new Date()))).limit(3);
  const results: { id: string; ok: boolean; message?: string }[] = [];
  for (const project of due) {
    try {
      await uploadProjectToYouTube(project.id);
      results.push({ id: project.id, ok: true });
    } catch (error) {
      results.push({ id: project.id, ok: false, message: error instanceof Error ? error.message : "Gagal" });
    }
  }
  return results;
}

export async function syncYouTubeStats() {
  const owned = await db.select({ id: projects.id, youtubeVideoId: projects.youtubeVideoId }).from(projects).where(isNotNull(projects.youtubeVideoId));
  const ids = owned.flatMap((project) => project.youtubeVideoId ? [project.youtubeVideoId] : []);
  const token = await getValidAccessToken();
  let synced = 0;
  if (ids.length) {
    const response = await fetch(`${API_ROOT}/videos?part=statistics&id=${encodeURIComponent(ids.slice(0, 50).join(","))}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Statistik YouTube gagal disinkronkan (${response.status}).`);
    const data = await response.json() as { items?: { id: string; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[] };
    for (const item of data.items || []) {
      await db.update(projects).set({
        views: Number(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
      }).where(and(inArray(projects.id, owned.map((project) => project.id)), eq(projects.youtubeVideoId, item.id)));
    }
    synced = data.items?.length || 0;
  }
  const channelResponse = await fetch(`${API_ROOT}/channels?part=statistics&mine=true`, { headers: { Authorization: `Bearer ${token}` } });
  let subscribers: number | undefined;
  if (channelResponse.ok) {
    const channelData = await channelResponse.json() as { items?: { statistics?: { subscriberCount?: string } }[] };
    const rawCount = channelData.items?.[0]?.statistics?.subscriberCount;
    if (rawCount !== undefined) {
      subscribers = Number(rawCount);
      const settings = await db.select().from(studioSettings).where(eq(studioSettings.id, STUDIO_ID)).limit(1);
      if (settings[0]) await db.update(studioSettings).set({ monetization: { ...settings[0].monetization, subscribers }, updatedAt: new Date() }).where(eq(studioSettings.id, STUDIO_ID));
    }
  }
  await logActivity("system", `${synced} statistik video diperbarui${subscribers !== undefined ? `; subscriber kanal: ${subscribers}` : ""}.`);
  return { synced, subscribers };
}
