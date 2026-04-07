import { NextRequest, NextResponse } from "next/server";
import { refreshExactTokenProactive } from "@/lib/exact-client";

export const dynamic = "force-dynamic"; // Nooit cachen

// Vercel stuurt automatisch "Authorization: Bearer {CRON_SECRET}" mee bij cron-aanroepen
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshExactTokenProactive();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/exact-refresh]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
