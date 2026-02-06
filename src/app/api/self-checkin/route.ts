import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetup_id, name, phone } = body;

  if (!meetup_id || !name || !phone) {
    return NextResponse.json(
      { error: "모든 항목을 입력해주세요." },
      { status: 400 }
    );
  }

  // Verify meetup exists
  const { data: meetup } = await supabaseAdmin
    .from("meetups")
    .select("id, title, date")
    .eq("id", meetup_id)
    .single();

  if (!meetup) {
    return NextResponse.json(
      { error: "모임을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Find matching participant by name and phone
  const cleanedPhone = phone.replace(/\s/g, "").replace(/-/g, "");
  const { data: participants } = await supabaseAdmin
    .from("participants")
    .select("*")
    .eq("meetup_id", meetup_id)
    .not("status", "eq", "cancelled");

  if (!participants || participants.length === 0) {
    return NextResponse.json(
      { error: "등록된 참가자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // Match by name + phone (flexible phone matching)
  const matched = participants.find((p) => {
    const pPhone = p.phone.replace(/\s/g, "").replace(/-/g, "");
    return p.name === name && pPhone === cleanedPhone;
  });

  if (!matched) {
    return NextResponse.json(
      { error: "이름과 전화번호가 일치하는 참가자를 찾을 수 없습니다. 신청 시 입력한 정보를 확인해주세요." },
      { status: 404 }
    );
  }

  if (matched.status === "attended") {
    return NextResponse.json(
      { error: "이미 출석 처리되었습니다." },
      { status: 409 }
    );
  }

  // Mark as attended
  const { error: updateError } = await supabaseAdmin
    .from("participants")
    .update({
      status: "attended",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", matched.id);

  if (updateError) {
    return NextResponse.json(
      { error: "출석 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "출석이 확인되었습니다!",
    participant_name: matched.name,
    meetup_title: meetup.title,
  });
}
