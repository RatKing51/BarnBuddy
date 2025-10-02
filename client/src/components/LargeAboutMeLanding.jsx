import React from 'react'
import '../index.css'

export default function LargeAboutMeLanding() {
  return (
    <section className="bg-[#101D42] text-white py-16">
      <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Outer border wrapper */}
        <div className="border border-white/30 rounded-xl p-6 sm:p-8 md:p-10 bg-[#101D42]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left: Responsive visual placeholder */}
            <div className="w-full flex justify-center lg:justify-end">
              <div className="w-full h-64 sm:h-80 md:h-[24rem] lg:h-[30rem] xl:h-[36rem] bg-white/5 border border-white/10 rounded-xl flex items-center justify-center p-6 shadow-inner">
                <span className="text-white/40 text-base sm:text-lg lg:text-xl">Image or graphic goes here</span>
              </div>
            </div>

            {/* Right: Responsive About card */}
            <aside className="w-full flex justify-center lg:justify-start">
              <div className="w-full bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 sm:p-8 md:p-10 shadow-lg border border-white/10">
                <h3 className="text-white text-2xl sm:text-3xl font-semibold mb-4">About Us</h3>

                <p className="text-white/90 text-sm sm:text-base lg:text-lg leading-relaxed mb-6">
                  Hi, I’m <strong>Gage Billings</strong>, a 16-year-old living and working on a small farm located in the United States. I built this site because I know firsthand how hard it is to keep items neat, organized, simple, and useful. So I built this site to help.
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