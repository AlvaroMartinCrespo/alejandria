import { Client, Databases } from "node-appwrite";

/**
 * Cliente de Appwrite pensado SOLO para usarse en el servidor
 * (Route Handlers de Next.js, Server Components, etc.).
 *
 * Usa la API key con permisos de lectura/escritura sobre la base de datos,
 * para que el navegador nunca tenga acceso directo a Appwrite ni a esa key.
 * Así, aunque la URL de Vercel sea pública, nadie puede escribir en tu
 * biblioteca sin pasar por tus propias rutas API.
 */
function getAppwriteClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    throw new Error(
      "Faltan variables de entorno de Appwrite. Revisa tu .env.local (ver .env.local.example)."
    );
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return client;
}

export function getDatabases() {
  return new Databases(getAppwriteClient());
}

export const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID ?? "";
export const APPWRITE_BOOKS_COLLECTION_ID =
  process.env.APPWRITE_BOOKS_COLLECTION_ID ?? "";
