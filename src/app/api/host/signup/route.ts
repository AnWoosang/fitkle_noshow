import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password, name, email, phone } = body;

  if (!username || !password || !name || !email || !phone) {
    return NextResponse.json(
      { error: "모든 항목을 입력해주세요." },
      { status: 400 }
    );
  }

  if (username.length < 4) {
    return NextResponse.json(
      { error: "아이디는 4자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  // Check username uniqueness
  const { data: existing } = await supabaseAdmin
    .from("hosts")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 아이디입니다." },
      { status: 409 }
    );
  }

  const authEmail = `${username}@app.trustkeeper.com`;

  // Create auth user using admin client
  const adminAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } =
    await adminAuth.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 500 }
    );
  }

  // Create host profile
  const { error: profileError } = await supabaseAdmin.from("hosts").insert({
    id: authData.user.id,
    username,
    name,
    email,
    phone,
  });

  if (profileError) {
    // Rollback: delete the auth user
    await adminAuth.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "프로필 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId: authData.user.id });
}
