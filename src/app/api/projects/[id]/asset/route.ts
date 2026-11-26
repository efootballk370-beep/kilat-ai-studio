import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getStudioState, logActivity } from "@/lib/studio";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("video");
    if (!(file instanceof File)) return NextResponse.json({ error: "File video tidak ditemukan." }, { status: 400 });
    if (!["video/mp4", "video/webm"].includes(file.type)) return NextResponse.json({ error: "Format harus MP4 atau WebM." }, { status: 415 });
    if (file.size < 1000 || file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Ukuran video harus antara 1 KB dan 25 MB." }, { status: 413 });
    const current = await db.select({ status: projects.status, title: projects.title }).from(projects).where(eq(projects.id, id)).limit(1);
    if (!current[0]) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    const data = Buffer.from(await file.arrayBuffer());
    await db.update(projects).set({
      videoData: data,
      renderMime: file.type,
      renderSize: file.size,
      status: current[0].status === "published" ? "published" : "ready",
      scheduledAt: current[0].status === "published" ? null : undefined,
      error: null,
      updatedAt: new Date(),
    }).where(eq(projects.id, id));
    await logActivity("render", `Video “${current[0].title}” tersimpan (${(file.size / 1024 / 1024).toFixed(1)} MB, ${file.type === "video/mp4" ? "MP4" : "WebM"}).`, id);
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Aset gagal disimpan." }, { status: 500 });
  }
}
