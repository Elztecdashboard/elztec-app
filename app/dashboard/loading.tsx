export default function DashboardLoading() {
  return (
    <div className="space-y-8 max-w-6xl animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-32 bg-gray-300 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
        <div className="h-[300px] bg-gray-100 rounded-lg flex items-end gap-2 px-4 pb-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${30 + Math.sin(i * 0.8) * 20 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#001D3A]/10 px-4 py-3 flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded flex-1" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`px-4 py-3 flex gap-4 ${i % 2 === 0 ? "bg-[#eef0fb]/40" : ""}`}>
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <svg className="animate-spin h-4 w-4 text-[#6979D6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Data ophalen uit Exact Online…
      </div>
    </div>
  );
}
