import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ideas } from "@/db/schema";
import { getStudioState } from "@/lib/studio";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: "fresh" | "used" | "archived" };
    if (!body.status || !["fresh", "used", "archived"].includes(body.status)) return NextResponse.json({ error: "Status ide tidak valid." }, { status: 400 });
    await db.update(ideas).set({ status: body.status }).where(eq(ideas.id, id));
    return NextResponse.json(await getStudioState());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ide gagal diperbarui." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  await db.delete(ideas).where(eq(ideas.id, id));
  return NextResponse.json(await getStudioState());
}
