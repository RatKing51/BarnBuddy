import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

export default function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector('.bb-marketing');
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo('.bb-hero-heading', { opacity: 0.7, y: 12 }, {
          opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: 'opacity,transform',
        });
        gsap.from('.bb-product-preview', {
          y: 24, opacity: 0.35, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,transform',
        });
        gsap.utils.toArray('[data-reveal]').forEach(element => {
          gsap.fromTo(element, { opacity: 0.45, y: 36 }, {
            opacity: 1, y: 0, ease: 'none',
            scrollTrigger: { trigger: element, start: 'clamp(top bottom)', end: 'clamp(top 70%)', scrub: 0.25 },
          });
        });
      }, root);
      return () => context.revert();
    });
    const pointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis;
    let tick;
    function syncScrolling() {
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = undefined;
      tick = undefined;
      if (pointer.matches && !reducedMotion.matches) {
        lenis = new Lenis({ duration: 0.65, smoothWheel: true, anchors: false });
        lenis.on('scroll', ScrollTrigger.update);
        tick = time => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
      }
    }
    syncScrolling();
    function scrollToSection(event) {
      const target = document.getElementById(event.detail?.id);
      if (!lenis || !target) return;
      event.preventDefault();
      // Lenis already honors the section's CSS scroll-margin-top.
      lenis.scrollTo(target, { duration: 0.65, force: true });
    }
    window.addEventListener('barnbuddy:scroll-to', scrollToSection);
    pointer.addEventListener('change', syncScrolling);
    reducedMotion.addEventListener('change', syncScrolling);
    const refresh = () => ScrollTrigger.refresh();
    // Images and font swaps can change trigger positions after the first render.
    root?.addEventListener('load', refresh, true);
    let alive = true;
    document.fonts.ready.then(() => { if (alive) refresh(); });
    return () => {
      alive = false;
      window.removeEventListener('barnbuddy:scroll-to', scrollToSection);
      root?.removeEventListener('load', refresh, true);
      pointer.removeEventListener('change', syncScrolling);
      reducedMotion.removeEventListener('change', syncScrolling);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      media.revert();
    };
  }, []);
  return null;
}
