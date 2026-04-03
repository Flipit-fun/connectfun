"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUsername(user.email?.split("@")[0] ?? "you");
    });
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setUsername(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#FAFAF7", borderBottom: "1px solid #E2E0D8" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/logo.png" alt="Connect" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "#1A1A1A", letterSpacing: "-0.01em" }}>Connect</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[{ label: "Features", href: "/#features" }, { label: "How it works", href: "/#how-it-works" }, { label: "Explore", href: "/explore" }].map(({ label, href }) => (
            <Link key={label} href={href} style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690", textDecoration: "none" }}>{label}</Link>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="https://x.com/MyConnectApp" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", color: "#1A1A1A", textDecoration: "none", opacity: 0.8 }} className="hover-fade">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          
          {username ? (
            <>
              <Link href="/app" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1A1A1A", textDecoration: "none" }}>@{username}</Link>
              <button onClick={signOut} style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690", background: "transparent", border: "none", cursor: "pointer" }}>Sign out</button>
            </>
          ) : (
            <Link href="/auth" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690", textDecoration: "none" }}>Sign in</Link>
          )}
          <Link href="/create" style={{ textDecoration: "none" }}>
            <button style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, background: "#1A1A1A", color: "#FAFAF7", border: "1px solid #1A1A1A", borderRadius: 4, padding: "8px 16px", cursor: "pointer" }}>
              Create Community
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
