import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RightsDrawer } from "@/components/rights-drawer";
import type { RightsState } from "@/lib/rights-utils";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeAsset(
  overrides: Partial<NonNullable<Parameters<typeof RightsDrawer>[0]["asset"]>> = {},
) {
  return {
    id: "asset_001",
    platformKey: "midjourney",
    platformLabel: "Midjourney",
    rightsState: "UNKNOWN" as RightsState,
    provenance: null as Record<string, unknown> | null,
    modelName: null as string | null,
    tags: [] as string[],
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<Parameters<typeof RightsDrawer>[0]> = {},
) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    asset: makeAsset(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RightsDrawer", () => {
  // ── Null asset state ─────────────────────────────────────

  it('shows "No asset selected." when asset is null', () => {
    render(<RightsDrawer {...makeProps({ asset: null })} />);

    expect(screen.getByText("No asset selected.")).toBeInTheDocument();
  });

  // ── Description / header ─────────────────────────────────

  it("shows platform label in description", () => {
    render(
      <RightsDrawer {...makeProps({ asset: makeAsset() })} />,
    );

    expect(screen.getByText(/Midjourney/)).toBeInTheDocument();
  });

  it("shows platform label and model name in description when modelName is set", () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ modelName: "v6.0" }),
        })}
      />,
    );

    // The description renders "Midjourney · v6.0" (with middle dot)
    expect(screen.getByText(/Midjourney/)).toBeInTheDocument();
    expect(screen.getByText(/v6\.0/)).toBeInTheDocument();
  });

  // ── OK to Ship / Not Ready to Ship summary ──────────────

  it('shows "Not Ready to Ship" for UNKNOWN rights state', () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ rightsState: "UNKNOWN" }),
        })}
      />,
    );

    expect(screen.getByText("Not Ready to Ship")).toBeInTheDocument();
  });

  it('shows "Not Ready to Ship" for NON_COMMERCIAL rights state', () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ rightsState: "NON_COMMERCIAL" }),
        })}
      />,
    );

    // NON_COMMERCIAL produces a "red" commercial check => not all green
    expect(screen.getByText("Not Ready to Ship")).toBeInTheDocument();
  });

  // ── Checklist items ──────────────────────────────────────

  it("renders checklist items", () => {
    render(
      <RightsDrawer {...makeProps({ asset: makeAsset() })} />,
    );

    expect(
      screen.getByText("OK to Ship Checklist"),
    ).toBeInTheDocument();
    // At minimum, the checklist always contains "Source platform identified"
    // and "Commercial rights" items
    expect(
      screen.getByText("Source platform identified"),
    ).toBeInTheDocument();
    expect(screen.getByText("Commercial rights")).toBeInTheDocument();
  });

  // ── Provenance present ───────────────────────────────────

  it("shows provenance details when provenance is present", () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({
            provenance: {
              platform: "midjourney",
              captureMethod: "extension-capture",
              captureTimestamp: "2026-02-14T12:00:00.000Z",
            },
          }),
        })}
      />,
    );

    expect(screen.getByText("Provenance Details")).toBeInTheDocument();
    // The provenance field labels are rendered via PROVENANCE_DISPLAY_LABELS
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Capture Method")).toBeInTheDocument();
    expect(screen.getByText("Capture Timestamp")).toBeInTheDocument();
    // Values
    expect(screen.getByText("midjourney")).toBeInTheDocument();
    expect(screen.getByText("extension-capture")).toBeInTheDocument();
  });

  it("shows boolean provenance values as Yes/No badges", () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({
            provenance: {
              platform: "gemini",
              captureMethod: "extension-capture",
              captureTimestamp: "2026-02-14T12:00:00.000Z",
              synthIdExpected: true,
              c2paPresent: false,
            },
          }),
        })}
      />,
    );

    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  // ── No provenance ────────────────────────────────────────

  it('shows "No provenance data" message when provenance is null', () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ provenance: null }),
        })}
      />,
    );

    expect(
      screen.getByText(/No provenance data attached to this asset/),
    ).toBeInTheDocument();
  });

  // ── Rights state dropdown ────────────────────────────────

  it("shows rights state dropdown when onUpdateRightsState is provided", () => {
    const onUpdateRightsState = vi.fn();
    render(
      <RightsDrawer
        {...makeProps({ onUpdateRightsState })}
      />,
    );

    expect(screen.getByText("Rights State")).toBeInTheDocument();
    // The native select element should be present
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("hides rights state dropdown when onUpdateRightsState is not provided", () => {
    render(
      <RightsDrawer
        {...makeProps({ onUpdateRightsState: undefined })}
      />,
    );

    expect(screen.queryByText("Rights State")).toBeNull();
    // Should not have a combobox for rights state
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("calls onUpdateRightsState when rights state dropdown is changed", async () => {
    const user = userEvent.setup();
    const onUpdateRightsState = vi.fn();
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ id: "asset_rights_change", rightsState: "UNKNOWN" }),
          onUpdateRightsState,
        })}
      />,
    );

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "COMMERCIAL_ALLOWED");

    expect(onUpdateRightsState).toHaveBeenCalledWith(
      "asset_rights_change",
      "COMMERCIAL_ALLOWED",
    );
  });

  it("renders all rights state options in the dropdown", () => {
    render(
      <RightsDrawer
        {...makeProps({ onUpdateRightsState: vi.fn() })}
      />,
    );

    const select = screen.getByRole("combobox");
    const options = within(select).getAllByRole("option");

    const values = options.map(
      (opt) => (opt as HTMLOptionElement).value,
    );
    expect(values).toContain("UNKNOWN");
    expect(values).toContain("NON_COMMERCIAL");
    expect(values).toContain("COMMERCIAL_ALLOWED");
    expect(values).toContain("RESTRICTED");
  });

  // ── Tags in drawer ───────────────────────────────────────

  it("shows asset tags in the drawer", () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({ tags: ["hero", "final"] }),
        })}
      />,
    );

    expect(screen.getByText("#hero")).toBeInTheDocument();
    expect(screen.getByText("#final")).toBeInTheDocument();
  });

  // ── Closed state ─────────────────────────────────────────

  it("does not render content when open is false", () => {
    render(
      <RightsDrawer {...makeProps({ open: false })} />,
    );

    // When Sheet is closed, content is not mounted
    expect(
      screen.queryByText("Rights & Provenance"),
    ).toBeNull();
  });

  // ── Provenance validation errors ─────────────────────────

  it("shows validation errors when provenance is invalid", () => {
    render(
      <RightsDrawer
        {...makeProps({
          asset: makeAsset({
            provenance: {
              // Missing required fields: platform, captureMethod, captureTimestamp
              someField: "value",
            },
          }),
        })}
      />,
    );

    expect(
      screen.getByText("Provenance Validation Errors"),
    ).toBeInTheDocument();
  });
});
