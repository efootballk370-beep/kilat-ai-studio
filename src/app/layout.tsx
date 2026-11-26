import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laju — Autonomous YouTube Shorts Studio",
  description: "Cari ide, tulis naskah, render video vertikal, dan jadwalkan publikasi YouTube Shorts dalam satu studio berbahasa Indonesia.",
  applicationName: "Laju",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Laju", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon/192", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#11130f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
