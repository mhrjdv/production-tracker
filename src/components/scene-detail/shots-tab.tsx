"use client";

import { ShotListPanel } from "@/components/shot-list-panel";
import { RunCardsPanel } from "@/components/run-cards-panel";
import type { ShotItem, AssetItem, PlatformItem, PromptPackageItem } from "./types";

interface ShotsTabProps {
  sceneId: string;
  shots: ShotItem[];
  assets: AssetItem[];
  platforms: PlatformItem[];
  promptPackages: PromptPackageItem[];
  selectedShotId: string | null;
  onShotSelect: (shotId: string | null) => void;
}

export function ShotsTab({
  sceneId,
  shots,
  assets,
  platforms,
  promptPackages,
  selectedShotId,
  onShotSelect,
}: ShotsTabProps) {
  return (
    <div className="space-y-6">
      <ShotListPanel
        sceneId={sceneId}
        shots={shots}
        selectedShotId={selectedShotId}
        onShotSelect={onShotSelect}
      />

      {promptPackages.length > 0 && (
        <RunCardsPanel
          promptPackage={promptPackages[0]}
          platforms={platforms}
          assets={assets}
        />
      )}
    </div>
  );
}
