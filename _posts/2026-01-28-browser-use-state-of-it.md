---
layout: post
title: "The State of Browser Use"
description: "WebSocket, Native Messaging, and DOM-first architectures for browser automation agents. Tradeoffs and convergence."
date: 2026-01-28
---

Browser use is a subset of computer use, but it deserves its own analysis because the browser is where most agent tasks end up. Booking a flight. Filling out a form. Extracting data from a website. Posting on social media.

I built a browser automation system that went through three architectures. Here is what I learned at each stage and where the field is converging.

## Architecture 1: Direct WebSocket to extension

The first attempt was a Chrome extension that opened a WebSocket connection to the daemon. The daemon sent commands (navigate, click, type), the extension executed them, and returned results.

```
Daemon <-- WebSocket --> Chrome Extension <-- Chrome APIs --> Web Page
```

This worked for demos but broke constantly in production:

- WebSocket connections dropped when Chrome suspended the extension's service worker (Manifest V3).
- The extension could not access pages with restrictive CSP headers.
- Chrome-internal pages (`chrome://settings`, `chrome://extensions`) were completely inaccessible.
- Reconnection was racy: commands sent during disconnection were lost.

## Architecture 2: Native Messaging + HTTP bridge

The second architecture split the transport into two hops:

```
Daemon <-- HTTP --> Native Host <-- Native Messaging --> Extension <-- Chrome APIs --> Page
```

Chrome Native Messaging (`chrome.runtime.connectNative`) launches a native host process that communicates with the extension via stdin/stdout. The native host relays commands to the daemon over localhost HTTP.

The improvement:

- **Reconnect-safe.** Commands are queued by request ID on the daemon. If the native host disconnects, inflight commands are re-queued automatically. The extension polls for pending work and only opens the native host when there is something to do.
- **Demand-driven.** The native host is not always running. The extension probes a `pending` endpoint periodically; when work exists, it opens `connectNative`. The host exits after ~60s of idle. This saves resources.
- **Authenticated.** Every request includes an instance ID and auth token from the daemon's discovery endpoint. No unauthorized process can inject commands.

The daemon exposes these endpoints:

```
POST /api/native-browser/session/open
POST /api/native-browser/session/heartbeat
POST /api/native-browser/host/register
GET  /api/native-browser/pending
GET  /api/native-browser/command/next
POST /api/native-browser/command/result
```

The extension discovers the daemon by scanning `http://127.0.0.1:9222..9232/api/extension-discovery`. The response includes the HTTP port, native host name, and auth credentials.

## Architecture 3: DOM-first with screenshot fallback

The action layer evolved from pixel-based to DOM-based. Instead of sending the model a screenshot and getting coordinates back, the extension inspects the page DOM and returns structured data.

```python
# Old: pixel-based
result = send_browser_command("screenshot")
action = model("click the login button", result.image)
send_browser_command("click", x=action.x, y=action.y)

# New: DOM-first
result = send_browser_command("get_page_info")
# Returns: {title, url, forms: [...], links: [...], buttons: [...]}
action = model("click the login button", result.page_info)
send_browser_command("click", selector="button.login-btn")
```

The `get_page_info` action returns a structured representation of the page: forms with their fields, clickable elements with labels, input fields with types and values. The model reasons over structured text instead of pixels.

Screenshots are still captured for:
- Verification after actions (did the click work?)
- Pages where the DOM is obfuscated (canvas-heavy apps, iframes)
- Visual layout reasoning (where is element X relative to element Y?)

The model sees both: the structured page info for planning, and an optional screenshot for verification. This hybrid approach gets the reliability of DOM selectors with the generality of vision.

## The action vocabulary

After iterating on what actions the model actually needs, the minimal set is:

| Action | Input | What it does |
|---|---|---|
| `navigate` | url | Go to a URL |
| `click` | CSS selector | Click an element |
| `type` | CSS selector + text | Type into a field |
| `scroll` | direction + amount | Scroll the page |
| `screenshot` | (none) | Capture current state |
| `get_page_info` | (none) | Return DOM structure |
| `back` / `forward` | (none) | Browser history |

That is seven actions. Everything else is a composition of these.

The most common failure mode is `click` with a selector that does not match. The recovery pattern:

```
function reliable_click(selector, retries=2):
    for attempt in range(retries):
        result = send_command("click", selector)
        if result.ok:
            return result
        # Selector failed, refresh page state
        page_info = send_command("get_page_info")
        # Ask model for a better selector
        new_selector = model("find this element", page_info)
        selector = new_selector
    # Last resort: screenshot + coordinate click
    screenshot = send_command("screenshot")
    coords = model("where is this element?", screenshot)
    return send_command("click", x=coords.x, y=coords.y)
```

## The hard problems

**Session management.** Browsers have cookies, local storage, and session state. If the agent logs into a site, that session persists across tasks. This is both useful (no re-authentication) and dangerous (the agent might act on the wrong account). There is no good solution here yet. Most systems use ephemeral profiles, which is safe but loses the convenience of persistent sessions.

**Multi-tab coordination.** Some workflows require multiple tabs: open a reference page in tab 1, fill a form in tab 2 using data from tab 1. Tab management is surprisingly hard. The extension needs to track which tab is active, route commands to the right tab, and handle tabs being closed or navigated away.

**Anti-bot detection.** Cloudflare, reCAPTCHA, and bot-detection services are optimized to detect automated browsers. Chrome controlled via DevTools protocol has detectable fingerprints (the `navigator.webdriver` flag, specific JS timing patterns). Workarounds exist but are fragile and ethically questionable.

**Performance.** Even with DOM-first actions, the round trip is:

```
1. Model generates action        ~1-2s (LLM inference)
2. Command sent to daemon        ~5ms (HTTP)
3. Command relayed to extension  ~10-50ms (native messaging)
4. Extension executes action     ~50-300ms (DOM manipulation + page load)
5. Result relayed back           ~10-50ms
6. Screenshot captured (if any)  ~100-200ms
Total: ~1.5-3s per action
```

A human does the same action in 200-500ms. The agent is 3-6x slower per step, and it takes more steps because it needs verification screenshots.

## The state of open source

Several open-source projects are tackling browser automation:

**Playwright + LLM wrappers.** The simplest approach: use Playwright for the browser automation, wrap it with an LLM that generates Playwright code or structured commands. This is reliable but requires the model to know Playwright's API.

**Browser-Use (open source project).** DOM extraction + structured actions, similar to what I described. Growing community, active development. The challenge is handling the long tail of web page structures.

**WebVoyager / WebArena.** Research benchmarks for web agent tasks. Useful for evaluation but the benchmark tasks are simpler than real-world workflows.

The common pattern across all of these: they started with screenshots and evolved toward DOM-first with screenshot fallback. The pixel-only approach is too slow and fragile for production use.

## What actually works in production

After running browser automation on real tasks for months, here is what reliably works:

1. **Read-only tasks.** Extracting data from web pages, checking prices, reading articles. The `web_fetch` tool (HTTP GET + HTML-to-markdown conversion) handles 80% of these without any browser automation at all.

2. **Simple form submissions.** One page, a few fields, one submit button. DOM selectors work reliably here.

3. **Authenticated read tasks.** Once logged in (manually or via the agent), reading data from dashboards and portals. The persistent session makes this smooth.

What does not reliably work:

1. **Multi-step purchase flows.** Too many dynamic elements, loading states, and edge cases.
2. **Social media posting.** Platforms actively fight automation. Selectors change frequently.
3. **Anything requiring visual verification of content.** "Does this image look right?" is not something the model can reliably judge from a screenshot.

## Where it is going

The convergence point is clear: **browser agents will use a hierarchy of methods**, choosing the simplest one that works for each step.

```
Priority 1: Direct API call (fastest, most reliable)
Priority 2: HTTP request + HTML parsing (no browser needed)
Priority 3: DOM-based browser automation (reliable, moderate speed)
Priority 4: Screenshot + vision model (slow, general, last resort)
```

The model should know when to use each level. If the user says "check the weather", do not open a browser -- call a weather API. If they say "fill out this web form", use DOM selectors. If the form has a CAPTCHA and the selectors fail, then fall back to screenshots.

The next big improvement will be browser-native AI integration. Chrome is already experimenting with built-in AI APIs (`window.ai`). Imagine if the browser itself could identify interactive elements, fill forms from structured data, and handle navigation -- with the AI model only needed for high-level planning, not pixel-level clicking.

Until then, the pragmatic approach is: make the browser automation layer as thin as possible, push complexity to the model's planning phase, and always have a fallback.
