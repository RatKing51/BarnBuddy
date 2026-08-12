import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router";
import { landingCarouselSlides } from "../data/carouselSlides";
import PwaInstallButton from "./PwaInstallButton";
import { resolveSiteImageUrl } from "../config/siteImages";

export default function LargeLandingCard({ slides = landingCarouselSlides }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const previewSlides = slides.length ? slides : landingCarouselSlides;

  useEffect(() => {
    if (!autoRotate || interactionPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % previewSlides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [autoRotate, interactionPaused, previewSlides.length]);

  useEffect(() => {
    if (activeSlide > previewSlides.length - 1) setActiveSlide(0);
  }, [activeSlide, previewSlides.length]);

  const showPrevious = () => setActiveSlide((current) => (current === 0 ? previewSlides.length - 1 : current - 1));
  const showNext = () => setActiveSlide((current) => (current + 1) % previewSlides.length);

  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-12 text-white sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
      <div className="public-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 xl:gap-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
            Built for smaller livestock operations
          </div>
          <h1 className="mt-6 text-4xl font-black leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
            Livestock records that stay useful after chores begin.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Keep animal details, health history, care dates, and herd records in one dependable place—without the complexity of enterprise farm software.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {isLoaded && !isSignedIn && (
              <Link
                to="/signup"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-bold text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500"
              >
                Start free
              </Link>
            )}
            {isLoaded && isSignedIn && (
              <Link
                to="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-bold text-white shadow-xl shadow-blue-950/30 transition hover:bg-blue-500"
              >
                Open your dashboard
              </Link>
            )}
            <a
              href="#features"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 font-bold text-white transition hover:border-white/25 hover:bg-white/10"
            >
              See what it tracks
            </a>
            <PwaInstallButton />
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {["Simple to start", "Made for the barn", "Works on any device"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300" aria-hidden="true">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl justify-center lg:justify-end">
          <div className="relative w-full">
            <div className="absolute -inset-5 rounded-[2.25rem] bg-blue-500/15 blur-3xl" aria-hidden="true" />
            <div
              className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#07102a] p-2 shadow-2xl shadow-black/40 sm:p-3"
              role="region"
              aria-roledescription="carousel"
              aria-label="BarnBuddy feature screenshots"
              onMouseEnter={() => setInteractionPaused(true)}
              onMouseLeave={() => setInteractionPaused(false)}
              onFocusCapture={() => setInteractionPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
              }}
            >
              <div className="flex items-center justify-between gap-3 rounded-t-[1.25rem] border-b border-white/10 bg-[#0f2650] px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-[10px] font-black">BB</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">BarnBuddy dashboard</p>
                    <p className="truncate text-[11px] text-slate-400">Your herd, clearly organized</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={showPrevious}
                    aria-label="Show previous screenshot"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    aria-label="Show next screenshot"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoRotate((current) => !current)}
                    aria-label={autoRotate ? "Pause screenshot rotation" : "Resume screenshot rotation"}
                    className="hidden h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 sm:inline-flex"
                  >
                    {autoRotate ? "Pause" : "Play"}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden" aria-live={autoRotate ? "off" : "polite"}>
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {previewSlides.map((slide, index) => (
                    <figure key={slide.image} className="w-full shrink-0" aria-hidden={activeSlide !== index}>
                      <div className="bg-[#091226] p-2 sm:p-3">
                        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b1425]">
                          <img
                            src={resolveSiteImageUrl(slide.image)}
                            alt={slide.alt}
                            loading={index === 0 ? "eager" : "lazy"}
                            className="aspect-[16/10] h-auto w-full object-cover object-left-top"
                          />
                        </div>
                      </div>
                      <figcaption className="flex min-h-20 items-center justify-between gap-4 border-t border-white/10 px-4 py-3 sm:px-5">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">{slide.eyebrow}</p>
                          <p className="mt-1 text-base font-bold text-white sm:text-lg">{slide.title}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-500">{index + 1} / {previewSlides.length}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 border-t border-white/10 px-4 py-2">
                {previewSlides.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Show ${slide.eyebrow} screenshot`}
                    aria-current={activeSlide === index ? "true" : undefined}
                    className="group grid h-9 w-10 place-items-center rounded-full"
                  >
                    <span aria-hidden="true" className={`h-2 rounded-full transition-all ${
                      activeSlide === index ? "w-7 bg-blue-400" : "w-2 bg-white/25 group-hover:bg-white/50"
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
