"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="big-empty route-error">
      <span className="error-mark">!</span>
      <strong>Algo no salió como debía.</strong>
      <p>Tu biblioteca sigue guardada. Puedes volver a intentar cargar esta pantalla.</p>
      <button className="button primary" onClick={reset}>Reintentar</button>
    </section>
  );
}