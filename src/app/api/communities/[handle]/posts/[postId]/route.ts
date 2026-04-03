import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// DELETE /api/communities/[handle]/posts/[postId] — Delete a post (Owner/Mod)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; postId: string }> }
) {
  const { handle, postId } = await params;
  const cookieStore = req.cookies;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookies) => cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options })) } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify role (Global Admin bypass for @redeemany)
  const { data: profile } = await supabase.from("connect_profiles").select("username").eq("id", user.id).single();
  const isGlobalAdmin = profile?.username === "redeemany";

  if (!isGlobalAdmin) {
    const { data: community } = await supabase.from("connect_communities").select("id").eq("handle", handle).single();
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    const { data: membership } = await supabase
      .from("connect_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "owner" && membership.role !== "mod")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("connect_posts").delete().eq("id", postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

// PATCH /api/communities/[handle]/posts/[postId] — Toggle pin (Owner/Mod)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; postId: string }> }
) {
  const { handle, postId } = await params;
  const body = await req.json();
  const { pinned } = body;

  const cookieStore = req.cookies;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookies) => cookies.forEach(({ name, value, options }) => cookieStore.set({ name, value, ...options })) } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify role (Global Admin bypass for @redeemany)
  const { data: profile } = await supabase.from("connect_profiles").select("username").eq("id", user.id).single();
  const isGlobalAdmin = profile?.username === "redeemany";

  if (!isGlobalAdmin) {
    const { data: community } = await supabase.from("connect_communities").select("id").eq("handle", handle).single();
    if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

    const { data: membership } = await supabase
      .from("connect_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "owner" && membership.role !== "mod")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("connect_posts").update({ pinned }).eq("id", postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, pinned });
}
