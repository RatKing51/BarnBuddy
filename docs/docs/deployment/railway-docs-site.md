---
title: Railway Docs Site
---

# Railway Docs Site

This Docusaurus app is separate from the main BarnBuddy client and server.

## Folder

The docs app lives at:

```text
docs
```

This folder sits next to:

```text
client
server
```

## Railway Setup

1. Create a new Railway service from the BarnBuddy repository.
2. Set the service root directory to `docs`.
3. Let Railway install dependencies with `npm install`.
4. Use the start command:

```bash
npm run railway:start
```

5. Add the custom domain:

```text
doc.barnbuddy.pro
```

6. Follow Railway's DNS instructions for the domain record.

## Local Commands

Install dependencies:

```bash
npm install
```

Start local docs:

```bash
npm run start
```

Build:

```bash
npm run build
```
