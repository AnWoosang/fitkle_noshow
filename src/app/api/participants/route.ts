import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetup_id, name, phone } = body;

  if (!meetup_id || !name || !phone) {
    return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
  }

  // Check meetup exists and get max_participants
  const { data: meetup, error: meetupError } = await supabaseAdmin
    .from("meetups")
    .select("*")
    .eq("id", meetup_id)
    .single();

  if (meetupError || !meetup) {
    return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }

  // Check duplicate phone
  const { data: existing } = await supabaseAdmin
    .from("participants")
    .select("id")
    .eq("meetup_id", meetup_id)
    .eq("phone", phone)
    .not("status", "eq", "cancelled")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "이미 신청한 번호입니다." }, { status: 409 });
  }

  // Count current registered (non-waitlisted, non-cancelled) participants
  const { count } = await supabaseAdmin
    .from("participants")
    .select("*", { count: "exact", head: true })
    .eq("meetup_id", meetup_id)
    .eq("is_waitlisted", false)
    .not("status", "in", '("cancelled")');

  const currentCount = count || 0;
  const isWaitlisted = currentCount >= meetup.max_participants;

  // Check waitlist limit
  if (isWaitlisted && meetup.max_waitlist !== null && meetup.max_waitlist !== undefined) {
    const { count: waitlistCount } = await supabaseAdmin
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("meetup_id", meetup_id)
      .eq("is_waitlisted", true)
      .not("status", "eq", "cancelled");

    if ((waitlistCount || 0) >= meetup.max_waitlist) {
      return NextResponse.json({ error: "대기 인원이 가득 찼습니다." }, { status: 409 });
    }
  }

  const token = crypto.randomBytes(8).toString("hex");

  const { data, error } = await supabaseAdmin
    .from("participants")
    .insert({
      meetup_id,
      name,
      phone,
      token,
      status: isWaitlisted ? "waitlisted" : "registered",
      is_waitlisted: isWaitlisted,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, is_waitlisted: isWaitlisted });
}
