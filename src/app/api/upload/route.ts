import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/upload — upload avatar or banner to Supabase Storage
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const prefix = (formData.get("prefix") as string) || "uploads";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}/${user.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("community-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("community-assets")
    .getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
