import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/communities/[handle]/posts/[postId]/react
export async function POST(_req: NextRequest, { params }: { params: Promise<{ handle: string; postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Toggle reaction
  const { data: existing } = await supabase
    .from("connect_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("connect_reactions").delete().eq("id", existing.id);
    return NextResponse.json({ reacted: false });
  } else {
    await supabase.from("connect_reactions").insert({ post_id: postId, user_id: user.id });
    return NextResponse.json({ reacted: true });
  }
}
