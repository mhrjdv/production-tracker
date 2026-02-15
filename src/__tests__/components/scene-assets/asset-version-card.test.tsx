import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetVersionCard } from "@/components/scene-assets/asset-version-card";
import type { SceneAssetItem } from "@/components/scene-assets/types";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeAsset(overrides: Partial<SceneAssetItem> = {}): SceneAssetItem {
  return {
    id: "asset_001",
    shotId: null,
    promptPackageId: null,
    parentVersionId: null,
    platformId: null,
    platformKey: "midjourney",
    platformLabel: "Midjourney",
    assetType: "IMAGE",
    status: "GENERATED",
    rightsState: "UNKNOWN",
    versionNumber: 1,
    title: null,
    prompt: "A hero standing on a cliff at sunset",
    negativePrompt: null,
    modelName: null,
    sourceUrl: null,
    externalAssetId: null,
    outputUrl: null,
    thumbnailUrl: null,
    costEstimateUsd: null,
    generationSeconds: null,
    queueWaitSeconds: null,
    compareGroup: null,
    metadata: null,
    provenance: null,
    tags: [],
    notes: null,
    selected: false,
    createdAt: "2026-02-14T12:00:00.000Z",
    createdByName: "Test User",
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<Parameters<typeof AssetVersionCard>[0]> = {},
) {
  return {
    asset: makeAsset(),
    isPending: false,
    isComparing: false,
    onSelectWinner: vi.fn(),
    onToggleCompare: vi.fn(),
    onOpenRights: vi.fn(),
    onReusePrompt: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssetVersionCard", () => {
  // ── Badge rendering ──────────────────────────────────────

  it("renders platform label, asset type, version number, status, and rights state badges", () => {
    render(<AssetVersionCard {...makeProps()} />);

    expect(screen.getByText("Midjourney")).toBeInTheDocument();
    expect(screen.getByText("IMAGE")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("GENERATED")).toBeInTheDocument();
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  it("shows title when provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ title: "Hero cliff shot" }) })}
      />,
    );

    expect(screen.getByText("Hero cliff shot")).toBeInTheDocument();
  });

  it("does not show title element when title is null", () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ title: null }) })}
      />,
    );

    // The prompt should be visible, but no separate title paragraph
    expect(screen.queryByText("Hero cliff shot")).toBeNull();
  });

  it("shows prompt text", () => {
    render(<AssetVersionCard {...makeProps()} />);

    expect(
      screen.getByText("A hero standing on a cliff at sunset"),
    ).toBeInTheDocument();
  });

  it("shows negative prompt when provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ negativePrompt: "blurry, low quality" }),
        })}
      />,
    );

    expect(
      screen.getByText(/Negative:.*blurry, low quality/),
    ).toBeInTheDocument();
  });

  it("does not show negative prompt when null", () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ negativePrompt: null }) })}
      />,
    );

    expect(screen.queryByText(/Negative:/)).toBeNull();
  });

  // ── Selected state ───────────────────────────────────────

  it('shows "Selected" badge when asset.selected is true', () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ selected: true }) })}
      />,
    );

    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it('hides "Mark Selected" button when asset.selected is true', () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ selected: true }) })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /mark selected/i }),
    ).toBeNull();
  });

  it('shows "Mark Selected" button when not selected', () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ selected: false }) })}
      />,
    );

    expect(
      screen.getByRole("button", { name: /mark selected/i }),
    ).toBeInTheDocument();
  });

  // ── Button callbacks ─────────────────────────────────────

  it('calls onSelectWinner with asset.id when "Mark Selected" is clicked', async () => {
    const user = userEvent.setup();
    const onSelectWinner = vi.fn();
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ id: "asset_777" }),
          onSelectWinner,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /mark selected/i }));
    expect(onSelectWinner).toHaveBeenCalledWith("asset_777");
  });

  it("calls onToggleCompare with asset.id when Compare is clicked", async () => {
    const user = userEvent.setup();
    const onToggleCompare = vi.fn();
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ id: "asset_888" }),
          onToggleCompare,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /compare/i }));
    expect(onToggleCompare).toHaveBeenCalledWith("asset_888");
  });

  it('shows "Comparing" text when isComparing is true', () => {
    render(
      <AssetVersionCard {...makeProps({ isComparing: true })} />,
    );

    expect(
      screen.getByRole("button", { name: /comparing/i }),
    ).toBeInTheDocument();
  });

  it('shows "Compare" text when isComparing is false', () => {
    render(
      <AssetVersionCard {...makeProps({ isComparing: false })} />,
    );

    expect(
      screen.getByRole("button", { name: /compare/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /comparing/i }),
    ).toBeNull();
  });

  it("calls onDelete when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ id: "asset_del" }),
          onDelete,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith("asset_del");
  });

  it("calls onOpenRights with asset when Rights button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenRights = vi.fn();
    const asset = makeAsset({ id: "asset_rights" });
    render(
      <AssetVersionCard {...makeProps({ asset, onOpenRights })} />,
    );

    await user.click(screen.getByRole("button", { name: /rights/i }));
    expect(onOpenRights).toHaveBeenCalledWith(asset);
  });

  it("calls onReusePrompt with asset when Reuse Prompt button is clicked", async () => {
    const user = userEvent.setup();
    const onReusePrompt = vi.fn();
    const asset = makeAsset({ id: "asset_reuse" });
    render(
      <AssetVersionCard {...makeProps({ asset, onReusePrompt })} />,
    );

    await user.click(screen.getByRole("button", { name: /reuse prompt/i }));
    expect(onReusePrompt).toHaveBeenCalledWith(asset);
  });

  it("calls onArchive with asset.id when Archive is clicked", async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ id: "asset_arch", status: "GENERATED" }),
          onArchive,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /archive/i }));
    expect(onArchive).toHaveBeenCalledWith("asset_arch");
  });

  // ── Disabled state ───────────────────────────────────────

  it("disables actionable buttons when isPending is true", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          isPending: true,
          asset: makeAsset({ selected: false, status: "GENERATED" }),
        })}
      />,
    );

    const markSelected = screen.getByRole("button", {
      name: /mark selected/i,
    });
    const reusePrompt = screen.getByRole("button", {
      name: /reuse prompt/i,
    });
    const archive = screen.getByRole("button", { name: /archive/i });
    const deleteBtn = screen.getByRole("button", { name: /delete/i });

    expect(markSelected).toBeDisabled();
    expect(reusePrompt).toBeDisabled();
    expect(archive).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });

  // ── Cost & timing metrics ────────────────────────────────

  it("shows cost/timing metrics when present", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            costEstimateUsd: 0.125,
            generationSeconds: 45,
            queueWaitSeconds: 12,
          }),
        })}
      />,
    );

    expect(screen.getByText(/\$0\.125/)).toBeInTheDocument();
    expect(screen.getByText(/Gen:.*45s/)).toBeInTheDocument();
    expect(screen.getByText(/Queue:.*12s/)).toBeInTheDocument();
  });

  it("does not show cost/timing section when all metrics are null", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            costEstimateUsd: null,
            generationSeconds: null,
            queueWaitSeconds: null,
          }),
        })}
      />,
    );

    expect(screen.queryByText(/Cost:/)).toBeNull();
    expect(screen.queryByText(/Gen:/)).toBeNull();
  });

  // ── Tags ─────────────────────────────────────────────────

  it("shows tags as badges", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ tags: ["cinematic", "approved"] }),
        })}
      />,
    );

    expect(screen.getByText("#cinematic")).toBeInTheDocument();
    expect(screen.getByText("#approved")).toBeInTheDocument();
  });

  it("does not render tag section when tags array is empty", () => {
    render(
      <AssetVersionCard
        {...makeProps({ asset: makeAsset({ tags: [] }) })}
      />,
    );

    expect(screen.queryByText(/#/)).toBeNull();
  });

  // ── Archive button visibility ────────────────────────────

  it('hides "Archive" button when status is "ARCHIVED"', () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ status: "ARCHIVED" }),
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /archive/i }),
    ).toBeNull();
  });

  it('shows "Archive" button when status is not "ARCHIVED"', () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ status: "GENERATED" }),
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: /archive/i }),
    ).toBeInTheDocument();
  });

  // ── Source and output links ──────────────────────────────

  it("shows source link when sourceUrl is provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            sourceUrl: "https://example.com/source",
          }),
        })}
      />,
    );

    const link = screen.getByText("Source").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/source");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows output link when outputUrl is provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            outputUrl: "https://example.com/output.png",
          }),
        })}
      />,
    );

    const link = screen.getByText("Output").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/output.png");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not show links section when both sourceUrl and outputUrl are null", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            sourceUrl: null,
            outputUrl: null,
            modelName: null,
          }),
        })}
      />,
    );

    expect(screen.queryByText("Source")).toBeNull();
    expect(screen.queryByText("Output")).toBeNull();
  });

  // ── Thumbnail ────────────────────────────────────────────

  it("shows thumbnail image when thumbnailUrl is provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({
            thumbnailUrl: "https://example.com/thumb.jpg",
          }),
        })}
      />,
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
    expect(img).toHaveAttribute(
      "alt",
      "Thumbnail for Midjourney v1",
    );
  });

  it("does not show thumbnail when thumbnailUrl is null", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ thumbnailUrl: null }),
        })}
      />,
    );

    expect(screen.queryByRole("img")).toBeNull();
  });

  // ── Model name ───────────────────────────────────────────

  it("shows model name when modelName is provided", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ modelName: "SDXL-Turbo" }),
        })}
      />,
    );

    expect(screen.getByText("Model: SDXL-Turbo")).toBeInTheDocument();
  });

  // ── Prompt Package badge ─────────────────────────────────

  it('shows "Prompt Package" badge when promptPackageId is set', () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ promptPackageId: "pp_123" }),
        })}
      />,
    );

    expect(screen.getByText("Prompt Package")).toBeInTheDocument();
  });

  it('does not show "Prompt Package" badge when promptPackageId is null', () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ promptPackageId: null }),
        })}
      />,
    );

    expect(screen.queryByText("Prompt Package")).toBeNull();
  });

  // ── Notes ────────────────────────────────────────────────

  it("shows notes when present", () => {
    render(
      <AssetVersionCard
        {...makeProps({
          asset: makeAsset({ notes: "Needs color grading" }),
        })}
      />,
    );

    expect(screen.getByText("Needs color grading")).toBeInTheDocument();
  });
});
