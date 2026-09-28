import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "./page";

beforeEach(() => {
  window.localStorage.clear();
});

describe("Home", () => {
  it("renders the Start screen when no draft is in progress", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /battle for biternia/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start draft/i }),
    ).toBeInTheDocument();
  });
});
