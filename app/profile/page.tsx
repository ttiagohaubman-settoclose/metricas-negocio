"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Client = {
  id: string;
  name: string;
  state: string;
  state_code: string;
  avatar_url: string | null;
};

export default function ProfilePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMyClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients((data.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        state: c.state,
        state_code: c.stateCode,
        avatar_url: c.avatarUrl,
      })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMyClients();
  }, []);

  async function handleUpload(clientId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Only images allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image too large (max 2MB)");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingId(clientId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);

      const res = await fetch("/api/profile/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setSuccess("Avatar updated successfully");
      setTimeout(() => setSuccess(""), 3000);
      loadMyClients();
    } catch (e: any) {
      setError(e.message);
    }
    setUploadingId(null);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "32px 80px",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <header style={{ marginBottom: 32 }}>
        <Link href="/" style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
          My Profile
        </h1>
        <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
          Update the profile picture of your client account
        </div>
      </header>

      {error && (
        <div style={{
          background: "rgba(255,80,80,0.1)",
          border: "1px solid rgba(255,80,80,0.3)",
          color: "#ff8080",
          padding: "10px 14px", borderRadius: 8,
          fontSize: 13, marginBottom: 16,
        }}>{error}</div>
      )}

      {success && (
        <div style={{
          background: "rgba(80,200,120,0.1)",
          border: "1px solid rgba(80,200,120,0.3)",
          color: "#80c878",
          padding: "10px 14px", borderRadius: 8,
          fontSize: 13, marginBottom: 16,
        }}>{success}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Loading...</div>
      ) : clients.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
          No clients assigned to your account.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clients.map((c) => (
            <ClientAvatarRow
              key={c.id}
              client={c}
              uploading={uploadingId === c.id}
              onUpload={(file) => handleUpload(c.id, file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientAvatarRow({ client, uploading, onUpload }: {
  client: Client;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 12,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {client.avatar_url ? (
          <img src={client.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
            {client.name.charAt(0)}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{client.name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
          {client.state} ({client.state_code})
        </div>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          style={{ display: "none" }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: uploading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Uploading..." : (client.avatar_url ? "Change" : "Upload")}
        </button>
      </div>
    </div>
  );
}