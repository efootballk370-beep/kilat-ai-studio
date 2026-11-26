import { NextResponse } from "next/server";
import { syncYouTubeStats } from "@/lib/youtube";
import { getStudioState } from "@/lib/studio";

export async function POST() {
  try {
    const result = await syncYouTubeStats();
    return NextResponse.json({ state: await getStudioState(), result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Statistik gagal disinkronkan." }, { status: 502 });
  }
}
