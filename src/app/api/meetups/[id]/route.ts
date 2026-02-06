import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: meetupId } = await params;
  const body = await request.json();

  // Try auth-based authentication first
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the meetup
  const { data: meetup } = await supabaseAdmin
    .from("meetups")
    .select("host_id, host_code")
    .eq("id", meetupId)
    .single();

  if (!meetup) {
    return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }

  // Authorize: auth user matches host_id, or host_code matches
  const authByUser = user && meetup.host_id === user.id;
  const authByCode = body.host_code && meetup.host_code === body.host_code;

  if (!authByUser && !authByCode) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // Pick only allowed fields
  const allowed = ["title", "description", "date", "location", "max_participants", "max_waitlist", "fee_display"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("meetups")
    .update(updates)
    .eq("id", meetupId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
