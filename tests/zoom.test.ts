import { describe, expect, it } from "vitest";
import {
  MAX_SCALE,
  MIN_PAN_STEP,
  MIN_SCALE,
  afterResize,
  arrowPanDelta,
  baseScale,
  baseState,
  clampPan,
  clampScale,
  fillState,
  fitScale,
  nextDoubleClickState,
  panBy,
  wheelFactor,
  zoomAt,
  zoomPercent,
} from "../src/shared/zoom.js";

const viewport = { width: 1000, height: 800 };
const largeImage = { width: 4000, height: 2000 };
const smallImage = { width: 100, height: 50 };

describe("scales", () => {
  it("fits a large image into the viewport", () => {
    expect(fitScale(largeImage, viewport)).toBeCloseTo(0.25);
    expect(baseScale(largeImage, viewport)).toBeCloseTo(0.25);
  });

  it("scales a small image up only in the fill view", () => {
    expect(fitScale(smallImage, viewport)).toBeCloseTo(10);
    expect(baseScale(smallImage, viewport)).toBe(1);
  });

  it("clamps scales to the allowed range", () => {
    expect(clampScale(1000)).toBe(MAX_SCALE);
    expect(clampScale(0.0001)).toBe(MIN_SCALE);
  });

  it("survives an image with no known size", () => {
    expect(fitScale({ width: 0, height: 0 }, viewport)).toBe(1);
  });
});

describe("base state", () => {
  it("centers the image", () => {
    const state = baseState(largeImage, viewport);
    expect(state.scale).toBeCloseTo(0.25);
    expect(state.x).toBeCloseTo(0);
    expect(state.y).toBeCloseTo(150);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the cursor in place", () => {
    const state = { scale: 1, x: 0, y: 0 };
    const cursor = { x: 300, y: 200 };
    const image = { width: 4000, height: 4000 };
    const zoomed = zoomAt(state, 2, cursor, image, viewport);

    expect(zoomed.scale).toBe(2);
    // The image point under the cursor was (300, 200); after zooming it must still be there.
    expect((cursor.x - zoomed.x) / zoomed.scale).toBeCloseTo(300);
    expect((cursor.y - zoomed.y) / zoomed.scale).toBeCloseTo(200);
  });

  it("never zooms past the limits", () => {
    const image = { width: 4000, height: 4000 };
    const zoomedIn = zoomAt({ scale: MAX_SCALE, x: 0, y: 0 }, 4, { x: 0, y: 0 }, image, viewport);
    expect(zoomedIn.scale).toBe(MAX_SCALE);

    const zoomedOut = zoomAt({ scale: MIN_SCALE, x: 0, y: 0 }, 0.1, { x: 0, y: 0 }, image, viewport);
    expect(zoomedOut.scale).toBe(MIN_SCALE);
  });
});

describe("panning", () => {
  it("centers an image that is smaller than the viewport", () => {
    const clamped = clampPan({ scale: 1, x: -500, y: -500 }, smallImage, viewport);
    expect(clamped.x).toBeCloseTo(450);
    expect(clamped.y).toBeCloseTo(375);
  });

  it("does not let the image edge move inside the viewport", () => {
    const state = { scale: 1, x: 0, y: 0 };
    const image = { width: 2000, height: 1600 };
    const draggedRight = panBy(state, 400, 0, image, viewport);
    expect(draggedRight.x).toBe(0);

    const draggedFarLeft = panBy(state, -5000, 0, image, viewport);
    expect(draggedFarLeft.x).toBe(viewport.width - image.width);
  });
});

describe("wheelFactor", () => {
  it("zooms in when scrolling up and out when scrolling down", () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-100) * wheelFactor(100)).toBeCloseTo(1);
  });

  it("normalizes line and page deltas and caps a single event", () => {
    expect(wheelFactor(-3, 1)).toBeCloseTo(wheelFactor(-100, 0));
    expect(wheelFactor(-10_000)).toBeCloseTo(Math.pow(1.1, 5));
  });
});

describe("double click", () => {
  it("fills the window for a small image, then returns to the base view", () => {
    const base = baseState(smallImage, viewport);
    const filled = nextDoubleClickState(base, smallImage, viewport);
    expect(filled.scale).toBeCloseTo(fillState(smallImage, viewport).scale);
    expect(filled.scale).toBeCloseTo(10);

    const back = nextDoubleClickState(filled, smallImage, viewport);
    expect(back.scale).toBeCloseTo(base.scale);
  });

  it("acts as a plain reset from a zoomed in state", () => {
    const zoomed = { scale: 3, x: -1200, y: -900 };
    const reset = nextDoubleClickState(zoomed, largeImage, viewport);
    expect(reset).toEqual(baseState(largeImage, viewport));
  });

  it("is a reset for a large image, where base and fill are the same", () => {
    const base = baseState(largeImage, viewport);
    expect(nextDoubleClickState(base, largeImage, viewport).scale).toBeCloseTo(base.scale);
  });
});

describe("arrowPanDelta", () => {
  it("moves the view with the arrow, so the image moves the other way", () => {
    expect(arrowPanDelta("ArrowRight", viewport)).toEqual({ dx: -20, dy: 0 });
    expect(arrowPanDelta("ArrowLeft", viewport)).toEqual({ dx: 20, dy: 0 });
    expect(arrowPanDelta("ArrowDown", viewport)).toEqual({ dx: 0, dy: -16 });
    expect(arrowPanDelta("ArrowUp", viewport)).toEqual({ dx: 0, dy: 16 });
  });

  it("keeps a usable step in a tiny window", () => {
    expect(arrowPanDelta("ArrowRight", { width: 200, height: 150 })).toEqual({ dx: -MIN_PAN_STEP, dy: 0 });
  });

  it("ignores any other key", () => {
    expect(arrowPanDelta("a", viewport)).toBeNull();
    expect(arrowPanDelta("PageDown", viewport)).toBeNull();
  });
});

describe("afterResize", () => {
  it("keeps the centered image point centered", () => {
    const image = { width: 4000, height: 4000 };
    const state = { scale: 1, x: -1500, y: -1500 };
    // Center of the old viewport is image point (2000, 1900) at this offset and scale.
    const resized = afterResize(state, image, viewport, { width: 600, height: 400 });
    expect((300 - resized.x) / resized.scale).toBeCloseTo(2000);
    expect((200 - resized.y) / resized.scale).toBeCloseTo(1900);
  });
});

describe("zoomPercent", () => {
  it("rounds to whole percents", () => {
    expect(zoomPercent(2.404)).toBe(240);
  });
});
