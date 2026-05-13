"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { META_METRICS_CATALOG, type MetaMetricDef } from "../lib/meta-metrics-catalog";

type Client = {
  id: string;
  name: string;
  state: string;
  state_code: string;
  avatar_url: string | null;
  ghl_location_id: string;
  ghl_tag: string;
  sale_value: number;
  fee_per_sale: number;
  active: boolean;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"clients" | "users" | "metrics">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (!error && data) setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      padding: "32px 80px",
      maxWidth: 1400,
      margin: "0 auto",
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
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
            Settings
          </h1>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
            Manage clients, users, and metrics
          </div>
        </div>
      </header>

      <div style={{
        display: "flex",
        gap: 4,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-strong)",
        borderRadius: 10,
        padding: 3,
        marginBottom: 24,
        width: "fit-content",
      }}>
        {[
          { id: "clients", label: "Clients" },
          { id: "users", label: "Users" },
          { id: "metrics", label: "Metrics" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? "var(--surface)" : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
              border: "none",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 7,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "clients" && (
        <ClientsTab clients={clients} loading={loading} onReload={loadClients} />
      )}
      {activeTab === "users" && <UsersTab clients={clients} />}
      {activeTab === "metrics" && <MetricsTab clients={clients} />}
    </div>
  );
}

function ClientsTab({ clients, loading, onReload }: { clients: Client[]; loading: boolean; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 14 }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "var(--ink-muted)" }}>
          {clients.length} active {clients.length === 1 ? "client" : "clients"}
        </div>
        <button
          onClick={() => { setEditingClient(null); setShowForm(true); }}
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add client
        </button>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)" }}>
              <th style={thStyle}>Client</th>
              <th style={thStyle}>State</th>
              <th style={thStyle}>GHL Tag</th>
              <th style={thStyle}>Sale Value</th>
              <th style={thStyle}>Fee</th>
              <th style={{ ...thStyle, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "var(--border-strong)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 13, color: "var(--ink)",
                    }}>
                      {c.name.charAt(0)}
                    </div>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: "var(--ink-muted)" }}>{c.state} ({c.state_code})</td>
                <td style={{ ...tdStyle, color: "var(--ink-muted)", fontFamily: "monospace", fontSize: 11 }}>{c.ghl_tag}</td>
                <td style={tdStyle}>${c.sale_value.toLocaleString()}</td>
                <td style={tdStyle}>${c.fee_per_sale.toLocaleString()}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => { setEditingClient(c); setShowForm(true); }}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-strong)",
                      color: "var(--ink-muted)",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
            No clients yet. Click "Add client" to create one.
          </div>
        )}
      </div>

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onReload(); }}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--ink-muted)",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "var(--ink)",
};

function ClientFormModal({ client, onClose, onSaved }: { client: Client | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: client?.name || "",
    state: client?.state || "",
    state_code: client?.state_code || "",
    ghl_location_id: client?.ghl_location_id || "",
    ghl_tag: client?.ghl_tag || "",
    calendar_english_id: "",
    calendar_spanish_id: "",
    sale_value: client?.sale_value || 0,
    fee_per_sale: client?.fee_per_sale || 0,
    active: client?.active ?? true,
  });
  const [adAccounts, setAdAccounts] = useState<{ ad_account_id: string; label: string; is_default: boolean }[]>([
    { ad_account_id: "", label: "Cuenta principal", is_default: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(client?.avatar_url || null);

  useEffect(() => {
    async function loadFullData() {
      if (!client) return;

      const { data } = await supabase.from("clients").select("*").eq("id", client.id).single();
      if (data) {
        setForm({
          name: data.name,
          state: data.state,
          state_code: data.state_code,
          ghl_location_id: data.ghl_location_id,
          ghl_tag: data.ghl_tag,
          calendar_english_id: data.calendar_english_id || "",
          calendar_spanish_id: data.calendar_spanish_id || "",
          sale_value: data.sale_value,
          fee_per_sale: data.fee_per_sale,
          active: data.active,
        });
      }

      const { data: accts } = await supabase.from("ad_accounts").select("*").eq("client_id", client.id);
      if (accts && accts.length > 0) {
        setAdAccounts(accts.map((a) => ({ ad_account_id: a.ad_account_id, label: a.label, is_default: a.is_default })));
      }
    }
    loadFullData();
  }, [client]);

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      let clientId = client?.id;

      if (client) {
        const { error: e } = await supabase.from("clients").update(form).eq("id", client.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from("clients").insert(form).select().single();
        if (e) throw e;
        clientId = data.id;
      }

      if (clientId) {
        await supabase.from("ad_accounts").delete().eq("client_id", clientId);
        const validAccounts = adAccounts.filter((a) => a.ad_account_id.trim() !== "");
        if (validAccounts.length > 0) {
          await supabase.from("ad_accounts").insert(
            validAccounts.map((a) => ({ ...a, client_id: clientId }))
          );
        }
      }

      onSaved();
    } catch (e: any) {
      setError(e.message || "Error saving");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Are you sure you want to delete ${client.name}? This cannot be undone.`)) return;

    setSaving(true);
    const { error: e } = await supabase.from("clients").delete().eq("id", client.id);
    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }
    onSaved();
  }

  function updateAdAccount(index: number, key: string, value: any) {
    const next = [...adAccounts];
    (next[index] as any)[key] = value;

    if (key === "is_default" && value === true) {
      next.forEach((a, i) => { if (i !== index) a.is_default = false; });
    }

    setAdAccounts(next);
  }

  function addAdAccount() {
    setAdAccounts([...adAccounts, { ad_account_id: "", label: `Cuenta ${adAccounts.length + 1}`, is_default: false }]);
  }

  function removeAdAccount(index: number) {
    setAdAccounts(adAccounts.filter((_, i) => i !== index));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{client ? "Edit client" : "Add client"}</div>
            <div className="modal-subtitle">{client ? "Update client information" : "Create a new client in the agency"}</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AvatarUploader
            clientId={client?.id}
            currentUrl={avatarUrl}
            onUploaded={(url: string) => setAvatarUrl(url)}
            uploading={uploading}
            setUploading={setUploading}
          />
          <Field label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="Client full name" />

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Field label="State" value={form.state} onChange={(v: string) => setForm({ ...form, state: v })} placeholder="South Carolina" />
            <Field label="State Code" value={form.state_code} onChange={(v: string) => setForm({ ...form, state_code: v.toUpperCase() })} placeholder="SC" />
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={sectionLabelStyle}>GHL (GoHighLevel)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Location ID" value={form.ghl_location_id} onChange={(v: string) => setForm({ ...form, ghl_location_id: v })} placeholder="EiZQnibRq2k2C21iyxmd" />
              <Field label="Tag (lead identifier)" value={form.ghl_tag} onChange={(v: string) => setForm({ ...form, ghl_tag: v })} placeholder="sc leads - a&y" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Calendar English ID" value={form.calendar_english_id} onChange={(v: string) => setForm({ ...form, calendar_english_id: v })} placeholder="ksBZDfOVUbwMlL6c0AgH" />
                <Field label="Calendar Spanish ID" value={form.calendar_spanish_id} onChange={(v: string) => setForm({ ...form, calendar_spanish_id: v })} placeholder="2Gja6y6mmj4V3W0CWVd9" />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={sectionLabelStyle}>Meta Ad Accounts</div>
              <button onClick={addAdAccount} style={{
                background: "transparent", border: "1px solid var(--border-strong)",
                color: "var(--ink)", padding: "4px 10px", borderRadius: 6,
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>+ Add account</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {adAccounts.map((acc, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 8, alignItems: "center" }}>
                  <input
                    value={acc.label}
                    onChange={(e) => updateAdAccount(i, "label", e.target.value)}
                    placeholder="Label"
                    style={inputStyle}
                  />
                  <input
                    value={acc.ad_account_id}
                    onChange={(e) => updateAdAccount(i, "ad_account_id", e.target.value)}
                    placeholder="act_123456789"
                    style={inputStyle}
                  />
                  <label style={{ fontSize: 11, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      checked={acc.is_default}
                      onChange={() => updateAdAccount(i, "is_default", true)}
                    />
                    Default
                  </label>
                  {adAccounts.length > 1 && (
                    <button onClick={() => removeAdAccount(i)} style={{
                      background: "transparent", border: "1px solid var(--border-strong)",
                      color: "var(--ink-muted)", width: 28, height: 28, borderRadius: 6,
                      cursor: "pointer", fontFamily: "inherit", fontSize: 14,
                    }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sale Value (USD)" type="number" value={String(form.sale_value)} onChange={(v: string) => setForm({ ...form, sale_value: Number(v) })} placeholder="3000" />
            <Field label="Fee per Sale (USD)" type="number" value={String(form.fee_per_sale)} onChange={(v: string) => setForm({ ...form, fee_per_sale: Number(v) })} placeholder="750" />
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff8080",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 12,
            marginTop: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div>
            {client && (
              <button onClick={handleDelete} disabled={saving} style={{
                background: "transparent",
                border: "1px solid rgba(255,80,80,0.4)",
                color: "#ff8080",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{
              background: "transparent",
              border: "1px solid var(--border-strong)",
              color: "var(--ink-muted)",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving..." : (client ? "Save changes" : "Create client")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ink-muted)",
  marginBottom: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "var(--ink)",
  fontFamily: "inherit",
  outline: "none",
};

function Field({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "var(--ink-muted)",
        marginBottom: 6,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

// ============================================================ USERS TAB ============================================================
type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  client_ids: string[];
  created_at: string;
};

function UsersTab({ clients }: { clients: Client[] }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 14 }}>Loading users...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, color: "var(--ink-muted)" }}>
          {users.length} {users.length === 1 ? "user" : "users"}
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add user
        </button>
      </div>

      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Assigned clients</th>
              <th style={{ ...thStyle, width: 100 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const assignedClients = clients.filter((c) => u.client_ids.includes(c.id));
              return (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{u.full_name || "—"}</div>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--ink-muted)" }}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      background: u.role === "admin" ? "var(--ink)" : "var(--bg-elevated)",
                      color: u.role === "admin" ? "var(--bg)" : "var(--ink-muted)",
                      border: u.role === "admin" ? "none" : "1px solid var(--border-strong)",
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--ink-muted)", fontSize: 12 }}>
                    {u.role === "admin" ? "All (admin)" : (assignedClients.length > 0 ? assignedClients.map((c) => c.name).join(", ") : "—")}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => { setEditingUser(u); setShowForm(true); }}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-strong)",
                        color: "var(--ink-muted)",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
            No users yet.
          </div>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          clients={clients}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, clients, onClose, onSaved }: { user: UserRow | null; clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    email: user?.email || "",
    password: "",
    full_name: user?.full_name || "",
    role: user?.role || "client",
    client_ids: user?.client_ids || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleClient(clientId: string) {
    if (form.client_ids.includes(clientId)) {
      setForm({ ...form, client_ids: form.client_ids.filter((c) => c !== clientId) });
    } else {
      setForm({ ...form, client_ids: [...form.client_ids, clientId] });
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      if (user) {
        const body: any = {
          user_id: user.id,
          full_name: form.full_name,
          role: form.role,
          client_ids: form.client_ids,
        };
        if (form.password.trim()) body.password = form.password;

        const res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error updating user");
      } else {
        if (!form.password.trim()) {
          setError("Password is required for new users");
          setSaving(false);
          return;
        }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error creating user");
      }

      onSaved();
    } catch (e: any) {
      setError(e.message || "Error saving");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users?user_id=${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error deleting user");
      onSaved();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{user ? "Edit user" : "Add user"}</div>
            <div className="modal-subtitle">{user ? "Update user information and access" : "Create a new user account"}</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Full name" value={form.full_name} onChange={(v: string) => setForm({ ...form, full_name: v })} placeholder="John Doe" />

          <Field label="Email" type="email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="user@example.com" />

          <Field
            label={user ? "Password (leave empty to keep current)" : "Password"}
            type="password"
            value={form.password}
            onChange={(v: string) => setForm({ ...form, password: v })}
            placeholder="••••••••"
          />

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--ink-muted)", marginBottom: 6,
            }}>
              Role
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {["client", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  style={{
                    flex: 1,
                    background: form.role === r ? "var(--ink)" : "transparent",
                    color: form.role === r ? "var(--bg)" : "var(--ink-muted)",
                    border: "1px solid " + (form.role === r ? "var(--ink)" : "var(--border-strong)"),
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {form.role === "client" && (
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ink-muted)", marginBottom: 8,
              }}>
                Assigned clients
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {clients.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>No clients available</div>
                )}
                {clients.map((c) => (
                  <label key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                  }}>
                    <input
                      type="checkbox"
                      checked={form.client_ids.includes(c.id)}
                      onChange={() => toggleClient(c.id)}
                    />
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ color: "var(--ink-muted)", fontSize: 11, marginLeft: "auto" }}>{c.state_code}</div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff8080",
            padding: "10px 12px",
            borderRadius: 8,
            fontSize: 12,
            marginTop: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div>
            {user && (
              <button onClick={handleDelete} disabled={saving} style={{
                background: "transparent",
                border: "1px solid rgba(255,80,80,0.4)",
                color: "#ff8080",
                padding: "10px 16px",
                borderRadius: 8,
                fontSize: 13,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                fontWeight: 500,
              }}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{
              background: "transparent",
              border: "1px solid var(--border-strong)",
              color: "var(--ink-muted)",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              background: "var(--ink)",
              color: "var(--bg)",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving..." : (user ? "Save changes" : "Create user")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
// ============================================================ METRICS TAB ============================================================
type CustomMetric = {
  metric_id: string;
  label: string;
  formula: string;
  format: string;
  lower_better: boolean;
  category: string;
};

type ScopeOption = {
  scope: "agency" | "ad_account";
  id?: string;
  label: string;
};

function MetricsTab({ clients }: { clients: Client[] }) {
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [selectedScopeKey, setSelectedScopeKey] = useState<string>("agency");
  const [activeMetricDefs, setActiveMetricDefs] = useState<string[]>([]);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showAddMetaField, setShowAddMetaField] = useState(false);
  const [showCustomMetricForm, setShowCustomMetricForm] = useState<CustomMetric | "new" | null>(null);

  useEffect(() => {
    async function loadScopes() {
      const { data } = await supabase
        .from("ad_accounts")
        .select("*, clients(id, name)")
        .order("label");
      const opts: ScopeOption[] = [{ scope: "agency", label: "Vista Agencia (consolidado)" }];
      (data || []).forEach((acc: any) => {
        opts.push({
          scope: "ad_account",
          id: acc.id,
          label: `${acc.clients?.name} — ${acc.label}`,
        });
      });
      setScopes(opts);
    }
    loadScopes();
  }, []);

  useEffect(() => {
    if (scopes.length === 0) return;
    async function loadConfig() {
      setLoading(true);
      try {
        const parts = selectedScopeKey.split(":");
        const scope = parts[0];
        const id = parts[1];
        const qs = scope === "agency" ? "scope=agency" : `scope=ad_account&id=${id}`;
        const res = await fetch(`/api/admin/metrics?${qs}`);
        const data = await res.json();
        setActiveMetricDefs(data.metric_ids || []);
        setCustomMetrics((data.custom_metrics || []).map((c: any) => ({
          metric_id: c.metric_id,
          label: c.label,
          formula: c.formula,
          format: c.format || "number",
          lower_better: c.lower_better || false,
          category: c.category || "Custom",
        })));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    loadConfig();
  }, [selectedScopeKey, scopes.length]);

  function toggleMetric(MetricDef: string) {
    if (activeMetricDefs.includes(MetricDef)) {
      setActiveMetricDefs(activeMetricDefs.filter((id) => id !== MetricDef));
    } else {
      setActiveMetricDefs([...activeMetricDefs, MetricDef]);
    }
  }

  function moveActive(index: number, direction: -1 | 1) {
    const next = [...activeMetricDefs];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= next.length) return;
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setActiveMetricDefs(next);
  }

  function addCustomMetaField(fieldId: string) {
    if (!fieldId.trim()) return;
    const id = fieldId.trim();
    if (!activeMetricDefs.includes(id)) setActiveMetricDefs([...activeMetricDefs, id]);
    setShowAddMetaField(false);
  }

  function saveCustomMetric(cm: CustomMetric, isNew: boolean) {
    if (isNew) setCustomMetrics([...customMetrics, cm]);
    else setCustomMetrics(customMetrics.map((c) => c.metric_id === cm.metric_id ? cm : c));
    setShowCustomMetricForm(null);
  }

  function deleteCustomMetric(MetricDef: string) {
    if (!confirm("Delete this custom metric?")) return;
    setCustomMetrics(customMetrics.filter((c) => c.metric_id !== MetricDef));
  }

  async function handleSave() {
    setSaving(true);
    setSavedMessage("");
    try {
      const parts = selectedScopeKey.split(":");
      const scope = parts[0];
      const id = parts[1];
      const res = await fetch("/api/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          id: id || null,
          metric_ids: activeMetricDefs,
          custom_metrics: customMetrics,
        }),
      });
      if (!res.ok) throw new Error("Error saving");
      setSavedMessage("Saved successfully");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (e: any) {
      setSavedMessage("Error: " + e.message);
    }
    setSaving(false);
  }

  const filteredCatalog = META_METRICS_CATALOG.filter((m) =>
    m.label.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, MetaMetricDef[]> = {};
  filteredCatalog.forEach((m) => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-muted)" }}>
        Choose which metrics to display. The order you select them is the order they'll appear in the dashboard. The first 8 appear as cards; the rest in "View all".
      </div>

      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <label style={{
          display: "block", fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: "var(--ink-muted)", marginBottom: 8,
        }}>Editing metrics for</label>
        <select
          value={selectedScopeKey}
          onChange={(e) => setSelectedScopeKey(e.target.value)}
          style={{
            width: "100%", background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)", borderRadius: 8,
            padding: "10px 12px", fontSize: 13, color: "var(--ink)",
            fontFamily: "inherit", outline: "none", cursor: "pointer",
          }}
        >
          {scopes.map((s) => {
            const key = s.scope === "agency" ? "agency" : `ad_account:${s.id}`;
            return <option key={key} value={key}>{s.label}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Loading...</div>
      ) : (
        <>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Active metrics ({activeMetricDefs.length + customMetrics.length})
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                First 8 = cards on dashboard
              </div>
            </div>

            {activeMetricDefs.length === 0 && customMetrics.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
                No metrics active yet. Add metrics from the catalog below.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeMetricDefs.map((id, index) => {
                  const def = META_METRICS_CATALOG.find((m) => m.id === id);
                  return (
                    <div key={id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: "var(--bg-elevated)",
                      border: "1px solid " + (index < 8 ? "var(--ink)" : "var(--border)"),
                      borderRadius: 8, fontSize: 13,
                    }}>
                      <div style={{
                        width: 24, fontSize: 10, fontWeight: 700,
                        color: index < 8 ? "var(--ink)" : "var(--ink-muted)",
                        textAlign: "center",
                      }}>{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {def?.label || id}
                          {!def && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", background: "var(--border)", color: "var(--ink-muted)", borderRadius: 4 }}>Custom Meta</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>
                          {id}{def ? ` · ${def.category}` : ""}
                        </div>
                      </div>
                      <button onClick={() => moveActive(index, -1)} disabled={index === 0} style={iconBtnStyle(index === 0)}>↑</button>
                      <button onClick={() => moveActive(index, 1)} disabled={index === activeMetricDefs.length - 1} style={iconBtnStyle(index === activeMetricDefs.length - 1)}>↓</button>
                      <button onClick={() => toggleMetric(id)} style={{
                        ...iconBtnStyle(false),
                        color: "#ff8080", borderColor: "rgba(255,80,80,0.4)",
                      }}>×</button>
                    </div>
                  );
                })}

                {customMetrics.map((cm) => (
                  <div key={cm.metric_id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", background: "var(--bg-elevated)",
                    border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
                  }}>
                    <div style={{ width: 24, fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textAlign: "center" }}>f(x)</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                        {cm.label}
                        <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", background: "var(--ink)", color: "var(--bg)", borderRadius: 4 }}>Custom</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>= {cm.formula}</div>
                    </div>
                    <button onClick={() => setShowCustomMetricForm(cm)} style={iconBtnStyle(false)}>Edit</button>
                    <button onClick={() => deleteCustomMetric(cm.metric_id)} style={{
                      ...iconBtnStyle(false),
                      color: "#ff8080", borderColor: "rgba(255,80,80,0.4)",
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => setShowAddMetaField(true)} style={{
                background: "transparent", border: "1px dashed var(--border-strong)",
                color: "var(--ink-muted)", padding: "8px 14px", borderRadius: 8,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>+ Add Meta metric not listed</button>
              <button onClick={() => setShowCustomMetricForm("new")} style={{
                background: "transparent", border: "1px dashed var(--border-strong)",
                color: "var(--ink-muted)", padding: "8px 14px", borderRadius: 8,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>+ Add custom metric (formula)</button>
            </div>
          </div>

          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Meta metrics catalog</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                  borderRadius: 8, padding: "8px 12px", fontSize: 12,
                  color: "var(--ink)", fontFamily: "inherit", outline: "none", width: 200,
                }}
              />
            </div>

            {Object.entries(grouped).map(([category, metrics]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "var(--ink-dim)", marginBottom: 8,
                }}>{category}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                  {metrics.map((m) => {
                    const checked = activeMetricDefs.includes(m.id);
                    return (
                      <label key={m.id} title={m.description || ""} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        background: checked ? "var(--bg-elevated)" : "transparent",
                        border: "1px solid " + (checked ? "var(--ink)" : "var(--border)"),
                        borderRadius: 8, cursor: "pointer", fontSize: 13,
                        transition: "all 0.1s ease",
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleMetric(m.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: checked ? 600 : 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>{m.id}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCatalog.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
                No metrics match your search.
              </div>
            )}
          </div>

          <div style={{
            position: "sticky", bottom: 16, zIndex: 10,
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 12, padding: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 12, color: savedMessage.startsWith("Error") ? "#ff8080" : "var(--ink-muted)" }}>
              {savedMessage || `${activeMetricDefs.length + customMetrics.length} metrics configured`}
            </div>
            <button onClick={handleSave} disabled={saving} style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      )}

      {showAddMetaField && (
        <AddMetaFieldModal onClose={() => setShowAddMetaField(false)} onAdd={addCustomMetaField} />
      )}

      {showCustomMetricForm && (
        <CustomMetricFormModal
          initial={showCustomMetricForm === "new" ? null : showCustomMetricForm}
          existingIds={[...activeMetricDefs, ...customMetrics.map((c) => c.metric_id)]}
          onClose={() => setShowCustomMetricForm(null)}
          onSave={saveCustomMetric}
        />
      )}
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--border-strong)",
    color: "var(--ink-muted)",
    minWidth: 32, height: 28, padding: "0 8px", borderRadius: 6,
    fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", opacity: disabled ? 0.3 : 1,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

function AddMetaFieldModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fieldId: string) => void }) {
  const [fieldId, setFieldId] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Add Meta metric not listed</div>
            <div className="modal-subtitle">Enter a Meta API field name to track a metric not in our catalog</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            padding: 12, borderRadius: 8, fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.5,
          }}>
            ⚠️ The field name must match exactly what the Meta Marketing API expects.<br />
            Examples: <code>spend</code>, <code>cpc</code>, <code>video_30_sec_watched_actions</code>
          </div>

          <Field label="Meta API field name" value={fieldId} onChange={setFieldId} placeholder="e.g. video_30_sec_watched_actions" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)", padding: "10px 16px", borderRadius: 8,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            onClick={() => onAdd(fieldId)}
            disabled={!fieldId.trim()}
            style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: !fieldId.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: !fieldId.trim() ? 0.4 : 1,
            }}
          >Add metric</button>
        </div>
      </div>
    </div>
  );
}

function CustomMetricFormModal({ initial, existingIds, onClose, onSave }: {
  initial: CustomMetric | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (cm: CustomMetric, isNew: boolean) => void;
}) {
  const isEditing = !!initial;
  const [form, setForm] = useState<CustomMetric>(initial || {
    metric_id: "", label: "", formula: "",
    format: "number", lower_better: false, category: "Custom",
  });
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    if (!form.metric_id.trim()) { setError("ID is required"); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.metric_id)) {
      setError("ID must be snake_case: letters, numbers, underscore"); return;
    }
    if (!form.label.trim()) { setError("Label is required"); return; }
    if (!form.formula.trim()) { setError("Formula is required"); return; }
    const safe = form.formula.replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9_+\-*/().]+$/.test(safe)) {
      setError("Formula contains invalid characters. Only letters, numbers, _ + - * / ( )"); return;
    }
    if (!isEditing && existingIds.includes(form.metric_id)) {
      setError("A metric with this ID already exists"); return;
    }
    onSave(form, !isEditing);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEditing ? "Edit custom metric" : "Create custom metric"}</div>
            <div className="modal-subtitle">Define a metric calculated from existing metrics</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ID (snake_case)" value={form.metric_id} onChange={(v: string) => setForm({ ...form, metric_id: v })} placeholder="cost_per_sale" />
            <Field label="Display label" value={form.label} onChange={(v: string) => setForm({ ...form, label: v })} placeholder="Cost per sale" />
          </div>

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--ink-muted)", marginBottom: 6,
            }}>Formula</label>
            <input
              value={form.formula}
              onChange={(e) => setForm({ ...form, formula: e.target.value })}
              placeholder="spend / leads"
              style={{
                width: "100%", background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)", borderRadius: 8,
                padding: "10px 12px", fontSize: 13, color: "var(--ink)",
                fontFamily: "monospace", outline: "none",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 6, lineHeight: 1.5 }}>
              Use metric IDs from the catalog with operators + - * / and parentheses.<br />
              Examples: <code>spend / leads</code>, <code>(spend + 100) / purchases</code>, <code>leads / linkClicks * 100</code>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ink-muted)", marginBottom: 6,
              }}>Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                style={{
                  width: "100%", background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)", borderRadius: 8,
                  padding: "10px 12px", fontSize: 13, color: "var(--ink)",
                  fontFamily: "inherit", outline: "none", cursor: "pointer",
                }}
              >
                <option value="number">Number (1,234)</option>
                <option value="currency">Currency ($1,234)</option>
                <option value="currency2">Currency 2 dec ($12.34)</option>
                <option value="percent">Percentage (12.34%)</option>
                <option value="decimal">Decimal (1.23)</option>
              </select>
            </div>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ink-muted)", marginBottom: 6,
              }}>Lower is better?</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { v: false, label: "No" },
                  { v: true, label: "Yes" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => setForm({ ...form, lower_better: o.v })}
                    style={{
                      flex: 1,
                      background: form.lower_better === o.v ? "var(--ink)" : "transparent",
                      color: form.lower_better === o.v ? "var(--bg)" : "var(--ink-muted)",
                      border: "1px solid " + (form.lower_better === o.v ? "var(--ink)" : "var(--border-strong)"),
                      padding: "10px 8px", borderRadius: 8,
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >{o.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff8080", padding: "10px 12px", borderRadius: 8,
            fontSize: 12, marginTop: 16,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)", padding: "10px 16px", borderRadius: 8,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            background: "var(--ink)", color: "var(--bg)", border: "none",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{isEditing ? "Save changes" : "Create metric"}</button>
        </div>
      </div>
    </div>
  );
}
}
// ============================================================ METRICS TAB ============================================================
type CustomMetric = {
  metric_id: string;
  label: string;
  formula: string;
  format: string;
  lower_better: boolean;
  category: string;
};

type ScopeOption = {
  scope: "agency" | "ad_account";
  id?: string;
  label: string;
};

function MetricsTab({ clients }: { clients: Client[] }) {
  const [scopes, setScopes] = useState<ScopeOption[]>([]);
  const [selectedScopeKey, setSelectedScopeKey] = useState<string>("agency");
  const [activeMetricDefs, setActiveMetricDefs] = useState<string[]>([]);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showAddMetaField, setShowAddMetaField] = useState(false);
  const [showCustomMetricForm, setShowCustomMetricForm] = useState<CustomMetric | "new" | null>(null);

  useEffect(() => {
    async function loadScopes() {
      const { data } = await supabase
        .from("ad_accounts")
        .select("*, clients(id, name)")
        .order("label");
      const opts: ScopeOption[] = [{ scope: "agency", label: "Vista Agencia (consolidado)" }];
      (data || []).forEach((acc: any) => {
        opts.push({
          scope: "ad_account",
          id: acc.id,
          label: `${acc.clients?.name} — ${acc.label}`,
        });
      });
      setScopes(opts);
    }
    loadScopes();
  }, []);

  useEffect(() => {
    if (scopes.length === 0) return;
    async function loadConfig() {
      setLoading(true);
      try {
        const parts = selectedScopeKey.split(":");
        const scope = parts[0];
        const id = parts[1];
        const qs = scope === "agency" ? "scope=agency" : `scope=ad_account&id=${id}`;
        const res = await fetch(`/api/admin/metrics?${qs}`);
        const data = await res.json();
        setActiveMetricDefs(data.metric_ids || []);
        setCustomMetrics((data.custom_metrics || []).map((c: any) => ({
          metric_id: c.metric_id,
          label: c.label,
          formula: c.formula,
          format: c.format || "number",
          lower_better: c.lower_better || false,
          category: c.category || "Custom",
        })));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    loadConfig();
  }, [selectedScopeKey, scopes.length]);

  function toggleMetric(MetricDef: string) {
    if (activeMetricDefs.includes(MetricDef)) {
      setActiveMetricDefs(activeMetricDefs.filter((id) => id !== MetricDef));
    } else {
      setActiveMetricDefs([...activeMetricDefs, MetricDef]);
    }
  }

  function moveActive(index: number, direction: -1 | 1) {
    const next = [...activeMetricDefs];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= next.length) return;
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setActiveMetricDefs(next);
  }

  function addCustomMetaField(fieldId: string) {
    if (!fieldId.trim()) return;
    const id = fieldId.trim();
    if (!activeMetricDefs.includes(id)) setActiveMetricDefs([...activeMetricDefs, id]);
    setShowAddMetaField(false);
  }

  function saveCustomMetric(cm: CustomMetric, isNew: boolean) {
    if (isNew) setCustomMetrics([...customMetrics, cm]);
    else setCustomMetrics(customMetrics.map((c) => c.metric_id === cm.metric_id ? cm : c));
    setShowCustomMetricForm(null);
  }

  function deleteCustomMetric(MetricDef: string) {
    if (!confirm("Delete this custom metric?")) return;
    setCustomMetrics(customMetrics.filter((c) => c.metric_id !== MetricDef));
  }

  async function handleSave() {
    setSaving(true);
    setSavedMessage("");
    try {
      const parts = selectedScopeKey.split(":");
      const scope = parts[0];
      const id = parts[1];
      const res = await fetch("/api/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          id: id || null,
          metric_ids: activeMetricDefs,
          custom_metrics: customMetrics,
        }),
      });
      if (!res.ok) throw new Error("Error saving");
      setSavedMessage("Saved successfully");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (e: any) {
      setSavedMessage("Error: " + e.message);
    }
    setSaving(false);
  }

  const filteredCatalog = META_METRICS_CATALOG.filter((m) =>
    m.label.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const grouped: Record<string, MetaMetricDef[]> = {};
  filteredCatalog.forEach((m) => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-muted)" }}>
        Choose which metrics to display. The order you select them is the order they'll appear in the dashboard. The first 8 appear as cards; the rest in "View all".
      </div>

      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <label style={{
          display: "block", fontSize: 11, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.06em",
          color: "var(--ink-muted)", marginBottom: 8,
        }}>Editing metrics for</label>
        <select
          value={selectedScopeKey}
          onChange={(e) => setSelectedScopeKey(e.target.value)}
          style={{
            width: "100%", background: "var(--bg-elevated)",
            border: "1px solid var(--border-strong)", borderRadius: 8,
            padding: "10px 12px", fontSize: 13, color: "var(--ink)",
            fontFamily: "inherit", outline: "none", cursor: "pointer",
          }}
        >
          {scopes.map((s) => {
            const key = s.scope === "agency" ? "agency" : `ad_account:${s.id}`;
            return <option key={key} value={key}>{s.label}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Loading...</div>
      ) : (
        <>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Active metrics ({activeMetricDefs.length + customMetrics.length})
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                First 8 = cards on dashboard
              </div>
            </div>

            {activeMetricDefs.length === 0 && customMetrics.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
                No metrics active yet. Add metrics from the catalog below.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeMetricDefs.map((id, index) => {
                  const def = META_METRICS_CATALOG.find((m) => m.id === id);
                  return (
                    <div key={id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: "var(--bg-elevated)",
                      border: "1px solid " + (index < 8 ? "var(--ink)" : "var(--border)"),
                      borderRadius: 8, fontSize: 13,
                    }}>
                      <div style={{
                        width: 24, fontSize: 10, fontWeight: 700,
                        color: index < 8 ? "var(--ink)" : "var(--ink-muted)",
                        textAlign: "center",
                      }}>{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {def?.label || id}
                          {!def && <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", background: "var(--border)", color: "var(--ink-muted)", borderRadius: 4 }}>Custom Meta</span>}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>
                          {id}{def ? ` · ${def.category}` : ""}
                        </div>
                      </div>
                      <button onClick={() => moveActive(index, -1)} disabled={index === 0} style={iconBtnStyle(index === 0)}>↑</button>
                      <button onClick={() => moveActive(index, 1)} disabled={index === activeMetricDefs.length - 1} style={iconBtnStyle(index === activeMetricDefs.length - 1)}>↓</button>
                      <button onClick={() => toggleMetric(id)} style={{
                        ...iconBtnStyle(false),
                        color: "#ff8080", borderColor: "rgba(255,80,80,0.4)",
                      }}>×</button>
                    </div>
                  );
                })}

                {customMetrics.map((cm) => (
                  <div key={cm.metric_id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", background: "var(--bg-elevated)",
                    border: "1px solid var(--border)", borderRadius: 8, fontSize: 13,
                  }}>
                    <div style={{ width: 24, fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", textAlign: "center" }}>f(x)</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>
                        {cm.label}
                        <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", background: "var(--ink)", color: "var(--bg)", borderRadius: 4 }}>Custom</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>= {cm.formula}</div>
                    </div>
                    <button onClick={() => setShowCustomMetricForm(cm)} style={iconBtnStyle(false)}>Edit</button>
                    <button onClick={() => deleteCustomMetric(cm.metric_id)} style={{
                      ...iconBtnStyle(false),
                      color: "#ff8080", borderColor: "rgba(255,80,80,0.4)",
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => setShowAddMetaField(true)} style={{
                background: "transparent", border: "1px dashed var(--border-strong)",
                color: "var(--ink-muted)", padding: "8px 14px", borderRadius: 8,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>+ Add Meta metric not listed</button>
              <button onClick={() => setShowCustomMetricForm("new")} style={{
                background: "transparent", border: "1px dashed var(--border-strong)",
                color: "var(--ink-muted)", padding: "8px 14px", borderRadius: 8,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>+ Add custom metric (formula)</button>
            </div>
          </div>

          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Meta metrics catalog</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
                  borderRadius: 8, padding: "8px 12px", fontSize: 12,
                  color: "var(--ink)", fontFamily: "inherit", outline: "none", width: 200,
                }}
              />
            </div>

            {Object.entries(grouped).map(([category, metrics]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.08em", color: "var(--ink-dim)", marginBottom: 8,
                }}>{category}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
                  {metrics.map((m) => {
                    const checked = activeMetricDefs.includes(m.id);
                    return (
                      <label key={m.id} title={m.description || ""} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px",
                        background: checked ? "var(--bg-elevated)" : "transparent",
                        border: "1px solid " + (checked ? "var(--ink)" : "var(--border)"),
                        borderRadius: 8, cursor: "pointer", fontSize: 13,
                        transition: "all 0.1s ease",
                      }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleMetric(m.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: checked ? 600 : 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: "var(--ink-dim)", fontFamily: "monospace" }}>{m.id}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCatalog.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>
                No metrics match your search.
              </div>
            )}
          </div>

          <div style={{
            position: "sticky", bottom: 16, zIndex: 10,
            background: "var(--surface)", border: "1px solid var(--border-strong)",
            borderRadius: 12, padding: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            <div style={{ fontSize: 12, color: savedMessage.startsWith("Error") ? "#ff8080" : "var(--ink-muted)" }}>
              {savedMessage || `${activeMetricDefs.length + customMetrics.length} metrics configured`}
            </div>
            <button onClick={handleSave} disabled={saving} style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      )}

      {showAddMetaField && (
        <AddMetaFieldModal onClose={() => setShowAddMetaField(false)} onAdd={addCustomMetaField} />
      )}

      {showCustomMetricForm && (
        <CustomMetricFormModal
          initial={showCustomMetricForm === "new" ? null : showCustomMetricForm}
          existingIds={[...activeMetricDefs, ...customMetrics.map((c) => c.metric_id)]}
          onClose={() => setShowCustomMetricForm(null)}
          onSave={saveCustomMetric}
        />
      )}
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "transparent",
    border: "1px solid var(--border-strong)",
    color: "var(--ink-muted)",
    minWidth: 32, height: 28, padding: "0 8px", borderRadius: 6,
    fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", opacity: disabled ? 0.3 : 1,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

function AddMetaFieldModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fieldId: string) => void }) {
  const [fieldId, setFieldId] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Add Meta metric not listed</div>
            <div className="modal-subtitle">Enter a Meta API field name to track a metric not in our catalog</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            padding: 12, borderRadius: 8, fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.5,
          }}>
            ⚠️ The field name must match exactly what the Meta Marketing API expects.<br />
            Examples: <code>spend</code>, <code>cpc</code>, <code>video_30_sec_watched_actions</code>
          </div>

          <Field label="Meta API field name" value={fieldId} onChange={setFieldId} placeholder="e.g. video_30_sec_watched_actions" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)", padding: "10px 16px", borderRadius: 8,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button
            onClick={() => onAdd(fieldId)}
            disabled={!fieldId.trim()}
            style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: !fieldId.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: !fieldId.trim() ? 0.4 : 1,
            }}
          >Add metric</button>
        </div>
      </div>
    </div>
  );
}

function CustomMetricFormModal({ initial, existingIds, onClose, onSave }: {
  initial: CustomMetric | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (cm: CustomMetric, isNew: boolean) => void;
}) {
  const isEditing = !!initial;
  const [form, setForm] = useState<CustomMetric>(initial || {
    metric_id: "", label: "", formula: "",
    format: "number", lower_better: false, category: "Custom",
  });
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    if (!form.metric_id.trim()) { setError("ID is required"); return; }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.metric_id)) {
      setError("ID must be snake_case: letters, numbers, underscore"); return;
    }
    if (!form.label.trim()) { setError("Label is required"); return; }
    if (!form.formula.trim()) { setError("Formula is required"); return; }
    const safe = form.formula.replace(/\s+/g, "");
    if (!/^[a-zA-Z0-9_+\-*/().]+$/.test(safe)) {
      setError("Formula contains invalid characters. Only letters, numbers, _ + - * / ( )"); return;
    }
    if (!isEditing && existingIds.includes(form.metric_id)) {
      setError("A metric with this ID already exists"); return;
    }
    onSave(form, !isEditing);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{isEditing ? "Edit custom metric" : "Create custom metric"}</div>
            <div className="modal-subtitle">Define a metric calculated from existing metrics</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ID (snake_case)" value={form.metric_id} onChange={(v: string) => setForm({ ...form, metric_id: v })} placeholder="cost_per_sale" />
            <Field label="Display label" value={form.label} onChange={(v: string) => setForm({ ...form, label: v })} placeholder="Cost per sale" />
          </div>

          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--ink-muted)", marginBottom: 6,
            }}>Formula</label>
            <input
              value={form.formula}
              onChange={(e) => setForm({ ...form, formula: e.target.value })}
              placeholder="spend / leads"
              style={{
                width: "100%", background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)", borderRadius: 8,
                padding: "10px 12px", fontSize: 13, color: "var(--ink)",
                fontFamily: "monospace", outline: "none",
              }}
            />
            <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 6, lineHeight: 1.5 }}>
              Use metric IDs from the catalog with operators + - * / and parentheses.<br />
              Examples: <code>spend / leads</code>, <code>(spend + 100) / purchases</code>, <code>leads / linkClicks * 100</code>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ink-muted)", marginBottom: 6,
              }}>Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                style={{
                  width: "100%", background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)", borderRadius: 8,
                  padding: "10px 12px", fontSize: 13, color: "var(--ink)",
                  fontFamily: "inherit", outline: "none", cursor: "pointer",
                }}
              >
                <option value="number">Number (1,234)</option>
                <option value="currency">Currency ($1,234)</option>
                <option value="currency2">Currency 2 dec ($12.34)</option>
                <option value="percent">Percentage (12.34%)</option>
                <option value="decimal">Decimal (1.23)</option>
              </select>
            </div>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--ink-muted)", marginBottom: 6,
              }}>Lower is better?</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { v: false, label: "No" },
                  { v: true, label: "Yes" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => setForm({ ...form, lower_better: o.v })}
                    style={{
                      flex: 1,
                      background: form.lower_better === o.v ? "var(--ink)" : "transparent",
                      color: form.lower_better === o.v ? "var(--bg)" : "var(--ink-muted)",
                      border: "1px solid " + (form.lower_better === o.v ? "var(--ink)" : "var(--border-strong)"),
                      padding: "10px 8px", borderRadius: 8,
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >{o.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff8080", padding: "10px 12px", borderRadius: 8,
            fontSize: 12, marginTop: 16,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)", padding: "10px 16px", borderRadius: 8,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            background: "var(--ink)", color: "var(--bg)", border: "none",
            padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{isEditing ? "Save changes" : "Create metric"}</button>
        </div>
      </div>
    </div>
  );
}
// ============================================================ AVATAR UPLOADER ============================================================
function AvatarUploader({ clientId, currentUrl, onUploaded, uploading, setUploading }: {
  clientId?: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  uploading: boolean;
  setUploading: (b: boolean) => void;
}) {
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!clientId) {
      setError("Save the client first, then upload the avatar.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);

      const res = await fetch("/api/admin/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUploaded(data.avatar_url);
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  }

  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em",
        color: "var(--ink-muted)", marginBottom: 6,
      }}>
        Avatar
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {currentUrl ? (
            <img src={currentUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" style={{ width: 28, height: 28 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !clientId}
            style={{
              background: "transparent",
              border: "1px solid var(--border-strong)",
              color: "var(--ink)",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              cursor: uploading || !clientId ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontWeight: 500,
              opacity: uploading || !clientId ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading..." : (currentUrl ? "Change image" : "Upload image")}
          </button>
          <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 6 }}>
            {!clientId ? "Save the client first before uploading an avatar." : "JPG, PNG · max 2MB"}
          </div>
          {error && (
            <div style={{
              background: "rgba(255,80,80,0.1)",
              border: "1px solid rgba(255,80,80,0.3)",
              color: "#ff8080",
              padding: "6px 10px",
              borderRadius: 6,
              fontSize: 11,
              marginTop: 6,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}