"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <p className="text-red-600 font-semibold text-lg">Er is een fout opgetreden</p>
      <p className="text-gray-500 text-sm max-w-md">{error.message}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
        >
          Opnieuw proberen
        </button>
        <Link
          href="/exact/connect"
          className="bg-[#001D3A] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition"
        >
          Exact Online opnieuw koppelen →
        </Link>
      </div>
    </div>
  );
}
