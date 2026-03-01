// Zeus: randomize the 3x3 post-title marker color + flicker pattern

(function () {
  function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 85;
    const light = 58;
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomizeCells(cells) {
    let litCount = 0;

    cells.forEach(function (cell) {
      const on = Math.random() < 0.36;
      cell.classList.toggle('is-on', on);
      if (on) litCount += 1;
    });

    if (litCount === 0 && cells.length > 0) {
      const fallback = cells[randomInt(0, cells.length - 1)];
      fallback.classList.add('is-on');
    }
  }

  function initRandomFlicker() {
    const grids = Array.from(document.querySelectorAll('.zeus-grid.zeus-grid-inline'));
    if (!grids.length) return;

    const reducedMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cellGroups = grids
      .map(function (grid) { return Array.from(grid.querySelectorAll('.zeus-cell')); })
      .filter(function (cells) { return cells.length > 0; });

    if (!cellGroups.length) return;

    if (reducedMotion) {
      cellGroups.forEach(function (cells) {
        cells.forEach(function (cell, index) {
          cell.classList.toggle('is-on', index === 4);
        });
      });
      return;
    }

    let timerId = null;

    function tick() {
      cellGroups.forEach(randomizeCells);
      timerId = window.setTimeout(tick, randomInt(85, 240));
    }

    function stop() {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    }

    function start() {
      if (timerId === null) tick();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    start();
  }

  function apply() {
    document.documentElement.style.setProperty('--zeus-grid-color', randomColor());
    initRandomFlicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
