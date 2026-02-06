import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// D-1 확정 요청 발송 (confirmation_sent 플래그 업데이트 + 미확정자 자동 취소)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetup_id, host_code } = body;

  if (!meetup_id || !host_code) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // Verify host
  const { data: meetup } = await supabaseAdmin
    .from("meetups")
    .select("*")
    .eq("id", meetup_id)
    .single();

  if (!meetup || meetup.host_code !== host_code) {
    return NextResponse.json({ error: "호스트 권한이 없습니다." }, { status: 403 });
  }

  // Mark confirmation as sent
  await supabaseAdmin
    .from("meetups")
    .update({ confirmation_sent: true })
    .eq("id", meetup_id);

  // Get all registered (non-waitlisted) participants for link generation
  const { data: participants } = await supabaseAdmin
    .from("participants")
    .select("*")
    .eq("meetup_id", meetup_id)
    .eq("is_waitlisted", false)
    .in("status", ["registered"]);

  return NextResponse.json({
    message: "확정 요청이 활성화되었습니다. 참가자들에게 확정 링크를 공유해주세요.",
    participants: participants || [],
  });
}
