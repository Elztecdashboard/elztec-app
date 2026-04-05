"use client";

import { useRouter } from "next/navigation";

const MAANDEN = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December"];

export default function MaandNavigatie({
  jaar,
  maand,
  isHuidig,
  basePath,
}: {
  jaar: number;
  maand: number;
  isHuidig: boolean;
  basePath: string;
}) {
  const router = useRouter();

  function navigeer(j: number, m: number) {
    router.push(`${basePath}?jaar=${j}&maand=${m}`);
  }

  function vorige() {
    if (maand === 1) navigeer(jaar - 1, 12);
    else navigeer(jaar, maand - 1);
  }

  function volgende() {
    if (maand === 12) navigeer(jaar + 1, 1);
    else navigeer(jaar, maand + 1);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={vorige}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      >
        ← Vorige
      </button>
      <span className="text-sm font-semibold text-[#001D3A] min-w-[140px] text-center">
        {MAANDEN[maand]} {jaar}
      </span>
      <button
        onClick={volgende}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
      >
        Volgende →
      </button>
      {!isHuidig && (
        <button
          onClick={() => router.push(basePath)}
          className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#001D3A] text-white hover:bg-[#6979D6] transition"
        >
          Huidige maand
        </button>
      )}
    </div>
  );
}
