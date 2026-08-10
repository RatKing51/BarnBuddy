import { Link } from "react-router";
import { getSiteAssetUrl } from "../config/siteImages";

export default function LargeAboutMeLanding() {
  return (
    <section className="px-4 py-14 text-white sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f2650] shadow-2xl shadow-black/20">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative min-h-80 overflow-hidden lg:min-h-[34rem]">
            <img
              src={getSiteAssetUrl("IMG_5761.JPEG")}
              alt="BarnBuddy founder Gage Billinger at a Kansas FFA event"
              className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07102a]/80 via-transparent to-transparent" aria-hidden="true" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-[#07102a]/80 p-4 backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-sm">
              <p className="font-bold text-white">Built by someone in agriculture</p>
              <p className="mt-1 text-sm text-slate-300">Kansas FFA roots and firsthand small-farm experience.</p>
            </div>
          </div>

          <div className="flex items-center p-6 sm:p-9 lg:p-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">The story behind BarnBuddy</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Farm software should understand the farm.</h2>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                I&apos;m Gage Billinger. My family raises meat goats on a small rural Kansas farm, and I saw how quickly health notes, dates, and project records could scatter across notebooks and spreadsheets.
              </p>
              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                I built BarnBuddy to keep those details together in a system that is straightforward enough for everyday chores and capable enough to grow with your herd.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/aboutus"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-500"
                >
                  Read our story
                </Link>
                <span className="text-sm font-semibold text-slate-400">Doing for the Small</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
