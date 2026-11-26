import { NextResponse } from "next/server";
import { db } from "@/db";
import { ideas } from "@/db/schema";
import { generateIdeaBatch } from "@/lib/content-engine";
import { getStudioState, logActivity } from "@/lib/studio";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { niche?: string; audience?: string; tone?: string; count?: number };
    const niche = (body.niche || "Produktivitas").trim().slice(0, 80);
    const count = Math.max(3, Math.min(6, Math.floor(body.count || 5)));
    const generated = await generateIdeaBatch(niche, (body.audience || "Audiens Indonesia").slice(0, 240), (body.tone || "Jelas dan hangat").slice(0, 160), count);
    const existing = await db.select({ title: ideas.title }).from(ideas);
    const existingTitles = new Set(existing.map((idea) => idea.title.toLocaleLowerCase("id-ID")));
    const fresh = generated.ideas.filter((idea) => !existingTitles.has(idea.title.toLocaleLowerCase("id-ID")));
    if (!fresh.length) return NextResponse.json({ error: "Tidak ada ide baru yang unik untuk niche ini. Coba niche lain, arsipkan ide lama, atau gunakan brief sendiri." }, { status: 409 });
    await db.insert(ideas).values(fresh.map(({ id: _id, createdAt: _createdAt, score: _score, ...idea }) => idea));
    await logActivity("idea", `${fresh.length} ide ${niche} dibuat via ${generated.mode === "openai" ? "OpenAI" : "mesin editorial lokal"}.`);
    return NextResponse.json({ state: await getStudioState(), mode: generated.mode, count: fresh.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ide gagal dibuat." }, { status: 500 });
  }
}
