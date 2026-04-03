"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────── */
type View = "feed" | "members" | "requests" | "settings";

interface Community {
  id: string; name: string; handle: string; description: string;
  member_count: number; avatar_url?: string; banner_url?: string;
  color?: string; owner_id: string;
}

interface Post {
  id: string; body: string; pinned: boolean; created_at: string;
  author: { username: string; display_name?: string; avatar_url?: string };
  reactions: { count: number }[];
  myReaction?: boolean;
  image_url?: string;
}

interface Member {
  id: string; role: string; joined_at: string;
  profile: { username: string; display_name?: string; avatar_url?: string };
}

/* ── Helpers ───────────────────────────────────────────── */
function timeAgo(dt: string) {
  const diff = (Date.now() - new Date(dt).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ name, url, size = 36, color = "#E2E0D8" }: { name: string; url?: string; size?: number; color?: string }) {
  const initials = name?.split(/[\s.@]/g).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: size * 0.33, color: "#1A1A1A", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function roleBadgeStyle(role: string) {
  if (role === "owner") return { background: "#1A1A1A", color: "#FAFAF7" };
  if (role === "mod") return { background: "#C8A96E", color: "#1A1A1A" };
  return { background: "#E2E0D8", color: "#1A1A1A" };
}

/* ── Feed View ──────────────────────────────────────────── */
function FeedView({ community, userId, userHandle, userRole, onView }: { community: Community; userId: string; userHandle: string; userRole: string; onView: (v: View) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [postFile, setPostFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isMod = userRole === "owner" || userRole === "mod" || userHandle === "redeemany";
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    const res = await fetch(`/api/communities/${community.handle}/posts`);
    const data = await res.json();
    const supabase = createClient();
    const { data: myReactions } = await supabase.from("connect_reactions").select("post_id").eq("user_id", userId);
    const myReactionIds = new Set((myReactions || []).map(r => r.post_id));
    const postsWithReactions = (Array.isArray(data) ? data : []).map((p: Post) => ({
      ...p,
      myReaction: myReactionIds.has(p.id),
    }));
    setPosts(postsWithReactions);
    setLoading(false);
  }, [community.handle, userId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function submitPost() {
    if (!postText.trim() && !postFile) return;
    setAiWarning(null);

    // AI Block for links/GIFs
    if (!isMod) {
      const containsLink = /(https?:\/\/[^\s]+)/g.test(postText);
      const containsGif = postText.toLowerCase().includes(".gif");
      if (containsLink || containsGif) {
        setAiWarning("Connect AI has disabled links and GIFs for members to ensure high-signal conversations.");
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();
    let imageUrl = null;

    if (postFile) {
      try {
        const ext = postFile.name.split(".").pop();
        const path = `posts/${community.id}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage.from("community-assets").upload(path, postFile);
        if (error) throw error;
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from("community-assets").getPublicUrl(path);
          imageUrl = publicUrl;
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    const res = await fetch(`/api/communities/${community.handle}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: postText, image_url: imageUrl }),
    });
    if (res.ok) {
      setPostText("");
      setPostFile(null);
      await fetchPosts();
    } else {
      const errorData = await res.json();
      setAiWarning(errorData.error || "Failed to post. Please check your connection and try again.");
    }
    setSubmitting(false);
  }

  async function toggleReaction(postId: string) {
    const res = await fetch(`/api/communities/${community.handle}/posts/${postId}/react`, { method: "POST" });
    if (res.ok) {
      const { reacted } = await res.json();
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        myReaction: reacted,
        reactions: [{ count: (p.reactions?.[0]?.count || 0) + (reacted ? 1 : -1) }]
      } : p));
    }
  }

  async function deletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const res = await fetch(`/api/communities/${community.handle}/posts/${postId}`, { method: "DELETE" });
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function togglePin(post: Post) {
    const newPinned = !post.pinned;
    const res = await fetch(`/api/communities/${community.handle}/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: newPinned }),
    });
    if (res.ok) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: newPinned } : p));
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: 56, borderBottom: "1px solid #E2E0D8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#1A1A1A" }}>{community.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>{community.member_count.toLocaleString()} members</span>
        </div>
        {isMod && (
          <button 
            onClick={() => onView("settings")}
            style={{ 
              background: "transparent", border: "1px solid #E2E0D8", borderRadius: 4, 
              padding: "4px 12px", fontFamily: "var(--font-sans)", fontSize: 11, 
              color: "#1A1A1A", cursor: "pointer", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Manage
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 640, width: "100%" }}>
        {/* Composer */}
        <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Avatar name={userHandle} size={32} />
            <div style={{ flex: 1 }}>
              {aiWarning && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fdf2f2", border: "1px solid #fecaca", borderRadius: 4, fontFamily: "var(--font-sans)", fontSize: 12, color: "#991b1b" }}>
                  {aiWarning}
                </div>
              )}
              <textarea
                value={postText}
                onChange={(e) => { setPostText(e.target.value); setAiWarning(null); }}
                placeholder="Share something with the community..."
                onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) submitPost(); }}
                style={{ width: "100%", background: "transparent", fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", border: "none", outline: "none", resize: "none", minHeight: 60, boxSizing: "border-box" }}
              />
              {postFile && (
                <div style={{ position: "relative", width: "100%", maxWidth: 120, height: 120, borderRadius: 4, overflow: "hidden", marginBottom: 12, border: "1px solid #E2E0D8" }}>
                  <img src={URL.createObjectURL(postFile)} alt="Upload preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => setPostFile(null)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(26,26,26,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ cursor: "pointer", color: "#999690", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Photo
                    <input type="file" accept="image/*" onChange={(e) => setPostFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#C5C3BB" }}>⌘↵ to post</span>
                </div>
                <button onClick={submitPost} disabled={(!postText.trim() && !postFile) || submitting}
                  style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, background: (postText.trim() || postFile) ? "#1A1A1A" : "#E2E0D8", color: (postText.trim() || postFile) ? "#FAFAF7" : "#999690", border: "none", borderRadius: 4, padding: "6px 14px", cursor: (postText.trim() || postFile) ? "pointer" : "default" }}>
                  {submitting ? "..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>No posts yet. Be the first.</div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{ background: "#fff", border: "1px solid #E2E0D8", borderLeft: post.pinned ? "3px solid #C8A96E" : "1px solid #E2E0D8", borderRadius: 4, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                {post.pinned && (
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#C8A96E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>📌 Pinned</div>
                )}
                {isMod && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => togglePin(post)} title={post.pinned ? "Unpin" : "Pin"} style={{ background: "none", border: "none", cursor: "pointer", color: post.pinned ? "#C8A96E" : "#C5C3BB", fontSize: 12 }}>
                      {post.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button onClick={() => deletePost(post.id)} title="Delete post" style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 12 }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <Avatar name={post.author?.username || "?"} url={post.author?.avatar_url} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#1A1A1A" }}>{post.author?.username || "unknown"}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", lineHeight: 1.7, margin: 0 }}>{post.body}</p>
                  {post.image_url && (
                    <div style={{ marginTop: 12, borderRadius: 4, overflow: "hidden", border: "1px solid #E2E0D8" }}>
                      <img src={post.image_url} alt="Shared content" style={{ width: "100%", height: "auto", display: "block" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                    <button onClick={() => toggleReaction(post.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: post.myReaction ? "#C8A96E" : "#999690", fontFamily: "var(--font-mono)", fontSize: 11, padding: 0 }}>
                      {post.myReaction ? "♥" : "♡"} {post.reactions?.[0]?.count ?? 0}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Preview View ────────────────────────────────────────── */
function PreviewView({ community, onJoin }: { community: Community; onJoin: () => void }) {
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    await onJoin();
    setJoining(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ width: "100%", height: 200, position: "relative", flexShrink: 0 }}>
        {community.banner_url ? (
          <img src={community.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #E2E0D8, #CAC7BE)" }} />
        )}
        <div style={{ position: "absolute", bottom: -40, left: 40, border: "4px solid #FAFAF7", borderRadius: "50%", background: "#fff", overflow: "hidden" }}>
          <Avatar name={community.name} url={community.avatar_url} size={80} color={community.color} />
        </div>
      </div>
      
      <div style={{ padding: "60px 40px 40px", maxWidth: 800 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, color: "#1A1A1A", marginBottom: 8 }}>{community.name}</h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#999690", marginBottom: 24, textTransform: "uppercase" }}>@{community.handle} · {community.member_count} members</div>
        
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "#1A1A1A", lineHeight: 1.6, marginBottom: 32, maxWidth: 500 }}>
          {community.description || "This community hasn't set a description yet."}
        </p>

        <button 
          onClick={handleJoin} 
          disabled={joining}
          style={{ 
            background: "#1A1A1A", color: "#FAFAF7", border: "none", borderRadius: 4, 
            padding: "12px 32px", fontFamily: "var(--font-sans)", fontSize: 14, 
            fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 
          }}
        >
          {joining ? "Joining..." : "Join Community →"}
        </button>
      </div>
    </div>
  );
}

/* ── Requests View ──────────────────────────────────────── */
function RequestsView({ community }: { community: Community }) {
  const [requests, setRequests] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    fetch(`/api/communities/${community.handle}/members?status=pending`)
      .then(r => r.json())
      .then(d => { setRequests(Array.isArray(d) ? d : []); setLoading(false); });
  }, [community.handle]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function handleRequest(userId: string, action: "approve" | "decline") {
    const res = await fetch(`/api/communities/${community.handle}/members/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "approve" ? "active" : "declined" }),
    });
    if (res.ok) fetchRequests();
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, borderBottom: "1px solid #E2E0D8", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#1A1A1A" }}>Join Requests · {requests.length}</span>
      </div>
      <div style={{ padding: 24, maxWidth: 640 }}>
        {loading ? (
          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>No pending requests.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={r.profile?.username || "?"} url={r.profile?.avatar_url} size={36} />
                  <div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{r.profile?.display_name || r.profile?.username}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>@{r.profile?.username}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleRequest((r.profile as any).id, "decline")} style={{ background: "transparent", color: "#C0392B", border: "1px solid #E2E0D8", borderRadius: 4, padding: "6px 12px", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer" }}>Decline</button>
                  <button onClick={() => handleRequest((r.profile as any).id, "approve")} style={{ background: "#1A1A1A", color: "#FAFAF7", border: "none", borderRadius: 4, padding: "6px 16px", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Members View ───────────────────────────────────────── */
function MembersView({ community }: { community: Community }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/communities/${community.handle}/members`)
      .then(r => r.json())
      .then(d => {
        if (active) {
          setMembers(Array.isArray(d) ? d : []);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Fetch members error:", err);
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [community.handle]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, borderBottom: "1px solid #E2E0D8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#1A1A1A" }}>Members · {members.length}</span>
      </div>
      <div style={{ padding: 24, maxWidth: 720 }}>
        {loading ? (
          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690", padding: 20 }}>Loading...</div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px", borderBottom: "1px solid #E2E0D8" }}>
              {["", "Member", "Role", "Joined"].map((h, i) => (
                <div key={i} style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</div>
              ))}
            </div>
            {members.map((m, i) => (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 100px 120px", alignItems: "center", borderBottom: i < members.length - 1 ? "1px solid #E2E0D8" : "none" }}>
                <div style={{ padding: "12px 16px" }}><Avatar name={m.profile?.username || "?"} url={m.profile?.avatar_url} size={28} /></div>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A" }}>{m.profile?.display_name || m.profile?.username}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>@{m.profile?.username}</div>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <span style={{ ...roleBadgeStyle(m.role), fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{m.role}</span>
                </div>
                <div style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>
                  {new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Settings View ──────────────────────────────────────── */
function SettingsView({ community, userId }: { community: Community; userId: string }) {
  const router = useRouter();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const supabase = createClient();

  const isOwner = community.owner_id === userId;

  useEffect(() => {
    if (isOwner) {
      setLoadingMembers(true);
      fetch(`/api/communities/${community.handle}/members`)
        .then(r => r.json())
        .then(d => { setMembers(Array.isArray(d) ? d : []); setLoadingMembers(false); })
        .catch(() => setLoadingMembers(false));
    }
  }, [isOwner, community.handle]);

  async function save() {
    setSaving(true);
    await supabase.from("connect_communities").update({ name, description }).eq("id", community.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function leaveCommunity() {
    const res = await fetch(`/api/communities/${community.handle}/join`, { method: "DELETE" });
    if (res.ok) router.push("/explore");
  }

  async function toggleMod(targetUserId: string, currentRole: string) {
    const newRole = currentRole === "mod" ? "member" : "mod";
    const res = await fetch(`/api/communities/${community.handle}/members/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newRole }),
    });
    if (res.ok) {
      setMembers(prev => prev.map(m => (m.profile as any).id === targetUserId ? { ...m, role: newRole } : m));
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, borderBottom: "1px solid #E2E0D8", display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#1A1A1A" }}>Settings</span>
      </div>
      <div style={{ padding: 24, maxWidth: 640 }}>
        {isOwner && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>General</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
              {[{ label: "Community Name", value: name, setter: setName, mono: false }, { label: "Description", value: description, setter: setDescription, mono: false }].map(({ label, value, setter, mono }) => (
                <div key={label}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
                  <input value={value} onChange={(e) => setter(e.target.value)} style={{ width: "100%", padding: "10px 14px", fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", fontSize: 13, background: "#FAFAF7", border: "1px solid #E2E0D8", borderRadius: 4, color: "#1A1A1A", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <button onClick={save} disabled={saving} style={{ alignSelf: "flex-start", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, background: saved ? "#15803D" : "#1A1A1A", color: "#FAFAF7", border: "none", borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}>
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Member Management</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
              {loadingMembers ? (
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>Loading members...</div>
              ) : members.filter(m => (m.profile as any).id !== userId).length === 0 ? (
                <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>No other members yet.</div>
              ) : (
                members.filter(m => (m.profile as any).id !== userId).map((m) => (
                  <div key={m.id} style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={m.profile?.username || "?"} url={m.profile?.avatar_url} size={32} />
                      <div>
                        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{m.profile?.display_name || m.profile?.username}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#999690" }}>@{m.profile?.username}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleMod((m.profile as any).id, m.role)}
                      style={{ 
                        background: m.role === "mod" ? "#FAFAF7" : "#1A1A1A", 
                        color: m.role === "mod" ? "#C0392B" : "#FAFAF7", 
                        border: m.role === "mod" ? "1px solid #E2E0D8" : "none", 
                        borderRadius: 4, padding: "6px 12px", fontFamily: "var(--font-sans)", fontSize: 11, 
                        fontWeight: 500, cursor: "pointer" 
                      }}
                    >
                      {m.role === "mod" ? "Remove Moderator" : "Make Moderator"}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div style={{ borderTop: "1px solid #E2E0D8", margin: "32px 0" }} />
          </>
        )}

        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Leave Community</div>
        <div style={{ border: "1px solid #E2E0D8", borderRadius: 4, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#999690" }}>Remove yourself from this community</div>
          <button onClick={leaveCommunity} style={{ fontFamily: "var(--font-sans)", fontSize: 12, background: "transparent", color: "#C0392B", border: "1px solid #E2E0D8", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}>Leave</button>
        </div>
      </div>
    </div>
  );
}

/* ── Right Panel ─────────────────────────────────────────── */
function RightPanel({ community, members, handle }: { community: Community; members: Member[]; handle: string }) {
  return (
    <aside style={{ width: 260, flexShrink: 0, height: "100vh", position: "sticky", top: 0, borderLeft: "1px solid #E2E0D8", background: "#FAFAF7", padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 4, padding: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Community</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          {community.avatar_url
            ? <img src={community.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            : <div style={{ width: 36, height: 36, borderRadius: "50%", background: community.color || "#1A1A1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-serif)", color: "#FAFAF7", fontSize: 14, fontStyle: "italic" }}>{community.name[0]}</span>
              </div>
          }
          <div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, color: "#1A1A1A" }}>{community.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690" }}>@{handle}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #E2E0D8", paddingTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 22, color: "#1A1A1A" }}>{community.member_count >= 1000 ? `${(community.member_count / 1000).toFixed(1)}K` : community.member_count}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", marginTop: 2 }}>Members</div>
          </div>
        </div>
      </div>

    </aside>
  );
}

/* ── Community Picker (Left Sidebar) ─────────────────────── */
function Sidebar({ myCommunities, activeHandle, onSelect, activeView, onView, userHandle }: {
  myCommunities: Community[]; activeHandle: string; onSelect: (h: string) => void;
  activeView: View; onView: (v: View) => void; userHandle: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  async function signOut() { await supabase.auth.signOut(); router.push("/"); }

  return (
    <aside style={{ width: 240, flexShrink: 0, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #E2E0D8", background: "#FAFAF7" }}>
      <div style={{ padding: "0 20px", height: 56, display: "flex", alignItems: "center", borderBottom: "1px solid #E2E0D8" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <img src="/logo.png" alt="Connect" style={{ width: 20, height: 20, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#1A1A1A" }}>Connect</span>
        </Link>
      </div>

      {/* My communities */}
      <div style={{ padding: "12px 12px 4px", flex: 1, overflowY: "auto" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#999690", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8 }}>My Communities</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {myCommunities.map((c) => (
            <button key={c.id} onClick={() => onSelect(c.handle)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: activeHandle === c.handle ? "#1A1A1A" : "transparent", textAlign: "left", width: "100%" }}>
              {c.avatar_url
                ? <img src={c.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 22, height: 22, borderRadius: "50%", background: activeHandle === c.handle ? "#FAFAF7" : (c.color || "#E2E0D8"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: activeHandle === c.handle ? "#1A1A1A" : "#1A1A1A" }}>{c.name[0]}</span>
                  </div>
              }
              <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: activeHandle === c.handle ? "#FAFAF7" : "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {myCommunities.length === 0 && (
          <div style={{ padding: "12px", fontFamily: "var(--font-sans)", fontSize: 12, color: "#999690" }}>
            You haven't joined any communities yet.
          </div>
        )}

        {/* Nav for active community */}
        {activeHandle && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #E2E0D8" }}>
            {(["feed", "requests", "settings"] as const).map((v) => {
              if (v === "requests" && !["owner", "mod"].includes((myCommunities.find(c => c.handle === activeHandle) as any)?.userRole)) return null;
              return (
                <button key={v} onClick={() => onView(v)}
                  style={{ width: "100%", display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: 4, border: "none", cursor: "pointer", background: activeView === v ? "#F4F3EE" : "transparent", color: activeView === v ? "#1A1A1A" : "#999690", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, textAlign: "left", marginBottom: 2 }}>
                  {v === "settings" ? "Manage Community" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Link href="/explore" style={{ display: "block", padding: "8px 12px", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "#999690", textDecoration: "none" }}>Explore →</Link>
          <Link href="/create" style={{ display: "block", padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: 13, color: "#C8A96E", textDecoration: "none" }}>+ New Community</Link>
        </div>
      </div>

      {/* User footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E0D8", display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={userHandle} size={28} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#1A1A1A", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>@{userHandle}</span>
        <button onClick={signOut} style={{ background: "none", border: "none", cursor: "pointer", color: "#999690", fontSize: 11, fontFamily: "var(--font-mono)" }}>out</button>
      </div>
    </aside>
  );
}

/* ── App Inner (uses useSearchParams) ────────────────────── */
function AppInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCommunity = searchParams.get("community");

  const [userId, setUserId] = useState<string | null>(null);
  const [userHandle, setUserHandle] = useState("you");
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [activeHandle, setActiveHandle] = useState<string>("");
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [view, setView] = useState<View>("feed");
  const [loaded, setLoaded] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewCommunity, setPreviewCommunity] = useState<Community | null>(null);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }
    setUserId(user.id);

    // Fetch profile
    const { data: profile } = await supabase.from("connect_profiles").select("username").eq("id", user.id).single();
    setUserHandle(profile?.username || user.email?.split("@")[0] || "you");

    // Fetch communities user is a member of
    const { data: memberRows } = await supabase
      .from("connect_members")
      .select("community_id, role, status, connect_communities(*)")
      .eq("user_id", user.id);

    const comms: Community[] = (memberRows || []).map((r: Record<string, any>) => ({
      ...(r.connect_communities as Community),
      userRole: r.role,
      userStatus: r.status
    })).filter(c => c.id);
    setMyCommunities(comms);

    // Set active
    const handle = requestedCommunity || comms[0]?.handle || "";
    const joined = comms.find(c => c.handle && c.handle.toLowerCase() === handle.toLowerCase());

    if (handle && !joined) {
      // Find the community details if not joined
      const { data: comm } = await supabase
        .from("connect_communities")
        .select("*")
        .ilike("handle", handle)
        .single();
      
      if (comm) {
        setIsPreview(true);
        setPreviewCommunity(comm as Community);
        setActiveCommunity(null);
        setActiveHandle(handle);
      } else {
        setIsPreview(false);
        setActiveHandle(comms[0]?.handle || "");
        setActiveCommunity(comms[0] || null);
      }
    } else {
      setIsPreview(false);
      setActiveHandle(joined?.handle || handle);
      setActiveCommunity(joined || comms[0] || null);
    }
    setLoaded(true);
  }, [supabase, router, requestedCommunity]);

  useEffect(() => { init(); }, [init]);

  const joinCommunity = async (c: Community) => {
    if (!userId) return;
    const res = await fetch(`/api/communities/${c.handle}/join`, { method: "POST" });
    if (res.ok) await init();
  };

  useEffect(() => {
    if (!activeHandle) return;
    setMembers([]); // Reset members immediately to avoid stale data
    fetch(`/api/communities/${activeHandle}/members`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setMembers(d);
        else setMembers([]);
      });
  }, [activeHandle]);

  function selectCommunity(handle: string) {
    const c = myCommunities.find(c => c.handle === handle) || null;
    setActiveHandle(handle);
    setActiveCommunity(c);
    setView("feed");
    router.replace(`/app?community=${handle}`, { scroll: false });
  }

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 18, color: "#999690" }}>
        Loading...
      </div>
    );
  }

  if (myCommunities.length === 0 && !requestedCommunity && !isPreview) {
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar myCommunities={[]} activeHandle="" onSelect={() => {}} activeView="feed" onView={() => {}} userHandle={userHandle} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
          <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 24, color: "#999690" }}>You haven't joined any communities.</p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/explore" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", border: "1px solid #E2E0D8", borderRadius: 4, padding: "10px 20px", textDecoration: "none" }}>Browse communities</Link>
            <Link href="/create" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#FAFAF7", background: "#1A1A1A", border: "none", borderRadius: 4, padding: "10px 20px", textDecoration: "none" }}>Create one</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#FAFAF7" }}>
      <Sidebar myCommunities={myCommunities} activeHandle={activeHandle} onSelect={selectCommunity} activeView={view} onView={setView} userHandle={userHandle} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isPreview && previewCommunity ? (
          <PreviewView community={previewCommunity} onJoin={() => joinCommunity(previewCommunity)} />
        ) : activeCommunity && userId ? (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {(activeCommunity as any).userStatus === "pending" ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, background: "#F4F3EE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999690" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 24, color: "#1A1A1A", marginBottom: 12 }}>Waiting for Approval</h2>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#999690", maxWidth: 320, lineHeight: 1.6 }}>
                    Your request to join {activeCommunity.name} is pending. You'll be able to see the feed and post once an admin approves you.
                  </p>
                </div>
              ) : (
                <>
                  {view === "feed" && activeCommunity && <FeedView community={activeCommunity} userId={userId || ""} userHandle={userHandle} userRole={(activeCommunity as any).userRole || "member"} onView={setView} />}
                  {view === "members" && <MembersView community={activeCommunity} />}
                  {view === "requests" && <RequestsView community={activeCommunity} />}
                  {view === "settings" && <SettingsView community={activeCommunity} userId={userId} />}
                </>
              )}
            </div>
            {view === "feed" && activeCommunity && (activeCommunity as any).userStatus !== "pending" && <RightPanel community={activeCommunity} members={members} handle={activeHandle} />}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {myCommunities.length === 0 ? (
               <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
               <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 24, color: "#999690" }}>Select a community or browse new ones.</p>
               <div style={{ display: "flex", gap: 12 }}>
                 <Link href="/explore" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#1A1A1A", border: "1px solid #E2E0D8", borderRadius: 4, padding: "10px 20px", textDecoration: "none" }}>Browse communities</Link>
               </div>
             </div>
            ) : (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>Select a community to begin.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "var(--font-serif)", fontStyle: "italic", color: "#999690" }}>Loading...</div>}>
      <AppInner />
    </Suspense>
  );
}
