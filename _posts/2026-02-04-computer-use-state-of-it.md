---
layout: post
title: "Computer Agents"
description: "Screenshot-to-action agents in production: what works, what breaks, and why structured APIs still win over pixel-level control."
date: 2026-02-04
---

"Computer use" is the idea that an AI agent can control a computer the way a human does: moving a mouse, clicking buttons, typing into text fields, reading what is on screen. Anthropic shipped it in October 2024. OpenAI followed. Google followed. Everyone has a version now.

Having built a system that uses computer use in production, and then largely moved away from it, here is my honest assessment of where things stand.

## What computer use actually is

At the implementation level, computer use is simple. The model receives a screenshot (an image). It outputs a structured action: click at coordinate (x, y), type this string, press this key, scroll in this direction. The host executes the action, takes a new screenshot, and sends it back.

```
function computer_use_loop(task):
    screenshot = capture_screen()
    while not done:
        action = model.predict(screenshot, task)

        if action.type == "click":
            move_mouse(action.x, action.y)
            click()
        elif action.type == "type":
            type_text(action.text)
        elif action.type == "key":
            press_key(action.key)
        elif action.type == "scroll":
            scroll(action.direction, action.amount)
        elif action.type == "done":
            return action.result

        wait(500ms)
        screenshot = capture_screen()
```

The model does not have access to the DOM, accessibility tree, or any structured representation of the UI. It literally looks at pixels and decides what to do. This is both the appeal and the fundamental limitation.

## What works

**Form filling and data entry.** If the task is "go to this website, fill in these fields, click submit", computer use works reasonably well. The fields are visually distinct, the labels are readable, and the action space is small.

**Simple navigation.** "Go to Settings, click Privacy, toggle this switch." The model can follow a linear sequence of UI steps if each step is visually unambiguous.

**Screenshot-based verification.** Even when you do not use computer use for actions, using screenshots as verification is valuable. "Take a screenshot and tell me what is on screen" is a reliable way to confirm that a previous action succeeded.

## What does not work

**Precision clicking.** The model outputs coordinates, but its spatial reasoning is approximate. A 14px-wide button next to another 14px-wide button is trouble. The model might click the wrong one 20-30% of the time. On high-DPI displays, the pixel coordinates get even worse.

**Dynamic content.** Pages that load asynchronously, show spinners, or rearrange layout after render confuse the model. It sees a loading state, decides the page is loaded, and clicks on something that has not finished rendering.

**Authentication flows.** OAuth redirects, CAPTCHAs, 2FA prompts, cookie banners -- the model stumbles on these because they are unpredictable and require multi-step reasoning about state that is not visible in a single screenshot.

**Speed.** Each round trip is screenshot (100-200ms to capture and encode) + model inference (1-3s for a vision model) + action execution (50-200ms) + wait for UI to settle (300-500ms). That is 2-4 seconds per action. A human can fill out a form in 10 seconds. Computer use takes 30-60 seconds for the same form.

**Reliability at scale.** If each step has a 90% success rate and the task requires 10 steps, your end-to-end success rate is 0.9^10 = 35%. For 20 steps: 12%. Computer use is fragile for long tasks.

## The alternative: structured tool use

For most tasks that people try to solve with computer use, there is a better approach: give the model a structured tool that does the same thing.

Instead of "look at the screen, find the email field, click it, type the address":

```python
# Computer use approach (slow, fragile)
screenshot = capture()
action = model("type email into the field", screenshot)
# Model outputs: click(342, 567), type("user@example.com")

# Structured tool approach (fast, reliable)
result = send_email(to="user@example.com", subject="Hello", body="...")
# Direct API call, no vision model needed
```

This is not always possible. Some applications do not have APIs. Some workflows genuinely require interacting with a GUI. But the bias should be heavily toward structured tools, with computer use as a last resort.

In the system I built, the priority order is:

1. Native API/tool (if one exists)
2. HTTP API via `http_request` (if the service has a REST API)
3. `web_fetch` to read web content as markdown
4. Browser automation via Chrome extension (DOM-level, not pixel-level)
5. Computer use / screenshot-based interaction (last resort)

## The browser problem

The most common use case for computer use is web browsing. And for web browsing specifically, there is a better middle ground: browser automation that operates on the DOM, not on pixels.

```python
# Computer use: pixel-based
screenshot = browser.screenshot()
action = model("click the search button", screenshot)
browser.click(action.x, action.y)

# DOM-based: structured selectors
browser.click("button[aria-label='Search']")
browser.type("input#search-query", "speculative decoding")
```

The DOM approach is:
- **Faster**: no screenshot encoding, no vision model inference
- **More reliable**: CSS selectors are exact, coordinates are approximate
- **Cheaper**: text-only model call instead of vision model call

The hybrid approach -- use the DOM when you can, fall back to screenshots for verification -- is where the industry is converging. You get the reliability of structured selectors with the generality of vision when the DOM is not cooperating.

Chrome's DevTools protocol, Playwright, and Puppeteer all support this. The model generates CSS selectors or XPath expressions. If the selector fails, you fall back to a screenshot and ask the model to identify the element visually.

## Where things are headed

**Accessibility tree > screenshots.** The accessibility tree (what screen readers use) is a structured representation of the UI. It has labels, roles, and hierarchy. Feeding this to the model instead of (or alongside) screenshots dramatically improves reliability. Apple's Accessibility API and Windows UI Automation both expose this.

```
Accessibility tree for a login form:
  AXWindow "Login"
    AXGroup
      AXTextField "Email" value=""
      AXSecureTextField "Password" value=""
      AXButton "Sign In"
```

This is much easier for a model to reason about than a screenshot.

**Specialized computer-use models.** The current approach uses general-purpose vision-language models. Dedicated models trained specifically on UI interaction (with synthetic data from web crawling) will push accuracy from 70-80% per step to 95%+. This is an active research area.

**OS-level integration.** Instead of screenshotting and clicking, the agent could use the OS's native automation APIs: AppleScript on macOS, PowerShell on Windows, D-Bus on Linux. These are faster, more reliable, and do not require vision. The tradeoff is platform specificity.

**Verification loops.** The biggest practical improvement is adding verification after each action. Instead of fire-and-forget clicks, the agent should: (1) execute the action, (2) take a screenshot, (3) verify the expected state change occurred, (4) retry or adjust if not. This simple loop catches most failures and pushes end-to-end reliability from 35% to 70-80%.

## My take

Computer use is impressive as a demo and useful as a last resort. But it is not the right primitive for building reliable agent systems. The latency is too high, the reliability is too low, and there is almost always a better alternative.

The right mental model: computer use is the equivalent of a human using a computer with oven mitts on. They can do it, but they are slow and clumsy. Give them proper tools (APIs, DOM access, structured commands) and they are 10x faster and 10x more reliable.

Build your system around structured tools. Keep computer use in the toolbox for the 5% of cases where nothing else works. And invest in the verification loop, because that is what turns a 70% success rate into a 95% success rate.
