"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

/* ── Fade-up hook (robust, no SSR mismatch) ────────── */
function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ── Section fade wrapper ─────────────────────────── */
function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useFadeUp();
  return (
    <div
      ref={ref}
      className="fade-up"
      style={{ transitionDelay: `${delay * 100}ms`, ...style }}
    >
      {children}
    </div>
  );
}


/* ── Features ────────────────────────────────────────── */
const features = [
  { num: "01", label: "CREATION", name: "Community Creation", desc: "Name, photo, banner, category, bio. Live in minutes. No friction." },
  { num: "02", label: "ACCESS", name: "Role & Permission System", desc: "Owner, Mod, Member + custom roles with granular per-action control." },
  { num: "03", label: "DISCOVERY", name: "Category System", desc: "Memecoin, DAO, NFT, Gaming, Dev, Social — tagged and searchable." },
  { num: "04", label: "FEED", name: "Clean Chronological Feed", desc: "Posts and announcements. No algorithm. No noise. Just signal." },
  { num: "05", label: "INVITE", name: "Invite & Access Control", desc: "Shareable links, invite-only toggle, member approval queue." },
  { num: "06", label: "AI MODERATION", name: "Connect AI", desc: "AI detects spam, scam links, impersonators, and raids automatically. Keeps your community high-signal and safe from day one." },
];

const categories = [
  "Memecoin", "DAO", "NFT Project", "DeFi", "GameFi",
  "Dev Tools", "Creator", "Social", "Startup", "Research", "Trading", "Layer 2",
];


/* ── Main ─────────────────────────────────────────────── */
export function HomepageClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, [supabase]);

  return (
    <>
      {/* ── Section 1: Hero ────────────────────────────── */}
      <section style={{ background: "#FAFAF7", padding: "100px 0 120px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px", textAlign: "center" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <FadeUp>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(44px, 6vw, 76px)",
                  lineHeight: 1.05,
                  color: "#1A1A1A",
                  marginBottom: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                <span style={{ fontStyle: "normal" }}>The home your community</span>
                <br />
                <span style={{ fontStyle: "italic" }}>actually deserves.</span>
              </h1>
            </FadeUp>

            <FadeUp delay={1}>
              <hr style={{ border: "none", borderTop: "1px solid #E2E0D8", width: 80, margin: "40px auto" }} />
            </FadeUp>

            <FadeUp delay={2}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 19, color: "#999690", lineHeight: 1.6, maxWidth: 600, margin: "0 auto" }}>
                X removed communities. Telegram is spam. Connect gives your crypto
                project — or any project — a clean, structured, moderated space to grow.
              </p>
            </FadeUp>

            <FadeUp delay={3}>
              <div style={{ marginTop: 48, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                {isLoggedIn ? (
                  <>
                    <Link href="/app"><Button size="lg">Your Communities</Button></Link>
                    <Link href="/explore"><Button variant="ghost" size="lg">Explore More</Button></Link>
                  </>
                ) : (
                  <>
                    <Link href="/create"><Button size="lg">Create a Community</Button></Link>
                    <Link href="/explore"><Button variant="ghost" size="lg">Explore Communities</Button></Link>
                  </>
                )}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Section 2: Problem Bar ────────────────────── */}
      <section style={{ background: "#F4F3EE", borderTop: "1px solid #E2E0D8", borderBottom: "1px solid #E2E0D8" }}>
        <div
          style={{
            maxWidth: 1152, margin: "0 auto", padding: "0 40px",
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          }}
        >
          {[
            { platform: "X Communities", reality: "Removed. No warning. No replacement.", italic: false },
            { platform: "Telegram", reality: "Bots, spam, zero content structure.", italic: false },
            { platform: "Connect", reality: "Signal. Structure. Yours.", italic: true },
          ].map(({ platform, reality, italic }, i) => (
            <div
              key={platform}
              style={{
                padding: "28px 32px",
                borderRight: i < 2 ? "1px solid #E2E0D8" : "none",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                {platform}
              </div>
              <div
                style={{
                  fontFamily: italic ? "var(--font-serif)" : "var(--font-sans)",
                  fontStyle: italic ? "italic" : "normal",
                  fontSize: italic ? 17 : 14,
                  color: "#1A1A1A",
                  lineHeight: 1.5,
                }}
              >
                {reality}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Features ──────────────────────── */}
      <section id="features" style={{ background: "#FAFAF7", padding: "96px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px" }}>
          <FadeUp>
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Features
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 3vw, 40px)", color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
                <span style={{ fontStyle: "normal" }}>Everything you need.</span>{" "}
                <span style={{ fontStyle: "italic" }}>Nothing you don&apos;t.</span>
              </h2>
            </div>
          </FadeUp>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {features.map((f, i) => (
              <FadeUp key={f.num} delay={i % 3}>
                <div
                  className="card-hover"
                  style={{
                    background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4,
                    padding: "24px", height: "100%", display: "flex", flexDirection: "column", gap: 12,
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {f.num} / {f.label}
                  </div>
                  <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "#1A1A1A", lineHeight: 1.3 }}>
                    {f.name}
                  </div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690", lineHeight: 1.7 }}>
                    {f.desc}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: How It Works ──────────────────── */}
      <section id="how-it-works" style={{ background: "#F4F3EE", borderTop: "1px solid #E2E0D8", borderBottom: "1px solid #E2E0D8", padding: "96px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px" }}>
          <FadeUp>
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Process
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 3vw, 40px)", color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
                <span style={{ fontStyle: "normal" }}>Up and running</span>{" "}
                <span style={{ fontStyle: "italic" }}>in three steps.</span>
              </h2>
            </div>
          </FadeUp>

          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            {/* Dashed connector */}
            <div style={{ position: "absolute", top: 76, left: "16%", right: "16%", borderTop: "1px dashed #C8C5BB" }} />

            {[
              { num: "01", title: "Sign Up or Log In", desc: "Email-based auth. Wallet connect ready for the Web3 future." },
              { num: "02", title: "Create Your Community", desc: "Brand it. Name it. Set your roles and rules. Done in minutes." },
              { num: "03", title: "Invite & Grow", desc: "Share your link. Approve members. Own your space completely." },
            ].map(({ num, title, desc }, i) => (
              <FadeUp key={num} delay={i}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 56, color: "#E2E0D8", lineHeight: 1, marginBottom: 16, userSelect: "none" }}>
                    {num}
                  </div>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#1A1A1A", marginBottom: 20, position: "relative", zIndex: 1 }} />
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 19, color: "#1A1A1A", marginBottom: 8 }}>{title}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690", lineHeight: 1.7 }}>{desc}</div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Category Pills ─────────────────── */}
      <section style={{ background: "#FAFAF7", padding: "64px 0" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px" }}>
          <FadeUp>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>
              Built for every kind of community
            </div>
          </FadeUp>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c, i) => (
              <FadeUp key={c} delay={i % 5}>
                <span
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 13,
                    background: "#F4F3EE", border: "1px solid #E2E0D8",
                    borderRadius: 6, padding: "6px 14px",
                    color: "#1A1A1A", display: "inline-block",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </span>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>


      {/* ── Section 6: Official Community ($CONNECT) ────────── */}
      <section style={{ background: "#FAFAF7", padding: "40px 0 96px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px" }}>
          <FadeUp>
            <div 
              style={{ 
                background: "#1A1A1A", borderRadius: 8, padding: "64px 48px", 
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center",
                boxShadow: "0 20px 40px rgba(0,0,0,0.12)", position: "relative", overflow: "hidden"
              }}
            >
              {/* Background Accent */}
              <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, background: "radial-gradient(circle, rgba(200,169,110,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
              
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#C8A96E", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>Official Community</div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#FAFAF7", lineHeight: 1.1, margin: "0 0 24px" }}>
                  The Heart of <br />
                  <span style={{ fontStyle: "italic", color: "#C8A96E" }}>$CONNECT</span>
                </h2>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "#999690", lineHeight: 1.7, marginBottom: 32, maxWidth: 400 }}>
                  Join the official hub for the Connect ecosystem. Direct access to builders, 
                  exclusive updates, and the signal without the noise.
                </p>
                <Link href="/app?community=connect">
                  <Button variant="gold" size="lg">Join Ecosystem</Button>
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { label: "Ticker", value: "$CONNECT", sub: "Official Token" },
                  { label: "Access", value: "Public", sub: "Open to Holders" },
                  { label: "Status", value: "Verified", sub: "Core Community" }
                ].map((item) => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "20px 24px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "#FAFAF7", fontStyle: "italic" }}>{item.value}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#C8A96E" }}>{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>


      {/* ── Section 7: CTA Banner ─────────────────────── */}
      <section style={{ background: "#1A1A1A", padding: "96px 40px" }}>
        <FadeUp>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.2, marginBottom: 36 }}>
              <span style={{ color: "#FAFAF7", fontStyle: "normal" }}>Your project deserves </span>
              <span style={{ color: "#FAFAF7", fontStyle: "italic" }}>a real home.</span>
              <br />
              <span style={{ color: "#C8A96E", fontStyle: "italic" }}>Start building today.</span>
            </h2>
            <Link href="/create">
              <Button variant="gold" size="lg">Create Your Community</Button>
            </Link>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
