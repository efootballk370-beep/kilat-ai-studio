import { NextResponse } from "next/server";
import { exchangeYouTubeCode } from "@/lib/youtube";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const savedState = request.headers.get("cookie")?.match(/(?:^|;\s*)laju_oauth_state=([^;]+)/)?.[1];
  const response = NextResponse.redirect(new URL("/?youtube=connected#integrations", origin));
  response.cookies.delete("laju_oauth_state");
  if (!code || !state || !savedState || state !== savedState) {
    response.headers.set("Location", new URL("/?youtube=invalid_state#integrations", origin).toString());
    return response;
  }
  try {
    await exchangeYouTubeCode(code, `${origin}/api/youtube/callback`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Koneksi gagal";
    response.headers.set("Location", new URL(`/?youtube=error&detail=${encodeURIComponent(message.slice(0, 180))}#integrations`, origin).toString());
    return response;
  }
}
