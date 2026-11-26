import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getStudioState } from "@/lib/studio";
import type { Scene } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };
const visuals = new Set(["burst", "orbit", "steps", "compare", "stat", "waves"]);

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const previous = rows[0];
    if (!previous) return NextResponse.json({ error: "Proyek tidak ditemukan." }, { status: 404 });
    let scenes = previous.scenes;
    if (Array.isArray(body.scenes)) {
      scenes = body.scenes.slice(0, 12).flatMap((raw, index) => {
        if (!raw || typeof raw !== "object") return [];
        const scene = raw as Partial<Scene>;
        if (typeof scene.heading !== "string" || typeof scene.narration !== "string") return [];
        return [{
          id: typeof scene.id === "string" ? scene.id : crypto.randomUUID(),
          heading: scene.heading.slice(0, 120),
          narration: scene.narration.slice(0, 700),
          caption: typeof scene.caption === "string" ? scene.caption.slice(0, 280) : scene.narration.slice(0, 280),
          duration: Math.max(1.5, Math.min(12, Number(scene.duration) || 4)),
          visual: visuals.has(scene.visual || "") ? scene.visual! : previous.scenes[index % Math.max(previous.scenes.length, 1)]?.visual || "burst",
          accent: typeof scene.accent === "string" && /^#[0-9a-f]{6}$/i.test(scene.accent) ? scene.accent : "#d9ff63",
          items: Array.isArray(scene.items) ? scene.items.filter((item): item is string => typeof item === "string").slice(0, 4).map((item) => item.slice(0, 70)) : [],
        } satisfies Scene];
      });
    }
    const theme = ["lime", "coral", "violet", "blue"].includes(String(body.theme)) ? body.theme as typeof previous.theme : previous.theme;
    const privacy = ["public", "unlisted", "private"].includes(String(body.privacy)) ? body.privacy as typeof previous.privacy : previous.privacy;
    const nextMusic = typeof body.music === "boolean" ? body.music : previous.music;
    const nextCaptions = typeof body.captions === "boolean" ? body.captions : previous.captions;
    const visualChanged = JSON.stringify(scenes) !== JSON.stringify(previous.scenes) || theme !== previous.theme || nextMusic !== previous.music || nextCaptions !== previous.captions;
    const invalidatesSchedule = visualChanged && previous.status === "scheduled";
    await db.update(projects).set({
      title: typeof body.title === "string" ? body.title.trim().slice(0, 100) || previous.title : previous.title,
      description: typeof body.description === "string" ? body.description.slice(0, 4900) : previous.description,
      scenes,
      script: scenes.map((scene, index) => `[${index + 1}] ${scene.narration}`).join("\n\n"),
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 15).map((tag) => tag.slice(0, 50)) : previous.tags,
      theme,
      music: nextMusic,
      captions: nextCaptions,
      privacy,
      status: visualChanged && previous.status !== "publishing" ? "draft" : previous.status,
      scheduledAt: invalidatesSchedule ? null : previous.scheduledAt,
      videoData: visualChanged ? null : previous.videoData,
      renderMime: visualChanged ? null : previous.renderMime,
      renderSize: visualChanged ? 0 : previous.renderSize,
      updatedAt: new Date(),
    }).where(eq(projects.id, id));
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Perubahan gagal disimpan." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json(await getStudioState());
}
