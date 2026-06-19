"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "../lib/supabase";

export default function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        await auth.signUp(email, password);
        setMessage({ type: "success", text: "Account created. Check your email to confirm." });
        router.push("/auth/login");
      } else {
        await auth.signIn(email, password);
        setMessage({ type: "success", text: "Signed in — redirecting..." });
        router.push("/");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const rateLimitMessage = message.includes("over_email_send_rate_limit")
        ? "Email send rate limit exceeded. Please wait a few minutes or use a different email."
        : message;
      setMessage({ type: "error", text: rateLimitMessage });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070e",
        color: "#e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 16px",
        fontFamily: "Rajdhani, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          display: "grid",
          gridTemplateColumns: "minmax(320px, 400px) 1fr",
          gap: "32px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(7,16,33,0.92), rgba(17,24,38,0.96))",
            padding: "36px",
            boxShadow: "0 30px 80px rgba(0,255,136,0.08)",
          }}
        >
          <div style={{ marginBottom: "32px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "999px",
                padding: "10px 18px",
                background: "rgba(0,255,136,0.08)",
                color: "#00ff88",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              ShuttlePro
            </span>
          </div>
          <h1 style={{ fontSize: "3rem", lineHeight: 1.05, margin: 0, fontWeight: 900 }}>
            {mode === "signup" ? "Create account" : "Welcome back"}
          </h1>
          <p style={{ marginTop: "18px", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.8 }}>
            Access your tournament dashboard with clean, consistent ShuttlePro styling.
          </p>

          <div
            style={{
              marginTop: "36px",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              padding: "24px",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "0.75rem", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "12px" }}>
              Benefits
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1", lineHeight: 1.8, fontSize: "0.95rem" }}>
              <li>View live match scores</li>
              <li>Manage teams and fixtures</li>
              <li>Receive real-time tournament notifications</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(9,14,30,0.95)",
            padding: "36px",
            boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "32px" }}>
            <div>
              <div style={{ textTransform: "uppercase", letterSpacing: "0.3em", color: "#94a3b8", fontSize: "0.75rem", marginBottom: "10px" }}>
                {mode === "signup" ? "New user" : "Returning user"}
              </div>
              <h2 style={{ fontSize: "2rem", margin: 0, color: "#f8fafc" }}>
                {mode === "signup" ? "Sign up" : "Sign in"}
              </h2>
            </div>
            <div style={{ borderRadius: "999px", background: "rgba(0,255,136,0.12)", color: "#00ff88", padding: "10px 18px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
              {mode === "signup" ? "Register" : "Login"}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "10px", color: "#cbd5e1", fontWeight: 600 }}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "#071021",
                  color: "#e2e8f0",
                  padding: "14px 18px",
                  outline: "none",
                  fontSize: "1rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "10px", color: "#cbd5e1", fontWeight: 600 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "#071021",
                  color: "#e2e8f0",
                  padding: "14px 18px",
                  outline: "none",
                  fontSize: "1rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                borderRadius: "18px",
                border: "none",
                background: loading ? "rgba(0,255,136,0.4)" : "#00ff88",
                color: "#06120d",
                padding: "14px 18px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {loading ? (mode === "signup" ? "Creating account..." : "Signing in...") : (mode === "signup" ? "Create account" : "Sign in")}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: "24px",
                borderRadius: "18px",
                padding: "18px",
                fontSize: "0.95rem",
                lineHeight: 1.5,
                background: message.type === "error" ? "rgba(248,113,113,0.12)" : "rgba(34,197,94,0.12)",
                color: message.type === "error" ? "#fecaca" : "#bbf7d0",
                border: message.type === "error" ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(34,197,94,0.25)",
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ marginTop: "24px", textAlign: "center", color: "#94a3b8", fontSize: "0.95rem" }}>
            {mode === "signup" ? (
              <span>
                Already have an account? <Link href="/auth/login" style={{ color: "#00ff88", textDecoration: "none" }}>Sign in</Link>
              </span>
            ) : (
              <span>
                New here? <Link href="/auth/signup" style={{ color: "#00ff88", textDecoration: "none" }}>Create account</Link>
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: "24px",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              padding: "18px",
              color: "#94a3b8",
              fontSize: "0.9rem",
              lineHeight: 1.7,
            }}
          >
            <p>Use a different email if your last signup hit the Supabase email rate limit.</p>
            {mode === "signup" && <p style={{ marginTop: "10px" }}>Disable email confirmation in Supabase auth settings during development to avoid repeated email sends.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
