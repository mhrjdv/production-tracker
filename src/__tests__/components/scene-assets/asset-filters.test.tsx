import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetFilters } from "@/components/scene-assets/asset-filters";
import type { PlatformItem } from "@/components/scene-assets/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
];

function makeProps(overrides: Partial<Parameters<typeof AssetFilters>[0]> = {}) {
  return {
    platforms: PLATFORMS,
    totalCount: 10,
    filteredCount: 7,
    isFiltered: false,
    isShotFiltered: false,
    query: "",
    onQueryChange: vi.fn(),
    platformFilter: "ALL",
    onPlatformFilterChange: vi.fn(),
    typeFilter: "ALL" as const,
    onTypeFilterChange: vi.fn(),
    statusFilter: "ALL" as const,
    onStatusFilterChange: vi.fn(),
    tagFilter: "",
    onTagFilterChange: vi.fn(),
    selectedOnly: false,
    onSelectedOnlyChange: vi.fn(),
    onClearFilters: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AssetFilters", () => {
  it("renders filter controls (Search, Platform, Type, Status, Tag, Selected)", () => {
    render(<AssetFilters {...makeProps()} />);

    // Search input
    expect(
      screen.getByPlaceholderText("Prompt, title, tag..."),
    ).toBeInTheDocument();

    // Labels
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Tag")).toBeInTheDocument();

    // Selected Only checkbox
    expect(screen.getByText("Selected Only")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("shows Clear button only when isFiltered is true", () => {
    const { rerender } = render(
      <AssetFilters {...makeProps({ isFiltered: false })} />,
    );
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();

    rerender(<AssetFilters {...makeProps({ isFiltered: true })} />);
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("calls onQueryChange when typing in search", async () => {
    const onQueryChange = vi.fn();
    render(<AssetFilters {...makeProps({ onQueryChange })} />);

    const input = screen.getByPlaceholderText("Prompt, title, tag...");
    fireEvent.change(input, { target: { value: "hero" } });

    expect(onQueryChange).toHaveBeenCalledWith("hero");
  });

  it("calls onClearFilters when Clear button is clicked", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(
      <AssetFilters
        {...makeProps({ isFiltered: true, onClearFilters })}
      />,
    );

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows correct count text "Showing X of Y version(s)"', () => {
    render(
      <AssetFilters {...makeProps({ filteredCount: 3, totalCount: 12 })} />,
    );

    expect(
      screen.getByText(/showing 3 of 12 version\(s\)/i),
    ).toBeInTheDocument();
  });

  it('shows "(shot filtered)" when isShotFiltered is true', () => {
    render(<AssetFilters {...makeProps({ isShotFiltered: true })} />);

    expect(screen.getByText(/\(shot filtered\)/)).toBeInTheDocument();
  });

  it('does not show "(shot filtered)" when isShotFiltered is false', () => {
    render(<AssetFilters {...makeProps({ isShotFiltered: false })} />);

    expect(screen.queryByText(/\(shot filtered\)/)).toBeNull();
  });

  it("calls onSelectedOnlyChange when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onSelectedOnlyChange = vi.fn();
    render(
      <AssetFilters {...makeProps({ onSelectedOnlyChange })} />,
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onSelectedOnlyChange).toHaveBeenCalledWith(true);
  });

  it("calls onTagFilterChange when typing in tag input", () => {
    const onTagFilterChange = vi.fn();
    render(<AssetFilters {...makeProps({ onTagFilterChange })} />);

    const tagInput = screen.getByPlaceholderText("e.g. approved");
    fireEvent.change(tagInput, { target: { value: "cinematic" } });

    expect(onTagFilterChange).toHaveBeenCalledWith("cinematic");
  });

  it("reflects the current query value in the search input", () => {
    render(<AssetFilters {...makeProps({ query: "sunset" })} />);

    const input = screen.getByPlaceholderText(
      "Prompt, title, tag...",
    ) as HTMLInputElement;
    expect(input.value).toBe("sunset");
  });

  it("reflects the current tagFilter value in the tag input", () => {
    render(<AssetFilters {...makeProps({ tagFilter: "approved" })} />);

    const input = screen.getByPlaceholderText(
      "e.g. approved",
    ) as HTMLInputElement;
    expect(input.value).toBe("approved");
  });

  it("checkbox is checked when selectedOnly is true", () => {
    render(<AssetFilters {...makeProps({ selectedOnly: true })} />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("checkbox is unchecked when selectedOnly is false", () => {
    render(<AssetFilters {...makeProps({ selectedOnly: false })} />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });
});
