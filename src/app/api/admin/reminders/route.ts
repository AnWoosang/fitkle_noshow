import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { meetup_id, type, sent_by, note } = await req.json();

    if (!meetup_id || !type) {
      return NextResponse.json({ error: "meetup_id와 type은 필수입니다." }, { status: 400 });
    }

    const validTypes = ["d7", "d3", "d1", "dday"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "유효하지 않은 리마인더 타입입니다." }, { status: 400 });
    }

    // Check if reminder already exists
    const { data: existing } = await supabaseAdmin
      .from("reminders")
      .select("id")
      .eq("meetup_id", meetup_id)
      .eq("type", type)
      .single();

    if (existing) {
      // Update existing reminder
      const { data, error } = await supabaseAdmin
        .from("reminders")
        .update({
          sent_at: new Date().toISOString(),
          sent_by: sent_by || null,
          note: note || null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Create new reminder
    const { data, error } = await supabaseAdmin
      .from("reminders")
      .insert({
        meetup_id,
        type,
        sent_at: new Date().toISOString(),
        sent_by: sent_by || null,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
