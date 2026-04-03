import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/communities/[handle]/join
export async function POST(_req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("connect_communities")
    .select("id, visibility")
    .eq("handle", handle)
    .single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If invite-only or private, status is pending
  const status = (community.visibility === "invite" || community.visibility === "private") ? "pending" : "active";

  const { error } = await supabase
    .from("connect_members")
    .insert({ community_id: community.id, user_id: user.id, role: "member", status });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ joined: true });
}

// DELETE /api/communities/[handle]/join — leave
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("connect_communities")
    .select("id")
    .eq("handle", handle)
    .single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("connect_members")
    .delete()
    .eq("community_id", community.id)
    .eq("user_id", user.id);

  return NextResponse.json({ left: true });
}
