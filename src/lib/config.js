// Single source of truth for window geometry. Loaded by main.js (require) and by the renderer (<script>).
(function (root) {
  const C = { W: 440, H: 210, PAD: 160 }; // window size; PAD = how far the window may hang off-screen
  if (typeof module !== 'undefined') module.exports = C; else root.PET_CONFIG = C;
})(globalThis);
