-- CreateEnum
CREATE TYPE "AssetType" AS ENUM (
  'SCRIPT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'MUSIC',
  'VOICE',
  'NARRATION',
  'STORYBOARD',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'SELECTED',
  'REJECTED',
  'ARCHIVED'
);

-- CreateTable
CREATE TABLE "ai_platforms" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" TEXT,
  "homepage_url" TEXT,
  "docs_url" TEXT,
  "specialties" TEXT[],
  "supported_output" "AssetType"[],
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_asset_versions" (
  "id" TEXT NOT NULL,
  "scene_id" TEXT NOT NULL,
  "platform_id" TEXT,
  "platform_key" TEXT NOT NULL,
  "platform_label" TEXT NOT NULL,
  "asset_type" "AssetType" NOT NULL,
  "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT,
  "prompt" TEXT NOT NULL,
  "negative_prompt" TEXT,
  "model_name" TEXT,
  "source_url" TEXT,
  "external_asset_id" TEXT,
  "output_url" TEXT,
  "thumbnail_url" TEXT,
  "metadata" JSONB,
  "tags" TEXT[],
  "notes" TEXT,
  "selected" BOOLEAN NOT NULL DEFAULT false,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "scene_asset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_api_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "token_prefix" TEXT NOT NULL,
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "extension_api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_platforms_slug_key" ON "ai_platforms"("slug");

-- CreateIndex
CREATE INDEX "scene_asset_versions_scene_id_idx" ON "scene_asset_versions"("scene_id");

-- CreateIndex
CREATE INDEX "scene_asset_versions_platform_key_idx" ON "scene_asset_versions"("platform_key");

-- CreateIndex
CREATE INDEX "scene_asset_versions_asset_type_idx" ON "scene_asset_versions"("asset_type");

-- CreateIndex
CREATE INDEX "scene_asset_versions_status_idx" ON "scene_asset_versions"("status");

-- CreateIndex
CREATE INDEX "scene_asset_versions_created_by_id_idx" ON "scene_asset_versions"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_asset_versions_scene_id_platform_key_asset_type_version_n_key"
ON "scene_asset_versions"("scene_id", "platform_key", "asset_type", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "extension_api_tokens_token_hash_key" ON "extension_api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "extension_api_tokens_user_id_idx" ON "extension_api_tokens"("user_id");

-- CreateIndex
CREATE INDEX "extension_api_tokens_revoked_at_idx" ON "extension_api_tokens"("revoked_at");

-- AddForeignKey
ALTER TABLE "scene_asset_versions"
ADD CONSTRAINT "scene_asset_versions_scene_id_fkey"
FOREIGN KEY ("scene_id") REFERENCES "scenes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_asset_versions"
ADD CONSTRAINT "scene_asset_versions_platform_id_fkey"
FOREIGN KEY ("platform_id") REFERENCES "ai_platforms"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_asset_versions"
ADD CONSTRAINT "scene_asset_versions_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_api_tokens"
ADD CONSTRAINT "extension_api_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
