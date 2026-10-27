import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoundBadge } from "./RoundBadge";

describe("RoundBadge", () => {
  it("shows the round, read-only", () => {
    const { container } = render(<RoundBadge round={3} />);

    expect(container).toHaveTextContent("Round3");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
