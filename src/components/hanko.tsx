import { useId } from "react";

export type HankoKind = "read" | "favorite";
export type HankoSize = "sm" | "md" | "lg";

/**
 * Sellos rojos inspirados en los hanko japoneses, en SVG puro.
 *
 *  - «Leído»: sello cuadrado (角印) con 読了 (dokuryō, «lectura terminada») en dos filas.
 *  - «Favorito»: sello redondo (丸印) con 好 («gustar», lo que más te gusta).
 *
 * Son sellos de tinta llena con los caracteres «vaciados» (el fondo se ve a través
 * de ellos, así funcionan sobre cualquier superficie) y un marco interior fino.
 * Un filtro de turbulencia deforma ligeramente el borde y deja pequeñas
 * faltas de tinta, como un sello estampado a mano.
 *
 * Accesibilidad: el glifo es decorativo; el nombre accesible es la etiqueta en
 * español («Leído», «Favorito»). El color sale de `--hanko` (≥ 4,6:1 sobre las
 * superficies oscuras). `animate` reproduce el estampado solo si el usuario no
 * ha pedido movimiento reducido (ver globals.css).
 */
const SEALS: Record<HankoKind, { label: string; shape: "square" | "round"; glyphs: string[] }> = {
  read: { label: "Leído", shape: "square", glyphs: ["読", "了"] },
  favorite: { label: "Favorito", shape: "round", glyphs: ["好"] },
};

export function Hanko({
  kind,
  size = "md",
  animate = false,
  label,
}: {
  kind: HankoKind;
  size?: HankoSize;
  /** Reproduce la animación de estampado al montarse. */
  animate?: boolean;
  /** Sobrescribe el nombre accesible (por defecto «Leído» / «Favorito»). */
  label?: string;
}) {
  const seal = SEALS[kind];
  const name = label ?? seal.label;
  // useId devuelve caracteres no válidos para `url(#…)` en algunas versiones.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const inkId = `hanko-ink-${uid}`;
  const maskId = `hanko-mask-${uid}`;

  return (
    <svg
      className="hanko"
      data-kind={kind}
      data-size={size}
      data-stamp={animate || undefined}
      viewBox="0 0 64 64"
      role="img"
      aria-label={name}
    >
      <title>{name}</title>
      <defs>
        <filter id={inkId} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          {/* Borde irregular */}
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="edge" />
          <feDisplacementMap in="SourceGraphic" in2="edge" scale="1.7" xChannelSelector="R" yChannelSelector="G" result="rough" />
          {/* Faltas de tinta: el ruido de baja frecuencia recorta pequeñas motas */}
          <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed="11" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 2.25" result="wear" />
          <feComposite in="rough" in2="wear" operator="in" />
        </filter>

        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          {seal.shape === "square" ? (
            <>
              <rect x="7.5" y="7.5" width="49" height="49" rx="2" fill="none" stroke="#000" strokeWidth="1.6" />
              <text x="32" y="20.5" fontSize="21.5" fill="#000" stroke="#000" strokeWidth=".9">{seal.glyphs[0]}</text>
              <text x="32" y="42.5" fontSize="21.5" fill="#000" stroke="#000" strokeWidth=".9">{seal.glyphs[1]}</text>
            </>
          ) : (
            <>
              <circle cx="32" cy="32" r="24.5" fill="none" stroke="#000" strokeWidth="1.6" />
              <text x="32" y="33" fontSize="31" fill="#000" stroke="#000" strokeWidth="1">{seal.glyphs[0]}</text>
            </>
          )}
        </mask>
      </defs>

      <g filter={`url(#${inkId})`}>
        {seal.shape === "square" ? (
          <rect x="2" y="2" width="60" height="60" rx="4" fill="currentColor" mask={`url(#${maskId})`} />
        ) : (
          <circle cx="32" cy="32" r="30" fill="currentColor" mask={`url(#${maskId})`} />
        )}
      </g>
    </svg>
  );
}
