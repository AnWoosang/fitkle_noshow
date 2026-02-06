import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendBulkSMS } from "@/lib/sms";

interface Participant {
  id: string;
  name: string;
  phone: string;
  token: string;
  status: string;
  is_waitlisted: boolean;
}

export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const { meetup_id, type, targets } = body;

  if (!meetup_id || !type) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  // Fetch meetup
  const { data: meetup } = await supabaseAdmin
    .from("meetups")
    .select("*")
    .eq("id", meetup_id)
    .single();

  if (!meetup) {
    return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }

  // Fetch participants
  let query = supabaseAdmin
    .from("participants")
    .select("*")
    .eq("meetup_id", meetup_id)
    .not("status", "eq", "cancelled");

  if (targets && targets.length > 0) {
    query = query.in("id", targets);
  }

  const { data: participants } = await query;
  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "발송 대상이 없습니다." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
  const dateStr = new Date(meetup.date).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timeStr = new Date(meetup.date).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Filter and generate messages based on type
  let targetParticipants: Participant[] = participants;
  const messages: { to: string; text: string }[] = [];

  switch (type) {
    case "registration": {
      for (const p of targetParticipants) {
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임에 신청이 완료되었습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n참석 확정: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "d7": {
      targetParticipants = participants.filter((p: Participant) => p.status !== "confirmed" && !p.is_waitlisted);
      for (const p of targetParticipants) {
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임이 일주일 앞으로 다가왔습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n미리 참석을 확정해주세요: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "d3": {
      targetParticipants = participants.filter((p: Participant) => p.status !== "confirmed" && !p.is_waitlisted);
      for (const p of targetParticipants) {
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임이 3일 앞으로 다가왔습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n미리 참석을 확정해주세요: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "d1": {
      targetParticipants = participants.filter((p: Participant) => p.status !== "confirmed" && !p.is_waitlisted);
      for (const p of targetParticipants) {
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, 내일 ${meetup.title} 모임이 예정되어 있습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n참석 확정: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "dday": {
      targetParticipants = participants.filter((p: Participant) => p.status !== "confirmed" && !p.is_waitlisted);
      for (const p of targetParticipants) {
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, 오늘 ${meetup.title} 모임이 있습니다.\n\n${timeStr}\n${meetup.location}\n\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "waitlist_promote": {
      targetParticipants = participants.filter((p: Participant) => p.is_waitlisted && p.status === "waitlisted");
      if (targetParticipants.length > 0) {
        const p = targetParticipants[0]; // First in waitlist
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임에 자리가 났습니다!\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n참석 확정: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "confirm_reminder": {
      targetParticipants = participants.filter((p: Participant) => p.status === "registered" && !p.is_waitlisted);
      for (const p of targetParticipants) {
        const confirmLink = `${origin}/confirm/${meetup_id}?token=${p.token}`;
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임 참석을 확정해주세요.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n참석 확정: ${confirmLink}\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "waitlist_registration": {
      for (const p of targetParticipants) {
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임 대기 신청이 완료되었습니다.\n\n현재 대기 순번으로 등록되었으며, 참여자가 빠지면 참여 신청 링크를 전송해드리겠습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}`,
        });
      }
      break;
    }
    case "confirmed_complete": {
      for (const p of targetParticipants) {
        const cancelLink = `${origin}/cancel/${meetup_id}?token=${p.token}`;
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임 참석이 확정되었습니다.\n\n${dateStr} ${timeStr}\n${meetup.location}\n\n참석이 어려우시면: ${cancelLink}`,
        });
      }
      break;
    }
    case "cancelled_complete": {
      for (const p of targetParticipants) {
        messages.push({
          to: p.phone.replace(/-/g, ""),
          text: `${p.name}님, ${meetup.title} 모임 참가가 취소되었습니다.\n\n다음 모임에서 뵙겠습니다.`,
        });
      }
      break;
    }
    default:
      return NextResponse.json({ error: "잘못된 발송 유형입니다." }, { status: 400 });
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "발송 대상이 없습니다." }, { status: 400 });
  }

  try {
    const result = await sendBulkSMS(messages);
    return NextResponse.json({
      message: `SMS ${messages.length}건 발송 완료`,
      count: messages.length,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SMS 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
