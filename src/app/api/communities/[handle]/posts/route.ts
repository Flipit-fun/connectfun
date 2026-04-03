import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/communities/[handle]/posts
export async function GET(_req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("connect_communities")
    .select("id")
    .eq("handle", handle)
    .single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: posts, error } = await supabase
    .from("connect_posts")
    .select(`
      *,
      author:connect_profiles(username, display_name, avatar_url),
      reactions:connect_reactions(count)
    `)
    .eq("community_id", community.id)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(posts);
}

// POST /api/communities/[handle]/posts
export async function POST(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, image_url, pinned = false } = await req.json();
  if (!body?.trim() && !image_url) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const { data: community } = await supabase
    .from("connect_communities")
    .select("id")
    .eq("handle", handle)
    .single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check membership
  const { data: membership } = await supabase
    .from("connect_members")
    .select("role")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { data: post, error } = await supabase
    .from("connect_posts")
    .insert({ community_id: community.id, author_id: user.id, body, image_url, pinned })
    .select(`*, author:connect_profiles(username, display_name, avatar_url)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(post, { status: 201 });
}
