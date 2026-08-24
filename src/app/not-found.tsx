import Link from "next/link";

export default function NotFound() {
  return (
    <section className="big-empty route-error">
      <span className="error-mark">404</span>
      <strong>Esta página no está en el catálogo.</strong>
      <p>Puede que el enlace haya cambiado o que el libro ya no exista.</p>
      <Link className="button secondary" href="/">Volver a la biblioteca</Link>
    </section>
  );
}