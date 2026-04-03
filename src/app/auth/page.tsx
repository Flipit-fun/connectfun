"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!username.trim()) {
          setError("Please choose a username.");
          setLoading(false);
          return;
        }
        // Store chosen username in metadata so it survives email confirmation
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          // Try to create profile immediately (works if email auto-confirm is on)
          const chosenUsername = username.trim();
          const { error: profileError } = await supabase
            .from("connect_profiles")
            .upsert(
              { id: data.user.id, username: chosenUsername, display_name: chosenUsername },
              { onConflict: "id" }
            );
          if (profileError) {
            console.warn("Profile upsert error:", profileError.message);
          }

          if (data.session) {
            // Email confirmation not required — go straight to app
            router.push("/app");
            router.refresh();
          } else {
            setSuccess(`Account created! Check your email to confirm, then sign in as @${chosenUsername}.`);
          }
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (data.user) {
          // Upsert profile using the username stored in metadata
          // This handles users who confirmed email but whose profile wasn't created yet
          const storedUsername = (data.user.user_metadata?.username as string) || email.split("@")[0];
          await supabase
            .from("connect_profiles")
            .upsert(
              { id: data.user.id, username: storedUsername, display_name: storedUsername },
              { onConflict: "id" }
            );
        }

        router.push("/app");
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF7", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid #E2E0D8", height: 56, display: "flex", alignItems: "center", padding: "0 40px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="Connect" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#1A1A1A" }}>Connect</span>
        </Link>
      </header>

      {/* Form */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Toggle */}
          <div style={{ display: "flex", gap: 0, marginBottom: 40, border: "1px solid #E2E0D8", borderRadius: 4, overflow: "hidden" }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                style={{
                  flex: 1, padding: "12px", border: "none", cursor: "pointer",
                  background: mode === m ? "#1A1A1A" : "#fff",
                  color: mode === m ? "#FAFAF7" : "#999690",
                  fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 15,
                }}
              >
                {m === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: "#1A1A1A", marginBottom: 32, lineHeight: 1.2 }}>
            {mode === "signin" ? (
              <><span style={{ fontStyle: "normal" }}>Welcome </span><span style={{ fontStyle: "italic" }}>back.</span></>
            ) : (
              <><span style={{ fontStyle: "normal" }}>Join </span><span style={{ fontStyle: "italic" }}>Connect.</span></>
            )}
          </h1>

          {/* Error / Success */}
          {error && (
            <div style={{ background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 4, padding: "12px 16px", marginBottom: 20, fontFamily: "var(--font-sans)", fontSize: 13, color: "#B91C1C" }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 4, padding: "12px 16px", marginBottom: 20, fontFamily: "var(--font-sans)", fontSize: 13, color: "#15803D" }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                  placeholder="your_handle"
                  required
                  style={{ width: "100%", padding: "11px 14px", fontFamily: "var(--font-mono)", fontSize: 13, color: "#1A1A1A", background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ width: "100%", padding: "11px 14px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                required
                minLength={8}
                style={{ width: "100%", padding: "11px 14px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                background: loading ? "#999690" : "#1A1A1A", color: "#FAFAF7",
                border: "none", borderRadius: 4, cursor: loading ? "default" : "pointer",
                marginTop: 8,
              }}
            >
              {loading ? "..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
