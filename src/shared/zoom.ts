/**
 * Pure view math for the image viewer. No DOM access here, so it is testable on its own.
 *
 * The view is a scaled image placed at an offset inside the viewport, rendered with a single CSS
 * transform using `transform-origin: 0 0`: translate(x, y) scale(scale). All values are CSS
 * pixels.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ViewState {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 32;

/** Zoom factor of one wheel notch. */
export const ZOOM_STEP = 1.1;

/** A single wheel event never zooms more than this many notches (trackpad bursts). */
const MAX_NOTCHES_PER_EVENT = 5;

/** Tolerance when comparing two scales, used by the double click toggle. */
const SCALE_EPSILON = 0.001;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Scale at which the image touches a viewport edge, scaling a small image up as well. */
export function fitScale(image: Size, viewport: Size): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  return clampScale(Math.min(viewport.width / image.width, viewport.height / image.height));
}

/** Scale the viewer opens with: fits a large image, leaves a small one at its native size. */
export function baseScale(image: Size, viewport: Size): number {
  return Math.min(fitScale(image, viewport), 1);
}

export function displayedSize(image: Size, scale: number): Size {
  return { width: image.width * scale, height: image.height * scale };
}

/**
 * Keeps the image inside the viewport: centered on an axis where it is smaller than the
 * viewport, and otherwise prevented from having its edge dragged into the viewport.
 */
export function clampPan(state: ViewState, image: Size, viewport: Size): ViewState {
  const shown = displayedSize(image, state.scale);
  const clampAxis = (offset: number, shownLength: number, viewportLength: number): number => {
    if (shownLength <= viewportLength) return (viewportLength - shownLength) / 2;
    return Math.min(0, Math.max(viewportLength - shownLength, offset));
  };
  return {
    scale: state.scale,
    x: clampAxis(state.x, shown.width, viewport.width),
    y: clampAxis(state.y, shown.height, viewport.height),
  };
}

/** The image centered in the viewport at the given scale. */
export function centeredState(scale: number, image: Size, viewport: Size): ViewState {
  const shown = displayedSize(image, scale);
  return {
    scale,
    x: (viewport.width - shown.width) / 2,
    y: (viewport.height - shown.height) / 2,
  };
}

export function baseState(image: Size, viewport: Size): ViewState {
  return centeredState(baseScale(image, viewport), image, viewport);
}

export function fillState(image: Size, viewport: Size): ViewState {
  return centeredState(fitScale(image, viewport), image, viewport);
}

/** Zoom by `factor`, keeping the image point under `cursor` in place. */
export function zoomAt(
  state: ViewState,
  factor: number,
  cursor: Point,
  image: Size,
  viewport: Size,
): ViewState {
  const scale = clampScale(state.scale * factor);
  const applied = scale / state.scale;
  const zoomed: ViewState = {
    scale,
    x: cursor.x - (cursor.x - state.x) * applied,
    y: cursor.y - (cursor.y - state.y) * applied,
  };
  return clampPan(zoomed, image, viewport);
}

export function panBy(state: ViewState, dx: number, dy: number, image: Size, viewport: Size): ViewState {
  return clampPan({ scale: state.scale, x: state.x + dx, y: state.y + dy }, image, viewport);
}

/**
 * Zoom factor for a wheel event. `deltaMode` follows WheelEvent: 0 pixels, 1 lines, 2 pages.
 * Scrolling up (negative delta) zooms in.
 */
export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const perNotch = deltaMode === 0 ? 100 : deltaMode === 1 ? 3 : 1;
  const raw = deltaY / perNotch;
  const notches = Math.min(MAX_NOTCHES_PER_EVENT, Math.max(-MAX_NOTCHES_PER_EVENT, raw));
  return Math.pow(ZOOM_STEP, -notches);
}

/**
 * Double click: switch between the base view and the fill view. For an image larger than the
 * viewport the two are the same scale, so it acts as a plain reset.
 */
export function nextDoubleClickState(state: ViewState, image: Size, viewport: Size): ViewState {
  const base = baseState(image, viewport);
  const atBase = Math.abs(state.scale - base.scale) < SCALE_EPSILON;
  return atBase ? fillState(image, viewport) : base;
}

/** Keep the image point that was in the middle of the viewport in the middle after a resize. */
export function afterResize(
  state: ViewState,
  image: Size,
  oldViewport: Size,
  newViewport: Size,
): ViewState {
  const imagePointX = (oldViewport.width / 2 - state.x) / state.scale;
  const imagePointY = (oldViewport.height / 2 - state.y) / state.scale;
  const moved: ViewState = {
    scale: state.scale,
    x: newViewport.width / 2 - imagePointX * state.scale,
    y: newViewport.height / 2 - imagePointY * state.scale,
  };
  return clampPan(moved, image, newViewport);
}

/** One arrow key press moves this share of the viewport, but never less than MIN_PAN_STEP. */
export const PAN_STEP_RATIO = 0.02;
export const MIN_PAN_STEP = 10;

/** Holding Ctrl makes an arrow key step this many times larger. */
export const FAST_PAN_MULTIPLIER = 5;

/**
 * Pan offset for an arrow key, or null for any other key. The view follows the arrow, so the
 * image itself moves the other way.
 */
export function arrowPanDelta(
  key: string,
  viewport: Size,
  multiplier = 1,
): { dx: number; dy: number } | null {
  const stepX = Math.max(MIN_PAN_STEP, viewport.width * PAN_STEP_RATIO) * multiplier;
  const stepY = Math.max(MIN_PAN_STEP, viewport.height * PAN_STEP_RATIO) * multiplier;
  switch (key) {
    case "ArrowLeft":
      return { dx: stepX, dy: 0 };
    case "ArrowRight":
      return { dx: -stepX, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: stepY };
    case "ArrowDown":
      return { dx: 0, dy: -stepY };
    default:
      return null;
  }
}

/** Zoom percentage for display, e.g. 240 for 2.4x. */
export function zoomPercent(scale: number): number {
  return Math.round(scale * 100);
}
