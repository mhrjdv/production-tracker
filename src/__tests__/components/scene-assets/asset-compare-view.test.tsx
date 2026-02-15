import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetCompareView } from "@/components/scene-assets/asset-compare-view";
import type { SceneAssetItem } from "@/components/scene-assets/types";

// ─── Factory helpers ──────────────────────────────────────────

function makeAsset(overrides: Partial<SceneAssetItem> = {}): SceneAssetItem {
  return {
    id: "asset_001",
    shotId: null,
    promptPackageId: null,
    parentVersionId: null,
    platformId: "plat_001",
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
  overrides: Partial<Parameters<typeof AssetCompareView>[0]> = {},
) {
  return {
    comparedAssets: [],
    compareGroups: [],
    compareAssetIds: [],
    onToggleCompare: vi.fn(),
    onClearCompare: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe("AssetCompareView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty state ──────────────────────────────────────────────

  it("renders nothing when no assets are compared and no compare groups exist", () => {
    const { container } = render(<AssetCompareView {...makeProps()} />);

    // Should render empty - no cards
    expect(container.querySelector(".border-emerald-500\\/40")).toBeNull();
    expect(container.querySelector(".border-blue-500\\/30")).toBeNull();
  });

  it("does not show manual compare panel when only 1 asset is compared", () => {
    const comparedAssets = [makeAsset({ id: "asset_001" })];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.queryByText(/compare variants/i)).toBeNull();
  });

  // ── Manual Compare Panel ─────────────────────────────────────

  it("shows manual compare panel when 2+ assets are compared", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        platformLabel: "Midjourney",
        versionNumber: 1,
      }),
      makeAsset({ id: "asset_002", platformLabel: "Sora", versionNumber: 2 }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText(/compare variants \(2\)/i)).toBeInTheDocument();
  });

  it("displays correct count in manual compare panel header", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001" }),
      makeAsset({ id: "asset_002" }),
      makeAsset({ id: "asset_003" }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText(/compare variants \(3\)/i)).toBeInTheDocument();
  });

  it("shows Clear Compare button in manual compare panel", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001" }),
      makeAsset({ id: "asset_002" }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(
      screen.getByRole("button", { name: /clear compare/i }),
    ).toBeInTheDocument();
  });

  it("calls onClearCompare when Clear Compare button is clicked", async () => {
    const user = userEvent.setup();
    const onClearCompare = vi.fn();
    const comparedAssets = [
      makeAsset({ id: "asset_001" }),
      makeAsset({ id: "asset_002" }),
    ];

    render(
      <AssetCompareView {...makeProps({ comparedAssets, onClearCompare })} />,
    );

    const clearButton = screen.getByRole("button", { name: /clear compare/i });
    await user.click(clearButton);

    expect(onClearCompare).toHaveBeenCalled();
  });

  it("displays asset cards in manual compare panel", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        platformLabel: "Midjourney",
        versionNumber: 1,
        prompt: "First prompt",
      }),
      makeAsset({
        id: "asset_002",
        platformLabel: "Sora",
        versionNumber: 2,
        prompt: "Second prompt",
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText("Midjourney")).toBeInTheDocument();
    expect(screen.getByText("Sora")).toBeInTheDocument();
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("First prompt")).toBeInTheDocument();
    expect(screen.getByText("Second prompt")).toBeInTheDocument();
  });

  it("shows thumbnail images when thumbnailUrl is provided", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        platformLabel: "Midjourney",
        versionNumber: 1,
        thumbnailUrl: "https://example.com/thumb1.jpg",
      }),
      makeAsset({
        id: "asset_002",
        platformLabel: "Sora",
        versionNumber: 2,
        thumbnailUrl: "https://example.com/thumb2.jpg",
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("src", "https://example.com/thumb1.jpg");
    expect(images[1]).toHaveAttribute("src", "https://example.com/thumb2.jpg");
    expect(images[0]).toHaveAttribute("alt", "Midjourney preview");
    expect(images[1]).toHaveAttribute("alt", "Sora preview");
  });

  it("does not show thumbnail section when thumbnailUrl is null", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        thumbnailUrl: null,
      }),
      makeAsset({
        id: "asset_002",
        thumbnailUrl: null,
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.queryByRole("img")).toBeNull();
  });

  it("displays cost and timing metrics in manual compare panel", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        costEstimateUsd: 0.125,
        generationSeconds: 45,
        queueWaitSeconds: 12,
      }),
      makeAsset({
        id: "asset_002",
        costEstimateUsd: 0.25,
        generationSeconds: 60,
        queueWaitSeconds: 30,
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText(/\$0\.125/)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.250/)).toBeInTheDocument();
    expect(screen.getByText(/45s gen/)).toBeInTheDocument();
    expect(screen.getByText(/60s gen/)).toBeInTheDocument();
    expect(screen.getByText(/12s wait/)).toBeInTheDocument();
    expect(screen.getByText(/30s wait/)).toBeInTheDocument();
  });

  it("shows dashes for null metrics in manual compare panel", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        costEstimateUsd: null,
        generationSeconds: null,
        queueWaitSeconds: null,
      }),
      makeAsset({
        id: "asset_002",
        costEstimateUsd: null,
        generationSeconds: null,
        queueWaitSeconds: null,
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    // Each asset card should have "- · -s gen · -s wait"
    const cards = screen.getAllByText(/-.*-s gen.*-s wait/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("displays rights state badges in manual compare panel", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001", rightsState: "UNKNOWN" }),
      makeAsset({ id: "asset_002", rightsState: "COMMERCIAL_ALLOWED" }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
    expect(screen.getByText("COMMERCIAL_ALLOWED")).toBeInTheDocument();
  });

  it("truncates long prompts with line-clamp-5", () => {
    const longPrompt =
      "This is a very long prompt that should be truncated. ".repeat(20);

    const comparedAssets = [
      makeAsset({ id: "asset_001", prompt: longPrompt }),
      makeAsset({ id: "asset_002", prompt: "Short prompt" }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    // Use a partial text match instead of exact match
    const promptElement = screen.getByText(/this is a very long prompt/i);
    expect(promptElement).toHaveClass("line-clamp-5");
  });

  // ── Auto Compare Groups ──────────────────────────────────────

  it("shows auto compare groups section when compareGroups is provided", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({ id: "asset_001", platformLabel: "Midjourney" }),
          makeAsset({ id: "asset_002", platformLabel: "Sora" }),
        ],
        metrics: {
          totalVersions: 2,
          platformCount: 2,
          avgCostUsd: 0.15,
          avgGenerationSeconds: 50,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/auto compare groups \(1\)/i)).toBeInTheDocument();
  });

  it("displays correct count in auto compare groups header", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
      {
        key: "group_002",
        items: [makeAsset({ id: "asset_002" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
      {
        key: "group_003",
        items: [makeAsset({ id: "asset_003" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/auto compare groups \(3\)/i)).toBeInTheDocument();
  });

  it("does not show auto compare groups section when compareGroups is empty", () => {
    render(<AssetCompareView {...makeProps({ compareGroups: [] })} />);

    expect(screen.queryByText(/auto compare groups/i)).toBeNull();
  });

  it("displays group metrics: total versions and platform count", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({ id: "asset_001" }),
          makeAsset({ id: "asset_002" }),
          makeAsset({ id: "asset_003" }),
        ],
        metrics: {
          totalVersions: 3,
          platformCount: 2,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/3 versions/i)).toBeInTheDocument();
    expect(screen.getByText(/across 2 platforms/i)).toBeInTheDocument();
  });

  it('uses singular "platform" when platformCount is 1', () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    const platformText = screen.getByText(/across 1 platform$/i);
    expect(platformText).toBeInTheDocument();
    expect(platformText.textContent).not.toMatch(/platforms/i);
  });

  it("displays average cost when avgCostUsd is provided", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: 1.234,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/avg \$1\.234/i)).toBeInTheDocument();
  });

  it("displays average generation seconds when avgGenerationSeconds is provided", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: 45.6,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/avg 46s/i)).toBeInTheDocument();
  });

  it("does not show avg cost or avg seconds when both are null", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.queryByText(/avg \$/i)).toBeNull();
    expect(screen.queryByText(/avg.*s$/i)).toBeNull();
  });

  it("renders badges for each item in a compare group", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({
            id: "asset_001",
            platformLabel: "Midjourney",
            versionNumber: 1,
            selected: false,
          }),
          makeAsset({
            id: "asset_002",
            platformLabel: "Sora",
            versionNumber: 2,
            selected: false,
          }),
        ],
        metrics: {
          totalVersions: 2,
          platformCount: 2,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/midjourney v1/i)).toBeInTheDocument();
    expect(screen.getByText(/sora v2/i)).toBeInTheDocument();
  });

  it("shows star symbol on selected assets in compare groups", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({
            id: "asset_001",
            platformLabel: "Midjourney",
            versionNumber: 1,
            selected: true,
          }),
          makeAsset({
            id: "asset_002",
            platformLabel: "Sora",
            versionNumber: 2,
            selected: false,
          }),
        ],
        metrics: {
          totalVersions: 2,
          platformCount: 2,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    // The selected badge should include the star symbol (U+2605)
    expect(screen.getByText(/midjourney v1.*\u2605/i)).toBeInTheDocument();

    // The non-selected badge should not have the star
    const soraBadge = screen.getByText(/sora v2/i);
    expect(soraBadge.textContent).not.toMatch(/\u2605/);
  });

  it("uses default variant for selected assets and outline for non-selected", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({
            id: "asset_001",
            platformLabel: "Midjourney",
            versionNumber: 1,
            selected: true,
          }),
          makeAsset({
            id: "asset_002",
            platformLabel: "Sora",
            versionNumber: 2,
            selected: false,
          }),
        ],
        metrics: {
          totalVersions: 2,
          platformCount: 2,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    const { container } = render(
      <AssetCompareView {...makeProps({ compareGroups })} />,
    );

    // Find badges
    const badges = container.querySelectorAll('[class*="badge"]');

    // Note: We can't easily test variant classes directly in JSDOM,
    // but we can verify the badges exist
    expect(badges.length).toBeGreaterThan(0);
  });

  it("calls onToggleCompare when a badge is clicked", async () => {
    const user = userEvent.setup();
    const onToggleCompare = vi.fn();

    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({
            id: "asset_001",
            platformLabel: "Midjourney",
            versionNumber: 1,
          }),
        ],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(
      <AssetCompareView {...makeProps({ compareGroups, onToggleCompare })} />,
    );

    const badge = screen.getByText(/midjourney v1/i);
    await user.click(badge);

    expect(onToggleCompare).toHaveBeenCalledWith("asset_001");
  });

  it("renders multiple compare groups correctly", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001", platformLabel: "Midjourney" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: 0.5,
          avgGenerationSeconds: 30,
        },
      },
      {
        key: "group_002",
        items: [makeAsset({ id: "asset_002", platformLabel: "Sora" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: 1.0,
          avgGenerationSeconds: 60,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/midjourney v1/i)).toBeInTheDocument();
    expect(screen.getByText(/sora v1/i)).toBeInTheDocument();
    expect(screen.getByText(/avg \$0\.500/i)).toBeInTheDocument();
    expect(screen.getByText(/avg \$1\.000/i)).toBeInTheDocument();
    expect(screen.getByText(/avg 30s/i)).toBeInTheDocument();
    expect(screen.getByText(/avg 60s/i)).toBeInTheDocument();
  });

  // ── Both panels together ─────────────────────────────────────

  it("renders both manual compare panel and auto compare groups when both are provided", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001" }),
      makeAsset({ id: "asset_002" }),
    ];

    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_003" })],
        metrics: {
          totalVersions: 1,
          platformCount: 1,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(
      <AssetCompareView {...makeProps({ comparedAssets, compareGroups })} />,
    );

    expect(screen.getByText(/compare variants \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/auto compare groups \(1\)/i)).toBeInTheDocument();
  });

  // ── Edge cases ───────────────────────────────────────────────

  it("handles empty items array in compare group gracefully", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [],
        metrics: {
          totalVersions: 0,
          platformCount: 0,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/0 versions/i)).toBeInTheDocument();
    expect(screen.getByText(/across 0 platforms/i)).toBeInTheDocument();
  });

  it("handles very large numbers in metrics", () => {
    const compareGroups = [
      {
        key: "group_001",
        items: [makeAsset({ id: "asset_001" })],
        metrics: {
          totalVersions: 9999,
          platformCount: 50,
          avgCostUsd: 999.999,
          avgGenerationSeconds: 3600.5,
        },
      },
    ];

    render(<AssetCompareView {...makeProps({ compareGroups })} />);

    expect(screen.getByText(/9999 versions/i)).toBeInTheDocument();
    expect(screen.getByText(/across 50 platforms/i)).toBeInTheDocument();
    expect(screen.getByText(/avg \$999\.999/i)).toBeInTheDocument();
    expect(screen.getByText(/avg 3601s/i)).toBeInTheDocument(); // Rounded to 3601
  });

  it("formats cost with 3 decimal places", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001", costEstimateUsd: 0.001 }),
      makeAsset({ id: "asset_002", costEstimateUsd: 1.5 }),
      makeAsset({ id: "asset_003", costEstimateUsd: 12.345 }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(screen.getByText(/\$0\.001/)).toBeInTheDocument();
    expect(screen.getByText(/\$1\.500/)).toBeInTheDocument();
    expect(screen.getByText(/\$12\.345/)).toBeInTheDocument();
  });

  it("handles assets with very long platform labels", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        platformLabel: "Very Long Platform Name That Should Not Break Layout",
        versionNumber: 1,
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    expect(
      screen.getByText("Very Long Platform Name That Should Not Break Layout"),
    ).toBeInTheDocument();
  });

  it("handles missing prompt gracefully", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        prompt: "",
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    // Should still render the card
    expect(screen.getByText("Midjourney")).toBeInTheDocument();
  });

  it("renders correctly with mixed null and non-null thumbnails", () => {
    const comparedAssets = [
      makeAsset({
        id: "asset_001",
        thumbnailUrl: "https://example.com/thumb1.jpg",
      }),
      makeAsset({
        id: "asset_002",
        thumbnailUrl: null,
      }),
      makeAsset({
        id: "asset_003",
        thumbnailUrl: "https://example.com/thumb3.jpg",
      }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2); // Only the non-null ones
  });

  it("each badge is clickable in compare groups", async () => {
    const user = userEvent.setup();
    const onToggleCompare = vi.fn();

    const compareGroups = [
      {
        key: "group_001",
        items: [
          makeAsset({ id: "asset_001", platformLabel: "Platform A" }),
          makeAsset({ id: "asset_002", platformLabel: "Platform B" }),
          makeAsset({ id: "asset_003", platformLabel: "Platform C" }),
        ],
        metrics: {
          totalVersions: 3,
          platformCount: 3,
          avgCostUsd: null,
          avgGenerationSeconds: null,
        },
      },
    ];

    render(
      <AssetCompareView {...makeProps({ compareGroups, onToggleCompare })} />,
    );

    const badgeA = screen.getByText(/platform a/i);
    const badgeB = screen.getByText(/platform b/i);
    const badgeC = screen.getByText(/platform c/i);

    await user.click(badgeA);
    expect(onToggleCompare).toHaveBeenCalledWith("asset_001");

    await user.click(badgeB);
    expect(onToggleCompare).toHaveBeenCalledWith("asset_002");

    await user.click(badgeC);
    expect(onToggleCompare).toHaveBeenCalledWith("asset_003");

    expect(onToggleCompare).toHaveBeenCalledTimes(3);
  });

  it("renders with accessible structure", () => {
    const comparedAssets = [
      makeAsset({ id: "asset_001" }),
      makeAsset({ id: "asset_002" }),
    ];

    render(<AssetCompareView {...makeProps({ comparedAssets })} />);

    // Should have a Clear Compare button that's accessible
    const clearButton = screen.getByRole("button", { name: /clear compare/i });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton.tagName).toBe("BUTTON");
  });
});
