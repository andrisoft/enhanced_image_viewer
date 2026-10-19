/**
 * Happy-dom smoke tests for the content script. They prove the wiring, not real browser
 * behavior: happy-dom has no layout, so sizes are injected by hand.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { IMAGE_CLASS, STAGE_CLASS, bootstrap, isImageDocument } from "../src/content/viewer.js";
import { baseState } from "../src/shared/zoom.js";

function setContentType(type: string): void {
  Object.defineProperty(document, "contentType", { value: type, configurable: true });
}

function setNaturalSize(image: HTMLImageElement, width: number, height: number): void {
  Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
}

function buildImageDocument(width: number, height: number): HTMLImageElement {
  document.documentElement.className = "";
  document.body.textContent = "";
  const image = document.createElement("img");
  image.setAttribute("src", "https://example.invalid/photo.png");
  setNaturalSize(image, width, height);
  document.body.appendChild(image);
  return image;
}

/** happy-dom does not carry clientX/clientY through every event constructor, so set them here. */
function withCursor<T extends Event>(event: T, x: number, y: number): T {
  Object.defineProperty(event, "clientX", { value: x, configurable: true });
  Object.defineProperty(event, "clientY", { value: y, configurable: true });
  return event;
}

function pointerEvent(type: string, x: number, y: number): Event {
  const event = new window.MouseEvent(type, { button: 0, bubbles: true, cancelable: true });
  Object.defineProperty(event, "pointerId", { value: 1, configurable: true });
  return withCursor(event, x, y);
}

function wheelEvent(deltaY: number, x: number, y: number): Event {
  return withCursor(new window.WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }), x, y);
}

function transformOf(image: HTMLImageElement): string {
  return image.style.transform;
}

const viewport = { width: window.innerWidth, height: window.innerHeight };

beforeEach(() => {
  setContentType("image/png");
});

describe("isImageDocument", () => {
  it("accepts raster image documents only", () => {
    setContentType("image/png");
    expect(isImageDocument(document)).toBe(true);
    setContentType("image/jpeg");
    expect(isImageDocument(document)).toBe(true);
    setContentType("text/html");
    expect(isImageDocument(document)).toBe(false);
    setContentType("image/svg+xml");
    expect(isImageDocument(document)).toBe(false);
  });
});

describe("bootstrap", () => {
  it("leaves a non image document completely untouched", () => {
    setContentType("text/html");
    document.documentElement.className = "";
    document.body.textContent = "";
    const paragraph = document.createElement("p");
    paragraph.textContent = "a normal page";
    document.body.appendChild(paragraph);

    const viewer = bootstrap(document, window, "/* css */");

    expect(viewer).toBeNull();
    expect(document.documentElement.className).toBe("");
    expect(document.body.children).toHaveLength(1);
    expect(document.querySelector("style")).toBeNull();
  });

  it("replaces the native image document with its own stage", () => {
    const original = buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, ".eiv-stage { inset: 0 }");

    expect(viewer).not.toBeNull();
    expect(original.isConnected).toBe(false);
    expect(document.documentElement.classList.contains("eiv-host")).toBe(true);
    expect(document.querySelector("style")?.textContent).toContain(".eiv-stage");

    const stage = document.querySelector(`.${STAGE_CLASS}`);
    const image = document.querySelector(`.${IMAGE_CLASS}`) as HTMLImageElement;
    expect(stage).not.toBeNull();
    expect(image.getAttribute("src")).toBe("https://example.invalid/photo.png");
  });

  it("opens at the base view", () => {
    buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, "")!;
    const expected = baseState({ width: 4000, height: 2000 }, viewport);

    expect(viewer.getState().scale).toBeCloseTo(expected.scale);
    expect(transformOf(viewer.image)).toBe(
      `translate(${expected.x}px, ${expected.y}px) scale(${expected.scale})`,
    );
  });
});

describe("interactions", () => {
  it("zooms in on a wheel scroll up and out on a scroll down", () => {
    buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, "")!;
    const start = viewer.getState().scale;

    viewer.stage.dispatchEvent(wheelEvent(-100, 500, 400));
    const zoomedIn = viewer.getState().scale;
    expect(zoomedIn).toBeGreaterThan(start);

    viewer.stage.dispatchEvent(wheelEvent(100, 500, 400));
    expect(viewer.getState().scale).toBeCloseTo(start);
  });

  it("pans while the left button is held and shows the dragging cursor", () => {
    buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, "")!;
    // Zoom well past the viewport on both axes, so the drag is not cut off by the pan clamp.
    for (let index = 0; index < 3; index += 1) viewer.stage.dispatchEvent(wheelEvent(-1000, 500, 400));
    const before = viewer.getState();

    viewer.stage.dispatchEvent(pointerEvent("pointerdown", 500, 400));
    expect(viewer.stage.classList.contains("eiv-dragging")).toBe(true);

    viewer.stage.dispatchEvent(pointerEvent("pointermove", 460, 370));
    const dragged = viewer.getState();
    expect(dragged.x).toBeCloseTo(before.x - 40);
    expect(dragged.y).toBeCloseTo(before.y - 30);

    viewer.stage.dispatchEvent(pointerEvent("pointerup", 460, 370));
    expect(viewer.stage.classList.contains("eiv-dragging")).toBe(false);

    viewer.stage.dispatchEvent(pointerEvent("pointermove", 100, 100));
    expect(viewer.getState()).toEqual(dragged);
  });

  it("ignores a drag started with a non primary button", () => {
    buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, "")!;
    const before = viewer.getState();

    const rightDown = new window.MouseEvent("pointerdown", { clientX: 10, clientY: 10, button: 2, bubbles: true });
    viewer.stage.dispatchEvent(rightDown);
    viewer.stage.dispatchEvent(pointerEvent("pointermove", 200, 200));

    expect(viewer.getState()).toEqual(before);
  });

  it("fills the window on a double click for a small image and resets on the next one", () => {
    buildImageDocument(100, 50);
    const viewer = bootstrap(document, window, "")!;
    expect(viewer.getState().scale).toBe(1);

    viewer.stage.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    const filled = viewer.getState().scale;
    expect(filled).toBeGreaterThan(1);
    expect(filled).toBeCloseTo(Math.min(viewport.width / 100, viewport.height / 50));

    viewer.stage.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    expect(viewer.getState().scale).toBe(1);
  });

  it("resets a zoomed view on a double click", () => {
    buildImageDocument(4000, 2000);
    const viewer = bootstrap(document, window, "")!;
    viewer.stage.dispatchEvent(wheelEvent(-500, 300, 300));
    expect(viewer.getState().scale).toBeGreaterThan(baseState({ width: 4000, height: 2000 }, viewport).scale);

    viewer.stage.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    expect(viewer.getState()).toEqual(baseState({ width: 4000, height: 2000 }, viewport));
  });
});
