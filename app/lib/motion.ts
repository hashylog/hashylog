// Shared, mutable motion state read by every canvas each frame.
// `progress` is the smoothed scroll progress (0 at the top, 1 at the bottom).
export const motion = {
  target: 0,
  progress: 0,
};
