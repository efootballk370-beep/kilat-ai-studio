import { NextResponse } from "next/server";
import { uploadProjectToYouTube } from "@/lib/youtube";
import { getStudioState } from "@/lib/studio";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const result = await uploadProjectToYouTube(id);
    return NextResponse.json({ state: await getStudioState(), result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publikasi gagal." }, { status: 502 });
  }
}
