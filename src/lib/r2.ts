// ============================================================
// Cloudflare R2 Client — S3-compatible object storage
// Used for all project-related file uploads (images, etc.)
// ============================================================

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// ─── Client Singleton ────────────────────────────────────────

let _client: S3Client | null = null;

function getR2Client(): S3Client {
    if (_client) return _client;

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error(
            "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env"
        );
    }

    _client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });

    return _client;
}

// ─── Config ──────────────────────────────────────────────────

const BUCKET = process.env.R2_BUCKET_NAME || "production-tracker";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev";

// ─── Upload ──────────────────────────────────────────────────

interface UploadOptions {
    /** The file buffer to upload */
    buffer: Buffer;
    /** Key/path in the bucket (e.g. "projects/abc123/portrait.jpg") */
    key: string;
    /** Content type (e.g. "image/jpeg") */
    contentType: string;
    /** Optional cache control header */
    cacheControl?: string;
}

export async function uploadToR2(options: UploadOptions): Promise<string> {
    const client = getR2Client();
    const { buffer, key, contentType, cacheControl } = options;

    await client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: cacheControl || "public, max-age=31536000, immutable",
        })
    );

    return `${PUBLIC_URL}/${key}`;
}

// ─── Delete ──────────────────────────────────────────────────

export async function deleteFromR2(key: string): Promise<void> {
    const client = getR2Client();

    await client.send(
        new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
        })
    );
}

// ─── Helpers ─────────────────────────────────────────────────

/** Extract the R2 key from a full public URL */
export function getKeyFromUrl(url: string): string | null {
    if (!url.startsWith(PUBLIC_URL)) return null;
    return url.replace(`${PUBLIC_URL}/`, "");
}

/** Generate a unique upload key for project assets */
export function generateUploadKey(
    projectId: string,
    folder: string,
    filename: string
): string {
    return `projects/${projectId}/${folder}/${filename}`;
}
