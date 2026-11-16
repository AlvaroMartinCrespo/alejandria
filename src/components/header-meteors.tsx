"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function HeaderMeteors() {
  const pathname = usePathname();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<HTMLElement, Animation>();
    const decorated = new Set<HTMLElement>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    function stop() {
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    }

    function spawn() {
      if (reducedMotion.matches || document.hidden) return;
      const headers = Array.from(document.querySelectorAll<HTMLElement>(".page-shell .page-heading"));
      const available = headers.filter((header) => {
        const bounds = header.getBoundingClientRect();
        return !animations.has(header) && bounds.bottom > 0 && bounds.top < window.innerHeight;
      });
      const header = available[Math.floor(Math.random() * available.length)];
      if (header) {
        const { width, height } = header.getBoundingClientRect();
        const trail = Math.min(32 + Math.random() * 36, width * .2);
        const startX = trail + Math.random() * Math.max(0, width - trail * 2);
        const startY = Math.random() * height * .2;
        const distance = Math.min(startX - 8, width * (.2 + Math.random() * .35));
        const fall = Math.min(height - startY - 8, distance * (.55 + Math.random() * .35));
        const angle = Math.atan2(fall, distance) * 180 / Math.PI;
        const transform = (progress: number) =>
          `translate3d(${startX - distance * progress}px, ${startY + fall * progress}px, 0) rotate(${-angle}deg)`;
        header.style.setProperty("--meteor-width", `${trail}px`);
        decorated.add(header);
        const animation = new Animation(new KeyframeEffect(header, [
          { transform: transform(0), opacity: 0, offset: 0 },
          { transform: transform(.2), opacity: .65, offset: .2 },
          { transform: transform(1), opacity: 0, offset: 1 },
        ], {
          duration: 1100 + Math.random() * 1200,
          easing: "linear",
          pseudoElement: "::after",
        }), document.timeline);
        animations.set(header, animation);
        animation.onfinish = () => {
          animations.delete(header);
          animation.cancel();
        };
        animation.play();
      }
      timer = setTimeout(spawn, 1200 + Math.random() * 3000);
    }

    function resume() {
      stop();
      if (!reducedMotion.matches && !document.hidden) {
        timer = setTimeout(spawn, 700 + Math.random() * 1400);
      }
    }

    resume();
    reducedMotion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      decorated.forEach((header) => header.style.removeProperty("--meteor-width"));
    };
  }, [pathname]);

  return null;
}