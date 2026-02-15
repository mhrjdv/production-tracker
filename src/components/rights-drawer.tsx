"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CircleCheck,
  CircleAlert,
  Circle,
  Info,
} from "lucide-react";
import type {
  RightsState,
  CommercialStatus,
  ChecklistItem,
  ChecklistStatus,
  Provenance,
} from "@/lib/rights-utils";
import {
  computeShipChecklist,
  deriveCommercialStatus,
  getProvenanceDefaults,
  validateProvenance,
} from "@/lib/rights-utils";

// ─── Props ──────────────────────────────────────────────────

interface RightsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    platformKey: string;
    platformLabel: string;
    rightsState: RightsState;
    provenance: Record<string, unknown> | null;
    modelName: string | null;
    tags: string[];
  } | null;
  onUpdateRightsState?: (assetId: string, rightsState: RightsState) => void;
}

// ─── Status icon helpers ────────────────────────────────────

function ChecklistStatusIcon({ status }: { status: ChecklistStatus }) {
  switch (status) {
    case "green":
      return <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />;
    case "yellow":
      return <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" />;
    case "red":
      return <Circle className="h-4 w-4 shrink-0 text-red-500" />;
  }
}

function CommercialShieldIcon({ status }: { status: CommercialStatus }) {
  switch (status) {
    case "allowed":
      return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
    case "not-allowed":
      return <ShieldX className="h-5 w-5 text-red-500" />;
    case "restricted":
      return <ShieldAlert className="h-5 w-5 text-orange-500" />;
    case "unknown":
      return <Shield className="h-5 w-5 text-amber-500" />;
  }
}

function commercialBadgeClasses(status: CommercialStatus): string {
  switch (status) {
    case "allowed":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "not-allowed":
      return "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
    case "restricted":
      return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "unknown":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }
}

function commercialLabel(status: CommercialStatus): string {
  switch (status) {
    case "allowed":
      return "Commercial Allowed";
    case "not-allowed":
      return "Non-Commercial Only";
    case "restricted":
      return "Restricted";
    case "unknown":
      return "Unknown";
  }
}

function checklistRowBg(status: ChecklistStatus): string {
  switch (status) {
    case "green":
      return "bg-emerald-500/5";
    case "yellow":
      return "bg-amber-500/5";
    case "red":
      return "bg-red-500/5";
  }
}

// ─── Provenance field labels ────────────────────────────────

const PROVENANCE_DISPLAY_LABELS: Record<string, string> = {
  platform: "Platform",
  platformPlan: "Platform Plan",
  modelId: "Model ID",
  captureMethod: "Capture Method",
  captureTimestamp: "Capture Timestamp",
  synthIdExpected: "SynthID Expected",
  c2paPresent: "C2PA Present",
  visibleWatermark: "Visible Watermark",
};

function formatProvenanceValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value === null || value === undefined) return "-";
  return JSON.stringify(value);
}

// ─── Component ──────────────────────────────────────────────

const RIGHTS_STATE_OPTIONS: { value: RightsState; label: string }[] = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "NON_COMMERCIAL", label: "Non-Commercial" },
  { value: "COMMERCIAL_ALLOWED", label: "Commercial Allowed" },
  { value: "RESTRICTED", label: "Restricted" },
];

export function RightsDrawer({
  open,
  onOpenChange,
  asset,
  onUpdateRightsState,
}: RightsDrawerProps) {
  const checklist = useMemo<ChecklistItem[]>(() => {
    if (!asset) return [];
    return computeShipChecklist({
      rightsState: asset.rightsState,
      provenance: asset.provenance as Provenance | null,
      platformKey: asset.platformKey,
    });
  }, [asset]);

  const commercialStatus = useMemo<CommercialStatus>(() => {
    if (!asset) return "unknown";
    return deriveCommercialStatus(
      asset.rightsState,
      asset.provenance as Provenance | null,
    );
  }, [asset]);

  const provenanceDefaults = useMemo(() => {
    if (!asset) return {};
    return getProvenanceDefaults(asset.platformKey);
  }, [asset]);

  const provenanceValidation = useMemo(() => {
    if (!asset?.provenance) return null;
    return validateProvenance(asset.provenance);
  }, [asset]);

  const hasDefaults = Object.keys(provenanceDefaults).length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CommercialShieldIcon status={commercialStatus} />
            Rights & Provenance
          </SheetTitle>
          {asset && (
            <SheetDescription>
              {asset.platformLabel}
              {asset.modelName ? ` \u00b7 ${asset.modelName}` : ""}
            </SheetDescription>
          )}
        </SheetHeader>

        {!asset ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            No asset selected.
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 pb-6">
            {/* ── OK to Ship Summary ── */}
            {(() => {
              const greenCount = checklist.filter(
                (c) => c.status === "green",
              ).length;
              const total = checklist.length;
              const allGreen = greenCount === total && total > 0;
              return (
                <div
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    allGreen
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {allGreen ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      {allGreen ? "OK to Ship" : "Not Ready to Ship"}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${allGreen ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-amber-500/40 text-amber-700 dark:text-amber-400"}`}
                  >
                    {greenCount}/{total} checks
                  </Badge>
                </div>
              );
            })()}

            {/* ── Commercial Status + Rights State ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`gap-1.5 px-3 py-1 text-sm ${commercialBadgeClasses(commercialStatus)}`}
                >
                  <CommercialShieldIcon status={commercialStatus} />
                  {commercialLabel(commercialStatus)}
                </Badge>
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable Rights State */}
              {onUpdateRightsState && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Rights State
                  </label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={asset.rightsState}
                    onChange={(e) =>
                      onUpdateRightsState(
                        asset.id,
                        e.target.value as RightsState,
                      )
                    }
                  >
                    {RIGHTS_STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Separator />

            {/* ── OK to Ship Checklist ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight">
                OK to Ship Checklist
              </h3>
              <div className="space-y-1.5">
                {checklist.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className={`flex items-start gap-2.5 rounded-md border px-3 py-2 ${checklistRowBg(item.status)}`}
                  >
                    <ChecklistStatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Provenance Details ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight">
                Provenance Details
              </h3>
              {asset.provenance ? (
                <>
                  {provenanceValidation && !provenanceValidation.valid && (
                    <Card className="border-red-500/30 bg-red-500/5 py-3">
                      <CardContent className="space-y-1">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                          Provenance Validation Errors
                        </p>
                        {provenanceValidation.errors.map((error) => (
                          <p key={error} className="text-xs text-red-500">
                            {error}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  <Card className="py-3">
                    <CardContent>
                      <dl className="space-y-2">
                        {Object.entries(asset.provenance).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-start justify-between gap-3"
                            >
                              <dt className="text-xs font-medium text-muted-foreground shrink-0">
                                {PROVENANCE_DISPLAY_LABELS[key] ?? key}
                              </dt>
                              <dd className="text-xs text-right break-all">
                                {typeof value === "boolean" ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      value
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {value ? "Yes" : "No"}
                                  </Badge>
                                ) : (
                                  formatProvenanceValue(value)
                                )}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  No provenance data attached to this asset.
                </div>
              )}
            </div>

            {/* ── Platform Defaults ── */}
            {hasDefaults && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-tight">
                    Platform Defaults for{" "}
                    <span className="text-primary">{asset.platformKey}</span>
                  </h3>
                  <Card className="border-primary/20 bg-primary/5 py-3">
                    <CardContent>
                      <dl className="space-y-2">
                        {Object.entries(provenanceDefaults).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-3"
                            >
                              <dt className="text-xs font-medium text-muted-foreground">
                                {PROVENANCE_DISPLAY_LABELS[key] ?? key}
                              </dt>
                              <dd className="text-xs">
                                {typeof value === "boolean" ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      value
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                        : "border-muted-foreground/30"
                                    }`}
                                  >
                                    {value ? "Expected" : "Not Expected"}
                                  </Badge>
                                ) : (
                                  formatProvenanceValue(value)
                                )}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        These are the expected provenance markers for assets
                        from this platform.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
