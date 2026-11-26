import { NextResponse } from "next/server";
import { runDueUploads } from "@/lib/youtube";

export async function POST() {
  try {
    return NextResponse.json({ results: await runDueUploads() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Otomasi gagal diperiksa." }, { status: 500 });
  }
}
