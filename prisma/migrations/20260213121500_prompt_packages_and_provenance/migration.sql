-- CreateEnum
CREATE TYPE "RightsState" AS ENUM (
  'UNKNOWN',
  'NON_COMMERCIAL',
  'COMMERCIAL_ALLOWED',
  'RESTRICTED'
);

-- CreateTable
CREATE TABLE "prompt_packages" (
  "id" TEXT NOT NULL,
  "scene_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL DEFAULT 1,
  "name" TEXT,
  "prompt" TEXT NOT NULL,
  "negative_prompt" TEXT,
  "constraints" JSONB,
  "target_aspect_ratio" TEXT,
  "target_duration_sec" INTEGER,
  "style_profile" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "prompt_packages_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "scene_asset_versions"
ADD COLUMN "prompt_package_id" TEXT,
ADD COLUMN "parent_version_id" TEXT,
ADD COLUMN "rights_state" "RightsState" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "cost_estimate_usd" DOUBLE PRECISION,
ADD COLUMN "generation_seconds" INTEGER,
ADD COLUMN "queue_wait_seconds" INTEGER,
ADD COLUMN "compare_group" TEXT,
ADD COLUMN "provenance" JSONB;

-- CreateIndex
CREATE INDEX "prompt_packages_scene_id_idx" ON "prompt_packages"("scene_id");

-- CreateIndex
CREATE INDEX "prompt_packages_created_by_id_idx" ON "prompt_packages"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_packages_scene_id_version_number_key"
ON "prompt_packages"("scene_id", "version_number");

-- CreateIndex
CREATE INDEX "scene_asset_versions_prompt_package_id_idx" ON "scene_asset_versions"("prompt_package_id");

-- CreateIndex
CREATE INDEX "scene_asset_versions_parent_version_id_idx" ON "scene_asset_versions"("parent_version_id");

-- CreateIndex
CREATE INDEX "scene_asset_versions_rights_state_idx" ON "scene_asset_versions"("rights_state");

-- CreateIndex
CREATE INDEX "scene_asset_versions_compare_group_idx" ON "scene_asset_versions"("compare_group");

-- AddForeignKey
ALTER TABLE "prompt_packages"
ADD CONSTRAINT "prompt_packages_scene_id_fkey"
FOREIGN KEY ("scene_id") REFERENCES "scenes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_packages"
ADD CONSTRAINT "prompt_packages_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_asset_versions"
ADD CONSTRAINT "scene_asset_versions_prompt_package_id_fkey"
FOREIGN KEY ("prompt_package_id") REFERENCES "prompt_packages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_asset_versions"
ADD CONSTRAINT "scene_asset_versions_parent_version_id_fkey"
FOREIGN KEY ("parent_version_id") REFERENCES "scene_asset_versions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
