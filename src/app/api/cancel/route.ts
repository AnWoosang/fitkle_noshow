import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  const { data: participant, error: findError } = await supabaseAdmin
    .from("participants")
    .select("*, meetups(*)")
    .eq("token", token)
    .single();

  if (findError || !participant) {
    return NextResponse.json({ error: "참가 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (participant.status === "cancelled") {
    return NextResponse.json({ error: "이미 취소된 신청입니다." }, { status: 400 });
  }

  if (!["registered", "confirmed", "waitlisted"].includes(participant.status)) {
    return NextResponse.json({ error: "취소할 수 없는 상태입니다." }, { status: 400 });
  }

  // 모임 24시간 전부터는 취소 차단
  const meetupDate = new Date(participant.meetups.date);
  const now = new Date();
  const hoursUntilMeetup = (meetupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilMeetup < 24) {
    return NextResponse.json(
      { error: "모임 24시간 전부터는 취소가 불가능합니다." },
      { status: 400 }
    );
  }

  const wasWaitlisted = participant.is_waitlisted;

  // Cancel the participant
  const { error: updateError } = await supabaseAdmin
    .from("participants")
    .update({ status: "cancelled" })
    .eq("id", participant.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  let promotedParticipant = null;

  // If non-waitlisted participant cancelled, promote first waitlisted
  if (!wasWaitlisted) {
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

      promotedParticipant = nextWaitlisted;
    }
  }

  return NextResponse.json({
    message: "참가가 취소되었습니다.",
    status: "cancelled",
    promoted: promotedParticipant
      ? { id: promotedParticipant.id, name: promotedParticipant.name, phone: promotedParticipant.phone }
      : null,
  });
}
