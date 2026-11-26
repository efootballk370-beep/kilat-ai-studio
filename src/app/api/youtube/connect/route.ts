import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { youtubeConfigured } from "@/lib/youtube";

export async function GET(request: Request) {
  const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!youtubeConfigured()) return NextResponse.redirect(new URL("/?youtube=not_configured#integrations", origin));
  const state = randomUUID();
  const redirectUri = `${origin}/api/youtube/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", process.env.YOUTUBE_CLIENT_ID!);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly");
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("include_granted_scopes", "true");
  auth.searchParams.set("state", state);
  const response = NextResponse.redirect(auth);
  response.cookies.set("laju_oauth_state", state, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), maxAge: 600, path: "/" });
  return response;
}
