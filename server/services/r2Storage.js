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

function isSiteR2Configured() {
  return Boolean(
    env.r2.accountId &&
      env.r2.accessKeyId &&
      env.r2.secretAccessKey &&
      env.r2.siteBucket
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

function sanitizeFilename(filename) {
  return String(filename || "image")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function createSiteMediaKey(filename, mimeType) {
  const originalExtension = sanitizeFilename(filename).split(".").pop();
  const extension = originalExtension && originalExtension !== sanitizeFilename(filename)
    ? originalExtension
    : extensionForMimeType(mimeType);
  return `site/media/${crypto.randomUUID()}.${extension}`;
}

function createSiteAssetKey(filename) {
  return `site/assets/${sanitizeFilename(filename)}`;
}

function getPublicObjectUrl(key) {
  return env.r2.publicBaseUrl ? `${env.r2.publicBaseUrl}/${key}` : "";
}

async function uploadObject({
  key,
  body,
  contentType,
  cacheControl = "private, max-age=31536000, immutable",
  bucket = env.r2.bucket,
}) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
  );
}

async function deleteObject(key, { bucket = env.r2.bucket } = {}) {
  if (!key || !isR2Configured()) return;

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

async function getSignedDownloadUrl(key, { bucket = env.r2.bucket } = {}) {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: env.r2.signedUrlTtlSeconds }
  );
}

async function verifyR2Connection(bucket = env.r2.bucket) {
  await getR2Client().send(new HeadBucketCommand({ Bucket: bucket }));
}

async function verifyObject(key, { bucket = env.r2.bucket } = {}) {
  await getR2Client().send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

module.exports = {
  createAnimalImageKey,
  createSiteAssetKey,
  createSiteMediaKey,
  deleteObject,
  getPublicObjectUrl,
  getSignedDownloadUrl,
  isR2Configured,
  isSiteR2Configured,
  uploadObject,
  verifyObject,
  verifyR2Connection,
};
