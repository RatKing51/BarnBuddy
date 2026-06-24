const crypto = require("crypto");
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const env = require("../config/env");

let client;

function getR2Endpoint() {
  const accountId = env.r2.accountId.trim();

  if (
    accountId.startsWith("http://") ||
    accountId.startsWith("https://") ||
    accountId.includes("r2.cloudflarestorage.com") ||
    accountId.includes("/")
  ) {
    throw new Error(
      "R2_ACCOUNT_ID must contain only the Cloudflare account ID, not the S3 endpoint URL."
    );
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function isR2Configured() {
  return Boolean(
    env.r2.accountId &&
      env.r2.accessKeyId &&
      env.r2.secretAccessKey &&
      env.r2.bucket
  );
}

function getR2Client() {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: getR2Endpoint(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });
  }

  return client;
}

function extensionForMimeType(mimeType) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
  }[mimeType] || "bin";
}

function createAnimalImageKey(userId, animalId, mimeType) {
  const extension = extensionForMimeType(mimeType);
  return `users/${userId}/animals/${animalId}/${crypto.randomUUID()}.${extension}`;
}

async function uploadObject({ key, body, contentType }) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    })
  );
}

async function deleteObject(key) {
  if (!key || !isR2Configured()) return;

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
    })
  );
}

async function getSignedDownloadUrl(key) {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
    }),
    { expiresIn: env.r2.signedUrlTtlSeconds }
  );
}

async function verifyR2Connection() {
  await getR2Client().send(new HeadBucketCommand({ Bucket: env.r2.bucket }));
}

async function verifyObject(key) {
  await getR2Client().send(
    new HeadObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
    })
  );
}

module.exports = {
  createAnimalImageKey,
  deleteObject,
  getSignedDownloadUrl,
  isR2Configured,
  uploadObject,
  verifyObject,
  verifyR2Connection,
};
