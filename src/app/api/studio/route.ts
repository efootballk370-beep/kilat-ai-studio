import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studioSettings } from "@/db/schema";
import { getStudioState, STUDIO_ID } from "@/lib/studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Studio gagal dimuat." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const current = await db.select().from(studioSettings).where(eq(studioSettings.id, STUDIO_ID)).limit(1);
    if (!current.length) return NextResponse.json({ error: "Pengaturan belum tersedia." }, { status: 404 });
    const previous = current[0];
    const text = (key: string, fallback: string, max = 180) => typeof body[key] === "string" ? String(body[key]).trim().slice(0, max) || fallback : fallback;
    const inputMonetization = body.monetization && typeof body.monetization === "object" ? body.monetization as Record<string, unknown> : {};
    const numberValue = (key: string, fallback: number) => typeof inputMonetization[key] === "number" ? Math.max(0, Math.floor(inputMonetization[key] as number)) : fallback;
    const booleanValue = (key: string, fallback: boolean) => typeof inputMonetization[key] === "boolean" ? inputMonetization[key] as boolean : fallback;
    const monetization = {
      subscribers: numberValue("subscribers", previous.monetization.subscribers),
      shortsViews90d: numberValue("shortsViews90d", previous.monetization.shortsViews90d),
      watchHours365d: numberValue("watchHours365d", previous.monetization.watchHours365d),
      publicUploads90d: numberValue("publicUploads90d", previous.monetization.publicUploads90d),
      twoStepVerification: booleanValue("twoStepVerification", previous.monetization.twoStepVerification),
      advancedFeatures: booleanValue("advancedFeatures", previous.monetization.advancedFeatures),
      adsenseReady: booleanValue("adsenseReady", previous.monetization.adsenseReady),
      originalContent: booleanValue("originalContent", previous.monetization.originalContent),
    };
    await db.update(studioSettings).set({
      channelName: text("channelName", previous.channelName, 80),
      niche: text("niche", previous.niche, 80),
      audience: text("audience", previous.audience, 240),
      tone: text("tone", previous.tone, 160),
      postingTime: text("postingTime", previous.postingTime, 5),
      timezone: text("timezone", previous.timezone, 60),
      autoPublish: typeof body.autoPublish === "boolean" ? body.autoPublish : previous.autoPublish,
      monetization,
      updatedAt: new Date(),
    }).where(eq(studioSettings.id, STUDIO_ID));
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Pengaturan gagal disimpan." }, { status: 400 });
  }
}
