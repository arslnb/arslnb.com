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

  var dots = '<span class="zd-dot zd-dot-r"></span><span class="zd-dot zd-dot-y"></span><span class="zd-dot zd-dot-g"></span>';

  function makeIcon(cls, label, left, top) {
    var d = document.createElement('div'); d.className = 'zd-icon';
    d.style.left = left; d.style.top = top;
    var img = document.createElement('div'); img.className = 'zd-icon-img ' + cls;
    var lbl = document.createElement('div'); lbl.className = 'zd-icon-label'; lbl.textContent = label;
    d.appendChild(img); d.appendChild(lbl);
    return d;
  }

  function makeWindow(opts) {
    var w = document.createElement('div'); w.className = 'zd-window';
    if (opts.id) w.id = opts.id;
    w.style.left = opts.left; w.style.top = opts.top;
    w.style.width = opts.width; w.style.height = opts.height;
    var bar = document.createElement('div'); bar.className = 'zd-window-bar';
    bar.innerHTML = dots;
    if (opts.title) { var t = document.createElement('span'); t.className = 'zd-window-title'; t.textContent = opts.title; bar.appendChild(t); }
    w.appendChild(bar);
    if (opts.bodyHtml) { var b = document.createElement('div'); b.className = 'zd-window-body'; b.innerHTML = opts.bodyHtml; w.appendChild(b); }
    if (opts.customHtml) w.insertAdjacentHTML('beforeend', opts.customHtml);
    return w;
  }

  function makePdf(opts) {
    var p = document.createElement('div'); p.className = 'zd-pdf'; p.id = opts.id || '';
    p.style.left = opts.left; p.style.top = opts.top;
    p.style.width = opts.width; p.style.height = opts.height;
    var bar = document.createElement('div'); bar.className = 'zd-pdf-bar';
    bar.innerHTML = dots;
    if (opts.title) { var t = document.createElement('span'); t.className = 'zd-window-title'; t.textContent = opts.title; bar.appendChild(t); }
    p.appendChild(bar);
    var page = document.createElement('div'); page.className = 'zd-pdf-page';
    var body = document.createElement('div'); body.className = 'zd-pdf-body';
    body.innerHTML = opts.html || '';
    page.appendChild(body); p.appendChild(page);
    return p;
  }

  // Line numbers helper
  function gutter(n) {
    var lines = [];
    for (var i = 1; i <= n; i++) lines.push(i);
    return lines.join('\n');
  }

  // ========== SCENARIO 1: Organize Desktop ==========
  function buildMessyDesktop() {
    desktop.innerHTML = '';
    var icons = [
      ['zd-file-img', 'Screenshot 2026-02...', '6%', '5%'],
      ['zd-file-doc', 'Q4 Report.docx', '30%', '3%'],
      ['zd-file-pdf', 'invoice_march.pdf', '58%', '8%'],
      ['zd-file-code', 'server.py', '14%', '30%'],
      ['zd-file-zip', 'Archive.zip', '73%', '25%'],
      ['zd-file-img', 'photo_0291.jpg', '43%', '32%'],
      ['zd-file-misc', 'notes.txt', '3%', '55%'],
      ['zd-file-xls', 'budget.xlsx', '53%', '52%'],
      ['zd-file-mov', 'demo_v2.mov', '78%', '50%'],
      ['zd-file-pdf', 'contract.pdf', '23%', '58%'],
      ['zd-file-img', 'IMG_4822.png', '66%', '65%'],
      ['zd-file-code', 'index.html', '38%', '70%'],
      ['zd-file-doc', 'Meeting Notes.docx', '8%', '75%'],
      ['zd-file-misc', 'TODO.md', '83%', '5%'],
      ['zd-file-zip', 'backup_feb.tar.gz', '48%', '15%'],
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

    // VS Code
    var vscode = makeWindow({
      title: 'main.py — stripe-webhook — Visual Studio Code',
      left: '2%', top: '2%', width: '50%', height: '78%',
      customHtml:
        '<div class="zd-vscode">' +
          '<div class="zd-vscode-sidebar">' +
            '<div class="zd-vscode-sidebar-icon active">&#9776;</div>' +
            '<div class="zd-vscode-sidebar-icon">&#128269;</div>' +
            '<div class="zd-vscode-sidebar-icon">&#9679;</div>' +
            '<div class="zd-vscode-sidebar-icon">&#9654;</div>' +
          '</div>' +
          '<div class="zd-vscode-main">' +
            '<div class="zd-vscode-tabs">' +
              '<div class="zd-vscode-tab active">main.py</div>' +
              '<div class="zd-vscode-tab">models.py</div>' +
              '<div class="zd-vscode-tab">.env</div>' +
            '</div>' +
            '<div class="zd-vscode-editor">' +
              '<div class="zd-vscode-gutter"><pre style="margin:0">' + gutter(15) + '</pre></div>' +
              '<div class="zd-vscode-code">' +
                '<div class="zd-code-line"><span class="zd-code-kw">from</span> <span class="zd-code-var">fastapi</span> <span class="zd-code-kw">import</span> <span class="zd-code-type">FastAPI</span>, <span class="zd-code-type">Request</span></div>' +
                '<div class="zd-code-line"><span class="zd-code-kw">import</span> <span class="zd-code-var">stripe</span></div>' +
                '<div class="zd-code-line"></div>' +
                '<div class="zd-code-line"><span class="zd-code-var">app</span> <span class="zd-code-op">=</span> <span class="zd-code-type">FastAPI</span>()</div>' +
                '<div class="zd-code-line"></div>' +
                '<div class="zd-code-line"><span class="zd-code-cm"># TODO: verify webhook signature</span></div>' +
                '<div class="zd-code-line"><span class="zd-code-fn">@app.post</span>(<span class="zd-code-str">"/webhook"</span>)</div>' +
                '<div class="zd-code-line"><span class="zd-code-kw">async def</span> <span class="zd-code-fn">handle_webhook</span>(<span class="zd-code-var">req</span>: <span class="zd-code-type">Request</span>):</div>' +
                '<div class="zd-code-line">    <span class="zd-code-var">payload</span> <span class="zd-code-op">=</span> <span class="zd-code-kw">await</span> <span class="zd-code-var">req</span>.body()</div>' +
                '<div class="zd-code-line">    <span class="zd-code-var">sig</span> <span class="zd-code-op">=</span> <span class="zd-code-var">req</span>.headers[<span class="zd-code-str">"stripe-signature"</span>]</div>' +
                '<div class="zd-code-line">    <span class="zd-code-var">event</span> <span class="zd-code-op">=</span> stripe.<span class="zd-code-type">Webhook</span>.construct_event(</div>' +
                '<div class="zd-code-line">        <span class="zd-code-var">payload</span>, <span class="zd-code-var">sig</span>, <span class="zd-code-var">endpoint_secret</span></div>' +
                '<div class="zd-code-line">    )</div>' +
                '<div class="zd-code-line">    <span class="zd-code-kw">if</span> <span class="zd-code-var">event</span>[<span class="zd-code-str">"type"</span>] <span class="zd-code-op">==</span> <span class="zd-code-str">"checkout.session.completed"</span>:</div>' +
                '<div class="zd-code-line">        <span class="zd-code-cm"># TODO: handle fulfillment</span></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
    });
    desktop.appendChild(vscode);

    // Terminal
    var term = makeWindow({
      title: 'user@macbook — stripe-webhook',
      left: '2%', top: '74%', width: '50%', height: '24%',
      customHtml:
        '<div class="zd-terminal-body">' +
          '<div><span class="zd-term-prompt">user@macbook</span> <span class="zd-term-path">~/stripe-webhook</span> <span class="zd-term-dim">%</span> uvicorn main:app --reload</div>' +
          '<div><span class="zd-term-ok">INFO</span><span class="zd-term-dim">:</span>     Uvicorn running on <span class="zd-term-dim">http://127.0.0.1:8000</span></div>' +
          '<div><span class="zd-term-dim">INFO:     Waiting for application startup.</span></div>' +
          '<div><span class="zd-term-ok">INFO</span><span class="zd-term-dim">:</span>     Application startup complete.</div>' +
          '<div><span class="zd-term-warn">WARNING</span><span class="zd-term-dim">:</span>  endpoint_secret is not set</div>' +
        '</div>'
    });
    desktop.appendChild(term);

    // Browser
    var browser = makeWindow({
      title: 'Stripe Documentation',
      left: '54%', top: '2%', width: '44%', height: '60%',
      customHtml:
        '<div class="zd-browser-bar">' +
          '<div class="zd-browser-nav"><span class="zd-browser-nav-btn">&lt;</span><span class="zd-browser-nav-btn">&gt;</span></div>' +
          '<div class="zd-browser-url">docs.stripe.com/webhooks/quickstart</div>' +
        '</div>' +
        '<div class="zd-browser-content">' +
          '<div class="zd-browser-h1">Receive webhook events</div>' +
          '<div class="zd-browser-dim">Learn how to listen for events on your Stripe account so your integration can automatically trigger reactions.</div>' +
          '<br>' +
          '<div style="color:#fff;font-weight:600;font-size:0.42rem;">Step 1: Create an endpoint</div>' +
          '<div>Set up an HTTP endpoint on your server to accept <code style="color:#58a6ff">POST</code> requests with a JSON payload.</div>' +
          '<div class="zd-browser-code">stripe listen --forward-to localhost:8000/webhook</div>' +
          '<br>' +
          '<div style="color:#fff;font-weight:600;font-size:0.42rem;">Step 2: Verify signatures</div>' +
          '<div>Use <span class="zd-browser-link">construct_event()</span> to verify the webhook came from Stripe.</div>' +
        '</div>'
    });
    desktop.appendChild(browser);
  }

  function showResearchPdf() {
    var pdf = makePdf({
      id: 'zd-research-pdf',
      title: 'Stripe Webhooks — Deep Research.pdf — Preview',
      left: '50%', top: '25%', width: '44%', height: '60%',
      html:
        '<div class="zd-pdf-title">Stripe Webhook Integration Guide</div>' +
        '<span class="zd-pdf-dim">Generated by Zeus \u2014 Feb 2026</span>' +
        '<div class="zd-pdf-h2">1. Signature Verification</div>' +
        '<div>Always verify webhook signatures using <code>stripe.Webhook.construct_event()</code>. Store your endpoint secret in environment variables.</div>' +
        '<div class="zd-pdf-h2">2. Idempotency</div>' +
        '<div>Stripe may send the same event multiple times. Track event IDs to prevent duplicate processing.</div>' +
        '<div class="zd-pdf-h2">3. Fulfillment Pattern</div>' +
        '<div>For <code>checkout.session.completed</code>, retrieve line items, update your database, then send confirmation.</div>' +
        '<div class="zd-pdf-h2">4. Error Handling</div>' +
        '<div>Return 200 quickly. Process heavy work async via a job queue to avoid Stripe\'s 30s timeout.</div>'
    });
    desktop.appendChild(pdf);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { pdf.classList.add('zd-pdf-visible'); });
    });
  }

  // ========== SCENARIO 3: Morning inbox triage ==========
  function buildInboxDesktop() {
    desktop.innerHTML = '';

    // Mail.app
    var mail = makeWindow({
      title: 'Mail',
      left: '3%', top: '2%', width: '55%', height: '90%',
      customHtml:
        '<div class="zd-window-body"><div class="zd-mail-list">' +
          '<div class="zd-mail-row zd-mail-row-unread"><span class="zd-mail-time">10:02 AM</span><div class="zd-mail-sender"><span class="zd-mail-badge"></span>Sarah Chen</div><div class="zd-mail-subject">Investor Update Request</div><div class="zd-mail-preview">Can you send the Q4 numbers by Friday? The board wants to review before...</div></div>' +
          '<div class="zd-mail-row zd-mail-row-unread"><span class="zd-mail-time">9:45 AM</span><div class="zd-mail-sender"><span class="zd-mail-badge"></span>DevOps</div><div class="zd-mail-subject">Staging is down</div><div class="zd-mail-preview">prod is fine but staging is returning 502s on /api/v2 endpoints...</div></div>' +
          '<div class="zd-mail-row zd-mail-row-unread"><span class="zd-mail-time">9:30 AM</span><div class="zd-mail-sender"><span class="zd-mail-badge"></span>Mike Reynolds</div><div class="zd-mail-subject">Design Review Feedback</div><div class="zd-mail-preview">Attached revised mockups for the onboarding flow. Main changes are...</div></div>' +
          '<div class="zd-mail-row"><span class="zd-mail-time">8:15 AM</span><div class="zd-mail-sender">TechCrunch</div><div class="zd-mail-subject">Weekly Newsletter</div><div class="zd-mail-preview">This week in AI: Apple releases new on-device models for...</div></div>' +
          '<div class="zd-mail-row"><span class="zd-mail-time">7:00 AM</span><div class="zd-mail-sender">AWS</div><div class="zd-mail-subject">Your February Invoice</div><div class="zd-mail-preview">Your invoice for February 2026 is ready \u2014 $142.30</div></div>' +
        '</div></div>'
    });
    desktop.appendChild(mail);

    // Calendar.app
    var cal = makeWindow({
      title: 'Calendar',
      left: '60%', top: '2%', width: '37%', height: '48%',
      customHtml:
        '<div class="zd-window-body">' +
          '<div class="zd-cal-event" style="border-color:#34c759;"><div class="zd-cal-time">9:00 AM</div><div class="zd-cal-title">Standup with eng team</div></div>' +
          '<div class="zd-cal-event" style="border-color:#007aff;"><div class="zd-cal-time">11:30 AM</div><div class="zd-cal-title">Design review \u2014 onboarding</div></div>' +
          '<div class="zd-cal-event" style="border-color:#ff9500;"><div class="zd-cal-time">2:00 PM</div><div class="zd-cal-title">Investor sync call</div></div>' +
          '<div class="zd-cal-event" style="border-color:#5856d6;"><div class="zd-cal-time">4:30 PM</div><div class="zd-cal-title">Focus block</div></div>' +
        '</div>'
    });
    desktop.appendChild(cal);

    // Messages.app
    var msgs = makeWindow({
      title: 'Messages',
      left: '60%', top: '52%', width: '37%', height: '42%',
      customHtml:
        '<div class="zd-window-body">' +
          '<div class="zd-msg-row"><div class="zd-msg-sender">Nico Bashir</div><div class="zd-msg-bubble">Hey, are we still on for Thursday?</div></div>' +
          '<div class="zd-msg-row"><div class="zd-msg-sender">Sarah Chen</div><div class="zd-msg-bubble">Sent the updated deck to your email</div></div>' +
        '</div>'
    });
    desktop.appendChild(msgs);
  }

  // ========== SCENARIO 4: Proactive meeting setup ==========
  function buildMeetingDesktop() {
    desktop.innerHTML = '';

    // Calendar in the background
    var cal = makeWindow({
      title: 'Calendar',
      left: '3%', top: '2%', width: '55%', height: '90%',
      customHtml:
        '<div class="zd-window-body">' +
          '<div class="zd-cal-event" style="border-color:#34c759;"><div class="zd-cal-time">9:00 AM</div><div class="zd-cal-title">Standup with eng team</div></div>' +
          '<div class="zd-cal-event" style="border-color:#007aff;"><div class="zd-cal-time">11:30 AM</div><div class="zd-cal-title">Design review — onboarding</div></div>' +
          '<div class="zd-cal-event" style="border-color:#ff9500;"><div class="zd-cal-time">2:00 PM</div><div class="zd-cal-title">Focus block</div></div>' +
        '</div>'
    });
    desktop.appendChild(cal);

    // Messages
    var msgs = makeWindow({
      title: 'Messages',
      left: '60%', top: '2%', width: '37%', height: '55%',
      customHtml:
        '<div class="zd-window-body">' +
          '<div class="zd-msg-row"><div class="zd-msg-sender">Marcus Wei</div><div class="zd-msg-bubble">Hey! Been following what you\'re building with Zeus. Would love to chat about integrating it with our infra at Vercel. Free this week?</div></div>' +
        '</div>'
    });
    desktop.appendChild(msgs);
  }

  function addCalendarEvent() {
    var cal = desktop.querySelector('.zd-window-body');
    if (!cal) return;
    var ev = document.createElement('div');
    ev.className = 'zd-cal-event';
    ev.style.borderColor = '#5856d6';
    ev.innerHTML = '<div class="zd-cal-time">3:30 PM Thu</div><div class="zd-cal-title">Coffee w/ Marcus — Vercel integration</div>';
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

    // Empty browser window (Safari)
    var browser = makeWindow({
      title: 'Safari',
      left: '10%', top: '5%', width: '80%', height: '88%',
      customHtml:
        '<div class="zd-browser-bar">' +
          '<div class="zd-browser-nav"><span class="zd-browser-nav-btn">&lt;</span><span class="zd-browser-nav-btn">&gt;</span></div>' +
          '<div class="zd-browser-url" id="zd-booking-url">google.com</div>' +
        '</div>' +
        '<div class="zd-browser-content" id="zd-booking-content">' +
          '<div style="text-align:center;padding:2rem 0;color:#666;font-size:0.4rem;">New Tab</div>' +
        '</div>'
    });
    desktop.appendChild(browser);
  }

  function showOpenTable() {
    var url = document.getElementById('zd-booking-url');
    var content = document.getElementById('zd-booking-content');
    if (!url || !content) return;

    url.textContent = 'opentable.com/s?covers=2&dateTime=2026-03-01T19%3A00&metro=san-francisco';
    content.innerHTML =
      '<div style="padding:0.3rem 0.4rem;">' +
        '<div style="color:#da3743;font-weight:700;font-size:0.5rem;margin-bottom:0.3rem;">OpenTable</div>' +
        '<div style="color:#fff;font-size:0.38rem;margin-bottom:0.4rem;">2 guests · Sat, Mar 1 · 7:00 PM · San Francisco</div>' +
        '<div class="zd-ot-result">' +
          '<div class="zd-ot-name">Zuni Café</div>' +
          '<div class="zd-ot-meta">Mediterranean · $$$$ · Hayes Valley</div>' +
          '<div class="zd-ot-slots"><span class="zd-ot-slot">6:45 PM</span><span class="zd-ot-slot">7:00 PM</span><span class="zd-ot-slot">7:15 PM</span></div>' +
        '</div>' +
        '<div class="zd-ot-result">' +
          '<div class="zd-ot-name">Nopa</div>' +
          '<div class="zd-ot-meta">American · $$$ · NoPa</div>' +
          '<div class="zd-ot-slots"><span class="zd-ot-slot">7:00 PM</span><span class="zd-ot-slot">7:30 PM</span></div>' +
        '</div>' +
        '<div class="zd-ot-result">' +
          '<div class="zd-ot-name">Foreign Cinema</div>' +
          '<div class="zd-ot-meta">California · $$$ · Mission</div>' +
          '<div class="zd-ot-slots"><span class="zd-ot-slot">6:30 PM</span><span class="zd-ot-slot">7:00 PM</span><span class="zd-ot-slot">7:45 PM</span></div>' +
        '</div>' +
      '</div>';
  }

  function showBookingConfirmed() {
    var content = document.getElementById('zd-booking-content');
    var url = document.getElementById('zd-booking-url');
    if (!content || !url) return;

    url.textContent = 'opentable.com/booking/confirmation';
    content.innerHTML =
      '<div style="padding:0.6rem 0.4rem;text-align:center;">' +
        '<div style="color:#34c759;font-size:0.6rem;margin-bottom:0.2rem;">&#10003;</div>' +
        '<div style="color:#fff;font-weight:600;font-size:0.45rem;margin-bottom:0.15rem;">Reservation Confirmed</div>' +
        '<div style="color:#aaa;font-size:0.35rem;">Zuni Café · 2 guests · Sat, Mar 1 · 7:00 PM</div>' +
        '<div style="color:#888;font-size:0.3rem;margin-top:0.15rem;">1658 Market St, San Francisco</div>' +
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
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          // Proactive — no user input, Zeus notices on its own
          addMsg('I see you\'re building a Stripe webhook handler. The endpoint secret isn\'t set and signature verification is incomplete.');
          setTimeout(function () {
            showThinking(true);
            addTool('Researching Stripe webhook best practices');
            setTimeout(function () {
              addTool('Reading docs.stripe.com + 3 guides');
              setTimeout(function () {
                addTool('Composing deep research document');
                setTimeout(function () {
                  showThinking(false);
                  addMsg('I\'ve put together a deep research doc covering signature verification, idempotency, fulfillment patterns, and error handling.');
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
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          submitAndRun('morning briefing', [
            { type: 'think', delay: 0 },
            { type: 'tool', text: 'Reading calendar — 4 events', delay: 700 },
            { type: 'tool', text: 'Scanning inbox — 7 unread, 2 urgent', delay: 600 },
            { type: 'tool', text: 'Checking iMessage — 2 unread', delay: 500 },
            { type: 'endthink', delay: 600 },
            { type: 'msg', text: 'First meeting in 40 min — standup with eng.', delay: 300 },
            { type: 'msg', text: 'Urgent: Sarah needs Q4 numbers by Friday. Staging is returning 502s on /api/v2.', delay: 500 },
            { type: 'msg', text: 'Nico is asking about Thursday. Sarah sent the updated deck.', delay: 500 },
          ], done);
        }, 500);
      }, 1200);
    },

    // 4. Proactive meeting setup
    function (done) {
      buildMeetingDesktop();
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          // Proactive — Zeus notices the inbound message
          addMsg('Marcus Wei from Vercel just reached out — he wants to chat about integrating Zeus with their infrastructure. Want me to set up a meeting?');
          setTimeout(function () {
            addApproval();
            setTimeout(function () {
              showThinking(true);
              setTimeout(function () {
                addTool('Checking your calendar for open slots');
                setTimeout(function () {
                  addTool('Found opening: Thu 3:30 PM');
                  setTimeout(function () {
                    addTool('Creating calendar invite');
                    setTimeout(function () {
                      showThinking(false);
                      addMsg('Done. Invite sent for Thursday at 3:30 PM.');
                      setTimeout(function () {
                        addCalendarEvent();
                        setTimeout(function () {
                          showThinking(true);
                          addTool('Researching Marcus Wei + Vercel infra');
                          setTimeout(function () {
                            addTool('Composing talking points');
                            setTimeout(function () {
                              showThinking(false);
                              addMsg('Here are a few talking points I put together — Vercel\'s edge runtime, their deployment pipeline, and how Zeus skills could hook into their build system.');
                              setTimeout(function () {
                                addMsg('Also found a few good spots in SF for coffee:');
                                setTimeout(function () {
                                  addMsg('• Sightglass Coffee — 270 7th St (quiet, good for meetings)\n• Ritual Coffee — 432 Octavia St\n• Saint Frank — 2340 Polk St');
                                  setTimeout(done, 3000);
                                }, 400);
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
      setTimeout(function () {
        openNotch();
        setTimeout(function () {
          submitAndRun('book a table for two this saturday night in sf', [
            { type: 'think', delay: 0 },
            { type: 'tool', text: 'Opening browser → opentable.com', delay: 800 },
            { type: 'tool', text: 'Searching: 2 guests · Sat, Mar 1 · 7:00 PM · San Francisco', delay: 700 },
            { type: 'desktop', fn: showOpenTable, delay: 600 },
            { type: 'endthink', delay: 400 },
            { type: 'msg', text: 'Found 3 options with availability Saturday at 7 PM:', delay: 300 },
            { type: 'msg', text: '1. Zuni Café — Mediterranean, Hayes Valley (6:45, 7:00, 7:15)\n2. Nopa — American, NoPa (7:00, 7:30)\n3. Foreign Cinema — California, Mission (6:30, 7:00, 7:45)', delay: 500 },
            { type: 'msg', text: 'Want me to book one? I\'d suggest Zuni Café at 7:00 PM — great food, walkable from BART.', delay: 600 },
            { type: 'approve', delay: 800 },
            { type: 'think', delay: 1000 },
            { type: 'tool', text: 'Booking Zuni Café · 2 guests · 7:00 PM', delay: 700 },
            { type: 'tool', text: 'Filling reservation form', delay: 600 },
            { type: 'tool', text: 'Confirming booking', delay: 500 },
            { type: 'desktop', fn: showBookingConfirmed, delay: 400 },
            { type: 'endthink', delay: 300 },
            { type: 'msg', text: 'Done — table for 2 at Zuni Café, Saturday 7:00 PM. Confirmation is on screen. Added it to your calendar too.', delay: 400 },
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
