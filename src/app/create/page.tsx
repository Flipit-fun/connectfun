"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface FormData {
  name: string;
  handle: string;
  description: string;
  categories: string[];
  visibility: "public" | "invite" | "private";
  color: string;
  avatar_url: string;
  banner_url: string;
}

const CATEGORIES = [
  "Memecoin", "DAO", "NFT Project", "DeFi", "GameFi",
  "Dev Tools", "Creator", "Social", "Startup", "Research", "Trading", "Layer 2",
];
const COLOR_SWATCHES = ["#1A1A1A", "#C8A96E", "#4A6FA5", "#6B8C42", "#8B5C42", "#7B5EA7"];
const STEPS = ["Identity", "Branding", "Discovery", "Launch"];

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 8 }}>{children}</div>;
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: i <= step ? "#1A1A1A" : "#E2E0D8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i < step ? <span style={{ color: "#fff", fontSize: 11 }}>✓</span> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#FAFAF7" }}>{i + 1}</span>}
            </div>
            {i < total - 1 && <div style={{ flex: 1, height: 1, background: i < step ? "#1A1A1A" : "#E2E0D8", margin: "0 4px" }} />}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase" as const, color: i === step ? "#1A1A1A" : "#C5C3BB", letterSpacing: "0.05em" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function ImageUpload({ label, value, onChange, aspect = "avatar" }: { label: string; value: string; onChange: (url: string) => void; aspect?: "avatar" | "banner" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("prefix", aspect === "avatar" ? "avatars" : "banners");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (data.url) onChange(data.url);
    setUploading(false);
  }

  const isAvatar = aspect === "avatar";
  const size = isAvatar ? { width: 96, height: 96, borderRadius: "50%" } : { width: "100%", height: 120, borderRadius: 4 };

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          ...size, border: "2px dashed #E2E0D8", background: value ? "transparent" : "#F4F3EE",
          display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
          cursor: "pointer", overflow: "hidden", position: "relative" as const,
        }}
      >
        {value ? (
          <img src={value} alt={label} style={{ ...size, objectFit: "cover" }} />
        ) : (
          <>
            <span style={{ fontSize: 20, marginBottom: 4 }}>↑</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#C5C3BB" }}>
              {uploading ? "Uploading..." : "Upload"}
            </span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}

/* ── Steps ─────────────────────────────────────────────── */
function StepIdentity({ data, onChange, validationError }: { data: FormData; onChange: (d: Partial<FormData>) => void; validationError?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Label>Community Name</Label>
        <input
          value={data.name}
          onChange={(e) => {
            const val = e.target.value;
            // Always produce a non-empty handle — fall back to timestamp slug if name is all special chars
            const raw = val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
            const handle = raw || data.handle;
            onChange({ name: val, handle });
          }}
          placeholder="What's it called?"
          style={{
            width: "100%", padding: "12px 0", background: "transparent",
            border: "none", borderBottom: `1px solid ${validationError ? "#FCA5A5" : "#E2E0D8"}`,
            fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 30,
            color: "#1A1A1A", outline: "none", boxSizing: "border-box" as const,
          }}
        />
        {validationError && (
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#C0392B", marginTop: 6 }}>
            {validationError}
          </div>
        )}
      </div>
      <div>
        <Label>Handle / Slug</Label>
        <div style={{ display: "flex", border: "1px solid #E2E0D8", borderRadius: 4, overflow: "hidden" }}>
          <span style={{ padding: "10px 14px", background: "#F4F3EE", borderRight: "1px solid #E2E0D8", fontFamily: "var(--font-mono)", fontSize: 13, color: "#999690", whiteSpace: "nowrap" as const }}>connect.app/</span>
          <input value={data.handle} onChange={(e) => onChange({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="your-community"
            style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 13, color: "#1A1A1A", background: "transparent", border: "none", outline: "none" }} />
        </div>
      </div>
      <div>
        <Label>Short Description</Label>
        <textarea value={data.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="What's this community about? One sentence." rows={3}
          style={{ width: "100%", padding: "10px 14px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", background: "#FAFAF7", border: "1px solid #E2E0D8", borderRadius: 4, outline: "none", resize: "none" as const, boxSizing: "border-box" as const }} />
      </div>
    </div>
  );
}

function StepBranding({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ImageUpload label="Profile Photo" value={data.avatar_url} onChange={(url) => onChange({ avatar_url: url })} aspect="avatar" />
      <ImageUpload label="Banner Image" value={data.banner_url} onChange={(url) => onChange({ banner_url: url })} aspect="banner" />
      <div>
        <Label>Primary Color</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
          {COLOR_SWATCHES.map((c) => (
            <button key={c} onClick={() => onChange({ color: c })} style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: data.color === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: data.color === c ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDiscovery({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <Label>Category (pick all that apply)</Label>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => onChange({ categories: data.categories.includes(cat) ? data.categories.filter((c) => c !== cat) : [...data.categories, cat] })}
              style={{ fontFamily: "var(--font-sans)", fontSize: 13, background: data.categories.includes(cat) ? "#1A1A1A" : "#F4F3EE", color: data.categories.includes(cat) ? "#FAFAF7" : "#1A1A1A", border: `1px solid ${data.categories.includes(cat) ? "#1A1A1A" : "#E2E0D8"}`, borderRadius: 6, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" as const }}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label>Visibility</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {(["public", "invite", "private"] as const).map((v) => {
            const labels = { public: "Public", invite: "Invite Only", private: "Private" };
            const descs = { public: "Anyone can join", invite: "Approval required", private: "Hidden from search" };
            const active = data.visibility === v;
            return (
              <button key={v} onClick={() => onChange({ visibility: v })} style={{ padding: "14px 16px", border: `1px solid ${active ? "#1A1A1A" : "#E2E0D8"}`, borderRadius: 4, background: active ? "#1A1A1A" : "#fff", textAlign: "left" as const, cursor: "pointer" }}>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: active ? "#FAFAF7" : "#1A1A1A" }}>{labels[v]}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", marginTop: 4 }}>{descs[v]}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepLaunch({ data, onLaunch, loading, error }: { data: FormData; onLaunch: () => void; loading: boolean; error: string | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 28, color: "#1A1A1A", margin: "0 0 6px" }}>Ready to go live?</h3>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690" }}>Review before launching</p>
      </div>

      {error && (
        <div style={{ background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 4, padding: "12px 16px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#B91C1C" }}>{error}</div>
      )}

      <div style={{ border: "1px solid #E2E0D8", borderRadius: 4, overflow: "hidden" }}>
        {[
          { label: "NAME", value: data.name || "—" },
          { label: "HANDLE", value: data.handle ? `connect.app/${data.handle}` : "—" },
          { label: "DESCRIPTION", value: data.description || "—" },
          { label: "CATEGORIES", value: data.categories.join(", ") || "—" },
          { label: "VISIBILITY", value: data.visibility.charAt(0).toUpperCase() + data.visibility.slice(1) },
          { label: "AVATAR", value: data.avatar_url ? "Uploaded ✓" : "None" },
          { label: "BANNER", value: data.banner_url ? "Uploaded ✓" : "None" },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{ display: "grid", gridTemplateColumns: "120px 1fr", borderBottom: i < arr.length - 1 ? "1px solid #E2E0D8" : "none" }}>
            <div style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", textTransform: "uppercase" as const, letterSpacing: "0.08em", background: "#F4F3EE", borderRight: "1px solid #E2E0D8", display: "flex", alignItems: "center" }}>{label}</div>
            <div style={{ padding: "12px 16px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A" }}>{value}</div>
          </div>
        ))}
      </div>

      <button onClick={onLaunch} disabled={loading || !data.name || !data.handle}
        style={{ width: "100%", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, background: loading ? "#999690" : "#1A1A1A", color: "#FAFAF7", border: "none", borderRadius: 4, padding: "14px", cursor: loading ? "default" : "pointer" }}>
        {loading ? "Launching..." : "Launch Community →"}
      </button>
    </div>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [data, setData] = useState<FormData>({
    name: "", handle: "", description: "",
    categories: [], visibility: "public",
    color: "#1A1A1A", avatar_url: "", banner_url: "",
  });

  function update(partial: Partial<FormData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  async function launch() {
    setLaunchError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!data.name || !data.handle) {
      setLaunchError("Name and handle are required.");
      return;
    }
    setLaunching(true);
    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      setLaunchError(result.error || "Failed to create community.");
      setLaunching(false);
      return;
    }
    router.push(`/app?community=${result.handle}`);
  }

  const stepComponents = [
    <StepIdentity key="identity" data={data} onChange={update} validationError={stepError || undefined} />,
    <StepBranding key="branding" data={data} onChange={update} />,
    <StepDiscovery key="discovery" data={data} onChange={update} />,
    <StepLaunch key="launch" data={data} onLaunch={launch} loading={launching} error={launchError} />,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid #E2E0D8", height: 56, display: "flex", alignItems: "center", padding: "0 40px", background: "#FAFAF7" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="Connect" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#1A1A1A" }}>Connect</span>
        </Link>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "64px 40px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 8 }}>New Community</div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 34, color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
              <span style={{ fontStyle: "normal" }}>Create your </span>
              <span style={{ fontStyle: "italic" }}>space.</span>
            </h1>
          </div>

          <ProgressBar step={step} total={STEPS.length} />
          <div style={{ marginBottom: 40 }}>{stepComponents[step]}</div>

          {step < STEPS.length - 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={() => { setStepError(null); setStep((s) => Math.max(0, s - 1)); }}
                disabled={step === 0}
                style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: step === 0 ? "#C5C3BB" : "#999690", background: "transparent", border: "1px solid #E2E0D8", borderRadius: 4, padding: "10px 20px", cursor: step === 0 ? "default" : "pointer" }}
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  // Validate step 0 before advancing
                  if (step === 0) {
                    if (!data.name.trim()) {
                      setStepError("Please enter a community name.");
                      return;
                    }
                    // Ensure handle has a value
                    if (!data.handle.trim()) {
                      const fallback = "community-" + Date.now().toString(36);
                      update({ handle: fallback });
                    }
                    setStepError(null);
                  }
                  setStep((s) => Math.min(STEPS.length - 1, s + 1));
                }}
                style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, background: "#1A1A1A", color: "#FAFAF7", border: "none", borderRadius: 4, padding: "10px 24px", cursor: "pointer" }}
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
