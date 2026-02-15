/**
 * Generate thumbnails for all asset images and upload to R2.
 *
 * Reads the original local files from project_Laserman_v2/IMAGE GEN/,
 * generates 800px-wide WebP thumbnails, uploads to R2 with _thumb.webp suffix,
 * and updates thumbnailUrl in the database.
 *
 * Usage: npx tsx scripts/generate-thumbnails.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as path from "path";

// ─── Config ────────────────────────────────────────────────

const THUMB_WIDTH = 800;
const THUMB_QUALITY = 80;

const R2_BUCKET = process.env.R2_BUCKET_NAME || "production-tracker";
const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ||
  "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev";

// ─── Clients ───────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials in .env");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log("=== Thumbnail Generation ===\n");

  const r2 = getR2Client();

  // Find all asset versions that have an outputUrl from R2 but no separate thumbnail
  const assets = await prisma.sceneAssetVersion.findMany({
    where: {
      outputUrl: { not: null },
    },
    select: {
      id: true,
      outputUrl: true,
      thumbnailUrl: true,
    },
  });

  // Filter to assets whose outputUrl points to our R2 bucket
  const r2Assets = assets.filter(
    (a) => a.outputUrl && a.outputUrl.startsWith(R2_PUBLIC_URL),
  );

  console.log(
    `Found ${r2Assets.length} assets with R2 URLs to generate thumbnails for\n`,
  );

  // Map local files: we still have originals at project_Laserman_v2/IMAGE GEN/
  // The R2 key structure is: projects/{projectId}/characters/{slug}/{filename}
  // We need to map R2 URLs → local file paths

  const imageDir = path.join(__dirname, "../project_Laserman_v2/IMAGE GEN");

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const asset of r2Assets) {
    processed++;
    const pct = ((processed / r2Assets.length) * 100).toFixed(0);

    // Derive the thumbnail R2 key from the output URL
    // outputUrl: https://pub-xxx.r2.dev/projects/{pid}/characters/{slug}/{file}.png
    // thumbKey: projects/{pid}/characters/{slug}/{file}_thumb.webp
    const r2Path = asset.outputUrl!.replace(`${R2_PUBLIC_URL}/`, "");
    const ext = path.extname(r2Path);
    const thumbKey = r2Path.replace(ext, "_thumb.webp");
    const thumbUrl = `${R2_PUBLIC_URL}/${thumbKey}`;

    // Skip if thumbnail already exists (same URL)
    if (asset.thumbnailUrl === thumbUrl) {
      skipped++;
      continue;
    }

    // Find the local file by matching the filename from the R2 key
    // We'll download from R2 instead since mapping local paths is fragile
    // Actually, let's fetch from R2 and resize — the original R2 upload works,
    // it's only next/image proxy that times out due to the optimization step.
    // But fetching 33MB from R2 in this script is fine since we're not under
    // a web request timeout.

    try {
      // Fetch the original from R2
      const response = await fetch(asset.outputUrl!);
      if (!response.ok) {
        console.error(
          `\n   ⚠️  Failed to fetch ${asset.outputUrl}: ${response.status}`,
        );
        failed++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Generate thumbnail
      const thumbBuffer = await sharp(buffer)
        .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();

      // Upload thumbnail to R2
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: thumbKey,
          Body: thumbBuffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      // Update DB
      await prisma.sceneAssetVersion.update({
        where: { id: asset.id },
        data: { thumbnailUrl: thumbUrl },
      });

      const savings = (
        ((buffer.length - thumbBuffer.length) / buffer.length) *
        100
      ).toFixed(0);
      process.stdout.write(
        `\r   [${processed}/${r2Assets.length}] ${pct}% — ${path.basename(r2Path)} (${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(thumbBuffer.length / 1024).toFixed(0)}KB, -${savings}%)`.padEnd(
          120,
        ),
      );
    } catch (err) {
      console.error(
        `\n   ⚠️  Error processing ${r2Path}: ${err instanceof Error ? err.message : err}`,
      );
      failed++;
    }
  }

  console.log(`\n\n✅ Done!`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Thumbnails generated: ${processed - skipped - failed}`);
  console.log(`   Skipped (already done): ${skipped}`);
  console.log(`   Failed: ${failed}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
