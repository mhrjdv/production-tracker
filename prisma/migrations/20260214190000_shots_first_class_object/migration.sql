-- CreateTable
CREATE TABLE "shots" (
    "id" TEXT NOT NULL,
    "shot_code" TEXT NOT NULL,
    "scene_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "angle" TEXT,
    "framing" TEXT,
    "movement" TEXT,
    "lens_notes" TEXT,
    "references" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shots_pkey" PRIMARY KEY ("id")
);

-- AddColumn: shot_id to scene_asset_versions (nullable for backward compat)
ALTER TABLE "scene_asset_versions" ADD COLUMN "shot_id" TEXT;

-- AddColumn: shot_id to prompt_packages (nullable for backward compat)
ALTER TABLE "prompt_packages" ADD COLUMN "shot_id" TEXT;

-- CreateIndex
CREATE INDEX "shots_scene_id_idx" ON "shots"("scene_id");

-- CreateIndex (unique: scene + shot code)
CREATE UNIQUE INDEX "shots_scene_id_shot_code_key" ON "shots"("scene_id", "shot_code");

-- CreateIndex
CREATE INDEX "scene_asset_versions_shot_id_idx" ON "scene_asset_versions"("shot_id");

-- CreateIndex
CREATE INDEX "prompt_packages_shot_id_idx" ON "prompt_packages"("shot_id");

-- AddForeignKey
ALTER TABLE "shots" ADD CONSTRAINT "shots_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_asset_versions" ADD CONSTRAINT "scene_asset_versions_shot_id_fkey" FOREIGN KEY ("shot_id") REFERENCES "shots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_packages" ADD CONSTRAINT "prompt_packages_shot_id_fkey" FOREIGN KEY ("shot_id") REFERENCES "shots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
