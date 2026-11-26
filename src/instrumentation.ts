export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const globalForScheduler = globalThis as typeof globalThis & { __lajuScheduler?: NodeJS.Timeout };
  if (globalForScheduler.__lajuScheduler) return;
  const { runDueUploads } = await import("@/lib/youtube");
  globalForScheduler.__lajuScheduler = setInterval(() => {
    runDueUploads().catch((error) => console.error("Automation tick failed", error));
  }, 60_000);
  globalForScheduler.__lajuScheduler.unref();
}
