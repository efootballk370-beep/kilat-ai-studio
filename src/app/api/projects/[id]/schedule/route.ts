import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, studioSettings } from "@/db/schema";
import { getStudioState, logActivity, STUDIO_ID } from "@/lib/studio";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { scheduledAt?: string; enableAutomation?: boolean };
    const scheduledAt = new Date(body.scheduledAt || "");
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Pilih waktu publikasi yang valid di masa depan." }, { status: 400 });
    const rows = await db.select({ renderSize: projects.renderSize, title: projects.title }).from(projects).where(eq(projects.id, id)).limit(1);
    if (!rows[0]?.renderSize) return NextResponse.json({ error: "Render dan simpan video sebelum menjadwalkan." }, { status: 400 });
    await db.update(projects).set({ status: "scheduled", scheduledAt, error: null, updatedAt: new Date() }).where(eq(projects.id, id));
    if (body.enableAutomation) await db.update(studioSettings).set({ autoPublish: true, updatedAt: new Date() }).where(eq(studioSettings.id, STUDIO_ID));
    await logActivity("schedule", `“${rows[0].title}” dijadwalkan pada ${scheduledAt.toISOString()}.`, id);
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Jadwal gagal disimpan." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await db.update(projects).set({ status: "ready", scheduledAt: null, updatedAt: new Date() }).where(eq(projects.id, id));
  return NextResponse.json(await getStudioState());
}
