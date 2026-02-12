// ============================================================
// TDD Tests for Upload Script Page — UX Scenarios
// Tests all UX states and user interactions
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        back: vi.fn(),
    }),
}));

// Mock sonner
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock server action
vi.mock("@/lib/actions/script-upload", () => ({
    saveGeneratedProject: vi.fn().mockResolvedValue({ projectId: "test-id" }),
}));

// Lazy import after mocks
import UploadScriptPage from "@/app/(dashboard)/projects/upload-script/page";

describe("UploadScriptPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── Step 1: Input State ─────────────────────────────────

    describe("Step 1: Script Input", () => {
        it("should render the upload page with title and instructions", () => {
            render(<UploadScriptPage />);
            expect(screen.getByText("Upload Script")).toBeInTheDocument();
            expect(
                screen.getByText("Paste your script and let AI generate everything")
            ).toBeInTheDocument();
        });

        it("should show drop zone when no script is entered", () => {
            render(<UploadScriptPage />);
            expect(
                screen.getByText("Drop your script file here")
            ).toBeInTheDocument();
            expect(
                screen.getByText(/or click to browse/)
            ).toBeInTheDocument();
        });

        it("should show textarea for pasting script", () => {
            render(<UploadScriptPage />);
            const textareas = screen.getAllByPlaceholderText(
                "Paste your script here..."
            );
            expect(textareas.length).toBeGreaterThanOrEqual(1);
        });

        it("should disable Generate button when script is too short", () => {
            render(<UploadScriptPage />);
            const button = screen.getByRole("button", { name: /generate/i });
            expect(button).toBeDisabled();
        });

        it("should enable Generate button when script has enough content", async () => {
            render(<UploadScriptPage />);
            const textarea = screen.getAllByPlaceholderText(
                "Paste your script here..."
            )[0];
            fireEvent.change(textarea, {
                target: {
                    value: "This is a sample script text that is long enough to meet the minimum character requirement for processing by the AI pipeline.",
                },
            });

            await waitFor(() => {
                const button = screen.getByRole("button", { name: /generate/i });
                expect(button).not.toBeDisabled();
            });
        });

        it("should show character and word count after text input", async () => {
            render(<UploadScriptPage />);
            const textareas = screen.getAllByPlaceholderText(
                "Paste your script here..."
            );
            // Start typing in the fallback textarea
            const textarea = textareas[textareas.length - 1];
            const longText =
                "This is a sample script text that is long enough to trigger the stats display with at least fifty characters needed here.";
            fireEvent.change(textarea, { target: { value: longText } });

            // After entering text, the card view appears with stats
            await waitFor(() => {
                // The stats show "<N> characters · <N> words"
                const statsText = screen.getByText(/\d+ characters/);
                expect(statsText).toBeInTheDocument();
            });
        });

        it("should show Clear button when text is entered", async () => {
            render(<UploadScriptPage />);
            const textarea = screen.getAllByPlaceholderText(
                "Paste your script here..."
            )[0];
            fireEvent.change(textarea, {
                target: {
                    value: "Script content that is long enough to show in the UI with at least fifty characters or more.",
                },
            });

            await waitFor(() => {
                expect(
                    screen.getByRole("button", { name: /clear/i })
                ).toBeInTheDocument();
            });
        });

        it("should show keyboard shortcut hint", () => {
            render(<UploadScriptPage />);
            expect(screen.getByText("⌘↩")).toBeInTheDocument();
        });
    });

    // ─── Step Navigation ─────────────────────────────────────

    describe("Step Navigation", () => {
        it("should show all 4 step indicators", () => {
            render(<UploadScriptPage />);
            expect(screen.getByText("Script")).toBeInTheDocument();
            // 'Generate' appears in both step indicator and button
            expect(screen.getAllByText("Generate").length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText("Review")).toBeInTheDocument();
            expect(screen.getByText("Save")).toBeInTheDocument();
        });

        it("should highlight the current step", () => {
            render(<UploadScriptPage />);
            // First step (Script) should be active — it has bg-primary
            const scriptStep = screen.getByText("Script").closest("div");
            expect(scriptStep?.className).toContain("bg-primary");
        });

        it("should have a back button to dashboard", () => {
            render(<UploadScriptPage />);
            // Find the back arrow button
            const buttons = screen.getAllByRole("button");
            const backButton = buttons.find((b) =>
                b.querySelector("svg")
            );
            expect(backButton).toBeTruthy();
        });
    });

    // ─── File Upload UX ──────────────────────────────────────

    describe("File Upload", () => {
        it("should have a hidden file input", () => {
            render(<UploadScriptPage />);
            const fileInput = document.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;
            expect(fileInput).toBeTruthy();
            expect(fileInput.className).toContain("hidden");
        });

        it("should accept .txt, .md, .fountain files", () => {
            render(<UploadScriptPage />);
            const fileInput = document.querySelector(
                'input[type="file"]'
            ) as HTMLInputElement;
            expect(fileInput.accept).toContain(".txt");
            expect(fileInput.accept).toContain(".md");
            expect(fileInput.accept).toContain(".fountain");
        });
    });

    // ─── Accessibility ───────────────────────────────────────

    describe("Accessibility", () => {
        it("should have proper button labels", () => {
            render(<UploadScriptPage />);
            expect(
                screen.getByRole("button", { name: /generate/i })
            ).toBeInTheDocument();
        });
    });
});
