import { getStudioState } from "@/lib/studio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getStudioState();
    return Response.json({ ok: true, database: "ready", projects: state.projects.length, ideas: state.ideas.length, engine: state.aiMode });
  } catch (error) {
    console.error("Studio healthcheck failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
