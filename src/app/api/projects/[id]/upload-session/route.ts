import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getValidAccessToken } from "@/lib/youtube";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const project = rows[0];
    if (!project) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    if (project.status === "publishing") return NextResponse.json({ error: "Proyek ini sedang diunggah." }, { status: 409 });
    if (project.status === "published" && project.youtubeVideoId) {
      return NextResponse.json({ error: "Video ini sudah tayang.", url: project.youtubeUrl }, { status: 409 });
    }
    const body = await request.json().catch(() => ({})) as { size?: number; mime?: string };
    const size = Math.max(1, Math.floor(Number(body.size) || 0));
    const mime = typeof body.mime === "string" && body.mime.startsWith("video/") ? body.mime : "video/mp4";
    if (size > 2 * 1024 * 1024 * 1024) return NextResponse.json({ error: "Ukuran video melebihi batas YouTube." }, { status: 413 });

    const accessToken = await getValidAccessToken();
    const metadata = {
      snippet: { title: project.title.slice(0, 100), description: project.description.slice(0, 4900), tags: project.tags.slice(0, 15), categoryId: "22" },
      status: { privacyStatus: project.privacy, selfDeclaredMadeForKids: false },
    };
    const session = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mime,
        "X-Upload-Content-Length": String(size),
      },
      body: JSON.stringify(metadata),
    });
    if (!session.ok) {
      const detail = await session.text();
      return NextResponse.json({ error: `YouTube menolak sesi unggah (${session.status}): ${detail.slice(0, 300)}` }, { status: 502 });
    }
    const uploadUrl = session.headers.get("location");
    if (!uploadUrl) return NextResponse.json({ error: "YouTube tidak mengirim URL unggah resumable." }, { status: 502 });
    await db.update(projects).set({ status: "publishing", error: null, updatedAt: new Date() }).where(eq(projects.id, id));
    return NextResponse.json({ uploadUrl, size, mime });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sesi unggah gagal dibuat." }, { status: 500 });
  }
}
