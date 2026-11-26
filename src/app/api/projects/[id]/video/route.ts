import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const rows = await db.select({ videoData: projects.videoData, renderMime: projects.renderMime, title: projects.title }).from(projects).where(eq(projects.id, id)).limit(1);
  const project = rows[0];
  if (!project?.videoData || !project.renderMime) return new Response("Video belum dirender", { status: 404 });
  const data = project.videoData;
  const range = request.headers.get("range");
  const download = new URL(request.url).searchParams.get("download") === "1";
  const common: Record<string, string> = {
    "Content-Type": project.renderMime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="laju-${id}.${project.renderMime === "video/mp4" ? "mp4" : "webm"}"`,
  };
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (match) {
      const start = Math.min(Number(match[1]), data.length - 1);
      const end = match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start <= end) {
        const chunk = data.subarray(start, end + 1);
        return new Response(new Uint8Array(chunk), { status: 206, headers: { ...common, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(chunk.length) } });
      }
    }
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
  }
  return new Response(new Uint8Array(data), { headers: { ...common, "Content-Length": String(data.length) } });
}
