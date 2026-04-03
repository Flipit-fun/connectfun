import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/communities — list all public communities
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  let query = supabase
    .from("connect_communities")
    .select("*")
    .in("visibility", ["public", "invite"])
    .order("member_count", { ascending: false });

  if (category && category !== "All") {
    query = query.contains("categories", [category]);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/communities — create a new community
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, handle, description, categories, visibility, color, avatar_url, banner_url } = body;

  if (!name || !handle) {
    return NextResponse.json({ error: "name and handle are required" }, { status: 400 });
  }

  // Create community
  const { data: community, error: communityError } = await supabase
    .from("connect_communities")
    .insert({ name, handle, description, categories, visibility, color, avatar_url, banner_url, owner_id: user.id, member_count: 1 })
    .select()
    .single();

  if (communityError) return NextResponse.json({ error: communityError.message }, { status: 400 });

  // Auto-join as owner
  await supabase.from("connect_members").insert({
    community_id: community.id,
    user_id: user.id,
    role: "owner",
  });

  return NextResponse.json(community, { status: 201 });
}
