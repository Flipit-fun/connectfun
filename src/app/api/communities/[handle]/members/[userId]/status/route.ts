import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/communities/[handle]/members/[userId]/status — Approve/Decline members
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; userId: string }> }
) {
  const { handle, userId } = await params;
  const { status } = await req.json();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify role (Owner/Mod)
  const { data: community } = await supabase.from("connect_communities").select("id").eq("handle", handle).single();
  if (!community) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: myMembership } = await supabase
    .from("connect_members")
    .select("role")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .single();

  if (!myMembership || !["owner", "mod"].includes(myMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status === "active") {
    // Approve
    const { error } = await supabase
      .from("connect_members")
      .update({ status: "active" })
      .eq("community_id", community.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    // Decline/Remove
    const { error } = await supabase
      .from("connect_members")
      .delete()
      .eq("community_id", community.id)
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
