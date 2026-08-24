import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || match[2] === "") continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] ??= value;
  }
}

loadEnvFile(".env.local");

const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || "alejandria";
const collectionId = process.env.APPWRITE_BOOKS_COLLECTION_ID || "books";

if (!endpoint || !projectId || !apiKey) {
  console.error("Faltan APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID o APPWRITE_API_KEY en .env.local.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function request(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `${response.status} ${response.statusText}`);
  }
  return response.status === 204 ? null : response.json();
}

async function exists(path) {
  const response = await fetch(`${endpoint}${path}`, { headers });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || response.statusText);
  return true;
}

async function createIfMissing(path, createPath, body, label) {
  if (await exists(path)) {
    console.log(`✓ ${label}`);
    return;
  }
  await request(createPath, { method: "POST", body: JSON.stringify(body) });
  console.log(`+ ${label}`);
}

async function collection() {
  return request(`/databases/${databaseId}/collections/${collectionId}`);
}

async function waitForAttribute(key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const current = await collection();
    const attribute = current.attributes?.find((item) => item.key === key);
    if (attribute?.status === "available") return;
    if (attribute?.status === "failed") throw new Error(`Falló la creación del atributo ${key}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Tiempo agotado esperando el atributo ${key}`);
}

async function ensureAttribute(type, definition) {
  const current = await collection();
  if (current.attributes?.some((attribute) => attribute.key === definition.key)) {
    console.log(`✓ atributo ${definition.key}`);
    return;
  }
  await request(
    `/databases/${databaseId}/collections/${collectionId}/attributes/${type}`,
    { method: "POST", body: JSON.stringify(definition) },
  );
  await waitForAttribute(definition.key);
  console.log(`+ atributo ${definition.key}`);
}

async function ensureIndex(key, attributes) {
  const current = await collection();
  if (current.indexes?.some((index) => index.key === key)) {
    console.log(`✓ índice ${key}`);
    return;
  }
  await request(`/databases/${databaseId}/collections/${collectionId}/indexes`, {
    method: "POST",
    body: JSON.stringify({ key, type: "key", attributes, orders: attributes.map(() => "ASC") }),
  });
  console.log(`+ índice ${key}`);
}

await createIfMissing(
  `/databases/${databaseId}`,
  "/databases",
  { databaseId, name: "Alejandría", enabled: true },
  `base de datos ${databaseId}`,
);

await createIfMissing(
  `/databases/${databaseId}/collections/${collectionId}`,
  `/databases/${databaseId}/collections`,
  { collectionId, name: "books", permissions: [], documentSecurity: false, enabled: true },
  `colección ${collectionId}`,
);

const stringAttributes = [
  { key: "googleBooksId", size: 120, required: true, array: false, encrypt: false },
  { key: "title", size: 500, required: true, array: false, encrypt: false },
  { key: "authors", size: 200, required: false, array: true, encrypt: false },
  { key: "coverUrl", size: 2000, required: false, array: false, encrypt: false },
  { key: "synopsis", size: 20000, required: false, array: false, encrypt: false },
  { key: "notes", size: 50000, required: false, array: false, encrypt: false },
];

for (const attribute of stringAttributes) await ensureAttribute("string", attribute);

const integerAttributes = [
  { key: "publishedYear", required: false, min: 0, max: 3000, array: false },
  { key: "pageCount", required: false, min: 0, max: 100000, array: false },
  { key: "order", required: false, min: 0, array: false },
  { key: "rating", required: false, min: 0, max: 5, array: false },
  { key: "finishedYear", required: false, min: 1900, max: 2100, array: false },
  { key: "currentPage", required: false, min: 0, array: false },
];

for (const attribute of integerAttributes) await ensureAttribute("integer", attribute);

await ensureAttribute("enum", {
  key: "status",
  elements: ["to_read", "reading", "read", "favorite"],
  required: true,
  array: false,
});
await ensureAttribute("datetime", { key: "addedAt", required: true, array: false });

for (const [key, attributes] of [
  ["idx_status", ["status"]],
  ["idx_finished_year", ["finishedYear"]],
  ["idx_rating", ["rating"]]
]) {
  await ensureIndex(key, attributes);
}

console.log("\nAppwrite listo. Usa estos valores en .env.local:");
console.log(`APPWRITE_DATABASE_ID=${databaseId}`);
console.log(`APPWRITE_BOOKS_COLLECTION_ID=${collectionId}`);