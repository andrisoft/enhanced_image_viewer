/**
 * The viewer itself: detect an image document, replace its DOM with our own stage and wire the
 * wheel, drag and double click interactions.
 *
 * Why the DOM is replaced: Chromium's ImageDocument attaches its own click-to-zoom handler to
 * the image and runs its own shrink-to-fit logic on resize. Neither is a JS listener, so neither
 * can be removed. Building a fresh <img> with the same src (served from cache) and dropping the
 * original leaves the built-in behavior unreachable.
 */

import {
  FAST_PAN_MULTIPLIER,
  afterResize,
  arrowPanDelta,
  baseState,
  nextDoubleClickState,
  panBy,
  wheelFactor,
  zoomAt,
  type Size,
  type ViewState,
} from "../shared/zoom.js";
import { MSG_VIEWER_ACTIVE } from "../shared/messages.js";

export const HOST_CLASS = "eiv-host";
export const STAGE_CLASS = "eiv-stage";
export const IMAGE_CLASS = "eiv-image";
export const DRAGGING_CLASS = "eiv-dragging";

/** True for a top level image document, except SVG, which is a real document and not in scope. */
export function isImageDocument(doc: Document): boolean {
  const contentType = doc.contentType || "";
  return contentType.startsWith("image/") && contentType !== "image/svg+xml";
}

/** Adds the viewer stylesheet. Called at document_start, so <head> may not exist yet. */
export function injectStyles(doc: Document, css: string): void {
  doc.documentElement.classList.add(HOST_CLASS);
  if (!css) return;
  const style = doc.createElement("style");
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);
}

export interface Viewer {
  readonly stage: HTMLDivElement;
  readonly image: HTMLImageElement;
  getState(): ViewState;
  reset(): void;
  destroy(): void;
}

function viewportOf(win: Window): Size {
  return { width: win.innerWidth, height: win.innerHeight };
}

/**
 * Builds the stage from the original image element and returns the live viewer.
 * The source URL only ever goes into an attribute, never into markup.
 */
export function createViewer(doc: Document, win: Window, original: HTMLImageElement): Viewer {
  const src = original.currentSrc || original.getAttribute("src") || win.location.href;

  const stage = doc.createElement("div");
  stage.className = STAGE_CLASS;

  const image = doc.createElement("img");
  image.className = IMAGE_CLASS;
  image.alt = "";
  image.draggable = false;
  image.setAttribute("src", src);

  stage.appendChild(image);
  original.remove();
  doc.body.appendChild(stage);

  let natural: Size = { width: original.naturalWidth || 0, height: original.naturalHeight || 0 };
  let viewport = viewportOf(win);
  let state: ViewState = baseState(natural, viewport);
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };

  const render = (): void => {
    image.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  };

  const measureNatural = (): void => {
    const width = image.naturalWidth || natural.width;
    const height = image.naturalHeight || natural.height;
    if (!width || !height) return;
    natural = { width, height };
    viewport = viewportOf(win);
    state = baseState(natural, viewport);
    render();
  };

  const onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    viewport = viewportOf(win);
    const factor = wheelFactor(event.deltaY, event.deltaMode);
    state = zoomAt(state, factor, { x: event.clientX, y: event.clientY }, natural, viewport);
    render();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    stage.classList.add(DRAGGING_CLASS);
    stage.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    viewport = viewportOf(win);
    state = panBy(state, event.clientX - lastPointer.x, event.clientY - lastPointer.y, natural, viewport);
    lastPointer = { x: event.clientX, y: event.clientY };
    render();
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove(DRAGGING_CLASS);
    stage.releasePointerCapture?.(event.pointerId);
  };

  const onDoubleClick = (event: MouseEvent): void => {
    event.preventDefault();
    viewport = viewportOf(win);
    state = nextDoubleClickState(state, natural, viewport);
    render();
  };

  const onDragStart = (event: Event): void => {
    event.preventDefault();
  };

  // Arrow keys pan when the image is larger than the window, Ctrl making the step five times
  // larger. The event is only consumed when something actually moved, so browser shortcuts keep
  // working on an image that fits. Alt and Meta are left alone: Alt+Arrow is back and forward.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.altKey || event.metaKey) return;
    viewport = viewportOf(win);
    const delta = arrowPanDelta(event.key, viewport, event.ctrlKey ? FAST_PAN_MULTIPLIER : 1);
    if (!delta) return;
    const next = panBy(state, delta.dx, delta.dy, natural, viewport);
    if (next.x === state.x && next.y === state.y) return;
    state = next;
    render();
    event.preventDefault();
  };

  const onResize = (): void => {
    const next = viewportOf(win);
    state = afterResize(state, natural, viewport, next);
    viewport = next;
    render();
  };

  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("dblclick", onDoubleClick);
  stage.addEventListener("dragstart", onDragStart);
  doc.addEventListener("keydown", onKeyDown);
  win.addEventListener("resize", onResize);

  if (image.complete && image.naturalWidth) {
    measureNatural();
  } else {
    image.addEventListener("load", measureNatural, { once: true });
  }
  render();

  return {
    stage,
    image,
    getState: () => state,
    reset: () => {
      viewport = viewportOf(win);
      state = baseState(natural, viewport);
      render();
    },
    destroy: () => {
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerUp);
      stage.removeEventListener("dblclick", onDoubleClick);
      stage.removeEventListener("dragstart", onDragStart);
      doc.removeEventListener("keydown", onKeyDown);
      win.removeEventListener("resize", onResize);
      stage.remove();
    },
  };
}

function reportActive(): void {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
  // The service worker may be starting up; a failed report only costs the colored icon.
  chrome.runtime.sendMessage({ type: MSG_VIEWER_ACTIVE }).catch(() => {});
}

/**
 * Entry point. Returns the viewer when it took over the document, or null when the document is
 * not an image, in which case nothing at all is touched.
 */
export function bootstrap(doc: Document, win: Window, css: string): Viewer | null {
  if (!isImageDocument(doc)) return null;
  injectStyles(doc, css);

  const build = (): Viewer | null => {
    const original = doc.body?.querySelector("img");
    if (!original) return null;
    const viewer = createViewer(doc, win, original as HTMLImageElement);
    reportActive();
    return viewer;
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", () => build(), { once: true });
    return null;
  }
  return build();
}
