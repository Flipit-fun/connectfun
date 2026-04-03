"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "All", "Memecoin", "DAO", "NFT Project", "DeFi", "GameFi",
  "Dev Tools", "Creator", "Social", "Startup",
];

interface Community {
  id: string;
  name: string;
  handle: string;
  description: string;
  categories: string[];
  member_count: number;
  avatar_url?: string;
  banner_url?: string;
  color?: string;
  visibility: "public" | "invite" | "private";
}

function CommunityCard({ c, userId, joined }: { c: Community; userId: string | null; joined: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [isJoined, setIsJoined] = useState(joined);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("connect_members")
      .select("status")
      .eq("community_id", c.id)
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsJoined(data.status === "active");
          setIsPending(data.status === "pending");
        }
      });
  }, [c.id, userId, supabase]);

  async function handleJoin(e: React.MouseEvent) {
    e.preventDefault();
    if (!userId) { router.push("/auth"); return; }
    setLoading(true);

    if (isJoined || isPending) {
      // Leave or cancel request
      await supabase.from("connect_members").delete().eq("community_id", c.id).eq("user_id", userId);
      setIsJoined(false);
      setIsPending(false);
    } else {
      // Join
      const status = c.visibility === "invite" ? "pending" : "active";
      await supabase.from("connect_members").insert({ 
        community_id: c.id, 
        user_id: userId, 
        role: "member",
        status 
      });
      if (status === "active") setIsJoined(true);
      else setIsPending(true);
    }
    setLoading(false);
  }

  const initials = c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff", border: "1px solid", borderRadius: 4, overflow: "hidden",
        display: "flex", flexDirection: "column",
        borderColor: hovered ? "#C8C5BB" : "#E2E0D8",
        boxShadow: hovered ? "0 8px 32px rgba(26,26,26,0.08)" : "none",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {/* Banner */}
      {c.banner_url ? (
        <img src={c.banner_url} alt="" style={{ height: 64, objectFit: "cover", width: "100%" }} />
      ) : (
        <div style={{ height: 64, background: "linear-gradient(135deg, #E2E0D8, #CAC7BE)" }} />
      )}

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ marginTop: -20, marginBottom: 12 }}>
          {c.avatar_url ? (
            <img src={c.avatar_url} alt={c.name} style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid #fff", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.color || "#1A1A1A", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-serif)", color: "#FAFAF7", fontSize: 14, fontStyle: "italic" }}>{initials}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <Link href={`/app?community=${c.handle}`} style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#1A1A1A", lineHeight: 1.3, textDecoration: "none" }}>
            {c.name}
          </Link>
          {c.categories?.[0] && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", background: "#F4F3EE", border: "1px solid #E2E0D8", padding: "2px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
              {c.categories[0]}
            </span>
          )}
        </div>

        {c.description && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#999690", lineHeight: 1.6, margin: "0 0 12px" }}>
            {c.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>
            {c.member_count.toLocaleString()} members
          </span>
          <button
            onClick={handleJoin}
            disabled={loading}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: isJoined ? "#999690" : "#C8A96E",
              background: "transparent", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            {loading ? "..." : isJoined ? "Joined ✓" : isPending ? "Request Sent" : c.visibility === "invite" ? "Request to Join →" : "Join →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExploreClient() {
  const supabase = createClient();
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase.from("connect_members").select("community_id").eq("user_id", user.id).then(({ data }) => {
          if (data) setJoinedIds(new Set(data.map(m => m.community_id)));
        });
      }
    });
  }, [supabase]);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (query) params.set("q", query);
    const res = await fetch(`/api/communities?${params}`);
    const data = await res.json();
    setCommunities(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [activeCategory, query]);

  useEffect(() => {
    const timeout = setTimeout(fetchCommunities, 300);
    return () => clearTimeout(timeout);
  }, [fetchCommunities]);

  return (
    <div style={{ padding: "64px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Explore</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(32px, 4vw, 48px)", color: "#1A1A1A", lineHeight: 1.2, margin: 0 }}>
            <span style={{ fontStyle: "normal" }}>Find your </span>
            <span style={{ fontStyle: "italic" }}>community.</span>
          </h1>
        </div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: 420, marginBottom: 24 }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#999690" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities..."
            style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontFamily: "var(--font-sans)", fontSize: 13, background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, color: "#1A1A1A", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setActiveCategory(c)} style={{ fontFamily: "var(--font-sans)", fontSize: 13, background: activeCategory === c ? "#1A1A1A" : "#F4F3EE", color: activeCategory === c ? "#FAFAF7" : "#1A1A1A", border: `1px solid ${activeCategory === c ? "#1A1A1A" : "#E2E0D8"}`, borderRadius: 6, padding: "6px 14px", cursor: "pointer", whiteSpace: "nowrap" }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "#999690" }}>
            Loading communities...
          </div>
        ) : communities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, color: "#999690" }}>No communities found.</p>
            <div style={{ marginTop: 24 }}>
              <Link href="/create" style={{ textDecoration: "none" }}>
                <button style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", background: "transparent", border: "1px solid #E2E0D8", borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}>
                  Start one yourself →
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {communities.map((c) => (
              <CommunityCard key={c.id} c={c} userId={userId} joined={joinedIds.has(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
