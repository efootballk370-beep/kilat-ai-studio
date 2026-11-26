import { ImageResponse } from "next/og";

type Context = { params: Promise<{ size: string }> };

export async function GET(_request: Request, context: Context) {
  const { size: rawSize } = await context.params;
  const size = Number(rawSize);
  if (![192, 512].includes(size)) return new Response("Ukuran ikon tidak tersedia", { status: 404 });
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: "#11130f", color: "#d9ff63", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", transform: `translateX(${-size * 0.025}px)`, fontSize: size * 0.54, fontWeight: 900, letterSpacing: `-${size * 0.075}px`, lineHeight: 1 }}>L/</div>
      <div style={{ position: "absolute", width: size * 0.065, height: size * 0.065, right: size * 0.15, top: size * 0.15, background: "#ff7657" }} />
    </div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}
