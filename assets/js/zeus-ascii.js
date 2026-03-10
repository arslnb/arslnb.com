// Zeus ASCII hero: full-width "ZEUS" in large ASCII art with animated noise
(function () {
  var canvas = document.getElementById('zeus-ascii-canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  var TOTAL_ROWS = 17;

  var CHAR_W = 9;
  var CHAR_H = 13;

  function getCols() {
    var containerW = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    return Math.max(40, Math.floor(containerW / CHAR_W));
  }

  var COLS = getCols();

  var CHARS_LIGHT = '.:-~,;\'`'.split('');

  var COLOR_CHANCE = 0.16;
  var PALETTE_LIGHT = ['#b07d5b', '#7a8b6e', '#8b7ea0', '#6e8b9b', '#a07a6e', '#7a9b8b'];
  var PALETTE_DARK = ['#c9a06a', '#7aab8e', '#a08bc0', '#6eaabb', '#bb8a7a', '#8abb9a'];

  var colorMap = [];
  function buildColorMap() {
    colorMap = [];
    for (var r = 0; r < TOTAL_ROWS; r++) {
      colorMap[r] = [];
      for (var c = 0; c < COLS; c++) {
        var isColored = Math.random() < COLOR_CHANCE;
        var palIdx = Math.floor(Math.random() * PALETTE_LIGHT.length);
        colorMap[r][c] = isColored ? palIdx : -1;
      }
    }
  }
  buildColorMap();

  function isDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resize() {
    COLS = getCols();
    var w = COLS * CHAR_W;
    var h = TOTAL_ROWS * CHAR_H;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildColorMap();
  }

  resize();
  window.addEventListener('resize', resize);

  var t = 0;
  var animId = null;
  var FPS = 12;
  var lastFrame = 0;

  function draw(now) {
    animId = requestAnimationFrame(draw);
    if (now - lastFrame < 1000 / FPS) return;
    lastFrame = now;

    var dark = isDark();
    var baseColor = dark ? '#3a3a3a' : '#c8c8c8';
    var palette = dark ? PALETTE_DARK : PALETTE_LIGHT;

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.font = '12px "JetBrains Mono", "SF Mono", Consolas, monospace';
    ctx.textBaseline = 'top';

    for (var r = 0; r < TOTAL_ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var v1 = Math.sin(c * 0.08 + t * 0.012 + r * 0.5);
        var v2 = Math.sin(c * 0.12 - t * 0.018 + r * 0.9);
        var v3 = Math.sin((c + r) * 0.06 + t * 0.008);
        var drift = Math.sin(t * 0.005 + r * 1.2) * 0.3;
        var v4 = Math.sin((c + drift) * 0.1 + t * 0.01);
        var v = (v1 + v2 + v3 + v4) / 4;
        var norm = (v + 1) / 2;
        var idx = Math.floor(norm * (CHARS_LIGHT.length - 1));

        var palIdx = colorMap[r] && colorMap[r][c] !== undefined ? colorMap[r][c] : -1;
        if (palIdx >= 0) {
          ctx.fillStyle = palette[palIdx];
        } else {
          ctx.fillStyle = baseColor;
        }
        ctx.fillText(CHARS_LIGHT[idx], c * CHAR_W, r * CHAR_H + 2);
      }
    }

    t++;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        if (!animId) animId = requestAnimationFrame(draw);
      } else {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    });
  });

  observer.observe(canvas);
  animId = requestAnimationFrame(draw);
})();

// Interactive desktop scenarios
(function () {
  var notch = document.getElementById('zeus-notch');
  var chat = document.getElementById('zeus-notch-chat');
  var thinking = document.getElementById('zeus-notch-thinking');
  var gridIcon = document.getElementById('zeus-grid-icon');
  var dotsEl = document.getElementById('zeus-thinking-dots');
  var inputText = document.getElementById('zeus-input-text');
  var desktop = document.getElementById('zeus-desktop');
  if (!notch || !chat || !desktop) return;

  var dotsTimer = null;

  function startDots() {
    var count = 0;
    dotsTimer = setInterval(function () {
      count = (count + 1) % 4;
      dotsEl.textContent = '...'.slice(0, count);
    }, 450);
  }

  function stopDots() {
    if (dotsTimer) clearInterval(dotsTimer);
    dotsEl.textContent = '';
  }

  function showThinking(on) {
    if (on) {
      thinking.classList.add('zeus-thinking-visible');
      gridIcon.classList.add('zeus-grid-active');
      startDots();
    } else {
      thinking.classList.remove('zeus-thinking-visible');
      gridIcon.classList.remove('zeus-grid-active');
      stopDots();
    }
  }

  function openNotch() { notch.classList.add('zeus-notch-expanded'); }
  function closeNotch() {
    notch.classList.remove('zeus-notch-expanded');
    showThinking(false);
    chat.innerHTML = '';
    inputText.textContent = 'Ask Zeus anything...';
    inputText.classList.remove('zeus-input-active');
  }

  function addUser(t) { var e = document.createElement('div'); e.className = 'zeus-chat-user'; e.textContent = t; chat.appendChild(e); }
  function addMsg(t) { var e = document.createElement('div'); e.className = 'zeus-chat-assistant'; e.textContent = t; chat.appendChild(e); }
  function addTool(t) {
    var e = document.createElement('div'); e.className = 'zeus-chat-tool';
    var g = document.createElement('span'); g.className = 'zeus-grid-icon zeus-grid-active';
    for (var i = 0; i < 9; i++) g.appendChild(document.createElement('span'));
    e.appendChild(g); e.appendChild(document.createTextNode(t)); chat.appendChild(e);
  }
  function addApproval() {
    var e = document.createElement('div'); e.className = 'zeus-chat-approval';
    var a = document.createElement('span'); a.className = 'zeus-approval-approve'; a.textContent = 'Approve';
    var d = document.createElement('span'); d.className = 'zeus-approval-deny'; d.textContent = 'Deny';
    e.appendChild(a); e.appendChild(d); chat.appendChild(e);
  }

  function typeInput(text, cb) {
    inputText.textContent = ''; inputText.classList.add('zeus-input-active');
    var i = 0;
    (function next() {
      if (i < text.length) { inputText.textContent += text[i]; i++; setTimeout(next, 30 + Math.random() * 40); }
      else cb();
    })();
  }

  function submitAndRun(query, steps, done) {
    typeInput(query, function () {
      setTimeout(function () {
        addUser(query);
        inputText.textContent = 'Ask Zeus anything...';
        inputText.classList.remove('zeus-input-active');
        runSteps(steps, 0, done);
      }, 400);
    });
  }

  function runSteps(steps, i, done) {
    if (i >= steps.length) { if (done) done(); return; }
    var s = steps[i];
    setTimeout(function () {
      if (s.type === 'think') showThinking(true);
      else if (s.type === 'endthink') showThinking(false);
      else if (s.type === 'tool') addTool(s.text);
      else if (s.type === 'msg') addMsg(s.text);
      else if (s.type === 'approve') addApproval();
      else if (s.type === 'desktop' && s.fn) s.fn();
      runSteps(steps, i + 1, done);
    }, s.delay || 0);
  }

  // --- Desktop builders ---

  var dots = '<span class="zd-window-dots"><span class="zd-dot zd-dot-r"></span><span class="zd-dot zd-dot-y"></span><span class="zd-dot zd-dot-g"></span></span>';

  function makeIcon(cls, label, left, top) {
    var d = document.createElement('div'); d.className = 'zd-icon';
    d.style.left = left; d.style.top = top;
    var img = document.createElement('div'); img.className = 'zd-icon-img ' + cls;
    var lbl = document.createElement('div'); lbl.className = 'zd-icon-label'; lbl.textContent = label;
    d.appendChild(img); d.appendChild(lbl);
    return d;
  }

  function makeWindow(opts) {
    var w = document.createElement('div'); w.className = 'zd-window' + (opts.windowClass ? ' ' + opts.windowClass : '');
    if (opts.id) w.id = opts.id;
    w.style.left = opts.left; w.style.top = opts.top;
    w.style.width = opts.width; w.style.height = opts.height;
    var bar = document.createElement('div'); bar.className = 'zd-window-bar' + (opts.barClass ? ' ' + opts.barClass : '');
    bar.innerHTML = dots;
    if (opts.barHtml) {
      bar.insertAdjacentHTML('beforeend', opts.barHtml);
    } else if (opts.title) {
      var t = document.createElement('span'); t.className = 'zd-window-title'; t.textContent = opts.title; bar.appendChild(t);
    }
    w.appendChild(bar);
    if (opts.bodyHtml) {
      var b = document.createElement('div');
      b.className = 'zd-window-body' + (opts.bodyClass ? ' ' + opts.bodyClass : '');
      b.innerHTML = opts.bodyHtml;
      w.appendChild(b);
    }
    if (opts.customHtml) w.insertAdjacentHTML('beforeend', opts.customHtml);
    return w;
  }

  function makePdf(opts) {
    var p = document.createElement('div'); p.className = 'zd-pdf' + (opts.windowClass ? ' ' + opts.windowClass : ''); p.id = opts.id || '';
    p.style.left = opts.left; p.style.top = opts.top;
    p.style.width = opts.width; p.style.height = opts.height;
    var bar = document.createElement('div'); bar.className = 'zd-pdf-bar' + (opts.barClass ? ' ' + opts.barClass : '');
    bar.innerHTML = dots;
    if (opts.barHtml) {
      bar.insertAdjacentHTML('beforeend', opts.barHtml);
    } else if (opts.title) {
      var t = document.createElement('span'); t.className = 'zd-window-title'; t.textContent = opts.title; bar.appendChild(t);
    }
    p.appendChild(bar);
    if (opts.contentHtml) {
      var content = document.createElement('div');
      content.className = 'zd-pdf-content' + (opts.contentClass ? ' ' + opts.contentClass : '');
      content.innerHTML = opts.contentHtml;
      p.appendChild(content);
    } else {
      var page = document.createElement('div'); page.className = 'zd-pdf-page';
      var body = document.createElement('div'); body.className = 'zd-pdf-body';
      body.innerHTML = opts.html || '';
      page.appendChild(body); p.appendChild(page);
    }
    return p;
  }

  // Line numbers helper
  function gutter(n) {
    var lines = [];
    for (var i = 1; i <= n; i++) lines.push(i);
    return lines.join('\n');
  }

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function sample(list, count) {
    return shuffle(list).slice(0, Math.min(count, list.length));
  }

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  function renderCodeLines(lines, activeIndex) {
    return lines.map(function (line, idx) {
      return '<div class="zd-code-line' + (idx === activeIndex ? ' is-active' : '') + '">' + (line || '&nbsp;') + '</div>';
    }).join('');
  }

  var CODE_SCENES = [
    {
      appTitle: 'atlas-sync',
      explorerHead: 'AUTOMATION',
      activeFile: 'retry_queue.py',
      breadcrumb: 'jobs > retry_queue.py > drain_backlog',
      tabType: 'py',
      tree: [
        { kind: 'folder', label: '__pycache__' },
        { kind: 'folder', label: 'api' },
        { kind: 'folder', label: 'jobs', open: true },
        { kind: 'file', label: 'retry_queue.py', active: true, badge: '3' },
        { kind: 'file', label: 'worker.py' },
        { kind: 'file', label: 'router.py' },
        { kind: 'folder', label: 'runtime' },
        { kind: 'folder', label: 'telemetry' },
        { kind: 'folder', label: 'tests' },
        { kind: 'file', label: 'main.py' },
        { kind: 'file', label: 'settings.py' },
        { kind: 'file', label: 'pyproject.toml' }
      ],
      codeLines: [
        '<span class="zd-code-cm">"""Retry routing for background workers."""</span>',
        '',
        '<span class="zd-code-kw">from</span> <span class="zd-code-var">typing</span> <span class="zd-code-kw">import</span> <span class="zd-code-type">NamedTuple</span>',
        '',
        '<span class="zd-code-kw">class</span> <span class="zd-code-type">RetryDecision</span>(<span class="zd-code-type">NamedTuple</span>):',
        '    <span class="zd-code-var">bucket</span>: <span class="zd-code-type">str</span>',
        '    <span class="zd-code-var">delay_ms</span>: <span class="zd-code-type">int</span>',
        '',
        '<span class="zd-code-kw">def</span> <span class="zd-code-fn">choose_bucket</span>(<span class="zd-code-var">error_count</span>: <span class="zd-code-type">int</span>, <span class="zd-code-var">elapsed_ms</span>: <span class="zd-code-type">int</span>) <span class="zd-code-op">-&gt;</span> <span class="zd-code-type">RetryDecision</span>:',
        '    <span class="zd-code-kw">if</span> <span class="zd-code-var">error_count</span> <span class="zd-code-op">&gt;=</span> <span class="zd-code-num">6</span>:',
        '        <span class="zd-code-kw">return</span> <span class="zd-code-type">RetryDecision</span>(<span class="zd-code-str">"dead-letter"</span>, <span class="zd-code-num">0</span>)',
        '    <span class="zd-code-var">base_delay</span> <span class="zd-code-op">=</span> <span class="zd-code-var">min</span>(<span class="zd-code-num">90000</span>, <span class="zd-code-num">1000</span> <span class="zd-code-op">*</span> (<span class="zd-code-num">2</span> <span class="zd-code-op">**</span> <span class="zd-code-var">error_count</span>))',
        '    <span class="zd-code-kw">if</span> <span class="zd-code-var">elapsed_ms</span> <span class="zd-code-op">&gt;</span> <span class="zd-code-num">120000</span>:',
        '        <span class="zd-code-var">base_delay</span> <span class="zd-code-op">=</span> <span class="zd-code-var">max</span>(<span class="zd-code-var">base_delay</span>, <span class="zd-code-num">15000</span>)',
        '    <span class="zd-code-kw">return</span> <span class="zd-code-type">RetryDecision</span>(<span class="zd-code-str">"retry"</span>, <span class="zd-code-fn">jitter</span>(<span class="zd-code-var">base_delay</span>))',
        '',
        '<span class="zd-code-kw">def</span> <span class="zd-code-fn">drain_backlog</span>(<span class="zd-code-var">queue</span>) <span class="zd-code-op">-&gt;</span> <span class="zd-code-type">list</span>[<span class="zd-code-type">str</span>]:',
        '    <span class="zd-code-var">moved</span> <span class="zd-code-op">=</span> []',
        '    <span class="zd-code-kw">for</span> <span class="zd-code-var">job</span> <span class="zd-code-kw">in</span> <span class="zd-code-var">queue</span>.<span class="zd-code-fn">fetch</span>(<span class="zd-code-var">limit</span><span class="zd-code-op">=</span><span class="zd-code-num">64</span>):',
        '        <span class="zd-code-var">decision</span> <span class="zd-code-op">=</span> <span class="zd-code-fn">choose_bucket</span>(<span class="zd-code-var">job</span>.<span class="zd-code-var">error_count</span>, <span class="zd-code-var">job</span>.<span class="zd-code-var">elapsed_ms</span>)',
        '        <span class="zd-code-var">queue</span>.<span class="zd-code-fn">move</span>(<span class="zd-code-var">job</span>.<span class="zd-code-var">id</span>, <span class="zd-code-var">decision</span>.<span class="zd-code-var">bucket</span>, <span class="zd-code-var">delay_ms</span><span class="zd-code-op">=</span><span class="zd-code-var">decision</span>.<span class="zd-code-var">delay_ms</span>)',
        '        <span class="zd-code-var">moved</span>.<span class="zd-code-fn">append</span>(<span class="zd-code-var">job</span>.<span class="zd-code-var">id</span>)',
        '    <span class="zd-code-kw">return</span> <span class="zd-code-var">moved</span>'
      ],
      activeLine: 20,
      status: ['atlas-sync', 'feat/retry-budget', '0  3', 'Ln 21, Col 18', 'Spaces: 4', 'UTF-8', 'Python'],
      terminalTitle: '~/work/atlas-sync',
      terminalLines: [
        'Last login: Tue Mar 10 08:14:22 on ttys005',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">atlas-sync</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">feature/retries</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> rg <span class="zd-code-str">"dead-letter"</span> src/jobs',
        '<span class="zd-term-dim">src/jobs/retry_queue.py:17:return RetryDecision("dead-letter", 0)</span>',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">atlas-sync</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">feature/retries</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> uv run pytest tests/test_retry_queue.py',
        '<span class="zd-term-dim">================ 12 passed in 1.84s ================</span>'
      ],
      browser: {
        url: 'docs.atlas.dev/reliability/retry-budgets',
        sidebarHead: 'Reliability',
        sidebarItems: ['Overview', 'Retry budgets', 'Worker leases', 'Backoff policy', 'Dead-letter flow'],
        activeSidebar: 'Retry budgets',
        breadcrumbs: 'Atlas Docs / Reliability',
        title: 'Controlling retry budgets',
        copy: 'Bound retries so transient failures recover quickly without allowing stale jobs to circle the queue forever.',
        callout: 'Track both attempt count and age-in-queue. Long-running jobs should escalate even if the raw retry count is low.',
        section1Title: '1. Classify failures',
        section1Body: 'Transient network faults can re-enter the retry lane. Validation failures should bypass retries and move straight to review.',
        code: 'decision = choose_bucket(error_count, elapsed_ms)',
        section2Title: '2. Escalate stale jobs',
        section2Body: 'When the retry window expires, route work into a dead-letter queue with enough context for manual replay.'
      },
      preview: {
        filename: 'retry-budget-brief.pdf',
        brand: 'research memo',
        order: 'Brief 08',
        title: 'Queue Reliability Brief',
        type: 'Prepared for Atlas Sync',
        meta: [
          'Focus: retry caps, backoff windows, dead-letter routing',
          'Recommendation: cap retries at 6 and attach age-in-queue metrics',
          'Risk: long-lived jobs can starve fresh work if retries are unbounded'
        ],
        sections: [
          { title: 'Key findings:', body: 'Bounded retries outperform open-ended retries because they limit tail latency and make queue pressure predictable during partial outages.' },
          { title: 'Suggested next step:', body: 'Add a retry decision helper, persist a deduplication token, and surface stale work in a dedicated operator queue.' }
        ]
      },
      notice: 'I found a gap in your retry flow: stale jobs can re-enter the queue without a cap.',
      tools: ['Reviewing retry budget patterns', 'Reading queue reliability docs', 'Drafting a reliability brief'],
      summary: 'I put together a short brief on bounded retries, dead-letter thresholds, and duplicate suppression.'
    },
    {
      appTitle: 'signal-planner',
      explorerHead: 'PLANNING',
      activeFile: 'planner.py',
      breadcrumb: 'scheduling > planner.py > score_slots',
      tabType: 'py',
      tree: [
        { kind: 'folder', label: '__pycache__' },
        { kind: 'folder', label: 'calendar' },
        { kind: 'folder', label: 'scheduling', open: true },
        { kind: 'file', label: 'planner.py', active: true, badge: '2' },
        { kind: 'file', label: 'availability.py' },
        { kind: 'file', label: 'rankers.py' },
        { kind: 'folder', label: 'notes' },
        { kind: 'folder', label: 'tests' },
        { kind: 'file', label: 'main.py' },
        { kind: 'file', label: 'pytest.ini' }
      ],
      codeLines: [
        '<span class="zd-code-cm">"""Meeting slot ranking for proactive scheduling."""</span>',
        '',
        '<span class="zd-code-kw">from</span> <span class="zd-code-var">dataclasses</span> <span class="zd-code-kw">import</span> <span class="zd-code-type">dataclass</span>',
        '',
        '<span class="zd-code-kw">@dataclass</span>',
        '<span class="zd-code-kw">class</span> <span class="zd-code-type">Slot</span>:',
        '    <span class="zd-code-var">start</span>: <span class="zd-code-type">str</span>',
        '    <span class="zd-code-var">score</span>: <span class="zd-code-type">float</span>',
        '    <span class="zd-code-var">tags</span>: <span class="zd-code-type">list</span>[<span class="zd-code-type">str</span>]',
        '',
        '<span class="zd-code-kw">def</span> <span class="zd-code-fn">score_slots</span>(<span class="zd-code-var">slots</span>, <span class="zd-code-var">prefs</span>):',
        '    <span class="zd-code-var">ranked</span> <span class="zd-code-op">=</span> []',
        '    <span class="zd-code-kw">for</span> <span class="zd-code-var">slot</span> <span class="zd-code-kw">in</span> <span class="zd-code-var">slots</span>:',
        '        <span class="zd-code-var">score</span> <span class="zd-code-op">=</span> <span class="zd-code-num">0.0</span>',
        '        <span class="zd-code-var">score</span> <span class="zd-code-op">+=</span> <span class="zd-code-fn">overlap_bonus</span>(<span class="zd-code-var">slot</span>, <span class="zd-code-var">prefs</span>.<span class="zd-code-var">focus_blocks</span>)',
        '        <span class="zd-code-var">score</span> <span class="zd-code-op">-=</span> <span class="zd-code-fn">context_switch_cost</span>(<span class="zd-code-var">slot</span>, <span class="zd-code-var">prefs</span>)',
        '        <span class="zd-code-kw">if</span> <span class="zd-code-var">slot</span>.<span class="zd-code-var">local_hour</span> <span class="zd-code-op">&lt;</span> <span class="zd-code-num">9</span>:',
        '            <span class="zd-code-var">score</span> <span class="zd-code-op">-=</span> <span class="zd-code-num">3.5</span>',
        '        <span class="zd-code-kw">if</span> <span class="zd-code-var">slot</span>.<span class="zd-code-var">free_window_minutes</span> <span class="zd-code-op">&lt;</span> <span class="zd-code-num">35</span>:',
        '            <span class="zd-code-kw">continue</span>',
        '        <span class="zd-code-var">ranked</span>.<span class="zd-code-fn">append</span>(<span class="zd-code-type">Slot</span>(<span class="zd-code-var">slot</span>.<span class="zd-code-var">start</span>, <span class="zd-code-var">score</span>, <span class="zd-code-var">slot</span>.<span class="zd-code-var">tags</span>))',
        '    <span class="zd-code-kw">return</span> <span class="zd-code-var">sorted</span>(<span class="zd-code-var">ranked</span>, <span class="zd-code-var">key</span><span class="zd-code-op">=</span><span class="zd-code-kw">lambda</span> <span class="zd-code-var">item</span>: <span class="zd-code-var">item</span>.<span class="zd-code-var">score</span>, <span class="zd-code-var">reverse</span><span class="zd-code-op">=</span><span class="zd-code-num">True</span>)'
      ],
      activeLine: 15,
      status: ['signal-planner', 'slot-ranking', '0  1', 'Ln 16, Col 15', 'Spaces: 4', 'UTF-8', 'Python'],
      terminalTitle: '~/work/signal-planner',
      terminalLines: [
        'Last login: Tue Mar 10 07:58:09 on ttys011',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">signal-planner</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">slot-ranking</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> uv run pytest tests/test_planner.py -q',
        '<span class="zd-term-dim">..............                                              [100%]</span>',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">signal-planner</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">slot-ranking</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> python scripts/preview_slots.py',
        '<span class="zd-term-dim">top slot: Thu 3:30 PM  score=8.4  tags=[focus, buffer]</span>'
      ],
      browser: {
        url: 'docs.signal.dev/scheduling/ranking-slots',
        sidebarHead: 'Scheduling',
        sidebarItems: ['Overview', 'Ranking slots', 'Buffers', 'Timezone rules', 'Follow-ups'],
        activeSidebar: 'Ranking slots',
        breadcrumbs: 'Signal Docs / Scheduling',
        title: 'Ranking available slots',
        copy: 'Score candidate times based on focus blocks, local working hours, and the cost of forcing a context switch.',
        callout: 'Healthy schedulers optimize for both convenience and momentum. Leave buffer around deep work when possible.',
        section1Title: '1. Reward clean windows',
        section1Body: 'Favor slots that preserve larger uninterrupted blocks before and after the meeting.',
        code: 'score += overlap_bonus(slot, prefs.focus_blocks)',
        section2Title: '2. Penalize interruptions',
        section2Body: 'Subtract points when a meeting fragments a longer focus interval or lands too early in the morning.'
      },
      preview: {
        filename: 'slot-ranking-note.pdf',
        brand: 'research memo',
        order: 'Memo 14',
        title: 'Scheduling Heuristics Note',
        type: 'Prepared for Signal Planner',
        meta: [
          'Focus: slot ranking, context switching, focus-block protection',
          'Recommendation: reward buffer time around the chosen meeting',
          'Risk: greedy ranking can overload mid-afternoons if all preferences are weighted equally'
        ],
        sections: [
          { title: 'Key findings:', body: 'Schedulers that consider transition cost produce better outcomes than ones that sort only by earliest open slot.' },
          { title: 'Suggested next step:', body: 'Expose ranking reasons in the UI so operators understand why one slot won over another.' }
        ]
      },
      notice: 'Your slot ranking looks solid, but it is not penalizing context switches yet.',
      tools: ['Reviewing scheduling heuristics', 'Reading docs on meeting buffers', 'Drafting a slot-ranking note'],
      summary: 'I wrote up a quick note on buffer-aware slot ranking and how to explain the result to users.'
    },
    {
      appTitle: 'digest-lab',
      explorerHead: 'INBOX',
      activeFile: 'digest_builder.py',
      breadcrumb: 'summaries > digest_builder.py > compact_threads',
      tabType: 'py',
      tree: [
        { kind: 'folder', label: '__pycache__' },
        { kind: 'folder', label: 'summaries', open: true },
        { kind: 'file', label: 'digest_builder.py', active: true, badge: '5' },
        { kind: 'file', label: 'scoring.py' },
        { kind: 'file', label: 'extractors.py' },
        { kind: 'folder', label: 'models' },
        { kind: 'folder', label: 'tests' },
        { kind: 'file', label: 'main.py' },
        { kind: 'file', label: 'requirements.txt' }
      ],
      codeLines: [
        '<span class="zd-code-cm">"""Build compact morning digests from active threads."""</span>',
        '',
        '<span class="zd-code-kw">def</span> <span class="zd-code-fn">compact_threads</span>(<span class="zd-code-var">threads</span>, <span class="zd-code-var">limit</span>: <span class="zd-code-type">int</span> = <span class="zd-code-num">6</span>):',
        '    <span class="zd-code-var">ranked</span> <span class="zd-code-op">=</span> <span class="zd-code-var">sorted</span>(',
        '        <span class="zd-code-var">threads</span>,',
        '        <span class="zd-code-var">key</span><span class="zd-code-op">=</span><span class="zd-code-kw">lambda</span> <span class="zd-code-var">thread</span>: (<span class="zd-code-var">thread</span>.<span class="zd-code-var">urgency</span>, <span class="zd-code-var">thread</span>.<span class="zd-code-var">last_reply_at</span>),',
        '        <span class="zd-code-var">reverse</span><span class="zd-code-op">=</span><span class="zd-code-num">True</span>',
        '    )',
        '    <span class="zd-code-var">items</span> <span class="zd-code-op">=</span> []',
        '    <span class="zd-code-kw">for</span> <span class="zd-code-var">thread</span> <span class="zd-code-kw">in</span> <span class="zd-code-var">ranked</span>[:<span class="zd-code-var">limit</span>]:',
        '        <span class="zd-code-var">summary</span> <span class="zd-code-op">=</span> <span class="zd-code-fn">compress_messages</span>(<span class="zd-code-var">thread</span>.<span class="zd-code-var">messages</span>)',
        '        <span class="zd-code-var">label</span> <span class="zd-code-op">=</span> <span class="zd-code-fn">classify_thread</span>(<span class="zd-code-var">thread</span>)',
        '        <span class="zd-code-var">items</span>.<span class="zd-code-fn">append</span>({',
        '            <span class="zd-code-str">"sender"</span>: <span class="zd-code-var">thread</span>.<span class="zd-code-var">sender</span>,',
        '            <span class="zd-code-str">"label"</span>: <span class="zd-code-var">label</span>,',
        '            <span class="zd-code-str">"summary"</span>: <span class="zd-code-var">summary</span>',
        '        })',
        '    <span class="zd-code-kw">return</span> <span class="zd-code-var">items</span>'
      ],
      activeLine: 10,
      status: ['digest-lab', 'summaries', '0  5', 'Ln 11, Col 9', 'Spaces: 4', 'UTF-8', 'Python'],
      terminalTitle: '~/work/digest-lab',
      terminalLines: [
        'Last login: Tue Mar 10 08:02:13 on ttys016',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">digest-lab</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">summaries</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> python scripts/preview_digest.py',
        '<span class="zd-term-dim">drafted summary for 18 active threads</span>',
        '<span class="zd-term-env">(venv)</span> <span class="zd-term-arrow">-&gt;</span> <span class="zd-term-dir">digest-lab</span> <span class="zd-term-git">git:(</span><span class="zd-term-branch">summaries</span><span class="zd-term-git">)</span> <span class="zd-term-ok">*</span> uv run pytest tests/test_digest_builder.py',
        '<span class="zd-term-dim">================ 9 passed in 1.13s ================</span>'
      ],
      browser: {
        url: 'docs.digest.dev/inbox/compaction-guide',
        sidebarHead: 'Inbox',
        sidebarItems: ['Overview', 'Thread compaction', 'Urgency labels', 'Summaries', 'Delivery'],
        activeSidebar: 'Thread compaction',
        breadcrumbs: 'Digest Docs / Inbox',
        title: 'Compacting active threads',
        copy: 'Morning digests should reduce scanning time, preserve urgency, and highlight the single next action for each thread.',
        callout: 'Strong digests separate truly urgent items from merely recent ones. Recency alone is not a good proxy for importance.',
        section1Title: '1. Rank before compressing',
        section1Body: 'Score threads by urgency, required action, and freshness before generating summaries.',
        code: 'summary = compress_messages(thread.messages)',
        section2Title: '2. Emit one next action',
        section2Body: 'Each digest row should end with a single concrete action so the operator can move quickly.'
      },
      preview: {
        filename: 'digest-compaction-memo.pdf',
        brand: 'research memo',
        order: 'Note 03',
        title: 'Inbox Compaction Memo',
        type: 'Prepared for Digest Lab',
        meta: [
          'Focus: ranking, thread compression, next-action extraction',
          'Recommendation: limit the digest to the top 6 actionable threads',
          'Risk: aggressive compression can bury context unless the next action is explicit'
        ],
        sections: [
          { title: 'Key findings:', body: 'Teams move faster when summaries collapse noise but preserve the final decision, blocker, and owner on each thread.' },
          { title: 'Suggested next step:', body: 'Score by urgency first, then recency, and include a short operator-facing action line for every thread.' }
        ]
      },
      notice: 'You already compress threads, but the digest still ranks mostly by recency instead of urgency.',
      tools: ['Reviewing digest ranking patterns', 'Reading compaction design notes', 'Drafting an inbox memo'],
      summary: 'I put together a memo on urgency-first ranking, compaction limits, and cleaner next-action output.'
    }
  ];

  var MAIL_POOL = [
    {
      from: 'Northstar Studio',
      subject: 'Revised launch copy',
      preview: 'Dropped two headline options and a tighter CTA set.',
      body: 'I tightened the hero copy and left two alternate headlines in the shared doc.\n\nIf the new version feels too formal, I can shift it back toward the warmer tone before noon.',
      route: 'creative@local.dev'
    },
    {
      from: 'Platform Ops',
      subject: 'Canary metrics look stable',
      preview: 'Error rate stayed below 0.3% after the latest rollout.',
      body: 'The canary held steady for the full monitoring window.\n\nIf you want, I can promote the new worker pool after the afternoon check.',
      route: 'ops@local.dev'
    },
    {
      from: 'Avery Cole',
      subject: 'Draft agenda for product review',
      preview: 'Grouped the discussion into wins, risks, and open decisions.',
      body: 'The product review agenda is now grouped into three sections: wins, risks, and decisions.\n\nPlease reorder anything that should come earlier in the meeting.',
      route: 'operator@local.dev'
    },
    {
      from: 'Harbor Accounting',
      subject: 'Invoice batch for March',
      preview: 'The March invoices are ready for a final pass.',
      body: 'The finance batch is assembled and waiting for a final review.\n\nOne vendor line item moved by a few dollars after the updated receipt came in.',
      route: 'finance@local.dev'
    },
    {
      from: 'Field Notes',
      subject: 'Early user feedback',
      preview: 'Three people asked for a more obvious approval state.',
      body: 'The strongest pattern in the early interviews is confusion around what is automatic versus what still needs confirmation.\n\nA clearer approval state in the UI would likely resolve most of it.',
      route: 'research@local.dev'
    },
    {
      from: 'Recruiting Desk',
      subject: 'Candidate panel recap',
      preview: 'The panel liked the systems thinking and ownership.',
      body: 'The candidate did well on system tradeoffs and came across as high-ownership.\n\nThe only open question is how deep they go on debugging production incidents.',
      route: 'talent@local.dev'
    },
    {
      from: 'Beacon Retail',
      subject: 'Automation pilot follow-up',
      preview: 'They want a short note on approval logging before rollout.',
      body: 'Beacon is comfortable moving ahead with the pilot but wants a simple explanation of approval logging and audit retention.\n\nA one-page note should be enough to unblock them.',
      route: 'sales@local.dev'
    },
    {
      from: 'Juniper Health',
      subject: 'API response sample',
      preview: 'Attached a cleaner payload from the staging environment.',
      body: 'I attached a fresh API sample from staging and trimmed the noisy fields.\n\nThe payload should be enough to validate the new parser path.',
      route: 'api@local.dev'
    },
    {
      from: 'Kite Logistics',
      subject: 'Updated ETA dashboard',
      preview: 'The new route cards are live in the preview environment.',
      body: 'The ETA dashboard preview now includes the revised route cards and the denser table layout.\n\nLet me know if you want the map hidden by default on smaller screens.',
      route: 'product@local.dev'
    },
    {
      from: 'Mina Park',
      subject: 'Slides for tomorrow',
      preview: 'Added the benchmark slide and shortened the intro.',
      body: 'I added the benchmark slide and trimmed the opening section to keep us under twenty minutes.\n\nThe final slide still needs a call to action if you want to close on next steps.',
      route: 'team@local.dev'
    }
  ];

  var CHAT_POOL = [
    {
      name: 'Mina Patel',
      snippet: 'Pushed the revised mock',
      bubbles: [
        { side: 'left wide', text: 'Pushed a denser table view and a lighter nav treatment for the dashboard.' },
        { side: 'left', text: 'Can you sanity check spacing later?' },
        { side: 'right', text: 'Yep, I will review after lunch.' },
        { side: 'right wide', text: 'If it holds up on mobile, let us keep the tighter layout.' }
      ]
    },
    {
      name: 'Jordan Reyes',
      snippet: 'Can review after lunch',
      bubbles: [
        { side: 'left', text: 'I can take the rollout checklist after lunch.' },
        { side: 'right', text: 'Perfect. I will leave comments on the open items.' },
        { side: 'left wide', text: 'Please flag anything that still needs operator approval copy.' }
      ]
    },
    {
      name: 'Casey Liu',
      snippet: 'Backlog finally dropped',
      bubbles: [
        { side: 'left wide', text: 'Support backlog is finally back under the target threshold.' },
        { side: 'right', text: 'Nice. Keep the same routing rules through the afternoon.' },
        { side: 'left', text: 'Will do.' }
      ]
    },
    {
      name: 'Ops Desk',
      snippet: 'Three nodes still draining',
      bubbles: [
        { side: 'left wide', text: 'Three edge nodes are still draining, but the queue depth is improving.' },
        { side: 'right', text: 'Okay. Hold the deploy until the slowest region clears.' },
        { side: 'left', text: 'On it.' }
      ]
    },
    {
      name: 'Tessa Holt',
      snippet: 'The brief looks clean',
      bubbles: [
        { side: 'left', text: 'The brief looks clean.' },
        { side: 'left wide', text: 'Could you add one line about why we picked this path over the simpler fallback?' },
        { side: 'right', text: 'Yes, I will add a tradeoff note.' }
      ]
    },
    {
      name: 'Noah Kim',
      snippet: 'Saved the latest board',
      bubbles: [
        { side: 'left', text: 'Saved the latest board to the project folder.' },
        { side: 'right', text: 'Great. I will reference it in the morning note.' }
      ]
    }
  ];

  var MEETING_CONTACTS = [
    {
      name: 'Ivy Chen',
      company: 'Northstar Cloud',
      slot: 'Thu 3:30 PM',
      inviteLabel: 'Intro sync - Northstar',
      listSnippet: 'Would love a quick intro on approval flows.',
      thread: [
        { side: 'left wide', text: 'We are evaluating approval layers for a few operator-facing workflows.' },
        { side: 'left', text: 'Would love a quick intro sometime this week.' },
        { side: 'right', text: 'Thursday afternoon works.' },
        { side: 'right wide', text: 'I can walk through approvals, logs, and operator checkpoints.' }
      ],
      research: [
        'Northstar runs multi-region worker fleets.',
        'They care about audit trails and review gates.',
        'A short workflow walkthrough will likely land well.'
      ]
    },
    {
      name: 'Theo Miles',
      company: 'Signal Forge',
      slot: 'Fri 10:00 AM',
      inviteLabel: 'Intro sync - Signal Forge',
      listSnippet: 'Interested in background workflow approvals.',
      thread: [
        { side: 'left wide', text: 'We are exploring background workflows that can stop for review when needed.' },
        { side: 'left', text: 'Do you have 20 minutes for a quick intro?' },
        { side: 'right', text: 'Friday morning works well.' },
        { side: 'right wide', text: 'Happy to cover approvals, queue visibility, and escalation patterns.' }
      ],
      research: [
        'Signal Forge automates internal workflow handoffs.',
        'They prioritize clean operator override paths.',
        'Lead with approval checkpoints and audit history.'
      ]
    },
    {
      name: 'Lena Hart',
      company: 'Vector Grid',
      slot: 'Wed 4:15 PM',
      inviteLabel: 'Intro sync - Vector Grid',
      listSnippet: 'Curious about reviewable automation.',
      thread: [
        { side: 'left wide', text: 'We are looking for a way to automate repetitive tasks without losing reviewability.' },
        { side: 'left', text: 'Could we do a quick intro this week?' },
        { side: 'right', text: 'Wednesday late afternoon works.' },
        { side: 'right wide', text: 'I can show the approval flow and how sensitive steps stay gated.' }
      ],
      research: [
        'Vector Grid is rolling out workflow tooling to operations teams.',
        'They need confidence around gated actions.',
        'Show approval logs and explain escalation paths first.'
      ]
    }
  ];

  var BOOKING_POOL = [
    { name: 'Cinder Table', cuisine: 'Wood-fired', price: '$$$', area: 'Mission', slots: ['6:30 PM', '7:00 PM', '7:45 PM'], note: 'strong menu and easy to reach' },
    { name: 'Marrow House', cuisine: 'Contemporary', price: '$$$$', area: 'Hayes Valley', slots: ['6:45 PM', '7:00 PM', '7:30 PM'], note: 'quiet enough for a long dinner' },
    { name: 'Alta Commons', cuisine: 'California', price: '$$$', area: 'SoMa', slots: ['6:15 PM', '7:00 PM', '8:00 PM'], note: 'great if you want a central location' },
    { name: 'Juniper Room', cuisine: 'Seasonal', price: '$$$', area: 'NoPa', slots: ['6:50 PM', '7:20 PM'], note: 'easy reservation and relaxed pacing' },
    { name: 'Harbor Club', cuisine: 'Seafood', price: '$$$$', area: 'Embarcadero', slots: ['7:00 PM', '7:40 PM'], note: 'best if you want something close to downtown' }
  ];

  function createCodingState() {
    return pick(CODE_SCENES);
  }

  function buildMailState() {
    var unread = randInt(8, 21);
    var urgent = randInt(2, 4);
    var rows = sample(MAIL_POOL, 7).map(function (item, idx) {
      return {
        from: item.from,
        subject: item.subject,
        preview: item.preview,
        body: item.body,
        route: item.route,
        time: pick(['8:42 AM', '7:18 AM', '6:54 AM', 'Yesterday', 'Mon', 'Sun']),
        active: idx === 2
      };
    });
    rows[2].active = true;
    return {
      title: 'Inbox',
      total: randInt(2800, 6200),
      unread: unread,
      urgent: urgent,
      mailboxCounts: {
        inbox: randInt(220, 640),
        flagged: randInt(8, 64),
        drafts: randInt(18, 92),
        sent: randInt(120, 460),
        archive: randInt(6400, 24000),
        important: randInt(20, 88)
      },
      rows: rows,
      active: rows[2]
    };
  }

  function buildCalendarState() {
    var days = [];
    for (var i = 1; i <= 31; i++) days.push(i);

    var eventPool = [
      'Design crit', 'Ops sync', 'Customer call', 'Roadmap review', 'Budget pass', 'Sprint demo',
      'Hiring debrief', 'Status review', 'Planning block', 'Research readout', 'Team lunch',
      'Partner intro', 'Launch prep', 'QA handoff', 'Notes sweep', 'Prototype review',
      'All hands', 'Focus block', 'Vendor check', 'Retro'
    ];
    var tones = ['violet', 'mint', 'sky', 'green', 'pink'];
    var busyDays = sample(days, 18);
    if (busyDays.indexOf(9) === -1) busyDays.push(9);
    if (busyDays.indexOf(13) === -1) busyDays.push(13);

    var eventsByDay = {};
    busyDays.forEach(function (day) {
      var count = day === 9 ? 4 : randInt(1, 3);
      eventsByDay[day] = sample(eventPool, count).map(function (text) {
        return { tone: pick(tones), text: text };
      });
    });

    return {
      todayCount: (eventsByDay[9] || []).length,
      todayHeadline: pick(eventsByDay[9] || [{ text: 'Planning block' }]).text,
      insertDay: 13,
      cells: days.map(function (day) {
        return {
          label: String(day),
          today: day === 9,
          events: eventsByDay[day] || []
        };
      }).concat([
        { label: '1', muted: true, events: [] },
        { label: '2', muted: true, events: [] },
        { label: '3', muted: true, events: [{ tone: 'violet', text: 'Planning reset' }] },
        { label: '4', muted: true, events: [] }
      ])
    };
  }

  function buildMessagesState(mode) {
    if (mode === 'meeting') {
      var contact = pick(MEETING_CONTACTS);
      return {
        unreadCount: randInt(2, 4),
        active: {
          name: contact.name,
          tone: 'teal',
          snippet: contact.listSnippet,
          bubbles: contact.thread
        },
        list: [
          { name: contact.name, tone: 'teal', snippet: contact.listSnippet, active: true },
          { name: 'Parker West', tone: 'violet', snippet: 'Still on for the review?' },
          { name: 'Dana Moore', tone: 'gray', snippet: 'Sent the revised outline.' },
          { name: 'Lark Team', tone: 'sand', snippet: 'Shared the pilot notes.' }
        ],
        contact: contact
      };
    }

    var conversations = sample(CHAT_POOL, 5);
    var active = conversations[0];
    return {
      unreadCount: randInt(2, 6),
      active: {
        name: active.name,
        tone: 'teal',
        snippet: active.snippet,
        bubbles: active.bubbles
      },
      list: conversations.map(function (chat, idx) {
        return {
          name: chat.name,
          tone: ['teal', 'violet', 'gray', 'sand', 'dark'][idx % 5],
          snippet: chat.snippet,
          active: idx === 0
        };
      })
    };
  }

  function buildInboxState() {
    return {
      mail: buildMailState(),
      calendar: buildCalendarState(),
      messages: buildMessagesState('inbox')
    };
  }

  function buildMeetingState() {
    var messages = buildMessagesState('meeting');
    return {
      calendar: buildCalendarState(),
      messages: messages,
      contact: messages.contact,
      slot: messages.contact.slot,
      inviteLabel: messages.contact.inviteLabel
    };
  }

  function buildBookingState() {
    var results = sample(BOOKING_POOL, 3).map(function (item, idx) {
      return {
        name: item.name,
        cuisine: item.cuisine,
        price: item.price,
        area: item.area,
        slots: item.slots.slice(),
        note: item.note,
        preferredSlot: item.slots[Math.min(1, item.slots.length - 1)],
        preferred: idx === 0
      };
    });
    return {
      meta: '2 guests · Sat, Mar 1 · 7:00 PM · San Francisco',
      results: results,
      selected: results[0]
    };
  }

  var currentCodingState = null;
  var currentInboxState = null;
  var currentMeetingState = null;
  var currentBookingState = null;

  function renderVscodeMarkup(scene) {
    return `
      <div class="zd-vscode-shell">
        <div class="zd-vscode-activity">
          <div class="zd-vscode-activity-icon active"></div>
          <div class="zd-vscode-activity-icon"></div>
          <div class="zd-vscode-activity-icon"></div>
          <div class="zd-vscode-activity-icon"></div>
          <div class="zd-vscode-activity-icon small"></div>
        </div>
        <div class="zd-vscode-explorer">
          <div class="zd-vscode-explorer-head">${esc(scene.explorerHead)}</div>
          <div class="zd-vscode-tree">
            ${scene.tree.map(function (row) {
              var cls = row.kind + (row.open ? ' open' : '') + (row.active ? ' active' : '');
              return '<div class="zd-vscode-tree-row ' + cls + '">' + esc(row.label) + (row.badge ? ' <span>' + esc(row.badge) + '</span>' : '') + '</div>';
            }).join('')}
          </div>
        </div>
        <div class="zd-vscode-main">
          <div class="zd-vscode-editor-tabs">
            <div class="zd-vscode-editor-tab active"><span class="zd-vscode-file-type">${esc(scene.tabType)}</span> ${esc(scene.activeFile)} <span class="zd-vscode-close">x</span></div>
          </div>
          <div class="zd-vscode-breadcrumbs">${esc(scene.breadcrumb)}</div>
          <div class="zd-vscode-editor-stage">
            <div class="zd-vscode-runbar">
              <span class="zd-vscode-run-icon"></span>
              <span class="zd-vscode-run-split"></span>
              <span class="zd-vscode-run-pill"></span>
            </div>
            <div class="zd-vscode-gutter"><pre style="margin:0">${gutter(scene.codeLines.length)}</pre></div>
            <div class="zd-vscode-code">${renderCodeLines(scene.codeLines, scene.activeLine)}</div>
            <div class="zd-vscode-minimap">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="zd-vscode-statusbar">
            ${scene.status.map(function (item) { return '<span>' + esc(item) + '</span>'; }).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderTerminalMarkup(scene) {
    return `
      <div class="zd-terminal-lines">
        ${scene.terminalLines.map(function (line) { return '<div>' + line + '</div>'; }).join('')}
      </div>`;
  }

  function renderChromeButton(icon, label, extraClass) {
    var classes = 'zd-chrome-btn' + (label ? ' with-label' : '') + (extraClass ? ' ' + extraClass : '');
    return '<span class="' + classes + '"><span class="zd-chrome-icon ' + icon + '"></span>' +
      (label ? '<span class="zd-chrome-label">' + esc(label) + '</span>' : '') +
      '</span>';
  }

  function renderChromeGroup(inner, extraClass) {
    return '<span class="zd-chrome-group' + (extraClass ? ' ' + extraClass : '') + '">' + inner + '</span>';
  }

  function renderChromeSearch(label, extraClass) {
    return '<span class="zd-chrome-search' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<span class="zd-chrome-icon search"></span>' +
      '<span>' + esc(label) + '</span>' +
      '</span>';
  }

  function renderMailBar() {
    return '<div class="zd-window-toolbar zd-mail-topbar">' +
      renderChromeGroup(
        renderChromeButton('filter') +
        renderChromeButton('ellipsis')
      ) +
      '<span class="zd-toolbar-spacer"></span>' +
      renderChromeGroup(
        renderChromeButton('compose') +
        renderChromeButton('reply-left') +
        renderChromeButton('reply-right') +
        renderChromeButton('trash') +
        renderChromeButton('archive') +
        renderChromeButton('flag')
      ) +
      renderChromeSearch('Search', 'compact') +
      '</div>';
  }

  function renderCalendarBar() {
    return '<div class="zd-window-toolbar zd-calendar-topbar">' +
      renderChromeGroup(
        renderChromeButton('grid') +
        renderChromeButton('sidebar')
      ) +
      renderChromeButton('plus', '', 'circle') +
      '<span class="zd-toolbar-spacer"></span>' +
      renderChromeSearch('Search', 'compact') +
      '</div>';
  }

  function renderMessagesBar() {
    return '<div class="zd-window-toolbar zd-messages-topbar">' +
      renderChromeGroup(
        renderChromeButton('filter') +
        renderChromeButton('compose')
      ) +
      '<span class="zd-toolbar-spacer"></span>' +
      renderChromeButton('video', '', 'circle') +
      '</div>';
  }

  function renderMailWindow(state) {
    return `
      <div class="zd-mail-shell">
        <div class="zd-mail-sidebar">
          <div class="zd-mail-sidebar-group">
            <div class="zd-mail-sidebar-title">Favorites</div>
            <div class="zd-mail-sidebar-row active"><span class="zd-mail-sidebar-icon accent"></span><span>Inbox</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.inbox}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Flagged</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.flagged}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Drafts</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.drafts}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Sent</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.sent}</span></div>
          </div>
          <div class="zd-mail-sidebar-group">
            <div class="zd-mail-sidebar-title">Workspaces</div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Important</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.important}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Archive</span><span class="zd-mail-sidebar-count">${state.mailboxCounts.archive}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Waiting</span><span class="zd-mail-sidebar-count">${randInt(8, 28)}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Receipts</span><span class="zd-mail-sidebar-count">${randInt(11, 49)}</span></div>
            <div class="zd-mail-sidebar-row"><span class="zd-mail-sidebar-icon"></span><span>Trash</span></div>
          </div>
          <div class="zd-mail-download">Downloading Messages</div>
        </div>
        <div class="zd-mail-listpane">
          <div class="zd-mail-pane-head">
            <div>
              <div class="zd-mail-pane-title">${esc(state.title)}</div>
              <div class="zd-mail-pane-meta">${esc(state.total)} messages, ${esc(state.unread)} unread</div>
            </div>
            <div class="zd-mail-toolbar-pill"></div>
          </div>
          <div class="zd-mail-modern-list">
            ${state.rows.map(function (row) {
              return '<div class="zd-mail-modern-row' + (row.active ? ' active' : '') + '">' +
                '<div class="zd-mail-modern-name">' + esc(row.from) + '</div>' +
                '<div class="zd-mail-modern-time">' + esc(row.time) + '</div>' +
                '<div class="zd-mail-modern-subject">' + esc(row.subject) + '</div>' +
                '<div class="zd-mail-modern-preview">' + esc(row.preview) + '</div>' +
              '</div>';
            }).join('')}
          </div>
        </div>
        <div class="zd-mail-reader">
          <div class="zd-mail-reader-toolbar">
            <div class="zd-mail-reader-actions">
              <span class="zd-mail-toolbar-pill small"></span>
              <span class="zd-mail-toolbar-pill small"></span>
              <span class="zd-mail-toolbar-pill small"></span>
              <span class="zd-mail-toolbar-pill small"></span>
            </div>
            <div class="zd-mail-reader-summary">Summarize</div>
          </div>
          <div class="zd-mail-reader-head">
            <div class="zd-mail-reader-avatar"></div>
            <div class="zd-mail-reader-meta">
              <div class="zd-mail-reader-name">${esc(state.active.from)}</div>
              <div class="zd-mail-reader-topic">${esc(state.active.subject)}</div>
              <div class="zd-mail-reader-to">From: ${esc(state.active.route)}</div>
            </div>
            <div class="zd-mail-reader-time">${esc(state.active.time)}</div>
          </div>
          <div class="zd-mail-reader-body">
            ${esc(state.active.body).replace(/\n\n/g, '<br><br>')}
          </div>
        </div>
      </div>`;
  }

  function renderBrowserBar(urlText, urlId) {
    return `
      <div class="zd-window-toolbar zd-browser-toolbar">
        <div class="zd-browser-toolbar-left">
          <span class="zd-browser-sidebar-toggle"></span>
          <span class="zd-toolbar-icon chevron"></span>
          <span class="zd-toolbar-icon chevron right"></span>
        </div>
        <div class="zd-browser-address">
          <span class="zd-browser-address-lock"></span>
          <span class="zd-browser-address-text"${urlId ? ' id="' + urlId + '"' : ''}>${urlText}</span>
        </div>
        <div class="zd-browser-toolbar-right">
          <span class="zd-browser-action share"></span>
          <span class="zd-browser-action plus"></span>
          <span class="zd-browser-action tabs"></span>
        </div>
      </div>`;
  }

  function renderResearchBrowser(scene) {
    var browser = scene.browser;
    return `
      <div class="zd-browser-shell zd-browser-docs">
        <div class="zd-browser-sidebar">
          <div class="zd-browser-sidebar-head">${esc(browser.sidebarHead)}</div>
          ${browser.sidebarItems.map(function (item) {
            return '<div class="zd-browser-sidebar-item' + (item === browser.activeSidebar ? ' active' : '') + '">' + esc(item) + '</div>';
          }).join('')}
        </div>
        <div class="zd-browser-page">
          <div class="zd-browser-breadcrumbs">${esc(browser.breadcrumbs)}</div>
          <div class="zd-browser-page-title">${esc(browser.title)}</div>
          <div class="zd-browser-page-copy">
            ${esc(browser.copy)}
          </div>
          <div class="zd-browser-callout">
            ${esc(browser.callout)}
          </div>
          <div class="zd-browser-section-title">${esc(browser.section1Title)}</div>
          <div class="zd-browser-page-copy">
            ${esc(browser.section1Body)}
          </div>
          <div class="zd-browser-code-block">${esc(browser.code)}</div>
          <div class="zd-browser-section-title">${esc(browser.section2Title)}</div>
          <div class="zd-browser-page-copy">
            ${esc(browser.section2Body)}
          </div>
        </div>
      </div>`;
  }

  function renderBookingBrowser() {
    return `
      <div class="zd-browser-shell zd-browser-start" id="zd-booking-content">
        <div class="zd-browser-start-mark">Safari Start Page</div>
        <div class="zd-browser-start-search">Search or enter website name</div>
        <div class="zd-browser-start-grid">
          <span>OpenTable</span>
          <span>Maps</span>
          <span>Calendar</span>
          <span>Notes</span>
        </div>
      </div>`;
  }

  function renderCalendarWindow(state, insertSlotId) {
    var headers = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `
      <div class="zd-calendar-shell">
        <div class="zd-calendar-sidebar">
          <div class="zd-calendar-sidebar-group">
            <div class="zd-calendar-sidebar-title">iCloud</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot work"></span>Product</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot sky"></span>Ops</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot home"></span>Personal</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot family"></span>Family</div>
          </div>
          <div class="zd-calendar-sidebar-group">
            <div class="zd-calendar-sidebar-title">Shared</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot green"></span>Recruiting</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot yellow"></span>Travel</div>
            <div class="zd-calendar-sidebar-row active"><span class="zd-calendar-dot cyan"></span>Launch calendar</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot pink"></span>Holidays</div>
            <div class="zd-calendar-sidebar-row"><span class="zd-calendar-dot gold"></span>Focus blocks</div>
          </div>
          <div class="zd-calendar-mini">
            <div class="zd-calendar-mini-head">March 2026</div>
            <div class="zd-calendar-mini-grid">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
              <span>8</span><span class="is-today">9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
              <span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span>
              <span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span><span>28</span>
              <span>29</span><span>30</span><span>31</span><span class="muted">1</span><span class="muted">2</span><span class="muted">3</span><span class="muted">4</span>
            </div>
          </div>
        </div>
        <div class="zd-calendar-main">
          <div class="zd-calendar-head">
            <div class="zd-calendar-title">March <span>2026</span></div>
            <div class="zd-calendar-controls">
              <div class="zd-calendar-segmented"><span>Day</span><span>Week</span><span class="active">Month</span><span>Year</span></div>
              <div class="zd-calendar-nav"><span></span><span>Today</span><span></span></div>
            </div>
          </div>
          <div class="zd-calendar-weekdays">${headers.map(function (h) { return '<span>' + h + '</span>'; }).join('')}</div>
          <div class="zd-calendar-grid">
            ${state.cells.map(function (cell) {
              return '<div class="zd-calendar-cell' + (cell.muted ? ' is-muted' : '') + '">' +
                '<div class="zd-calendar-date' + (cell.today ? ' is-today' : '') + '">' + cell.label + '</div>' +
                '<div class="zd-calendar-events">' +
                  cell.events.map(function (event) {
                    return '<div class="zd-calendar-chip is-' + event.tone + '">' + esc(event.text) + '</div>';
                  }).join('') +
                  (insertSlotId && Number(cell.label) === state.insertDay && !cell.muted ? '<div id="' + insertSlotId + '"></div>' : '') +
                '</div>' +
              '</div>';
            }).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderMessagesWindow(state) {
    return `
      <div class="zd-messages-shell">
        <div class="zd-messages-listpane">
          <div class="zd-messages-search">Search</div>
          <div class="zd-messages-list">
            ${state.list.map(function (chat) {
              return '<div class="zd-messages-list-row' + (chat.active ? ' active' : '') + '">' +
                '<div class="zd-messages-avatar small ' + chat.tone + '">' + esc(initials(chat.name)) + '</div>' +
                '<div><div class="zd-messages-name">' + esc(chat.name) + '</div><div class="zd-messages-snippet">' + esc(chat.snippet) + '</div></div>' +
              '</div>';
            }).join('')}
          </div>
        </div>
        <div class="zd-messages-threadpane">
          <div class="zd-messages-thread-header">
            <div class="zd-messages-avatar ${state.active.tone}">${esc(initials(state.active.name))}</div>
            <div class="zd-messages-thread-name">${esc(state.active.name)}</div>
          </div>
          ${state.active.bubbles.map(function (bubble) {
            return '<div class="zd-messages-bubble ' + bubble.side + '">' + esc(bubble.text) + '</div>';
          }).join('')}
          <div class="zd-messages-compose"><span>iMessage</span><span>Message</span><span class="zd-messages-compose-wave"></span></div>
        </div>
      </div>`;
  }

  function renderPreviewContent(scene) {
    var preview = scene.preview;
    return `
      <div class="zd-preview-toolbar">
        <div class="zd-preview-pill small"></div>
        <div class="zd-preview-title">
          <div>${esc(preview.filename)}</div>
          <span>Page 1 of 2</span>
        </div>
        <div class="zd-preview-pill-group">
          <span class="zd-preview-pill"></span>
          <span class="zd-preview-pill"></span>
          <span class="zd-preview-pill"></span>
        </div>
        <div class="zd-preview-pill-group">
          <span class="zd-preview-pill"></span>
          <span class="zd-preview-pill"></span>
          <span class="zd-preview-pill"></span>
        </div>
        <div class="zd-preview-search">Search</div>
      </div>
      <div class="zd-preview-subbar">
        <span></span><span></span><span></span><span></span><span></span>
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <div class="zd-preview-scroll">
        <div class="zd-pdf-page">
          <div class="zd-pdf-body">
            <div class="zd-preview-brand">${esc(preview.brand)}</div>
            <div class="zd-preview-order">${esc(preview.order)}</div>
            <div class="zd-preview-ticket-card">
              <div class="zd-preview-ticket-title">${esc(preview.title)}</div>
              <div class="zd-preview-ticket-type">${esc(preview.type)}</div>
              ${preview.meta.map(function (line) {
                return '<div class="zd-preview-ticket-meta">' + esc(line) + '</div>';
              }).join('')}
              <div class="zd-preview-qr"></div>
            </div>
            <div class="zd-preview-info-card">
              ${preview.sections.map(function (section) {
                return '<div class="zd-preview-info-title">' + esc(section.title) + '</div><div>' + esc(section.body) + '</div>';
              }).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ========== SCENARIO 1: Organize Desktop ==========
  function buildMessyDesktop() {
    desktop.innerHTML = '';
    var icons = [
      ['zd-file-png', 'Screenshot 2026-02...', '6%', '5%'],
      ['zd-file-docx', 'Q4 Report.docx', '30%', '3%'],
      ['zd-file-pdf', 'invoice_march.pdf', '58%', '8%'],
      ['zd-file-py', 'server.py', '14%', '30%'],
      ['zd-file-zip', 'Archive.zip', '73%', '25%'],
      ['zd-file-jpg', 'photo_0291.jpg', '43%', '32%'],
      ['zd-file-txt', 'notes.txt', '3%', '55%'],
      ['zd-file-xlsx', 'budget.xlsx', '53%', '52%'],
      ['zd-file-mov', 'demo_v2.mov', '78%', '50%'],
      ['zd-file-pdf', 'contract.pdf', '23%', '58%'],
      ['zd-file-png', 'IMG_4822.png', '66%', '65%'],
      ['zd-file-html', 'index.html', '38%', '70%'],
      ['zd-file-docx', 'Meeting Notes.docx', '8%', '75%'],
      ['zd-file-md', 'TODO.md', '83%', '5%'],
      ['zd-file-gz', 'backup_feb.tar.gz', '48%', '15%'],
    ];
    icons.forEach(function (ic) { desktop.appendChild(makeIcon(ic[0], ic[1], ic[2], ic[3])); });
  }

  function organizeDesktop() {
    desktop.innerHTML = '';
    var folders = [
      ['zd-folder', 'Screenshots', '82%', '5%'],
      ['zd-folder', 'Documents', '82%', '22%'],
      ['zd-folder', 'Code', '82%', '39%'],
      ['zd-folder', 'Media', '82%', '56%'],
    ];
    folders.forEach(function (f) { desktop.appendChild(makeIcon(f[0], f[1], f[2], f[3])); });
  }

  // ========== SCENARIO 2: Proactive research while coding ==========
  function buildCodingDesktop() {
    desktop.innerHTML = '';
    currentCodingState = createCodingState();

    // VS Code
    var vscode = makeWindow({
      windowClass: 'zd-vscode-window',
      barHtml:
        '<div class="zd-window-toolbar zd-vscode-toolbar">' +
          '<div class="zd-vscode-toolbar-side">' +
            '<span class="zd-toolbar-icon chevron"></span>' +
            '<span class="zd-toolbar-icon chevron right"></span>' +
          '</div>' +
          '<div class="zd-vscode-toolbar-title">server</div>' +
          '<div class="zd-vscode-toolbar-side right">' +
            '<span class="zd-toolbar-icon plus"></span>' +
            '<span class="zd-toolbar-icon square"></span>' +
            '<span class="zd-toolbar-icon square"></span>' +
            '<span class="zd-toolbar-icon square"></span>' +
            '<span class="zd-toolbar-icon gear"></span>' +
          '</div>' +
        '</div>',
      bodyHtml: renderVscodeMarkup(currentCodingState)
    });
    desktop.appendChild(vscode);

    // Terminal
    var term = makeWindow({
      windowClass: 'zd-terminal-window',
      barHtml:
        '<div class="zd-window-toolbar zd-terminal-toolbar">' +
          '<div class="zd-terminal-folder-mark"></div>' +
          '<div class="zd-terminal-toolbar-title">' + currentCodingState.terminalTitle + '</div>' +
          '<div class="zd-terminal-toolbar-fade">...</div>' +
        '</div>',
      left: '2%', top: '74%', width: '50%', height: '24%',
      bodyClass: 'zd-terminal-body',
      bodyHtml: renderTerminalMarkup(currentCodingState)
    });
    desktop.appendChild(term);

    // Browser
    var browser = makeWindow({
      windowClass: 'zd-browser-window',
      barHtml: renderBrowserBar(currentCodingState.browser.url),
      left: '54%', top: '2%', width: '44%', height: '60%',
      bodyHtml: renderResearchBrowser(currentCodingState)
    });
    desktop.appendChild(browser);
  }

  function showResearchPdf() {
    if (!currentCodingState) currentCodingState = createCodingState();
    var pdf = makePdf({
      id: 'zd-research-pdf',
      windowClass: 'zd-preview-window',
      barHtml:
        '<div class="zd-window-toolbar zd-preview-bar-title">' +
          '<span class="zd-preview-sidebar-toggle"></span>' +
          '<span class="zd-preview-filename">' + currentCodingState.preview.filename + '</span>' +
        '</div>',
      left: '50%', top: '25%', width: '44%', height: '60%',
      contentHtml: renderPreviewContent(currentCodingState)
    });
    desktop.appendChild(pdf);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { pdf.classList.add('zd-pdf-visible'); });
    });
  }

  // ========== SCENARIO 3: Morning inbox triage ==========
  function buildInboxDesktop() {
    desktop.innerHTML = '';
    currentInboxState = buildInboxState();

    // Mail.app
    var mail = makeWindow({
      windowClass: 'zd-mail-window',
      barHtml: renderMailBar(),
      left: '3%', top: '2%', width: '55%', height: '90%',
      bodyHtml: renderMailWindow(currentInboxState.mail)
    });
    desktop.appendChild(mail);

    // Calendar.app
    var cal = makeWindow({
      windowClass: 'zd-calendar-window',
      barHtml: renderCalendarBar(),
      left: '60%', top: '2%', width: '37%', height: '48%',
      bodyHtml: renderCalendarWindow(currentInboxState.calendar)
    });
    desktop.appendChild(cal);

    // Messages.app
    var msgs = makeWindow({
      windowClass: 'zd-messages-window',
      barHtml: renderMessagesBar(),
      left: '60%', top: '52%', width: '37%', height: '42%',
      bodyHtml: renderMessagesWindow(currentInboxState.messages)
    });
    desktop.appendChild(msgs);
  }

  // ========== SCENARIO 4: Proactive meeting setup ==========
  function buildMeetingDesktop() {
    desktop.innerHTML = '';
    currentMeetingState = buildMeetingState();

    // Calendar in the background
    var cal = makeWindow({
      windowClass: 'zd-calendar-window',
      barHtml: renderCalendarBar(),
      left: '3%', top: '2%', width: '55%', height: '90%',
      bodyHtml: renderCalendarWindow(currentMeetingState.calendar, 'zd-calendar-insert-slot')
    });
    desktop.appendChild(cal);

    // Messages
    var msgs = makeWindow({
      windowClass: 'zd-messages-window',
      barHtml: renderMessagesBar(),
      left: '60%', top: '2%', width: '37%', height: '55%',
      bodyHtml: renderMessagesWindow(currentMeetingState.messages)
    });
    desktop.appendChild(msgs);
  }

  function addCalendarEvent() {
    var cal = document.getElementById('zd-calendar-insert-slot');
    if (!cal) return;
    var ev = document.createElement('div');
    ev.className = 'zd-calendar-chip is-sky';
    ev.textContent = currentMeetingState ? currentMeetingState.inviteLabel : 'Intro sync';
    ev.style.opacity = '0';
    ev.style.transition = 'opacity 0.4s';
    cal.appendChild(ev);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { ev.style.opacity = '1'; });
    });
  }

  // ========== SCENARIO 5: Book a table ==========
  function buildBookingDesktop() {
    desktop.innerHTML = '';
    currentBookingState = buildBookingState();

    // Empty browser window (Safari)
    var browser = makeWindow({
      windowClass: 'zd-browser-window',
      barHtml: renderBrowserBar('google.com', 'zd-booking-url'),
      left: '10%', top: '5%', width: '80%', height: '88%',
      bodyHtml: renderBookingBrowser()
    });
    desktop.appendChild(browser);
  }

  function showOpenTable() {
    var url = document.getElementById('zd-booking-url');
    var content = document.getElementById('zd-booking-content');
    if (!url || !content) return;
    if (!currentBookingState) currentBookingState = buildBookingState();

    url.textContent = 'opentable.com/s?covers=2&dateTime=2026-03-01T19%3A00&metro=san-francisco';
    content.innerHTML =
      '<div class="zd-booking-results">' +
        '<div class="zd-booking-brand">OpenTable</div>' +
        '<div class="zd-booking-meta">' + currentBookingState.meta + '</div>' +
        currentBookingState.results.map(function (result) {
          return '<div class="zd-booking-card">' +
            '<div class="zd-booking-card-head"><span class="zd-booking-card-name">' + result.name + '</span><span class="zd-booking-card-rating">' + (result.preferred ? 'Top pick' : 'Open') + '</span></div>' +
            '<div class="zd-booking-card-sub">' + result.cuisine + ' · ' + result.price + ' · ' + result.area + '</div>' +
            '<div class="zd-booking-slots">' +
              result.slots.map(function (slot) {
                return '<span class="zd-booking-slot' + (slot === result.preferredSlot ? ' is-primary' : '') + '">' + slot + '</span>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
  }

  function showBookingConfirmed() {
    var content = document.getElementById('zd-booking-content');
    var url = document.getElementById('zd-booking-url');
    if (!content || !url) return;
    if (!currentBookingState) currentBookingState = buildBookingState();

    url.textContent = 'opentable.com/booking/confirmation';
    content.innerHTML =
      '<div class="zd-booking-results">' +
        '<div class="zd-booking-brand">Reservation Confirmed</div>' +
        '<div class="zd-booking-meta">' + currentBookingState.selected.name + ' · 2 guests · Sat, Mar 1 · ' + currentBookingState.selected.preferredSlot + '</div>' +
        '<div class="zd-booking-card">' +
          '<div class="zd-booking-card-head"><span class="zd-booking-card-name">' + currentBookingState.selected.name + '</span><span class="zd-booking-card-rating">Booked</span></div>' +
          '<div class="zd-booking-card-sub">' + currentBookingState.selected.cuisine + ' · ' + currentBookingState.selected.price + ' · ' + currentBookingState.selected.area + '</div>' +
          '<div class="zd-booking-meta" style="margin-top:10px;">Confirmation saved. Zeus can add this reservation to your calendar after approval.</div>' +
        '</div>' +
      '</div>';
  }

  // ========== SCENARIOS ==========
  var scenarios = [
    // 1. Organize messy desktop
    function (done) {
      buildMessyDesktop();
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          submitAndRun('organize my desktop', [
            { type: 'think', delay: 0 },
            { type: 'tool', text: 'Scanning Desktop — found 15 files', delay: 900 },
            { type: 'tool', text: 'Categorizing by type', delay: 700 },
            { type: 'endthink', delay: 600 },
            { type: 'msg', text: 'Found 15 files scattered across your desktop. Sorting into 4 folders: Screenshots, Documents, Code, Media.', delay: 400 },
            { type: 'approve', delay: 500 },
            { type: 'think', delay: 1200 },
            { type: 'tool', text: 'Moving 4 images → Screenshots', delay: 600 },
            { type: 'tool', text: 'Moving 4 docs → Documents', delay: 500 },
            { type: 'tool', text: 'Moving 3 code files → Code', delay: 500 },
            { type: 'tool', text: 'Moving 4 media/archives → Media', delay: 500 },
            { type: 'desktop', fn: organizeDesktop, delay: 400 },
            { type: 'endthink', delay: 300 },
            { type: 'msg', text: 'Done. Desktop organized into 4 folders.', delay: 300 },
          ], done);
        }, 500);
      }, 1200);
    },

    // 2. Proactive research while coding
    function (done) {
      buildCodingDesktop();
      var codingState = currentCodingState;
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          // Proactive — no user input, Zeus notices on its own
          addMsg(codingState.notice);
          setTimeout(function () {
            showThinking(true);
            addTool(codingState.tools[0]);
            setTimeout(function () {
              addTool(codingState.tools[1]);
              setTimeout(function () {
                addTool(codingState.tools[2]);
                setTimeout(function () {
                  showThinking(false);
                  addMsg(codingState.summary);
                  setTimeout(function () {
                    showResearchPdf();
                    setTimeout(done, 4000);
                  }, 600);
                }, 800);
              }, 700);
            }, 700);
          }, 800);
        }, 500);
      }, 1200);
    },

    // 3. Morning briefing with inbox visible
    function (done) {
      buildInboxDesktop();
      var inboxState = currentInboxState;
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          submitAndRun('morning briefing', [
            { type: 'think', delay: 0 },
            { type: 'tool', text: 'Reading calendar — ' + inboxState.calendar.todayCount + ' events today', delay: 700 },
            { type: 'tool', text: 'Scanning inbox — ' + inboxState.mail.unread + ' unread, ' + inboxState.mail.urgent + ' urgent', delay: 600 },
            { type: 'tool', text: 'Checking Messages — ' + inboxState.messages.unreadCount + ' unread', delay: 500 },
            { type: 'endthink', delay: 600 },
            { type: 'msg', text: 'Next up: ' + inboxState.calendar.todayHeadline + '.', delay: 300 },
            { type: 'msg', text: 'Priority: ' + inboxState.mail.active.from + ' sent "' + inboxState.mail.active.subject + '".', delay: 500 },
            { type: 'msg', text: inboxState.messages.active.name + ' left a note: ' + inboxState.messages.active.bubbles[0].text, delay: 500 },
          ], done);
        }, 500);
      }, 1200);
    },

    // 4. Proactive meeting setup
    function (done) {
      buildMeetingDesktop();
      var meetingState = currentMeetingState;
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          // Proactive — Zeus notices the inbound message
          addMsg(meetingState.contact.name + ' from ' + meetingState.contact.company + ' asked for a quick intro on approval-aware automation. Want me to set it up?');
          setTimeout(function () {
            addApproval();
            setTimeout(function () {
              showThinking(true);
              setTimeout(function () {
                addTool('Checking your calendar for open slots');
                setTimeout(function () {
                  addTool('Found opening: ' + meetingState.slot);
                  setTimeout(function () {
                    addTool('Creating calendar invite');
                    setTimeout(function () {
                      showThinking(false);
                      addMsg('Done. Invite sent for ' + meetingState.slot + '.');
                      setTimeout(function () {
                        addCalendarEvent();
                        setTimeout(function () {
                          showThinking(true);
                          addTool('Researching ' + meetingState.contact.company + ' context');
                          setTimeout(function () {
                            addTool('Composing talking points');
                            setTimeout(function () {
                              showThinking(false);
                              addMsg('Talking points: ' + meetingState.contact.research.join(' '));
                              setTimeout(function () {
                                addMsg('I also flagged ' + pick(['Mercury Cafe', 'Verve Social', 'Oakline Coffee']) + ' as a quiet place if you want to do it in person.');
                                setTimeout(done, 3000);
                              }, 500);
                            }, 500);
                          }, 700);
                        }, 700);
                      }, 600);
                    }, 600);
                  }, 500);
                }, 600);
              }, 800);
            }, 1200);
          }, 800);
        }, 500);
      }, 1200);
    },

    // 5. Book a table
    function (done) {
      buildBookingDesktop();
      var bookingState = currentBookingState;
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          submitAndRun('book a table for two this saturday night in sf', [
            { type: 'think', delay: 0 },
            { type: 'tool', text: 'Opening browser → opentable.com', delay: 800 },
            { type: 'tool', text: 'Searching: ' + bookingState.meta, delay: 700 },
            { type: 'desktop', fn: showOpenTable, delay: 600 },
            { type: 'endthink', delay: 400 },
            { type: 'msg', text: 'Found 3 options with availability Saturday at 7 PM:', delay: 300 },
            { type: 'msg', text: bookingState.results.map(function (result, idx) { return (idx + 1) + '. ' + result.name + ' — ' + result.cuisine + ', ' + result.area + ' (' + result.slots.join(', ') + ')'; }).join('\n'), delay: 500 },
            { type: 'msg', text: 'Want me to book one? I\'d suggest ' + bookingState.selected.name + ' at ' + bookingState.selected.preferredSlot + ' — ' + bookingState.selected.note + '.', delay: 600 },
            { type: 'approve', delay: 800 },
            { type: 'think', delay: 1000 },
            { type: 'tool', text: 'Booking ' + bookingState.selected.name + ' · 2 guests · ' + bookingState.selected.preferredSlot, delay: 700 },
            { type: 'tool', text: 'Filling reservation form', delay: 600 },
            { type: 'tool', text: 'Confirming booking', delay: 500 },
            { type: 'desktop', fn: showBookingConfirmed, delay: 400 },
            { type: 'endthink', delay: 300 },
            { type: 'msg', text: 'Done — table for 2 at ' + bookingState.selected.name + ', Saturday ' + bookingState.selected.preferredSlot + '. Confirmation is on screen. Added it to your calendar too.', delay: 400 },
          ], done);
        }, 500);
      }, 1200);
    },
  ];

  // --- Tab-driven scenario system ---
  var pendingTimers = [];
  var origSetTimeout = window.setTimeout;

  function trackedTimeout(fn, ms) {
    var id = origSetTimeout(fn, ms);
    pendingTimers.push(id);
    return id;
  }

  function clearAllTimers() {
    pendingTimers.forEach(function (id) { clearTimeout(id); });
    pendingTimers = [];
    if (dotsTimer) clearInterval(dotsTimer);
  }

  // Patch setTimeout inside scenario runners
  function runScenario(idx) {
    clearAllTimers();
    closeNotch();
    desktop.innerHTML = '';

    // Temporarily override setTimeout to track timers
    var _st = window.setTimeout;
    window.setTimeout = trackedTimeout;

    scenarios[idx](function () {
      // scenario done — just stay on final state
    });

    window.setTimeout = _st;
  }

  // Tab click handling
  var tabs = document.querySelectorAll('.zeus-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      runScenario(parseInt(tab.getAttribute('data-scenario'), 10));
    });
  });

  // Start scenario 0 when visible
  var screenEl = document.querySelector('.zeus-screen');
  if (!screenEl) { runScenario(0); return; }

  var started = false;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !started) {
        started = true;
        origSetTimeout(function () { runScenario(0); }, 800);
      }
    });
  }, { threshold: 0.3 });

  obs.observe(screenEl);
})();

(function () {
  var dock = document.querySelector('.zeus-dock');
  if (!dock) return;
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var icons = Array.prototype.slice.call(dock.querySelectorAll('.zeus-dock-icon'));
  if (!icons.length) return;

  var rafId = null;
  var pointerX = null;
  var SIGMA = 42;
  var MAX_DISTANCE = 110;

  function resetIcons() {
    icons.forEach(function (icon) {
      icon.style.setProperty('--dock-scale', '1');
      icon.style.setProperty('--dock-lift', '0px');
      icon.style.zIndex = '1';
    });
  }

  function updateIcons(clientX) {
    icons.forEach(function (icon) {
      var rect = icon.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var distance = Math.abs(clientX - centerX);
      var influence = distance > MAX_DISTANCE ? 0 : Math.exp(-(distance * distance) / (2 * SIGMA * SIGMA));
      var scale = 1 + influence * 0.42;
      var lift = influence * 11;

      icon.style.setProperty('--dock-scale', scale.toFixed(3));
      icon.style.setProperty('--dock-lift', lift.toFixed(2) + 'px');
      icon.style.zIndex = String(10 + Math.round(influence * 10));
    });
  }

  function scheduleUpdate() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () {
      rafId = null;
      if (pointerX == null) {
        resetIcons();
        return;
      }
      updateIcons(pointerX);
    });
  }

  dock.addEventListener('pointerenter', function (event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    dock.classList.add('is-hovering');
    pointerX = event.clientX;
    scheduleUpdate();
  });

  dock.addEventListener('pointermove', function (event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointerX = event.clientX;
    scheduleUpdate();
  });

  dock.addEventListener('pointerleave', function () {
    dock.classList.remove('is-hovering');
    pointerX = null;
    scheduleUpdate();
  });

  window.addEventListener('blur', function () {
    dock.classList.remove('is-hovering');
    pointerX = null;
    scheduleUpdate();
  });

  resetIcons();
})();
