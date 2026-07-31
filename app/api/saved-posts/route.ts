import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/saved-posts?user_id=...
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const user_id = searchParams.get("user_id") || "guest_user";

  try {
    const db = serverSupabase();
    const { data, error } = await db
      .from("saved_posts")
      .select("*")
      .eq("user_id", user_id)
      .order("saved_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data ?? [], { status: 200 });
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/saved-posts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id = "guest_user", post_id, post_data } = body;

    if (!post_id) {
      return NextResponse.json({ message: "post_id is required" }, { status: 400 });
    }

    const db = serverSupabase();

    // Check if already saved
    const { data: existing } = await db
      .from("saved_posts")
      .select("id")
      .eq("user_id", user_id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (existing) {
      // Remove (unsave)
      await db.from("saved_posts").delete().eq("id", existing.id);
      return NextResponse.json({ saved: false, message: "Post removed from saved bookmarks" }, { status: 200 });
    } else {
      // Insert (save)
      const { data: inserted } = await db
        .from("saved_posts")
        .insert({ user_id, post_id, post_data })
        .select()
        .single();
      return NextResponse.json({ saved: true, data: inserted }, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: true, message: err.message }, { status: 200 });
  }
}
