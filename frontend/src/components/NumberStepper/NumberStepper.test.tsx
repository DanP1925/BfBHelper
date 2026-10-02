import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberStepper } from "./NumberStepper";

describe("NumberStepper", () => {
  it("calls onChange with the clamped next value on + and -", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={10} onChange={onChange} label="Gold" />);

    fireEvent.click(screen.getByRole("button", { name: "Increase Gold" }));
    expect(onChange).toHaveBeenCalledWith(6);

    fireEvent.click(screen.getByRole("button", { name: "Decrease Gold" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("disables the decrease button at min", () => {
    render(<NumberStepper value={0} min={0} max={10} onChange={vi.fn()} label="Gold" />);
    expect(screen.getByRole("button", { name: "Decrease Gold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase Gold" })).not.toBeDisabled();
  });

  it("disables the increase button at max, but never when max is omitted", () => {
    const { rerender } = render(
      <NumberStepper value={10} min={0} max={10} onChange={vi.fn()} label="Gold" />,
    );
    expect(screen.getByRole("button", { name: "Increase Gold" })).toBeDisabled();

    rerender(<NumberStepper value={10} min={0} onChange={vi.fn()} label="Gold" />);
    expect(screen.getByRole("button", { name: "Increase Gold" })).not.toBeDisabled();
  });

  it("clamps a typed value above max on commit instead of rejecting it", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={15} onChange={onChange} label="HP" />);

    const input = screen.getByRole("spinbutton", { name: "HP" });
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(15);
  });

  it("rounds a fractional typed value to the nearest integer on commit", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={15} onChange={onChange} label="HP" />);

    const input = screen.getByRole("spinbutton", { name: "HP" });
    fireEvent.change(input, { target: { value: "7.5" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("commits a typed value on Enter, not just blur", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={15} onChange={onChange} label="HP" />);

    const input = screen.getByRole("spinbutton", { name: "HP" });
    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("reverts to the last valid value on an empty commit, calling onChange zero times", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={15} onChange={onChange} label="HP" />);

    const input = screen.getByRole("spinbutton", { name: "HP" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("5");
  });

  it("reverts to the last valid value on a non-numeric commit, calling onChange zero times", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} min={0} max={15} onChange={onChange} label="HP" />);

    const input = screen.getByRole("spinbutton", { name: "HP" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("5");
  });
});
