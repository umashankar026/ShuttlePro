"use client";
import React from "react";
import AuthForm from "../../../components/AuthForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <AuthForm mode="signup" />
    </main>
  );
}
