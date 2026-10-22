import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isKitchen, unauthorized } from "@/lib/kitchenAuth";
import { toPublic } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isKitchen()) return unauthorized();
  const { rows } = await query(
    `SELECT * FROM orders WHERE status <> 'delivered' OR delivered_at > now() - interval '3 days' ORDER BY created_at DESC LIMIT 300`
  );
  return NextResponse.json({ orders: rows.map((r) => toPublic(r, { forKitchen: true })) });
}
