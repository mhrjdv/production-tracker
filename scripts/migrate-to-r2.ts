// ============================================================
// One-time migration: Upload local character portraits to R2
// and update database URLs
//
// Run: npx tsx scripts/migrate-to-r2.ts
// ============================================================

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { resolve } from "path";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET_NAME || "production-tracker";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-15baef71f1364d1e867fa9a59fcb3717.r2.dev";

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function main() {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    // Get all characters with local portrait URLs
    const { rows } = await db.query<{ id: string; name: string; portrait_url: string; project_id: string }>(
        `SELECT id, name, portrait_url, project_id FROM characters WHERE portrait_url IS NOT NULL AND portrait_url NOT LIKE 'http%'`
    );

    console.log(`Found ${rows.length} local portraits to migrate\n`);

    for (const row of rows) {
        const localPath = resolve(process.cwd(), "public", row.portrait_url.replace(/^\//, ""));
        const filename = row.portrait_url.split("/").pop()!;
        const r2Key = `projects/${row.project_id}/portraits/${filename}`;

        console.log(`📤 ${row.name}: ${row.portrait_url}`);
        console.log(`   → R2: ${r2Key}`);

        try {
            const buffer = readFileSync(localPath);

            await s3.send(
                new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: r2Key,
                    Body: buffer,
                    ContentType: "image/png",
                    CacheControl: "public, max-age=31536000, immutable",
                })
            );

            const newUrl = `${R2_PUBLIC_URL}/${r2Key}`;

            await db.query(
                `UPDATE characters SET portrait_url = $1 WHERE id = $2`,
                [newUrl, row.id]
            );

            console.log(`   ✅ Updated to: ${newUrl}\n`);
        } catch (err) {
            console.error(`   ❌ Failed:`, err);
        }
    }

    await db.end();
    console.log("Migration complete!");
}

main().catch(console.error);
