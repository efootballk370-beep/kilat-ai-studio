import { StudioApp } from "@/components/studio-app";
import { getStudioState } from "@/lib/studio";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const state = await getStudioState();
  return <StudioApp initialState={state} />;
}
