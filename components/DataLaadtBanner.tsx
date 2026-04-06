"use client";

/**
 * Getoond wanneer de Supabase-cache nog leeg is (cold start of eerste deployment).
 * Make.com vult de cache elke 8 minuten automatisch op — gebruikers hoeven
 * niets te doen, alleen de pagina even later opnieuw laden.
 */
export default function DataLaadtBanner() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
      <div className="w-12 h-12 rounded-full bg-[#eef0fb] flex items-center justify-center">
        <svg className="w-6 h-6 text-[#6979D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <div>
        <p className="text-[#001D3A] font-semibold text-lg">Data wordt geladen</p>
        <p className="text-gray-500 text-sm mt-1 max-w-sm">
          De cijfers worden op de achtergrond opgehaald uit Exact Online.
          Ververs deze pagina over 1 minuut.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2.5 bg-[#001D3A] text-white rounded-lg text-sm font-semibold hover:bg-[#6979D6] transition"
      >
        Pagina vernieuwen
      </button>
    </div>
  );
}
