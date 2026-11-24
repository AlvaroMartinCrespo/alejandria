"use client";

import { useEffect, useState } from "react";

type StarPoint = { x: number; y: number; radius: number };
type Constellation = { left: number; top: number; points: StarPoint[] };

/** Atmósfera espacial muy ligera: una constelación ocasional y nebulosas CSS estáticas. */
export function CosmicAtmosphere() {
  const [constellation, setConstellation] = useState<Constellation | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let spawnTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const clear = () => {
      if (spawnTimer) clearTimeout(spawnTimer);
      if (hideTimer) clearTimeout(hideTimer);
      setConstellation(null);
    };

    const schedule = (initial = false) => {
      if (stopped || reducedMotion.matches || document.hidden) return;
      spawnTimer = setTimeout(() => {
        if (stopped || reducedMotion.matches || document.hidden) return;
        const count = 4 + Math.floor(Math.random() * 3);
        const points: StarPoint[] = Array.from({ length: count }, (_, index) => ({
          x: 24 + index * (230 / (count - 1)) + (Math.random() - 0.5) * 42,
          y: 28 + Math.random() * 112,
          radius: 0.8 + Math.random() * 0.65,
        }));
        const maxLeft = window.innerWidth < 640 ? 50 : 72;
        setConstellation({ left: 2 + Math.random() * (maxLeft - 2), top: 12 + Math.random() * 66, points });
        hideTimer = setTimeout(() => setConstellation(null), 17_000);
        schedule(false);
      }, initial ? 22_000 + Math.random() * 16_000 : 48_000 + Math.random() * 32_000);
    };

    const resume = () => {
      clear();
      if (!reducedMotion.matches && !document.hidden) schedule(true);
    };

    resume();
    reducedMotion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      stopped = true;
      clear();
      reducedMotion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return (
    <div className="cosmic-atmosphere" aria-hidden="true">
      <span className="cosmic-nebula cosmic-nebula-one" />
      <span className="cosmic-nebula cosmic-nebula-two" />
      {constellation && (
        <svg className="cosmic-constellation" viewBox="0 0 280 180" style={{ left: `${constellation.left}%`, top: `${constellation.top}%` }} focusable="false">
          {constellation.points.slice(1).map((point, index) => {
            const previous = constellation.points[index];
            return <line key={`line-${index}`} x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} />;
          })}
          {constellation.points.map((point, index) => <circle key={`star-${index}`} cx={point.x} cy={point.y} r={point.radius} />)}
        </svg>
      )}
    </div>
  );
}
