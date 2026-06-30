"use client";
import React from "react";
import AuthForm from "../../../components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-void p-6">
      <AuthForm mode="signup" />
    </main>
  );
}
