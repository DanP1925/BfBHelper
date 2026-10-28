"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { motionAllowed } from "./motion";

type TransitionAnimationOptions<T> = {
  elementRef: RefObject<HTMLElement | null>;
  value: T;
  /** False means never play, e.g. on a card that isn't on the Board. */
  enabled: boolean;
  /** Whether going from `previous` to `next` plays the animation. */
  plays: (previous: T, next: T) => boolean;
  /** Starts the animations on the element and returns them, so they can be
   * cancelled. They should end in the element's normal look (no `fill`),
   * so cancelling or finishing them leaves nothing behind. */
  play: (element: HTMLElement) => Animation[];
};

/**
 * Plays an animation when `value` changes in a way `plays` accepts
 * (intents 26 and 27). Never on mount, so a reload or a Board/Map switch
 * shows the settled look with no replay. Any other change of `value`, and
 * unmounting, cancels whatever is still running. Purely presentational:
 * the value is already saved, and nothing here blocks a tap.
 *
 * Does nothing when `motionAllowed()` is false (reduced motion, or jsdom),
 * read when an animation would start.
 */
export function useTransitionAnimation<T>({
  elementRef,
  value,
  enabled,
  plays,
  play,
}: TransitionAnimationOptions<T>): void {
  const previousRef = useRef(value);
  const runningRef = useRef<Animation[]>([]);
  // The latest callbacks, so callers can pass inline functions without
  // re-running the effect: it only reacts to `value`.
  const latestRef = useRef({ enabled, plays, play });
  useLayoutEffect(() => {
    latestRef.current = { enabled, plays, play };
  });

  useLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = value;
    if (Object.is(previous, value)) return;

    for (const animation of runningRef.current) animation.cancel();
    runningRef.current = [];

    const element = elementRef.current;
    const latest = latestRef.current;
    if (!latest.enabled || element === null || !latest.plays(previous, value) || !motionAllowed()) {
      return;
    }
    runningRef.current = latest.play(element);
  }, [elementRef, value]);

  useEffect(() => {
    const running = runningRef;
    return () => {
      for (const animation of running.current) animation.cancel();
      running.current = [];
    };
  }, []);
}
