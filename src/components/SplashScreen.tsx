"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ onDone }: { onDone?: () => void } = {}) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); return 100; }
        return p + 2;
      });
    }, 50);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("idle"), 800);
    const exitTimer = setTimeout(() => setPhase("exit"), 3200);
    const navTimer = setTimeout(() => onDone?.(), 4000);
    return () => { clearTimeout(enterTimer); clearTimeout(exitTimer); clearTimeout(navTimer); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? null : null}
      <motion.main
        className="min-h-screen bg-void flex flex-col items-center justify-center overflow-hidden"
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <motion.div
          initial={{ y: -120, rotate: -30, opacity: 0 }}
          animate={
            phase === "enter"
              ? { y: [null, 20, -10, 5, 0], rotate: [null, 10, -5, 2, 0], opacity: 1 }
              : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-7xl sm:text-8xl mb-6 select-none"
        >
          🏸
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
          className="text-4xl sm:text-5xl font-black font-orbitron text-white tracking-wide"
        >
          ShuttlePro
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-3 text-sm sm:text-base text-slate-500 uppercase tracking-[0.4em] font-rajdhani"
        >
          Badminton Tournament Platform
        </motion.p>

        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-12 h-1 rounded-full bg-slate-800 overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full bg-neon"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
          className="mt-4 text-xs text-slate-600 font-rajdhani tracking-widest uppercase"
        >
          Loading arena…
        </motion.p>
      </motion.main>
    </AnimatePresence>
  );
}
