"use client";

import { SceneAssetsPanel } from "@/components/scene-assets";
import type { AssetItem, PlatformItem, PromptPackageItem } from "./types";

interface AssetsTabProps {
  sceneDbId: string;
  assets: AssetItem[];
  platforms: PlatformItem[];
  promptPackages: PromptPackageItem[];
  selectedShotId: string | null;
}

export function AssetsTab({
  sceneDbId,
  assets,
  platforms,
  promptPackages,
  selectedShotId,
}: AssetsTabProps) {
  return (
    <SceneAssetsPanel
      sceneDbId={sceneDbId}
      assets={assets}
      platforms={platforms}
      promptPackages={promptPackages}
      selectedShotId={selectedShotId}
    />
  );
}
