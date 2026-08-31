# 📚 Alejandría — Aplicación personal de biblioteca (Next.js + Supabase + Google Books)

**Alejandría** es una aplicación web personal de gestión de biblioteca y seguimiento de lectura, construida con **Next.js 16**, **TypeScript**, **Tailwind CSS**, **Supabase** y la **API de Google Books**. Permite organizar tus libros por leer, en curso y leídos, llevar estadísticas de lectura, hacer backups en JSON y usarla como **PWA instalable**, sin necesidad de login ni cuentas de usuario.

Ideal para quien busca una alternativa **self-hosted** y minimalista a apps como Goodreads o StoryGraph, con control total sobre sus propios datos.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Características principales

- 🏠 **Inicio dinámico**: lectura actual con barra de progreso, lista ordenable de pendientes y favoritos destacados.
- 🔍 **Búsqueda e importación desde Google Books**: añade libros a tu biblioteca con metadatos completos (portada, autores, sinopsis, año, páginas).
- 🗂️ **Archivo de leídos por año**, con búsqueda y ordenación.
- 📖 **Ficha de detalle editable**: estado de lectura, puntuación, año, notas personales y eliminación.
- 📊 **Estadísticas de lectura**: totales, páginas leídas, autor más leído, media de valoraciones y gráfico anual.
- 💾 **Exportación e importación**: backup completo en JSON y vista imprimible en PDF.
- 🎲 **Modo "Sorpréndeme"** para elegir tu próxima lectura al azar.
- 📱 **PWA instalable**, con funcionamiento offline gracias a un modo local automático cuando Supabase no está configurado.
- 🔒 **Sin login**: pensada para uso personal, con la clave privada de Supabase protegida siempre en el servidor.

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| Backend / base de datos | [Supabase](https://supabase.com/) / PostgreSQL |
| Fuente de datos de libros | [Google Books API](https://developers.google.com/books) |
| Despliegue recomendado | [Vercel](https://vercel.com/) |

Las visualizaciones están inspiradas en el proyecto MIT [Monocharts](https://github.com/Subhan-code/Monocharts) y adaptadas a los datos y al sistema visual de Alejandría mediante Recharts.

---

## 🚀 Empezar

```bash
git clone https://github.com/TU_USUARIO/alejandria.git
cd alejandria
cp .env.local.example .env.local
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Si no configuras `.env.local`, la app funciona igualmente en **modo local**, guardando los libros en `localStorage` del navegador. La búsqueda de Google Books no requiere clave, aunque con cuota reducida.

### Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Ejecuta `supabase/schema.sql` desde el SQL Editor.
3. Configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

### Configuración de Google Books API

1. Activa la **Books API** en [Google Cloud Console](https://console.cloud.google.com/).
2. Genera una API key y añádela a `GOOGLE_BOOKS_API_KEY`.

Consulta la guía completa paso a paso, incluido el modelo de datos y el despliegue en Vercel, en el propio repositorio.

---

## 📂 Estructura del proyecto

```
src/
  app/            # pantallas y Route Handlers
  components/     # shell, modal, filas, portadas y proveedor de estado
  lib/
    supabase.ts   # acceso REST a Supabase (solo servidor)
    book-utils.ts # normalización y etiquetas
  types/book.ts   # modelo de datos compartido
```

---

## ☁️ Despliegue

Pensada para desplegarse en **Vercel**, importando el repositorio y configurando las variables de entorno de `.env.local.example`. Ninguna clave privada se expone al cliente.

```bash
npm run check:deploy -- https://TU_PROYECTO.vercel.app
```

---

## 🗺️ Roadmap

El estado detallado por fases (modelo de datos, diseño, reordenación drag & drop, archivo, estadísticas, backup y despliegue) está documentado en `ROADMAP_STATUS.md`.

---

## 🤝 Contribuciones

Este es un proyecto personal, pero las sugerencias, issues y pull requests son bienvenidos.

## 📄 Licencia

MIT — usa, modifica y despliega libremente tu propia instancia de Alejandría.

---

**Palabras clave:** gestor de biblioteca personal, app de seguimiento de lectura, self-hosted book tracker, Next.js Supabase Google Books, alternativa a Goodreads open source, PWA lectura libros.
