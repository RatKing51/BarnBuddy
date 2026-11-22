import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { loadEnv } from 'vite';

const clientDirectory = fileURLToPath(new URL('../../', import.meta.url));
const serverDirectory = fileURLToPath(new URL('../../../server/', import.meta.url));
const loopback = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function readDashboardTestEnv() {
  const client = loadEnv('development', clientDirectory, 'VITE_');
  const server = {
    ...parseEnv(readFileSync(new URL('../../../server/.env', import.meta.url), 'utf8')),
    ...process.env,
  };
  const publishableKey = client.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey?.startsWith('pk_test_')) {
    throw new Error('Set VITE_CLERK_PUBLISHABLE_KEY in client/.env to a Clerk development key.');
  }
  if (!server.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Set CLERK_SECRET_KEY in server/.env to the matching Clerk development key.');
  }
  if (publishableKey !== (server.CLERK_PUBLISHABLE_KEY || server.VITE_CLERK_PUBLISHABLE_KEY)) {
    throw new Error('The Clerk publishable keys in client/.env and server/.env must match.');
  }
  const api = URL.parse(client.VITE_API_URL || '');
  if (api?.protocol !== 'http:' || !loopback.has(api.hostname) || api.port !== (server.PORT || '5000') ||
    api.pathname !== '/' || api.search || api.hash || api.username || api.password) {
    throw new Error('Set VITE_API_URL in client/.env to the loopback API using PORT from server/.env.');
  }
  if (server.NODE_ENV !== 'development' || server.RAILWAY_ENVIRONMENT_NAME ||
    server.DATABASE_URL || server.DB_URL || server.USE_PUBLIC_DATABASE_URL === 'true' ||
    !loopback.has(server.PGHOST) || !server.PGDATABASE) {
    throw new Error('Use NODE_ENV=development and loopback PGHOST/PGDATABASE in server/.env for the browser fixtures.');
  }
  return { apiURL: api.origin, publishableKey, server, serverDirectory };
}

export function sessionFile(plan) {
  return fileURLToPath(new URL(`../../playwright/.clerk/${plan}.json`, import.meta.url));
}

export function dashboardScreenshot(project, name) {
  return fileURLToPath(new URL(`../../../output/playwright/dashboard/${project}/${name}.png`, import.meta.url));
}

export const sampleFarm = {
  north: 'North Pasture',
  south: 'South Paddock',
  project: 'County Fair Market Steer',
  inventory: [
    { item_name: 'Goat grower pellets', category: 'Feed', quantity: 12, unit: 'bag', reorder_level: 4, cost_per_unit: 16.5, supplier: 'Maple Feed Co.' },
    { item_name: 'Mineral mix', category: 'Supplies', quantity: 2, unit: 'bag', reorder_level: 4, cost_per_unit: 13 },
  ],
  animals: [
    { name: 'Clover', tag_id: 'NP-014', species: 'Cattle', sex: 'Female', herd: 'north' },
    { name: 'Juniper', tag_id: 'NP-017', species: 'Cattle', sex: 'Female', herd: 'north' },
    { name: 'Milo', tag_id: 'NP-023', species: 'Cattle', sex: 'Male', herd: 'north' },
    { name: 'Fern', tag_id: 'SP-006', species: 'Goat', sex: 'Female', herd: 'south' },
    { name: 'Scout', tag_id: 'SP-009', species: 'Goat', sex: 'Male', herd: 'south' },
  ],
};
