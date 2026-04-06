import { NextRequest, NextResponse } from "next/server";
import {
  warmTransactionLines,
  warmSalesInvoices,
  warmReceivables,
} from "@/lib/exact-client";

// Vercel Hobby: max 60s per serverless function.
// tx-current/prev halen 12 periodes op (~5-8s) — verhoog limiet voor zekerheid.
export const maxDuration = 60;

/**
 * Cache warm-up endpoint — wordt aangeroepen door Make.com elke 10 minuten.
 * Vult de Supabase cache proactief, zodat gebruikers nooit wachten op
 * een cold start en nooit 429-fouten zien.
 *
 * Gebruik: GET /api/exact/warm-cache?key=<sleutel>
 * Sleutels: tx-current, tx-prev, si-current, si-prev, recv
 *
 * Make.com roept elke sleutel sequentieel aan (één HTTP module per sleutel)
 * om Exact Online rate limits te voorkomen.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get("key");
  const nu = new Date();
  const huidigJaar = nu.getFullYear();
  const vorigJaar = huidigJaar - 1;

  try {
    let count = 0;

    switch (key) {
      case "tx-current":
        count = await warmTransactionLines(huidigJaar);
        break;
      case "tx-prev":
        count = await warmTransactionLines(vorigJaar);
        break;
      case "si-current":
        count = await warmSalesInvoices(huidigJaar);
        break;
      case "si-prev":
        count = await warmSalesInvoices(vorigJaar);
        break;
      case "recv":
        count = await warmReceivables();
        break;
      default:
        return NextResponse.json(
          {
            error: "Onbekende cache key",
            geldig: ["tx-current", "tx-prev", "si-current", "si-prev", "recv"],
          },
          { status: 400 }
        );
    }

    console.log(`[warm-cache] ${key}: ${count} items gecached`);
    return NextResponse.json({ ok: true, key, count, cachedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[warm-cache]", key, e);
    return NextResponse.json({ ok: false, key, error: String(e) }, { status: 500 });
  }
}
