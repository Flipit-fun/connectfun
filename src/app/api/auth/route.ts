import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/auth/signout
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ signedOut: true });
}

// GET /api/auth/me
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null });

  const { data: profile } = await supabase
    .from("connect_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ user, profile });
}
