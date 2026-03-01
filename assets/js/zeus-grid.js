// Zeus: randomize the 3x3 grid accent per page load
// Applied to: .zeus-grid-inline (post title icon)

(function () {
  function randomColor() {
    // Bright-ish, avoids muddy tones
    const hue = Math.floor(Math.random() * 360);
    const sat = 85;
    const light = 58;
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  function apply() {
    const color = randomColor();
    document.documentElement.style.setProperty('--zeus-grid-color', color);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
