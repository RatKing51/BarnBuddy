import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';
import { readDashboardTestEnv, sampleFarm, sessionFile } from './dashboard-env.mjs';

const requireFromServer = createRequire(new URL('../../../server/package.json', import.meta.url));
const { createClerkClient } = requireFromServer('@clerk/backend');
const { Pool } = requireFromServer('pg');

async function ensureClerkFixture(client, plan) {
  const email = `barnbuddy-dashboard-${plan}+clerk_test@example.com`;
  const { data: [existing] } = await client.users.getUserList({ emailAddress: [email] });
  if (existing && existing.privateMetadata.barnBuddyBrowserFixture !== true) {
    throw new Error(`The dedicated ${plan} Clerk fixture email is in use by another account.`);
  }
  return existing || client.users.createUser({
    emailAddress: [email],
    username: `barnbuddy_dashboard_${plan}`,
    firstName: plan === 'premium' ? 'Casey' : 'Robin',
    lastName: 'Sample',
    password: `${randomUUID()}!Aa9`,
    legalAcceptedAt: new Date(),
    privateMetadata: { barnBuddyBrowserFixture: true },
  });
}

function dateIn(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function seedFarm(api) {
  const existingHerds = await api('/api/herds');
  const herds = {};
  for (const [key, name] of Object.entries({ north: sampleFarm.north, south: sampleFarm.south })) {
    herds[key] = existingHerds.find(herd => herd.name === name) || await api('/api/herds', { name });
  }

  const existingAnimals = await api('/api/animals');
  const animals = {};
  for (const { herd, ...animal } of sampleFarm.animals) {
    animals[animal.name] = existingAnimals.find(record => record.tag_id === animal.tag_id) ||
      await api('/api/animals', { ...animal, herd_id: herds[herd].id, birthdate: dateIn(-420) });
  }

  const clover = animals.Clover.id;
  const vaccineName = 'Clostridial booster';
  const vaccines = await api(`/api/vaccinations/animal/${clover}`);
  const vaccine = { animal_id: clover, vaccine_name: vaccineName, date_given: dateIn(-180), next_due_date: dateIn(3) };
  const existingVaccine = vaccines.find(record => record.vaccine_name === vaccineName);
  await api(`/api/vaccinations${existingVaccine ? `/${existingVaccine.id}` : ''}`, vaccine, existingVaccine ? 'PUT' : 'POST');

  const juniper = animals.Juniper.id;
  const vetName = 'Maple County Vet';
  const visits = await api(`/api/vetVisits/animal/${juniper}`);
  const visit = { animal_id: juniper, vet_name: vetName, visit_date: dateIn(5), reason: 'Annual wellness check' };
  const existingVisit = visits.find(record => record.vet_name === vetName);
  await api(`/api/vetVisits${existingVisit ? `/${existingVisit.id}` : ''}`, visit, existingVisit ? 'PUT' : 'POST');

  const milo = animals.Milo.id;
  if ((await api(`/api/animals/${milo}/weight-records`)).length === 0) {
    await api(`/api/animals/${milo}/weight-records`, { weight: 840, unit: 'lb', recorded_date: dateIn(-3) });
  }
  const projects = await api('/api/ffa-projects');
  if (!projects.some(project => project.name === sampleFarm.project)) {
    const year = new Date().getFullYear();
    await api('/api/ffa-projects', {
      name: sampleFarm.project,
      school_year: `${year}–${year + 1}`,
      sae_type: 'entrepreneurship',
      start_date: dateIn(-30),
      animals: [{ animal_id: milo, starting_weight: 840, starting_value: 700, ownership_percentage: 100, records_from_date: dateIn(-30) }],
      goals: ['Track Milo’s weight through the county fair.'],
    });
  }
  const stock = await api(`/api/premium-records/inventory/herd/${herds.south.id}`);
  for (const item of sampleFarm.inventory) {
    if (!stock.some(record => record.item_name === item.item_name)) {
      await api('/api/premium-records/inventory', { ...item, herd_id: herds.south.id });
    }
  }
}

async function finishOnboarding(page) {
  await expect(page).toHaveURL(/\/dashboard(?:\/onboarding)?(?:\?.*)?$/);
  const onboarding = page.getByRole('heading', { name: 'What best describes you?' });
  const dashboard = page.getByRole('link', { name: 'Settings', exact: true });
  await expect(onboarding.or(dashboard)).toBeVisible();
  if (await onboarding.isVisible()) {
    for (const option of [/^FFA \/ 4-H student/, /^Cattle/, /^1-5/, /^Manage show animals/, /^Explore the dashboard first/]) {
      const choice = page.getByRole('button', { name: option });
      if (await choice.getAttribute('aria-pressed') !== 'true') await choice.click();
      await page.getByRole('button', { name: /^(Continue|Finish setup)$/ }).click();
    }
    await expect(page).toHaveURL(/\/dashboard\?tour=1$/);
    await page.goto('/dashboard');
  }
  await expect(dashboard).toBeVisible();
}

test('prepare dedicated Clerk development accounts and farm records', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const { apiURL, publishableKey, server } = readDashboardTestEnv();
  const health = await fetch(`${apiURL}/health`).then(response => response.json());
  if (health.environment !== 'development') throw new Error('The BarnBuddy API must report a development environment.');

  const previousSecret = process.env.CLERK_SECRET_KEY;
  process.env.CLERK_SECRET_KEY = server.CLERK_SECRET_KEY;
  process.env.CLERK_PUBLISHABLE_KEY = publishableKey;
  const clerkClient = createClerkClient({ secretKey: server.CLERK_SECRET_KEY, publishableKey });
  const pool = new Pool({
    host: server.PGHOST, port: Number(server.PGPORT) || 5432, database: server.PGDATABASE,
    user: server.PGUSER, password: server.PGPASSWORD, connectionTimeoutMillis: 5000,
  });

  let stage = 'request testing token';
  try {
    await clerkSetup({ publishableKey, dotenv: false });
    for (const plan of ['premium', 'free']) {
      stage = `prepare ${plan} account`;
      const user = await ensureClerkFixture(clerkClient, plan);
      const context = await browser.newContext({ baseURL });
      try {
        const page = await context.newPage();
        await page.goto('/');
        stage = `sign in to ${plan} account`;
        await clerk.signIn({ page, emailAddress: user.primaryEmailAddress.emailAddress });
        await page.goto('/dashboard');
        await finishOnboarding(page);
        const api = async (path, body, method = body ? 'POST' : 'GET') => {
          for (let attempt = 1; ; attempt += 1) {
            const token = await page.evaluate(() => window.Clerk.session.getToken());
            const response = await fetch(`${apiURL}${path}`, {
              method,
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: body ? JSON.stringify(body) : undefined,
            });
            if (response.ok) return response.json();
            const retryAfter = Number(response.headers.get('Retry-After'));
            if (response.status !== 429 || retryAfter < 1 || retryAfter > 60 || attempt === 4) {
              throw new Error(`Development API ${method} ${path} returned HTTP ${response.status}.`);
            }
            await response.body?.cancel();
            await delay(retryAfter * 1000 + 100);
          }
        };
        if (plan === 'premium') {
          // Use the app's existing manual plan grant, scoped to this fixture in loopback PostgreSQL.
          const result = await pool.query(
            `UPDATE users SET subscription_plan = 'premium', subscription_status = 'active',
             subscription_source = 'manual_admin', subscription_is_premium = true, subscription_expires_at = NULL
             WHERE clerk_user_id = $1`, [user.id],
          );
          expect(result.rowCount).toBe(1);
          await seedFarm(api);
        }
        const account = await api('/auth/me');
        expect(account.user.subscription.isPremium).toBe(plan === 'premium');
        await mkdir(dirname(sessionFile(plan)), { recursive: true });
        await context.storageState({ path: sessionFile(plan) });
      } finally {
        await context.close();
      }
    }
  } catch (error) {
    if (error.clerkError || error.clerkTraceId) {
      const code = error.errors?.map(({ code, meta, longMessage }) => {
        const params = meta?.paramNames || meta?.param_names;
        const namedFields = longMessage?.match(/\b(?:user_?name|phone_?number|email_?address|password|legal_?accepted(?:_?at)?|first_?name|last_?name)\b/gi) || [];
        const fields = [meta?.paramName, ...(Array.isArray(params) ? params : []), ...namedFields]
          .filter(field => typeof field === 'string' && /^[a-z_]{1,40}$/i.test(field));
        return fields.length ? `${code}: ${fields.join(', ')}` : code;
      }).filter(Boolean).join(', ');
      throw new Error(`Could not ${stage} in Clerk development (${error.status || 'connection error'}${code ? `, ${code}` : ''}).`);
    }
    throw error;
  } finally {
    if (previousSecret === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = previousSecret;
    await pool.end();
  }
});
