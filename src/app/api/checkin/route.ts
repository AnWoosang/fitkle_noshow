import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { participant_id, host_code, meetup_id, action } = body;
  // action: "checkin" | "noshow"

  if (!participant_id || !host_code || !meetup_id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // Verify host code
  const { data: meetup } = await supabaseAdmin
    .from("meetups")
    .select("host_code")
    .eq("id", meetup_id)
    .single();

  if (!meetup || meetup.host_code !== host_code) {
    return NextResponse.json({ error: "호스트 권한이 없습니다." }, { status: 403 });
  }

  const newStatus = action === "noshow" ? "noshow" : "attended";
  const updateData: Record<string, string> = { status: newStatus };
  if (action !== "noshow") {
    updateData.checked_in_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("participants")
    .update(updateData)
    .eq("id", participant_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: newStatus === "attended" ? "체크인 완료" : "노쇼 처리 완료", status: newStatus });
}
