import { NextResponse } from "next/server";
import { safeEqual, signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/secure";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  const expected = process.env.KITCHEN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "KITCHEN_PASSWORD is not set on the server." }, { status: 500 });
  let body = {};
  try { body = await req.json(); } catch {}
  await new Promise((r) => setTimeout(r, 400)); // slows down password guessing
  if (!safeEqual(String(body.password || ""), expected)) {
    return NextResponse.json({ error: "Wrong kitchen password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, signSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_MAX_AGE });
  return res;
}
