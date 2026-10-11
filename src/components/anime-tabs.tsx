"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sub-pestañas Seguimiento · Estadísticas, con el estilo de `.stats-tabs`. */
export function AnimeTabs() {
  const pathname = usePathname();
  const onStats = pathname.startsWith("/anime/estadisticas");

  return (
    <nav className="stats-tabs anime-tabs" aria-label="Secciones de anime">
      <Link href="/anime" className={`stats-tab${onStats ? "" : " active"}`} aria-current={onStats ? undefined : "page"}>
        Seguimiento
      </Link>
      <Link href="/anime/estadisticas" className={`stats-tab${onStats ? " active" : ""}`} aria-current={onStats ? "page" : undefined}>
        Estadísticas
      </Link>
    </nav>
  );
}
