const target = (process.argv[2] || process.env.DEPLOYMENT_URL || "").replace(/\/$/, "");

if (!target || !/^https?:\/\//.test(target)) {
  console.error("Uso: npm run check:deploy -- https://tu-proyecto.vercel.app");
  process.exit(1);
}

const routes = ["/", "/leidos", "/estadisticas", "/exportar", "/anime", "/anime/estadisticas"];
let failed = false;

for (const route of routes) {
  try {
    const response = await fetch(`${target}${route}`, { redirect: "follow" });
    const passed = response.ok && (response.headers.get("content-type") || "").includes("text/html");
    console.log(`${passed ? "✓" : "✗"} ${route} (${response.status})`);
    failed ||= !passed;
  } catch (error) {
    console.log(`✗ ${route} (${error instanceof Error ? error.message : "error de red"})`);
    failed = true;
  }
}

try {
  const response = await fetch(`${target}/api/health`, { cache: "no-store" });
  const data = await response.json();
  const passed = response.ok && data.status === "ok";
  console.log(`${passed ? "✓" : "✗"} /api/health (${data.supabase || response.status})`);
  if (!data.googleBooksKey) console.log("! GOOGLE_BOOKS_API_KEY no configurada; se usará la cuota pública.");
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log("✓ Variables de tiempo real presentes en este entorno (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).");
  } else {
    console.log("! NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no definidas aquí: sin tiempo real (la app sigue funcionando; se refresca al volver a la pestaña).");
    console.log("  Si ya las pusiste en Vercel, ignora este aviso: este script solo ve las de tu terminal.");
  }
  failed ||= !passed;
} catch (error) {
  console.log(`✗ /api/health (${error instanceof Error ? error.message : "respuesta no válida"})`);
  failed = true;
}

if (failed) {
  console.error("\nLa comprobación de despliegue ha fallado.");
  process.exit(1);
}

console.log("\nDespliegue operativo.");