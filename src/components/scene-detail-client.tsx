"use client";

import { useState } from "react";
import type { AssetType, RightsState } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Crosshair, Layers, GitCompareArrows, Clock } from "lucide-react";
import {
  SceneHeader,
  ScriptTab,
  ShotsTab,
  AssetsTab,
  CompareTab,
  TimelineTab,
} from "@/components/scene-detail";
import type {
  SceneDetailData,
  ShotItem,
  AssetItem,
  PlatformItem,
  PromptPackageItem,
  SceneNavItem,
} from "@/components/scene-detail";

interface SceneDetailClientProps {
  projectId: string;
  projectName: string;
  scene: SceneDetailData;
  shots: ShotItem[];
  assets: AssetItem[];
  platforms: PlatformItem[];
  promptPackages: PromptPackageItem[];
  prev: SceneNavItem | null;
  next: SceneNavItem | null;
}

export function SceneDetailClient({
  projectId,
  projectName,
  scene,
  assets,
  platforms,
  promptPackages,
  shots,
  prev,
  next,
}: SceneDetailClientProps) {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header is always visible above tabs */}
      <SceneHeader
        projectId={projectId}
        projectName={projectName}
        scene={scene}
        prev={prev}
        next={next}
      />

      {/* Tabbed content */}
      <Tabs defaultValue="script" className="w-full">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="script" className="gap-1.5">
            <Film className="h-3.5 w-3.5" />
            Script
          </TabsTrigger>
          <TabsTrigger value="shots" className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" />
            Shots
            {shots.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                {shots.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Assets
            {assets.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                {assets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-1.5">
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script">
          <ScriptTab scene={scene} />
        </TabsContent>

        <TabsContent value="shots">
          <ShotsTab
            sceneId={scene.id}
            shots={shots}
            assets={assets}
            platforms={platforms}
            promptPackages={promptPackages}
            selectedShotId={selectedShotId}
            onShotSelect={setSelectedShotId}
          />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsTab
            sceneDbId={scene.id}
            assets={assets}
            platforms={platforms}
            promptPackages={promptPackages}
            selectedShotId={selectedShotId}
          />
        </TabsContent>

        <TabsContent value="compare">
          <CompareTab sceneDbId={scene.id} assets={assets} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab assets={assets} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
