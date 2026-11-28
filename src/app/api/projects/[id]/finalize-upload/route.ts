import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getValidAccessToken } from "@/lib/youtube";
import { logActivity } from "@/lib/studio";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as { videoId?: string; size?: number; mime?: string };
    const youtubeVideoId = typeof body.videoId === "string" && body.videoId.length >= 5 ? body.videoId : null;
    if (!youtubeVideoId) return NextResponse.json({ error: "ID video dari YouTube tidak diterima." }, { status: 400 });
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const project = rows[0];
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    const url = `https://youtu.be/${youtubeVideoId}`;
    await db.update(projects).set({
      status: "published",
      youtubeVideoId,
      youtubeUrl: url,
      publishedAt: project.publishedAt || new Date(),
      scheduledAt: null,
      error: null,
      renderMime: typeof body.mime === "string" && body.mime.startsWith("video/") ? body.mime : project.renderMime,
      renderSize: Math.max(project.renderSize, Math.floor(Number(body.size) || 0)),
      updatedAt: new Date(),
    }).where(eq(projects.id, id));
    await logActivity("publish", `“${project.title}” berhasil diunggah langsung ke YouTube.`, id);
    return NextResponse.json({ ok: true, videoId: youtubeVideoId, url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Finalisasi unggahan gagal." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const rows = await db.select({ status: projects.status, title: projects.title }).from(projects).where(eq(projects.id, id)).limit(1);
    if (!rows[0]) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    await db.update(projects).set({ status: "ready", error: "Unggahan langsung gagal. Video tetap tersimpan, coba unggah ulang.", updatedAt: new Date() }).where(eq(projects.id, id));
    await logActivity("error", `Unggahan langsung “${rows[0].title}” gagal dilanjutkan.`, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menandai kegagalan." }, { status: 500 });
  }
}

export async function GET() {
  try {
    await getValidAccessToken();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Token tidak tersedia." }, { status: 401 });
  }
}
