import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/communities/[handle]/members/role
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId, newRole } = await req.json();
  if (!targetUserId || !['mod', 'member'].includes(newRole)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // 1. Fetch community and verify requester is the owner
  const { data: community, error: commError } = await supabase
    .from("connect_communities")
    .select("id, owner_id")
    .ilike("handle", handle)
    .single();

  if (commError || !community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  if (community.owner_id !== user.id) {
    return NextResponse.json({ error: "Only owners can manage moderator roles" }, { status: 403 });
  }

  // 2. Update member role
  const { error: updateError } = await supabase
    .from("connect_members")
    .update({ role: newRole })
    .eq("community_id", community.id)
    .eq("user_id", targetUserId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, role: newRole });
}
