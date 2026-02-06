import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Waitlist participant confirms their spot
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, action } = body; // action: "join" or "pass"

  if (!token || !action) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { data: participant } = await supabaseAdmin
    .from("participants")
    .select("*")
    .eq("token", token)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "참가 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (action === "join") {
    const { error } = await supabaseAdmin
      .from("participants")
      .update({
        status: "confirmed",
        is_waitlisted: false,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", participant.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "참여가 확정되었습니다!", status: "confirmed" });
  }

  if (action === "pass") {
    const { error } = await supabaseAdmin
      .from("participants")
      .update({ status: "cancelled" })
      .eq("id", participant.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Promote next waitlisted person
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

    return NextResponse.json({ message: "패스했습니다.", status: "cancelled" });
  }

  return NextResponse.json({ error: "잘못된 액션입니다." }, { status: 400 });
}
