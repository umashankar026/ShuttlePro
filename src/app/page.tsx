"use client";
// src/app/page.tsx
// Entry point — splash once per session, then home (if authed) or login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useTournament";
import SplashScreen from "@/components/SplashScreen";
import BadmintonDashboard from "@/components/BadmintonDashboard";

function splashAlreadyShown(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem("sp_splash_shown");
}

function markSplashShown(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("sp_splash_shown", "1");
}

export default function HomePage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const [phase, setPhase] = useState<"splash" | "deciding" | "done">(
    splashAlreadyShown() ? "deciding" : "splash"
  );

  useEffect(() => {
    if (phase !== "splash") return;
    const timer = setTimeout(() => {
      markSplashShown();
      setPhase("deciding");
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "deciding") return;
    if (loading) return;
    if (profile) {
      setPhase("done");
    } else {
      router.push("/auth/login");
    }
  }, [phase, loading, profile, router]);

  if (phase === "splash") return <SplashScreen />;
  if (phase === "deciding" || !profile) return null;
  return <BadmintonDashboard />;
}
