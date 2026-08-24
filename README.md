# Alejandría

Aplicación personal de biblioteca con Next.js, Appwrite y Google Books. Incluye:

- Inicio con lectura actual, progreso, lista ordenable de pendientes y favoritos.
- Búsqueda en Google Books y alta de libros.
- Búsqueda global dentro de la biblioteca.
- Archivo de leídos por año, con búsqueda y ordenación.
- Detalle editable: estado, puntuación, año, notas y eliminación.
- Estadísticas y exportación a JSON o PDF mediante la vista de impresión.
- Restauración de copias JSON, PWA instalable y modo «Sorpréndeme».
- Modo local automático cuando Appwrite no está configurado.

El avance exacto por fases está en [ROADMAP_STATUS.md](ROADMAP_STATUS.md).

## 1. Instalación local

Con las dependencias ya disponibles en el entorno:

```bash
cp .env.local.example .env.local
npm run dev
```

Abre http://localhost:3000

Si no creas `.env.local`, la aplicación funciona igualmente y conserva los libros en `localStorage` en ese navegador. La búsqueda de Google Books no necesita clave, aunque su cuota es menor.

## 2. Crear el proyecto en Appwrite

1. Entra en [cloud.appwrite.io](https://cloud.appwrite.io) (o tu instancia self-hosted) y crea un proyecto nuevo, por ejemplo `alejandria`.
2. Copia el **Project ID** y el **Endpoint** → van en `APPWRITE_PROJECT_ID` y `APPWRITE_ENDPOINT`.
3. Ve a **Databases** → crea una base de datos (p. ej. `biblioteca`) → copia su ID a `APPWRITE_DATABASE_ID`.
4. Dentro, crea una colección llamada `books` → copia su ID a `APPWRITE_BOOKS_COLLECTION_ID`. Añádele estos atributos (coinciden con `src/types/book.ts`):

   | Atributo | Tipo | Notas |
   |---|---|---|
   | `googleBooksId` | String | requerido |
   | `title` | String | requerido |
   | `authors` | String[] (array) | |
   | `coverUrl` | String | URL, opcional |
   | `publishedYear` | Integer | opcional |
   | `pageCount` | Integer | opcional |
   | `synopsis` | String (largo) | opcional |
  | `status` | Enum: `to_read`, `reading`, `read` | requerido |
  | `favorite` | Boolean | independiente del estado de lectura |
   | `order` | Integer | opcional |
   | `rating` | Integer (0–5) | opcional |
   | `finishedYear` | Integer | opcional |
   | `addedAt` | Datetime | requerido |
  | `progress` | Integer (0–100) | porcentaje leído |
  | `notes` | String (largo) | opcional, notas personales |

5. En **Permisos** de la colección, NO actives acceso público de lectura/escritura — todo el acceso pasará por las rutas API del propio servidor Next.js usando la API key.
6. Ve a **Overview → Integrations → API keys**, crea una API key con scopes `databases.read` y `databases.write`, y cópiala a `APPWRITE_API_KEY`.

También puedes automatizar los pasos de base de datos, colección, atributos e índices. Completa endpoint, proyecto y API key en `.env.local` y ejecuta:

```bash
npm run setup:appwrite
```

El script usa la API REST y no instala dependencias. Es idempotente: puede ejecutarse de nuevo sin duplicar recursos.

## 3. Obtener API key de Google Books

1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto (o usa uno existente) y ve a **APIs y servicios → Biblioteca**, busca **Books API** y actívala.
3. Ve a **Credenciales → Crear credenciales → Clave de API**.
4. (Recomendado) Restringe la key para que solo pueda usar la Books API.
5. Copia la key a `GOOGLE_BOOKS_API_KEY`.

## 4. Subir el proyecto a GitHub

El repo ya tiene un primer commit local. Solo falta crear el remoto y subirlo:

```bash
# crea un repo vacío en https://github.com/new (sin README/licencia)
git remote add origin https://github.com/TU_USUARIO/alejandria.git
git branch -M main
git push -u origin main
```

## 5. Desplegar en Vercel

1. En [vercel.com](https://vercel.com), **Add New → Project** e importa el repo de GitHub.
2. En **Environment Variables**, añade las mismas variables que en `.env.local`. Todas las variables de Appwrite son privadas y se usan únicamente en servidor.
3. Deploy. Vercel te dará una URL — esa será la única "puerta" de entrada a tu biblioteca (recuerda: no hay login, así que no compartas el enlace).

## Funcionamiento de los datos

Al arrancar, el cliente consulta `/api/books`. Si Appwrite está configurado, todas las operaciones pasan por Route Handlers de Next.js y la API key nunca llega al navegador. Si no lo está, cambia de forma transparente a almacenamiento local; el pie de la aplicación indica qué modo está activo.

La lista «Quiero leer» usa drag & drop nativo del navegador para no depender de paquetes adicionales. En móvil, el orden actual se conserva y los cambios de estado siguen disponibles.

## Estructura del proyecto

```
src/
  app/            # pantallas y Route Handlers
  components/     # shell, modal, filas, portadas y proveedor de estado
  lib/
    appwrite.ts   # cliente de Appwrite, solo servidor
    book-utils.ts # normalización y etiquetas
  types/book.ts   # modelo compartido
```

## Despliegue

Importa el repositorio en Vercel y configura allí las variables de `.env.local.example`. Ninguna variable de Appwrite debe llevar el prefijo `NEXT_PUBLIC_`. La aplicación no tiene autenticación: protege el despliegue desde Vercel si necesitas una barrera real de acceso.

La guía completa está en [DEPLOYMENT.md](DEPLOYMENT.md). Después del deploy puedes verificar las rutas y la conexión con:

```bash
npm run check:deploy -- https://TU_PROYECTO.vercel.app
```
