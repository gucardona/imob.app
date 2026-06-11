export default function PublicSkeleton() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 w-full h-16 sm:h-20 bg-white border-b border-gray-100 px-4 sm:px-8 lg:px-16 z-50 flex items-center justify-between">
        <div className="flex items-center gap-8 animate-pulse">
          <div className="w-32 h-8 bg-gray-200 rounded-lg" />
          <div className="hidden md:flex items-center gap-6">
            <div className="w-14 h-3 bg-gray-100 rounded-full" />
            <div className="w-14 h-3 bg-gray-100 rounded-full" />
            <div className="w-14 h-3 bg-gray-100 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-6 h-6 bg-gray-100 rounded" />
          <div className="w-10 h-10 bg-gray-100 rounded-full" />
        </div>
      </header>

      <main className="pt-16 sm:pt-20">

        {/* ── Hero ── */}
        <section className="relative h-[75vh] w-full bg-gray-200 overflow-hidden animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-300/60 via-gray-200/20 to-transparent" />
          <div className="absolute bottom-20 left-8 lg:left-16 space-y-4">
            <div className="h-14 lg:h-20 bg-gray-300/90 rounded-2xl w-[460px] max-w-[80vw]" />
            <div className="h-14 lg:h-20 bg-gray-300/90 rounded-2xl w-[340px] max-w-[65vw]" />
            <div className="h-4 bg-gray-300/60 rounded-full w-64 max-w-[55vw] mt-1" />
            <div className="h-12 bg-gray-300/90 rounded-xl w-40 mt-2" />
          </div>
        </section>

        {/* ── Search card ── */}
        <div className="max-w-6xl mx-auto px-8 lg:px-0 relative z-10 -mt-12">
          <div className="bg-white rounded-2xl p-4 custom-shadow border border-gray-100 flex flex-col md:flex-row items-center gap-4 animate-pulse">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {[0, 1, 2].map(i => (
                <div key={i} className="px-6 py-3 space-y-2.5">
                  <div className="h-2 bg-gray-100 rounded-full w-20" />
                  <div className="h-4 bg-gray-100 rounded-lg w-32" />
                </div>
              ))}
            </div>
            <div className="w-full md:w-36 h-14 bg-gray-200 rounded-xl flex-shrink-0" />
          </div>
        </div>

        {/* ── Property grid ── */}
        <section className="max-w-7xl mx-auto px-8 lg:px-16 py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-9 bg-gray-100 rounded-xl w-56" />
              <div className="h-4 bg-gray-100 rounded-lg w-72 max-w-full" />
            </div>
            <div className="h-4 bg-gray-100 rounded-full w-20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] bg-gray-100 rounded-2xl mb-6" />
                <div className="space-y-3">
                  <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-3.5 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-3.5 bg-gray-100 rounded-full w-2/3" />
                  <div className="h-6 bg-gray-100 rounded-lg w-28 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
