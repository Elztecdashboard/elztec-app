import { NextRequest, NextResponse } from "next/server";
import { refreshExactTokenProactive } from "@/lib/exact-client";

// Vercel stuurt automatisch "Authorization: Bearer {CRON_SECRET}" mee bij cron-aanroepen
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
