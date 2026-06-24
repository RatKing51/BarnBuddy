import React, { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { landingCarouselSlides } from '../data/carouselSlides'
import PwaInstallButton from './PwaInstallButton'
import '../index.css'
import { getSiteAssetUrl, resolveSiteImageUrl } from '../config/siteImages'

export default function LargeLandingCard({ slides = landingCarouselSlides }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const { isLoaded, isSignedIn } = useAuth()
  const showSignUp = isLoaded && !isSignedIn
  const previewSlides = slides.length ? slides : landingCarouselSlides

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % previewSlides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [previewSlides.length])

  useEffect(() => {
    if (activeSlide > previewSlides.length - 1) setActiveSlide(0)
  }, [activeSlide, previewSlides.length])

  const goToSlide = (index) => setActiveSlide(index)
  const showPrevious = () => setActiveSlide((current) => (current === 0 ? previewSlides.length - 1 : current - 1))
  const showNext = () => setActiveSlide((current) => (current + 1) % previewSlides.length)

  return (
    <div className="bg-[#101D42] text-white py-12 px-6 lg:py-20 lg:px-12 overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
        <div className="space-y-6 lg:space-y-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold">Why Us?</h2>

          <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed">
            BarnBuddy is a livestock management platform built for small farmers, FFA and 4-H members, and hobby ranchers. It replaces paper records with a single, easy-to-use system for tracking health, vaccinations, breeding cycles, and overall herd performance.
          </p>

          <p className="text-sm sm:text-base lg:text-lg opacity-90">
            Get clear herd histories, automated reminders, and simple reporting so you can spend less time on paperwork and more time with your animals.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showSignUp && (
              <a
                href="/signup"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-500 px-6 py-3 text-base font-medium text-white shadow-md transition-colors hover:bg-blue-600 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                aria-label="Sign up for BarnBuddy"
              >
                Sign Up
              </a>
            )}
            <PwaInstallButton />
          </div>

        </div>

        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-full md:max-w-2xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-blue-500/14 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-[#07102a] shadow-2xl shadow-black/35">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white px-5 py-4">
                <img src={getSiteAssetUrl("bblogo.png")} alt="BarnBuddy logo" className="h-10 w-auto object-contain" />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label="Show previous screenshot"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    &lsaquo;
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    aria-label="Show next screenshot"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>

              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {previewSlides.map((slide) => (
                    <figure key={slide.image} className="w-full shrink-0">
                      <div className="px-4 pt-4">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1425]">
                          <img
                            src={resolveSiteImageUrl(slide.image)}
                            alt={slide.alt}
                            className="aspect-[16/10] h-auto w-full object-cover object-left-top"
                          />
                        </div>
                      </div>
                      <figcaption className="flex min-h-24 flex-col justify-center px-5 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">{slide.eyebrow}</p>
                        <h3 className="mt-1 text-xl font-semibold text-white">{slide.title}</h3>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 border-t border-white/10 px-5 py-4">
                {previewSlides.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`Show ${slide.eyebrow} screenshot`}
                    className={`h-2.5 rounded-full transition-all ${
                      activeSlide === index ? 'w-8 bg-blue-400' : 'w-2.5 bg-white/28 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
