import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// ─── Providers Wrapper ───────────────────────────────────────
// Wraps components in necessary providers for testing

function AllProviders({ children }: { children: ReactNode }) {
  // Add providers here as needed (e.g., ThemeProvider, SessionProvider)
  return <>{children}</>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export { renderWithProviders as renderUI };
