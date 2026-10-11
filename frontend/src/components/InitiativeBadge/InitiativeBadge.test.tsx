import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InitiativeBadge } from "./InitiativeBadge";

describe("InitiativeBadge", () => {
  it("shows the holder's name and says who tapping passes to", () => {
    render(<InitiativeBadge holder="p1" onPass={() => {}} />);

    const badge = screen.getByRole("button", { name: "Initiative: Player 1. Pass to Player 2." });
    expect(badge).toHaveTextContent("Player 1");
    expect(badge).toHaveAttribute("title", "Initiative: Player 1. Pass to Player 2.");
  });

  it("names Player 2 as holder when p2 has initiative", () => {
    render(<InitiativeBadge holder="p2" onPass={() => {}} />);

    expect(
      screen.getByRole("button", { name: "Initiative: Player 2. Pass to Player 1." }),
    ).toHaveTextContent("Player 2");
  });

  it("clicking calls onPass", () => {
    const onPass = vi.fn();
    render(<InitiativeBadge holder="p1" onPass={onPass} />);

    fireEvent.click(screen.getByRole("button", { name: /^Initiative:/ }));

    expect(onPass).toHaveBeenCalledOnce();
  });
});
