import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, action } = body; // action: "confirm" or "cancel"

  if (!token || !action) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: participant, error: findError } = await supabaseAdmin
    .from("participants")
    .select("*, meetups(*)")
    .eq("token", token)
    .single();

  if (findError || !participant) {
    return NextResponse.json({ error: "참가 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (participant.status !== "registered" && participant.status !== "waitlisted") {
    return NextResponse.json({ error: "이미 처리된 요청입니다.", participant }, { status: 400 });
  }

  if (action === "confirm") {
    const { error } = await supabaseAdmin
      .from("participants")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", participant.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "참석이 확정되었습니다.", status: "confirmed" });
  }

  if (action === "cancel") {
    const { error } = await supabaseAdmin
      .from("participants")
      .update({ status: "cancelled" })
      .eq("id", participant.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-promote waitlisted participant
    if (!participant.is_waitlisted) {
      const { data: nextWaitlisted } = await supabaseAdmin
        .from("participants")
        .select("*")
        .eq("meetup_id", participant.meetup_id)
        .eq("status", "waitlisted")
        .order("registered_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextWaitlisted) {
        await supabaseAdmin
          .from("participants")
          .update({ status: "registered", is_waitlisted: false })
          .eq("id", nextWaitlisted.id);
      }
    }

    return NextResponse.json({ message: "참가가 취소되었습니다.", status: "cancelled" });
  }

  return NextResponse.json({ error: "잘못된 액션입니다." }, { status: 400 });
}
