import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/communities/[handle]/members
export async function GET(_req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();

  const { data: community } = await supabase
    .from("connect_communities")
    .select("id")
    .eq("handle", handle)
    .single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = _req.nextUrl.searchParams.get("status") || "active";

  const { data, error } = await supabase
    .from("connect_members")
    .select(`*, profile:connect_profiles(id, username, display_name, avatar_url)`)
    .eq("community_id", community.id)
    .eq("status", status)
    .order("joined_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
