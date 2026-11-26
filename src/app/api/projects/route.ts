import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas, projects } from "@/db/schema";
import { createProjectBlueprint, ideaFromBrief } from "@/lib/content-engine";
import { getStudioState, logActivity } from "@/lib/studio";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { ideaId?: string; brief?: string; niche?: string; audience?: string; theme?: "lime" | "coral" | "violet" | "blue" };
    let idea;
    let ideaId: string | null = null;
    if (body.ideaId) {
      const rows = await db.select().from(ideas).where(eq(ideas.id, body.ideaId)).limit(1);
      if (!rows[0]) return NextResponse.json({ error: "Ide tidak ditemukan." }, { status: 404 });
      idea = { ...rows[0], createdAt: rows[0].createdAt.toISOString() };
      ideaId = rows[0].id;
      await db.update(ideas).set({ status: "used" }).where(eq(ideas.id, ideaId));
    } else if (body.brief?.trim()) {
      idea = ideaFromBrief(body.brief.trim().slice(0, 1600), (body.niche || "Produktivitas").slice(0, 80), (body.audience || "penonton").slice(0, 240));
    } else {
      return NextResponse.json({ error: "Pilih ide atau tulis brief terlebih dahulu." }, { status: 400 });
    }
    const blueprint = createProjectBlueprint(idea, body.theme || "lime");
    const inserted = await db.insert(projects).values({ ...blueprint, ideaId }).returning({ id: projects.id });
    await logActivity("script", `Naskah ${blueprint.scenes.length} adegan untuk “${blueprint.title}” selesai disusun.`, inserted[0].id);
    return NextResponse.json({ state: await getStudioState(), projectId: inserted[0].id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Proyek gagal dibuat." }, { status: 500 });
  }
}
