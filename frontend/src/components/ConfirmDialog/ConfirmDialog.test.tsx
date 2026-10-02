import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders with dialog semantics, labeled by its title", () => {
    render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("End Battle");
  });

  it("calls onCancel on Escape", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on a backdrop click, but not a click inside the panel", () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(container.firstChild as Element);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("wraps Shift+Tab backward from the first focusable to the last", () => {
    render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    // Cancel is focused by default on mount.
    expect(document.activeElement).toBe(cancelButton);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirmButton);
  });

  it("wraps Tab forward from the last focusable back to the first", () => {
    render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    confirmButton.focus();
    expect(document.activeElement).toBe(confirmButton);

    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancelButton);
  });

  it("calls onConfirm/onCancel exactly once when their buttons are clicked", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog title="End Battle" body="Are you sure?" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
