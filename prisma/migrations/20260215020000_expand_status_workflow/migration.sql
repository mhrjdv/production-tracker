-- AlterEnum: Add new statuses to AssetStatus
ALTER TYPE "AssetStatus" ADD VALUE 'NEEDS_REVIEW';
ALTER TYPE "AssetStatus" ADD VALUE 'REVIEWED';
ALTER TYPE "AssetStatus" ADD VALUE 'APPROVED';
ALTER TYPE "AssetStatus" ADD VALUE 'FINAL';

-- CreateIndex: Composite index for selected + status queries
CREATE INDEX "scene_asset_versions_selected_status_idx" ON "scene_asset_versions"("selected", "status");
