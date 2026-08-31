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