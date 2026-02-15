"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Clapperboard } from "lucide-react";
import {
  SceneHeader,
  ScriptTab,
  ProductionTab,
} from "@/components/scene-detail";
import type {
  SceneDetailData,
  ShotItem,
  AssetItem,
  PlatformItem,
  PromptPackageItem,
  CharacterItem,
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
  projectCharacters: CharacterItem[];
  sceneCharacterIds: string[];
  shotCharactersMap: Record<string, string[]>;
  prev: SceneNavItem | null;
  next: SceneNavItem | null;
}

export function SceneDetailClient({
  projectId,
  projectName,
  scene,
  assets,
  platforms,
  projectCharacters,
  sceneCharacterIds,
  shotCharactersMap,
  shots,
  prev,
  next,
}: SceneDetailClientProps) {
  return (
    <div className="space-y-6 max-w-5xl">
      <SceneHeader
        projectId={projectId}
        projectName={projectName}
        scene={scene}
        prev={prev}
        next={next}
      />

      <Tabs defaultValue="production" className="w-full">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="script" className="gap-1.5">
            <Film className="h-3.5 w-3.5" />
            Script
          </TabsTrigger>
          <TabsTrigger value="production" className="gap-1.5">
            <Clapperboard className="h-3.5 w-3.5" />
            Production
            {shots.length > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                {shots.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script">
          <ScriptTab
            scene={scene}
            projectCharacters={projectCharacters}
            sceneCharacterIds={sceneCharacterIds}
          />
        </TabsContent>

        <TabsContent value="production">
          <ProductionTab
            sceneId={scene.id}
            shots={shots}
            assets={assets}
            platforms={platforms}
            projectCharacters={projectCharacters}
            shotCharactersMap={shotCharactersMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
