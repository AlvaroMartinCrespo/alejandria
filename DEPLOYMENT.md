# Despliegue en producción

## 1. Exportar Appwrite antes del cambio

En la versión todavía conectada a Appwrite, abre **Estadísticas** y pulsa **JSON**. Guarda ese archivo antes de cambiar las variables o desplegar esta versión. La importación nueva acepta tanto ese array antiguo como el backup versionado actual.

El JSON contiene todos los datos funcionales: ID, ID de Google Books, título, autores, portada, publicación, páginas, sinopsis, estado, favorito, orden, puntuación, año de finalización, fecha de alta, progreso y notas.

## 2. Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Abre **SQL Editor**, pega el contenido de `supabase/schema.sql` y ejecútalo.
3. En **Project Settings → API**, copia la URL del proyecto y la clave `service_role`.
4. Configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en Vercel.

La tabla usa RLS sin políticas públicas. La clave `service_role` solo se utiliza en el servidor y nunca debe llevar el prefijo `NEXT_PUBLIC_`.

## 3. Publicar en GitHub

Crea un repositorio vacío y conecta este proyecto:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git add .
git commit -m "Complete personal library application"
git push -u origin main
```

Revisa los archivos antes de confirmar. `.env.local` está ignorado y no debe subirse.

## 4. Crear el proyecto de Vercel

1. En Vercel, elige **Add New → Project** e importa el repositorio.
2. Mantén el framework detectado como Next.js y los comandos predeterminados.
3. Añade estas variables para Production, Preview y Development:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_BOOKS_API_KEY
```

`GOOGLE_BOOKS_API_KEY` es opcional. Ninguna clave privada debe llevar el prefijo `NEXT_PUBLIC_`.

## 4 bis. Migración de Anime (instalaciones existentes)

Antes de desplegar la versión con anime, pega `supabase/migration-anime.sql` en **Supabase → SQL Editor → Run**. Es aditiva e idempotente: crea la tabla `anime` y la función `reorder_anime` sin tocar `books`, `collections` ni `reorder_books`. Sin la migración los libros funcionan igual y `/anime` muestra el aviso "Falta aplicar la migración de anime en Supabase". No hacen falta variables de entorno nuevas: la búsqueda usa Jikan y AniList sin clave.

Rutas nuevas: `/anime`, `/anime/[id]`, `/anime/estadisticas`, `/api/anime`, `/api/anime/[id]`, `/api/anime/reorder`, `/api/anime/import` y `/api/anime-search`. Las mutaciones exigen sesión de edición (401 si está bloqueada).

Desde la versión con anime, **JSON** exporta copias `version: 3` que incluyen `anime`. La restauración acepta copias v1, v2 y v3 (también las que solo traen anime) y siempre mezcla: nunca borra datos existentes. El PDF de **/exportar** incluye los grupos de anime debajo de los libros.

## 4 ter. Migración del calendario de lectura (instalaciones existentes)

Antes de desplegar la pestaña **Estadísticas → Calendario**, pega `supabase/migration-reading-log.sql` en **Supabase → SQL Editor → Run**. Es aditiva e idempotente: crea la tabla `reading_log` y la función `log_reading_activity` sin tocar el resto. Sin la migración los libros siguen funcionando (el servidor ignora el fallo al registrar) y `/api/health` devuelve `readingLog: "missing"`.

- Variable opcional `ALEJANDRIA_TIMEZONE` (por defecto `Europe/Madrid`): decide a qué día pertenece cada lectura, porque Vercel corre en UTC.
- Cuenta como lectura: cambiar el progreso y cambiar el estado (*Leyendo*, *Leído*, etc.). Notas, valoración y favorito no cuentan (constante `COUNT_METADATA_AS_ACTIVITY` en `src/lib/reading-activity.ts`).
- El historial empieza el día de la migración; las lecturas anteriores no tienen fecha exacta.
- **JSON** exporta ahora copias `version: 4` con `activity`. La restauración sigue aceptando v1-v3 (sin historial) y siempre mezcla.
- **Días marcados a mano** (para igualar, por ejemplo, la racha de Kindle): ejecuta también `supabase/migration-reading-marks.sql`, que crea la tabla `reading_marks`. En **Calendario → Igualar la racha de Kindle** (con la edición desbloqueada) se marcan los últimos N días terminando hoy; también se puede marcar o quitar un día suelto desde su detalle. Estos días cuentan para las rachas y van en el JSON (`marks`). Sin esa migración, el calendario funciona igual pero no se pueden guardar días marcados.
- Rutas: `GET /api/activity` (devuelve `entries` y `marks`), `POST /api/activity/import` y `POST /api/activity/marks` (estas dos exigen sesión de edición).
- Pruebas de la lógica pura: `npm test`.

## 5. Importar la copia

Despliega la aplicación, abre **Estadísticas → Restaurar** y selecciona el JSON descargado de Appwrite. La operación conserva los IDs y fechas originales, actualiza coincidencias y no duplica libros con el mismo ID de Google Books.

## 6. Proteger el acceso

La URL no listada no es autenticación. Si la biblioteca debe ser privada, activa **Deployment Protection** en Vercel. Las rutas API usan la API key en servidor, pero cualquier visitante que alcance la aplicación puede invocarlas porque el producto no tiene login.

## 7. Evitar que el proyecto gratuito se pause

El archivo `vercel.json` programa una llamada diaria a `/api/health`. Esa ruta hace una consulta mínima a Supabase para mantener actividad. Los cron jobs se activan al desplegar la rama de producción en Vercel; comprueba en el panel de Vercel que aparece el cron después del despliegue.

## 8. Verificar el despliegue

Ejecuta la comprobación sin dependencias adicionales:

```bash
npm run check:deploy -- https://TU_PROYECTO.vercel.app
```

El comando comprueba inicio, leídos, estadísticas, exportación y `/api/health`. Después realiza manualmente el flujo final:

1. Busca y añade un libro.
2. Cámbialo a Leyendo y guarda el progreso.
3. Muévelo a Leído, asigna año y puntuación.
4. Reordena dos pendientes.
5. Exporta JSON y PDF.
6. Restaura el JSON y confirma que no crea duplicados.
7. Abre `/anime`, desbloquea la edición y prueba un alta (búsqueda y manual), escribir temporada y capítulo, reordenar y cambiar estados.

## Puntuación 0-10

Si la base de datos viene de la versión con puntuación sobre 5, pega `supabase/migration-rating-10.sql` en **Supabase → SQL Editor → Run** antes de desplegar. Amplía el límite a 10 y duplica las valoraciones existentes; es idempotente (no las duplica dos veces). Las copias JSON antiguas (escala 1-5) se restauran tal cual, sin duplicar.


## Copias de seguridad por correo

Cada **14 días** se envía por correo (Resend) la copia **JSON** completa de la biblioteca (formato v5: libros, carpetas, anime, historial y días marcados). No se envía PDF. El archivo se llama `alejandria-backup-YYYY-MM-DD.json` y el correo trae un resumen con el número de libros y anime.

### Puesta en marcha

1. **Supabase:** pega `supabase/migration-backup-log.sql` en **SQL Editor → Run** (aditiva e idempotente; una instalación nueva con `schema.sql` ya la incluye). Sin esta tabla **no se envía nada** (así el cron no reenviaría la copia cada día) y `/api/health` devuelve `lastBackup: "missing"`.
2. **Resend:** crea una API key y verifica el dominio (o usa el remitente de pruebas de Resend, que solo entrega a tu propia cuenta).
3. **Variables de entorno** (Vercel → Settings → Environment Variables, y `.env.local` en local; nunca en el repositorio):

| Variable | Para qué |
| --- | --- |
| `CRON_SECRET` | Secreto largo y aleatorio. Vercel lo envía como `Authorization: Bearer …` al cron. Sin él, la ruta responde 503. |
| `RESEND_API_KEY` | Clave de Resend. |
| `BACKUP_EMAIL_TO` | Destino (varias direcciones separadas por comas). Usa un buzón privado: el JSON lleva tus notas y el correo no va cifrado. |
| `BACKUP_EMAIL_FROM` | Remitente verificado en Resend, p. ej. `Alejandría <backup@tu-dominio.com>`. |
| `BACKUP_EVERY_DAYS` | Opcional, por defecto 14 (1-365). |
| `ALEJANDRIA_TIMEZONE` | Opcional, por defecto `Europe/Madrid`. Decide la fecha del archivo y el cómputo de días. |

4. Redespliega. `vercel.json` ya incluye el cron.

### Cómo funciona

- `vercel.json` ejecuta `/api/cron/backup` **a diario a las 07:00 UTC** (08:00 en invierno, 09:00 en verano en Madrid). Solo envía si han pasado `BACKUP_EVERY_DAYS` **días naturales** (en `ALEJANDRIA_TIMEZONE`) desde el último envío correcto; el resto de días no hace nada.
- La ruta solo acepta `Authorization: Bearer $CRON_SECRET`. La cookie de edición no la autoriza.
- Cada intento (éxito o error) queda en `backup_log` con fecha, origen, nº de libros y anime, tamaño del JSON y mensaje de error. Si un envío falla no se registra ningún éxito, así que **el cron reintenta al día siguiente**.
- Si no se pueden leer el historial o los días marcados, la copia sale igualmente con `omitted` y el correo lo avisa. Si fallan libros, carpetas o anime, no se envía nada y queda registrado.
- Límite: el adjunto no puede superar 30 MB (Resend admite 40 MB tras codificar en base64).
- `/api/health` incluye `lastBackup` (fecha ISO del último envío correcto, `null` si nunca).

### Probarlo a mano

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tu-app.vercel.app/api/cron/backup
```

Respuestas: `{"status":"sent",…}` (envió), `{"status":"skipped","nextDueDate":"…"}` (aún no toca) o `{"status":"error","stage":"…","error":"…"}` (código 500). Para forzar un envío antes de plazo, borra o renombra temporalmente la última fila `success` de `backup_log`, o usa el botón «Enviar copia ahora» de Estadísticas (ver abajo).

### Envío manual desde Estadísticas

Al final de **Estadísticas** hay un bloque «Copia por correo» con la fecha de la última copia enviada correctamente y cuándo toca la siguiente automática. Con la sesión de edición desbloqueada aparece el botón **«Enviar copia ahora»**, que llama a `POST /api/backup/send` (protegido con `hasEditorSession()`; 401 sin sesión) y fuerza el envío sin esperar los 14 días.

- El envío manual se registra en `backup_log` con `trigger = manual`. Cuenta como último envío correcto, así que **el plazo de 14 días del cron se reinicia desde esa copia**.
- Si falla, el botón muestra el error y no se registra ningún éxito (el cron sigue reintentando a diario).
- `GET /api/backup/status` devuelve solo fechas, recuentos y si la configuración está completa (nunca claves ni direcciones). Responde 503 si falta `backup_log`.

### Pruebas

`npm test` incluye `scripts/test-email.mjs` (Resend con `fetch` simulado) y `scripts/test-backup-run.mjs` (plazo de 14 días, zona horaria, errores, reintento, límite de tamaño).
