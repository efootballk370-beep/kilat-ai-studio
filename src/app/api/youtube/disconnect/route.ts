import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { channelConnections } from "@/db/schema";
import { getStudioState, logActivity, STUDIO_ID } from "@/lib/studio";

export async function POST() {
  await db.delete(channelConnections).where(eq(channelConnections.id, STUDIO_ID));
  await logActivity("system", "Koneksi kanal YouTube diputus. Token lokal dihapus.");
  return NextResponse.json(await getStudioState());
}
