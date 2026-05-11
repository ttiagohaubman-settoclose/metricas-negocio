"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Incorrect email or password");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 20,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 32,
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <img
            src="/settoclose-logo-white.png"
            alt="SetToClose"
            style={{ height: 40, objectFit: "contain" }}
          />
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 8,
          color: "var(--ink)",
        }}>
         Sign in
        </h1>
        <p style={{
          fontSize: 13,
          color: "var(--ink-muted)",
          textAlign: "center",
          marginBottom: 28,
        }}>
          Enter your credentials to access the dashboard
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink-muted)",
              marginBottom: 6,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ink-muted)",
              marginBottom: 6,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.1)",
              border: "1px solid rgba(255,80,80,0.3)",
              color: "#ff8080",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontFamily: "inherit",
              transition: "opacity 0.15s ease",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{
          marginTop: 20,
          fontSize: 11,
          color: "var(--ink-dim)",
          textAlign: "center",
        }}>
          SetToClose Dashboard · v1.0
        </div>
      </div>
    </div>
  );
}