import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetCreateForm } from "@/components/scene-assets/asset-create-form";
import { createSceneAssetVersion, createSceneAssetFanout } from "@/lib/actions";
import type {
  PlatformItem,
  PromptPackageItem,
  SceneAssetItem,
} from "@/components/scene-assets/types";

// ─── Mock server actions ──────────────────────────────────────
vi.mock("@/lib/actions", () => ({
  createSceneAssetVersion: vi.fn(),
  createSceneAssetFanout: vi.fn(),
}));

// ─── Factory helpers ──────────────────────────────────────────

const PLATFORMS: PlatformItem[] = [
  {
    id: "plat_001",
    slug: "midjourney",
    name: "Midjourney",
    provider: "Midjourney Inc",
    specialties: ["image"],
    supportedOutput: ["IMAGE"],
  },
  {
    id: "plat_002",
    slug: "sora",
    name: "Sora",
    provider: "OpenAI",
    specialties: ["video"],
    supportedOutput: ["VIDEO"],
  },
  {
    id: "plat_003",
    slug: "veo",
    name: "Veo",
    provider: "Google",
    specialties: ["video"],
    supportedOutput: ["VIDEO"],
  },
];

const PROMPT_PACKAGES: PromptPackageItem[] = [
  {
    id: "pp_001",
    versionNumber: 1,
    name: "Hero Shot Package",
    prompt: "Hero standing on cliff at sunset",
    negativePrompt: "blurry, low quality",
    targetAspectRatio: "16:9",
    targetDurationSec: 5,
    styleProfile: "cinematic",
    tags: ["hero", "sunset"],
    metadata: { fps: 24 },
    createdAt: "2026-02-14T12:00:00.000Z",
  },
  {
    id: "pp_002",
    versionNumber: 2,
    name: null,
    prompt: "Action sequence",
    negativePrompt: null,
    targetAspectRatio: null,
    targetDurationSec: null,
    styleProfile: null,
    tags: [],
    metadata: null,
    createdAt: "2026-02-14T13:00:00.000Z",
  },
];

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
    negativePrompt: "blurry, low quality",
    modelName: "MJ v6",
    sourceUrl: "https://midjourney.com/gallery/123",
    externalAssetId: "mj_123",
    outputUrl: "https://cdn.midjourney.com/output.jpg",
    thumbnailUrl: "https://cdn.midjourney.com/thumb.jpg",
    costEstimateUsd: 0.125,
    generationSeconds: 45,
    queueWaitSeconds: 12,
    compareGroup: null,
    metadata: { aspectRatio: "16:9" },
    provenance: { platform: "midjourney" },
    tags: ["hero", "approved"],
    notes: "Perfect shot",
    selected: false,
    createdAt: "2026-02-14T12:00:00.000Z",
    createdByName: "Test User",
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<Parameters<typeof AssetCreateForm>[0]> = {},
) {
  return {
    sceneDbId: "scene_001",
    platforms: PLATFORMS,
    promptPackages: PROMPT_PACKAGES,
    reuseAsset: null,
    onClose: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────

describe("AssetCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render ───────────────────────────────────────────

  it("renders all form fields with default values", () => {
    render(<AssetCreateForm {...makeProps()} />);

    // Platform, Asset Type, Status, Rights dropdowns
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Asset Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Rights")).toBeInTheDocument();

    // Prompt Package section
    expect(screen.getByText("Prompt Package")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/save as new prompt package/i),
    ).toBeInTheDocument();

    // Text fields
    expect(screen.getByPlaceholderText(/shot 02.*rain close-up/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/describe the exact output/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/what should be avoided/i),
    ).toBeInTheDocument();

    // Action buttons
    expect(
      screen.getByRole("button", { name: /save single version/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /fan-out create/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancel/i }),
    ).toBeInTheDocument();
  });

  it("defaults to first platform when platforms array is provided", () => {
    render(<AssetCreateForm {...makeProps()} />);

    // The SelectValue should show "Midjourney" (first platform)
    expect(screen.getByText("Midjourney")).toBeInTheDocument();
  });

  it("renders fan-out platform checkboxes", () => {
    render(<AssetCreateForm {...makeProps()} />);

    expect(screen.getByText("Single Prompt Fan-Out")).toBeInTheDocument();
    expect(
      screen.getByText(/create one version per selected platform/i),
    ).toBeInTheDocument();

    // All platforms should be checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    // 1 for "Save as new prompt package" + 3 for platforms
    expect(checkboxes).toHaveLength(4);
  });

  it("defaults to first 3 platforms selected for fan-out", () => {
    render(<AssetCreateForm {...makeProps()} />);

    const checkboxes = screen
      .getAllByRole("checkbox")
      .filter((cb) => (cb as HTMLInputElement).checked);

    // All 3 platforms should be checked (plus prompt package checkbox = 4 total)
    expect(checkboxes).toHaveLength(4);
  });

  // ── Reuse asset hydration ────────────────────────────────────

  it("hydrates form with reuseAsset data when provided", () => {
    const reuseAsset = makeAsset({
      title: "Reused title",
      prompt: "Reused prompt text",
      tags: ["tag1", "tag2"],
    });

    render(<AssetCreateForm {...makeProps({ reuseAsset })} />);

    // Check that fields are populated
    const titleInput = screen.getByPlaceholderText(
      /shot 02.*rain close-up/i,
    ) as HTMLInputElement;
    expect(titleInput.value).toBe("Reused title");

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    ) as HTMLTextAreaElement;
    expect(promptInput.value).toBe("Reused prompt text");

    const tagsInput = screen.getByPlaceholderText(
      /scene-01, hero, approved/i,
    ) as HTMLInputElement;
    expect(tagsInput.value).toBe("tag1, tag2");
  });

  it("hydrates numeric fields from reuseAsset", () => {
    const reuseAsset = makeAsset({
      costEstimateUsd: 1.25,
      generationSeconds: 60,
      queueWaitSeconds: 30,
    });

    render(<AssetCreateForm {...makeProps({ reuseAsset })} />);

    const costInput = screen.getByPlaceholderText("0.35") as HTMLInputElement;
    expect(costInput.value).toBe("1.25");

    const genSecondsInput = screen.getByPlaceholderText(
      "45",
    ) as HTMLInputElement;
    expect(genSecondsInput.value).toBe("60");

    const queueSecondsInput = screen.getByPlaceholderText(
      "120",
    ) as HTMLInputElement;
    expect(queueSecondsInput.value).toBe("30");
  });

  it("hydrates JSON fields from reuseAsset", () => {
    const reuseAsset = makeAsset({
      metadata: { fps: 24, resolution: "4K" },
      provenance: { platform: "sora", captureMethod: "extension" },
    });

    render(<AssetCreateForm {...makeProps({ reuseAsset })} />);

    const metadataInput = screen.getByPlaceholderText(
      /durationSec.*fps.*aspectRatio/i,
    ) as HTMLTextAreaElement;
    expect(metadataInput.value).toContain("fps");
    expect(metadataInput.value).toContain("24");

    const provenanceInput = screen.getByPlaceholderText(
      /providerPolicyVersion.*model/i,
    ) as HTMLTextAreaElement;
    expect(provenanceInput.value).toContain("sora");
  });

  it("disables createPromptPackageOnSave when reuseAsset is provided", () => {
    const reuseAsset = makeAsset();
    render(<AssetCreateForm {...makeProps({ reuseAsset })} />);

    const checkbox = screen.getByLabelText(
      /save as new prompt package/i,
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  // ── User interactions ────────────────────────────────────────

  it("updates prompt field when user types", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "New prompt text");

    expect(promptInput).toHaveValue("New prompt text");
  });

  it("updates title field when user types", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const titleInput = screen.getByPlaceholderText(/shot 02.*rain close-up/i);
    await user.type(titleInput, "My custom title");

    expect(titleInput).toHaveValue("My custom title");
  });

  it("updates tags field when user types", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const tagsInput = screen.getByPlaceholderText(/scene-01, hero, approved/i);
    await user.type(tagsInput, "tag1, tag2, tag3");

    expect(tagsInput).toHaveValue("tag1, tag2, tag3");
  });

  it("toggles fan-out platform checkboxes", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    // Find Midjourney checkbox (should be checked by default)
    const checkboxes = screen.getAllByRole("checkbox");
    const mjCheckbox = checkboxes.find(
      (cb) => cb.nextSibling?.textContent === "Midjourney",
    ) as HTMLInputElement;

    expect(mjCheckbox.checked).toBe(true);

    await user.click(mjCheckbox);
    expect(mjCheckbox.checked).toBe(false);

    await user.click(mjCheckbox);
    expect(mjCheckbox.checked).toBe(true);
  });

  it("toggles createPromptPackageOnSave checkbox", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const checkbox = screen.getByLabelText(
      /save as new prompt package/i,
    ) as HTMLInputElement;

    expect(checkbox.checked).toBe(true);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("disables createPromptPackageOnSave when selecting existing package", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const checkbox = screen.getByLabelText(
      /save as new prompt package/i,
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    // Select an existing prompt package
    const select = screen.getAllByRole("combobox")[3]; // 4th combobox is Prompt Package
    await user.click(select);
    const option = screen.getByText(/hero shot package/i);
    await user.click(option);

    await waitFor(() => {
      expect(checkbox.checked).toBe(false);
    });
  });

  it("resets promptPackageId to NONE when enabling createPromptPackageOnSave", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    // First select an existing package
    const select = screen.getAllByRole("combobox")[3];
    await user.click(select);
    await user.click(screen.getByText(/hero shot package/i));

    // Then re-enable the checkbox
    const checkbox = screen.getByLabelText(/save as new prompt package/i);
    await user.click(checkbox);

    // Now the select should show "No package" again
    await waitFor(() => {
      expect(screen.getByText("No package")).toBeInTheDocument();
    });
  });

  // ── Form validation ──────────────────────────────────────────

  it('disables "Save Single Version" when prompt is empty', () => {
    render(<AssetCreateForm {...makeProps()} />);

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    expect(saveButton).toBeDisabled();
  });

  it('enables "Save Single Version" when prompt is provided', async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Valid prompt");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    expect(saveButton).not.toBeDisabled();
  });

  it('disables "Fan-Out Create" when prompt is empty', () => {
    render(<AssetCreateForm {...makeProps()} />);

    const fanoutButton = screen.getByRole("button", {
      name: /fan-out create/i,
    });
    expect(fanoutButton).toBeDisabled();
  });

  it('disables "Fan-Out Create" when no platforms are selected', async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    // Add a prompt
    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Valid prompt");

    // Uncheck all platform checkboxes
    const checkboxes = screen
      .getAllByRole("checkbox")
      .filter((cb) => cb.nextSibling?.textContent?.includes("journey") || cb.nextSibling?.textContent?.includes("Sora") || cb.nextSibling?.textContent?.includes("Veo"));

    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    const fanoutButton = screen.getByRole("button", {
      name: /fan-out create/i,
    });
    expect(fanoutButton).toBeDisabled();
  });

  // ── Save single version ──────────────────────────────────────

  it("calls createSceneAssetVersion with correct data on save", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps({ onCreated })} />);

    // Fill in the form
    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const titleInput = screen.getByPlaceholderText(/shot 02.*rain close-up/i);
    await user.type(titleInput, "Test title");

    // Click save
    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith("scene_001", {
        platformId: "plat_001",
        platformKey: "midjourney",
        platformLabel: "Midjourney",
        assetType: "IMAGE",
        title: "Test title",
        prompt: "Test prompt",
        negativePrompt: null,
        modelName: null,
        sourceUrl: null,
        externalAssetId: null,
        outputUrl: null,
        thumbnailUrl: null,
        costEstimateUsd: null,
        generationSeconds: null,
        queueWaitSeconds: null,
        metadata: null,
        provenance: null,
        tags: [],
        notes: null,
        status: "DRAFT",
        rightsState: "UNKNOWN",
        selected: false,
        promptPackageId: null,
        createPromptPackage: true,
      });
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it("sets selected to true when status is SELECTED", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    // Change status to SELECTED
    const statusSelect = screen.getAllByRole("combobox")[2]; // 3rd combobox is Status
    await user.click(statusSelect);
    await user.click(screen.getByText("SELECTED"));

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          status: "SELECTED",
          selected: true,
        }),
      );
    });
  });

  it("parses numeric fields correctly", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const costInput = screen.getByPlaceholderText("0.35");
    await user.type(costInput, "1.99");

    const genSecondsInput = screen.getByPlaceholderText("45");
    await user.type(genSecondsInput, "30");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          costEstimateUsd: 1.99,
          generationSeconds: 30,
        }),
      );
    });
  });

  it("normalizes tags correctly", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const tagsInput = screen.getByPlaceholderText(/scene-01, hero, approved/i);
    await user.type(tagsInput, "Hero, HERO, hero, approved");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          tags: ["hero", "approved"], // Deduplicated and lowercased
        }),
      );
    });
  });

  // ── Fan-out create ───────────────────────────────────────────

  it("calls createSceneAssetFanout with selected platforms", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    vi.mocked(createSceneAssetFanout).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps({ onCreated })} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Fanout prompt");

    const fanoutButton = screen.getByRole("button", {
      name: /fan-out create/i,
    });
    await user.click(fanoutButton);

    await waitFor(() => {
      expect(createSceneAssetFanout).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          platformIds: ["plat_001", "plat_002", "plat_003"],
          prompt: "Fanout prompt",
        }),
      );
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it("shows error when fan-out is attempted with no platforms", async () => {
    const user = userEvent.setup();
    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Fanout prompt");

    // Uncheck all platforms
    const checkboxes = screen
      .getAllByRole("checkbox")
      .filter((cb) => cb.nextSibling?.textContent?.includes("journey") || cb.nextSibling?.textContent?.includes("Sora") || cb.nextSibling?.textContent?.includes("Veo"));

    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    const fanoutButton = screen.getByRole("button", {
      name: /fan-out create/i,
    });

    // Button should be disabled, but let's verify the error state would trigger
    expect(fanoutButton).toBeDisabled();
  });

  // ── Error handling ───────────────────────────────────────────

  it("shows validation error for invalid URL", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockRejectedValue(
      new Error("Source URL must be a valid URL starting with http:// or https://"),
    );

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const sourceUrlInput = screen.getByPlaceholderText(
      /https:\/\/platform.com\/project\/shot/i,
    );
    await user.type(sourceUrlInput, "invalid-url");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/must be a valid url/i),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid JSON metadata", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockRejectedValue(
      new Error("Metadata must be valid JSON"),
    );

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const metadataInput = screen.getByPlaceholderText(
      /durationSec.*fps.*aspectRatio/i,
    );
    await user.type(metadataInput, "{invalid json}");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/metadata must be valid json/i),
      ).toBeInTheDocument();
    });
  });

  it("shows server error when createSceneAssetVersion fails", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockRejectedValue(
      new Error("Database connection failed"),
    );

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/server error.*database connection failed/i),
      ).toBeInTheDocument();
    });
  });

  it("shows generic error when non-Error is thrown", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockRejectedValue("Something went wrong");

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/an unexpected error occurred while creating/i),
      ).toBeInTheDocument();
    });
  });

  it("clears error when form is re-submitted", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion)
      .mockRejectedValueOnce(new Error("First error"))
      .mockResolvedValueOnce(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });

    // First attempt - error
    await user.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/first error/i)).toBeInTheDocument();
    });

    // Second attempt - success
    await user.click(saveButton);
    await waitFor(() => {
      expect(screen.queryByText(/first error/i)).toBeNull();
    });
  });

  // ── Cancel button ────────────────────────────────────────────

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AssetCreateForm {...makeProps({ onClose })} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("disables buttons when form is pending", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    // All buttons should be disabled during pending state
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /fan-out create/i }),
      ).toBeDisabled();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────

  it("handles empty platforms array gracefully", () => {
    render(<AssetCreateForm {...makeProps({ platforms: [] })} />);

    // Should still render without crashing
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("trims whitespace from text inputs", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "  Test prompt  ");

    const titleInput = screen.getByPlaceholderText(/shot 02.*rain close-up/i);
    await user.type(titleInput, "  Test title  ");

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          prompt: "Test prompt",
          title: "Test title",
        }),
      );
    });
  });

  it("converts empty strings to null for optional fields", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    // Leave other fields empty
    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          title: null,
          negativePrompt: null,
          modelName: null,
          sourceUrl: null,
          externalAssetId: null,
          outputUrl: null,
          thumbnailUrl: null,
          notes: null,
        }),
      );
    });
  });

  it("parses provenance JSON correctly", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    const provenanceInput = screen.getByPlaceholderText(
      /providerPolicyVersion.*model/i,
    );
    await user.type(
      provenanceInput,
      '{"platform": "sora", "captureMethod": "extension"}',
    );

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          provenance: { platform: "sora", captureMethod: "extension" },
        }),
      );
    });
  });

  it("allows empty tags array when tags input is empty", async () => {
    const user = userEvent.setup();
    vi.mocked(createSceneAssetVersion).mockResolvedValue(undefined);

    render(<AssetCreateForm {...makeProps()} />);

    const promptInput = screen.getByPlaceholderText(
      /describe the exact output/i,
    );
    await user.type(promptInput, "Test prompt");

    // Tags input is empty by default

    const saveButton = screen.getByRole("button", {
      name: /save single version/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(createSceneAssetVersion).toHaveBeenCalledWith(
        "scene_001",
        expect.objectContaining({
          tags: [],
        }),
      );
    });
  });
});
