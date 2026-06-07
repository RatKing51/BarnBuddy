import React from 'react'
import '../index.css'

export default function LargeAboutMeLanding() {
  return (
    <section className="bg-[#101D42] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-white/14 rounded-2xl p-5 sm:p-8 md:p-10 bg-white/4 shadow-2xl shadow-black/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/12 bg-white/5 shadow-xl shadow-black/25">
                <div className="aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/5] xl:aspect-[5/4]">
                  <img
                    src="/IMG_5761.JPEG"
                    alt="Gage Billinger at a Kansas FFA event"
                    className="h-full w-full object-cover object-[center_38%]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#06112b]/45 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute bottom-4 left-4 rounded-lg border border-white/14 bg-[#07102a]/78 px-4 py-3 backdrop-blur">
                  <p className="text-sm font-semibold">Built by someone in ag</p>
                  <p className="text-xs text-white/72">FFA roots, small-farm focus</p>
                </div>
              </div>
            </div>

            <aside className="w-full flex justify-center lg:justify-start">
              <div className="w-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 sm:p-8 md:p-10 shadow-lg border border-white/10">
                <h3 className="text-white text-2xl sm:text-3xl font-semibold mb-4">About Us</h3>

                <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed mb-6">
                  Hi, I’m <strong>Gage Billinger</strong>, a 16-year-old who lives on a small rural farm in KS where we raise meat goats. I built this site because I know firsthand how hard it is to keep items neat, organized, simple, and useful. So I built this site to help.
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mr-3">
                      <svg className="w-6 h-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-white/80">Built from the farm for the farm</p>
                      <p className="text-xs text-white/60 mt-1">Small farm workflow, made simple</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}
