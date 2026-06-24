# Cloudflare R2 setup for animal photos

BarnBuddy uses a private R2 bucket. The API verifies the signed-in user, then
returns a short-lived signed URL so the browser can download the image directly
from Cloudflare.

## 1. Create the bucket

1. Sign in to Cloudflare and open **R2 Object Storage**.
2. Select **Create bucket**.
3. Name it `barnbuddy-animal-photos`.
4. Leave the bucket private. Do not enable the public `r2.dev` URL.

## 2. Create an R2 API token

1. In **R2 Object Storage**, open **Manage R2 API Tokens**.
2. Create an account API token.
3. Grant **Object Read & Write** permission.
4. Restrict it to the `barnbuddy-animal-photos` bucket.
5. Copy the Access Key ID and Secret Access Key immediately.

The Cloudflare Account ID is shown in the R2 dashboard. BarnBuddy uses this S3
endpoint:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

## 3. Configure bucket CORS

Open the bucket's **Settings**, find **CORS Policy**, and add:

```json
[
  {
    "AllowedOrigins": [
      "https://barnbuddy.pro",
      "https://www.barnbuddy.pro",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Remove the localhost origin later if local development does not need production
images.

## 4. Add Railway variables

Add these variables to the BarnBuddy server service:

```text
R2_ACCOUNT_ID=<Cloudflare account ID only, with no https:// or domain>
R2_ACCESS_KEY_ID=<R2 token access key ID>
R2_SECRET_ACCESS_KEY=<R2 token secret access key>
R2_BUCKET_NAME=barnbuddy-animal-photos
R2_SIGNED_URL_TTL_SECONDS=900
```

Do not add these values to the Vite/client service and never prefix them with
`VITE_`. They are server secrets.

Deploy the server once after adding the variables. Startup adds the
`image_key` database column automatically.

## 5. Migrate existing database images

Use the production server environment so the command has both `DATABASE_URL`
and the five `R2_*` variables.

First upload the existing images while retaining the PostgreSQL copies:

```powershell
npm.cmd run images:migrate:r2
```

The command is resumable. It skips rows that already have an R2 key.

Test several accounts and image formats in production. Once the R2 images are
confirmed, verify every R2 object and remove only the old database blobs:

```powershell
npm.cmd run images:cleanup:database
```

Do not run cleanup until the application has been deployed and the migrated
photos have been checked.

## Rollback behavior

Before cleanup, each migrated animal still has its old PostgreSQL image. If R2
configuration is temporarily removed, the legacy authenticated image endpoint
can continue serving those database copies.
