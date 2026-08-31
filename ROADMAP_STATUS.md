# Estado del roadmap

Actualizado: 24 de agosto de 2026.

## Fase 0 - Preparación

- [x] Proyecto Next.js con TypeScript, App Router y Tailwind CSS.
- [x] Plantilla de variables en `.env.local.example`.
- [ ] Crear el proyecto remoto de Supabase y obtener sus credenciales.
- [ ] Crear o conectar el repositorio de GitHub.
- [ ] Conectar el repositorio con Vercel.

## Fase 1 - Modelo Supabase

- [x] Modelo TypeScript completo.
- [x] Esquema SQL idempotente para crear tabla, restricciones e índices.
- [x] RLS activado sin acceso público; clave privada limitada al servidor.
- [ ] Ejecutar `supabase/schema.sql` en un proyecto real.

## Fases 2 a 4 - Diseño, Google Books y home

- [x] Sistema visual oscuro responsive y componentes reutilizables.
- [x] Búsqueda normalizada en Google Books mediante una ruta servidor.
- [x] Alta de libros con prevención de duplicados.
- [x] Lectura actual, progreso, pendientes, favoritos y acceso a leídos.
- [x] Acciones rápidas que ocultan el estado actual.

## Fase 5 - Reordenación

- [x] Drag & drop de pendientes con persistencia del orden.
- [x] Alternativa accesible con botones para móvil y teclado.
- [x] Feedback visual durante el arrastre.

Se usa la API nativa del navegador en lugar de `dnd-kit` porque no se pueden instalar paquetes en este entorno.

## Fases 6 a 8 - Archivo, detalle y búsqueda

- [x] Leídos agrupados por año.
- [x] Búsqueda y ordenación global sobre todos los años.
- [x] Detalle con portada, metadatos, estado, puntuación, sinopsis y eliminación.
- [x] Buscador global por título y autor con etiquetas de estado.

## Fases 9 y 10 - Estadísticas y backup

- [x] Totales, páginas, autor más leído, media y gráfico anual.
- [x] Exportación completa a JSON.
- [x] Restauración JSON con mezcla de duplicados.
- [x] Vista imprimible de toda la biblioteca agrupada por estado para guardar como PDF.

## Fase 11 - Pulido

- [x] Diseño móvil, tablet y escritorio.
- [x] Transiciones CSS y feedback visual.
- [x] Skeletons y estados vacíos.
- [x] Avisos de operaciones y recuperación de errores.
- [x] Límites globales de carga, error y página no encontrada.
- [ ] Prueba visual en navegador y prueba completa contra Supabase real.

No es posible ejecutar Next.js en este entorno sin `node_modules`, y se ha respetado la restricción de no instalar paquetes.

## Fase 12 - Despliegue

- [x] Cabeceras HTTP de seguridad y ocultación de `X-Powered-By`.
- [x] Endpoint `/api/health` para comprobar Supabase sin exponer secretos.
- [x] Smoke test `npm run check:deploy -- URL` para las rutas de producción.
- [x] Guía operativa en `DEPLOYMENT.md`.
- [ ] Configurar las variables reales en Vercel.
- [ ] Desplegar.
- [ ] Ejecutar la prueba completa en producción.
- [ ] Activar Vercel Deployment Protection si se necesita privacidad real sin login.

## Extras

- [x] PWA instalable sin dependencias adicionales.
- [x] Modo “Sorpréndeme”.
- [x] Progreso de lectura.
- [x] Notas personales.