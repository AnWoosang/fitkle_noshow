import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { host_name, host_phone, title, description, date, location, max_participants, max_waitlist, fee_display, host_id } = body;

  if (!host_name || !host_phone || !title || !date || !location) {
    return NextResponse.json({ error: "필수 항목을 모두 입력해주세요." }, { status: 400 });
  }

  const host_code = crypto.randomBytes(4).toString("hex");

  const { data, error } = await supabaseAdmin
    .from("meetups")
    .insert({
      host_name,
      host_phone,
      host_code,
      title,
      description: description || null,
      date,
      location,
      max_participants: max_participants || 10,
      max_waitlist: max_waitlist !== undefined ? max_waitlist : null,
      fee_display: fee_display || null,
      host_id: host_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
