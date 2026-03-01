---
layout: post
title: "The Three Layers of Evals We Run"
description: "Fast unit checks, end to end scenario suites, and human-in-the-loop dogfooding: three layers that keep an agent system honest."
date: 2026-02-28
---

If you build anything with an LLM in the loop, you eventually learn the same lesson: you are not shipping a model, you are shipping a *system*.

The system has prompts, routing, tool wrappers, sandboxes, memory, approvals, retries, timeouts, UI, and a pile of “small” engineering decisions that quietly determine whether it works.

That means your evals cannot be a single scoreboard.

We run three layered evals. The goal is not academic benchmarking. The goal is simple: catch regressions early, understand failures quickly, and make sure improvements generalize instead of overfitting to a handful of demo tasks.

## Layer 1: Unit evals (fast, deterministic, local)

**What it is:** tight tests for components that should behave predictably.

Think:

- tool input validation
- output parsing and normalization
- permission gating and approval token logic
- context compaction and truncation
- routing rules ("when the user asks for X, choose tool Y")
- prompt templates (structure, required fields, schema compliance)

**Why it exists:** these are the parts of an agent stack where failures are *usually not model capability problems*. They are engineering bugs. You want them to fail loudly and immediately.

**How we run it:** quick CI and local runs. Low variance. High signal. If a unit eval fails, it’s almost always actionable within minutes.

**What it catches best:**

- breaking changes in tool schemas
- fragile parsing
- accidental prompt edits
- regressions in guardrails

This layer is your “no excuses” safety net.

## Layer 2: Integration and scenario evals (end to end, tool-in-the-loop)

**What it is:** realistic tasks that exercise the full agent loop: plan, call tools, observe, recover, and finish.

Examples of scenario tests:

- “find relevant files, edit them, run tests, iterate until green”
- “draft an email reply based on thread context, create a draft, send it”
- “schedule a meeting, respecting calendar constraints”
- “investigate an error log, apply a fix, rerun the command”

These are not unit tests. They are closer to flight simulators.

**Why it exists:** a lot of regressions live in the *composition* of parts.

- a tool wrapper returns slightly different output and the model’s next step breaks
- a retry policy interacts with a timeout
- the model makes the right plan but gets derailed by a noisy tool result
- context grows, compaction triggers, and a crucial detail disappears

**How we score it:** not just pass/fail. We track:

- completion rate
- number of tool calls
- time to completion
- common failure modes (permission denied loops, lost state, wrong tool choice)

**What it catches best:**

- "it worked yesterday" breakages
- brittle multi-step behavior
- failure recovery regressions
- context management bugs that only appear after many steps

This layer is where you discover whether your system is coherent.

## Layer 3: Human-in-the-loop evals (dogfooding, live friction, real stakes)

**What it is:** using the agent in real workflows with approvals, real accounts, real constraints, and real interruptions.

This is where the truth shows up:

- the user changes their mind mid-run
- the “right” answer is technically correct but socially wrong in tone
- UI affordances shape whether a tool is used properly
- edge cases in permissions happen on real machines, not in CI

**Why it exists:** automated evals can tell you whether the agent *can* do a task. Dogfooding tells you whether the agent is something you actually want to *live with*.

A few things we look for deliberately:

- Are approval prompts understandable in one glance?
- Does the agent ask for the right clarifications, at the right time?
- When it gets stuck, does it degrade gracefully or thrash?
- Do we trust it enough to let it run longer?

**What it catches best:**

- product issues disguised as “model problems”
- trust regressions
- UX friction
- miscalibrated autonomy (too timid or too reckless)

This layer is also where you find the missing evals: any repeated annoyance becomes a candidate for a new scenario test or a new unit test.

## Why three layers instead of one

A single eval suite creates perverse incentives.

- If it is too small, you overfit.
- If it is too big, it runs too slowly and stops getting run.
- If it only measures final answers, you miss tool and workflow regressions.

Layering fixes this:

- **Unit evals** keep the core primitives stable.
- **Scenario evals** keep the system behavior stable.
- **Human-in-the-loop** keeps the product honest.

The trick is to let failures flow “downhill.”

When dogfooding finds a problem, you turn it into a scenario. When a scenario failure is traceable to a primitive, you turn it into a unit test. Over time, the whole stack gets less surprising.

## The meta point

As agents get more capable, the primary failure mode shifts.

It is less “the model is dumb” and more:

- the system leaked state
- the tool contract drifted
- the approval boundary was unclear
- the context got compacted at the wrong time

Three layered evals are how you keep making progress without breaking everything every week.
