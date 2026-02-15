"use client";

import type { AssetStatus, AssetType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { ASSET_TYPES, ASSET_STATUSES } from "./types";
import type { PlatformItem } from "./types";

// ─── Props ──────────────────────────────────────────────────

interface AssetFiltersProps {
  platforms: PlatformItem[];
  totalCount: number;
  filteredCount: number;
  isFiltered: boolean;
  isShotFiltered: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (value: string) => void;
  typeFilter: AssetType | "ALL";
  onTypeFilterChange: (value: AssetType | "ALL") => void;
  statusFilter: AssetStatus | "ALL";
  onStatusFilterChange: (value: AssetStatus | "ALL") => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  selectedOnly: boolean;
  onSelectedOnlyChange: (value: boolean) => void;
  onClearFilters: () => void;
}

// ─── Component ──────────────────────────────────────────────

export function AssetFilters({
  platforms,
  totalCount,
  filteredCount,
  isFiltered,
  isShotFiltered,
  query,
  onQueryChange,
  platformFilter,
  onPlatformFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  selectedOnly,
  onSelectedOnlyChange,
  onClearFilters,
}: AssetFiltersProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4" />
          Filters
          {isFiltered && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onClearFilters}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Search</Label>
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Prompt, title, tag..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              value={platformFilter}
              onValueChange={onPlatformFilterChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform.id} value={platform.slug}>
                    {platform.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => onTypeFilterChange(v as AssetType | "ALL")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                onStatusFilterChange(v as AssetStatus | "ALL")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {ASSET_STATUSES.map((assetStatus) => (
                  <SelectItem key={assetStatus} value={assetStatus}>
                    {assetStatus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <Input
              value={tagFilter}
              onChange={(event) => onTagFilterChange(event.target.value)}
              placeholder="e.g. approved"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedOnly}
                onChange={(event) => onSelectedOnlyChange(event.target.checked)}
                className="h-4 w-4 rounded border border-input bg-background"
              />
              Selected Only
            </label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {filteredCount} of {totalCount} version(s)
          {isShotFiltered ? " (shot filtered)" : ""}.
        </p>
      </CardContent>
    </Card>
  );
}
