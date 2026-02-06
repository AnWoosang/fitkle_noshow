import { cookies } from "next/headers";

const ADMIN_SESSION_TOKEN = "trust-keeper-admin-session";
const ADMIN_USERNAME = "fitkle.official";
const ADMIN_PASSWORD = "Wjsekazlffj12!@";

export function validateCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export async function setAdminSession(): Promise<string> {
  const token = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_TOKEN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return token;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_TOKEN);
  return !!session?.value;
}
