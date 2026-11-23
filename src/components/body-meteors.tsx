"use client";

import { useEffect, useRef } from "react";

// Estrellas fugaces por toda la página. Capa fija (position: fixed, z-index: -1) detrás
// del contenido y sin eventos de puntero: no afecta al layout, al scroll ni a los clics.
// Misma estética que las del header (estela de 2px que se desvanece, caída en diagonal).
export function BodyMeteors() {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sky = layer.current;
    if (!sky) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const active = new Set<Animation>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    function stop() {
      clearTimeout(timer);
      active.forEach((animation) => animation.cancel());
      active.clear();
      sky?.replaceChildren();
    }

    function spawn() {
      if (!sky || reducedMotion.matches || document.hidden) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (active.size < 3) {
        const trail = 36 + Math.random() * 44;
        const startX = trail + Math.random() * Math.max(0, width - trail * 2);
        const startY = Math.random() * height * .55;
        const distance = Math.min(startX - 8, width * (.12 + Math.random() * .22));
        const fall = Math.min(height - startY - 8, distance * (.55 + Math.random() * .35));
        const angle = Math.atan2(fall, distance) * 180 / Math.PI;
        const transform = (progress: number) =>
          `translate3d(${startX - distance * progress}px, ${startY + fall * progress}px, 0) rotate(${-angle}deg)`;
        const meteor = document.createElement("span");
        meteor.className = "body-meteor";
        meteor.style.width = `${trail}px`;
        sky.appendChild(meteor);
        const animation = meteor.animate([
          { transform: transform(0), opacity: 0, offset: 0 },
          { transform: transform(.2), opacity: .6, offset: .2 },
          { transform: transform(1), opacity: 0, offset: 1 },
        ], { duration: 1100 + Math.random() * 1200, easing: "linear" });
        active.add(animation);
        animation.onfinish = animation.oncancel = () => {
          active.delete(animation);
          meteor.remove();
        };
      }
      timer = setTimeout(spawn, 1800 + Math.random() * 3600);
    }

    function resume() {
      stop();
      if (!reducedMotion.matches && !document.hidden) {
        timer = setTimeout(spawn, 900 + Math.random() * 1600);
      }
    }

    resume();
    reducedMotion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return <div ref={layer} className="body-meteors" aria-hidden="true" />;
}
