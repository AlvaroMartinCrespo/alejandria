# Despliegue en producción

## 1. Preparar Appwrite

1. Crea un proyecto en Appwrite Cloud.
2. Crea una API key de servidor con permisos de lectura y escritura de bases de datos.
3. Copia `.env.local.example` a `.env.local` y completa endpoint, project ID y API key.
4. Ejecuta `npm run setup:appwrite` para crear la base, colección, atributos e índices.
5. Copia al archivo los IDs que muestra el script si utilizaste los valores predeterminados.

La colección se crea sin permisos públicos. La API key solo se utiliza en el servidor.

## 2. Publicar en GitHub

Crea un repositorio vacío y conecta este proyecto:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git add .
git commit -m "Complete personal library application"
git push -u origin main
```

Revisa los archivos antes de confirmar. `.env.local` está ignorado y no debe subirse.

## 3. Crear el proyecto de Vercel

1. En Vercel, elige **Add New → Project** e importa el repositorio.
2. Mantén el framework detectado como Next.js y los comandos predeterminados.
3. Añade estas variables para Production, Preview y Development:

```text
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_BOOKS_COLLECTION_ID
GOOGLE_BOOKS_API_KEY
```

`GOOGLE_BOOKS_API_KEY` es opcional. Ninguna variable de Appwrite debe llevar el prefijo `NEXT_PUBLIC_`.

## 4. Proteger el acceso

La URL no listada no es autenticación. Si la biblioteca debe ser privada, activa **Deployment Protection** en Vercel. Las rutas API usan la API key en servidor, pero cualquier visitante que alcance la aplicación puede invocarlas porque el producto no tiene login.

## 5. Verificar el despliegue

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