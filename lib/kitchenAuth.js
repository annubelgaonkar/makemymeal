import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./secure";

export function isKitchen() {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}
export function unauthorized() {
  return NextResponse.json({ error: "Kitchen login required." }, { status: 401 });
}
