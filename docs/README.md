# BarnBuddy Docs

This folder is a standalone Docusaurus site for `docs.barnbuddy.pro`.

## Local development

```bash
npm install
npm run start
```

## Production build

```bash
npm run build
npm run railway:start
```

On Railway, create a new service from this repository and set the root directory to `docs`. Point the custom domain `docs.barnbuddy.pro` at that service.
