// Adapted from React Bits FadeContent by David Haz. See THIRD_PARTY_NOTICES.md.
// Uses visible defaults, reduced-motion support, and scoped GSAP cleanup.
import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function FadeContent({ children, className = '' }) {
  const ref = useRef(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(ref.current, { opacity: 0.65, y: 16 }, {
        opacity: 1, y: 0, duration: 0.65, ease: 'power2.out',
        scrollTrigger: { trigger: ref.current, start: 'top 92%', once: true },
        clearProps: 'opacity,transform',
      });
    });
    return () => media.revert();
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}
