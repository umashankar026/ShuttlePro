 import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShuttlePro — Tournament Platform",
  description: "Premium real-time tournament management",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#00ff88",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-void text-slate-100 font-rajdhani">{children}</body>
    </html>
  );
}
