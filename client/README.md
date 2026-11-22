# React + Vite

## Signed-in dashboard browser tests

Install both `client` and `server` dependencies and install the Playwright Firefox browser with `npx playwright install firefox` from `client`. Keep local PostgreSQL running and let Playwright start the development API and Vite.

Use the existing `client/.env` with `VITE_API_URL` pointing at the loopback API and `VITE_CLERK_PUBLISHABLE_KEY` from a Clerk development instance. In `server/.env`, use `NODE_ENV=development`, the matching Clerk publishable key and `CLERK_SECRET_KEY`, and your local `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` settings. Fixture setup creates dedicated Free and Premium Clerk test accounts. It seeds fictional records through the development API and applies BarnBuddy’s manual Premium grant to the dedicated test account in local PostgreSQL.

From `client` in PowerShell:

```powershell
$env:BARNBUDDY_SIGNED_IN = '1'
npm.cmd run test:browser -- dashboard.spec.mjs
```

Omit `dashboard.spec.mjs` to run the public-site tests as well. Screenshots are in `output/playwright/dashboard` at the repository root. Playwright keeps reusable sessions in the ignored `client/playwright/.clerk` directory.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
