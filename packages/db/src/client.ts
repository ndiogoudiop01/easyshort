import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// En runtime Node.js (serveur OVH/Dokploy), il faut fournir un WebSocket.
// Inutile sur un runtime edge qui expose un WebSocket natif.
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Pool réutilisé entre hot-reloads en dev pour éviter la fuite de connexions.
const globalForDb = globalThis as unknown as { __pool?: Pool };

export const pool =
  globalForDb.__pool ?? new Pool({ connectionString: process.env.DATABASE_URL! });

if (process.env.NODE_ENV !== 'production') globalForDb.__pool = pool;

// Driver neon-serverless (WebSocket) => supporte les transactions interactives
// (nécessaires pour SELECT ... FOR UPDATE dans le débit de badges).
export const db = drizzle(pool, { schema, casing: 'snake_case' });
export type DB = typeof db;
export { schema };
