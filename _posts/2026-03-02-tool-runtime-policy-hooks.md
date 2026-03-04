---
layout: post
title: "Runtime Contracts"
description: "What changed when we added runtime contracts to Zeus: clearer boundaries, safer experiments, and more reliable agent behavior."
date: 2026-03-02
---

The biggest lesson from building [Zeus](/zeus/) is simple:

> agent reliability is mostly a systems problem, not a model problem.

Two recent changes made this obvious:

1. A TUI for running and observing the system.
2. A runtime contract for tools (policy, hooks, context budgets).

Neither change is flashy. Both are high leverage.

---

## Learning 1: Interfaces change engineering quality

A GUI is great for everyday use. It is not great for debugging and reproducibility.

Adding a TUI changes how the team works:

- You can reproduce issues with exact commands.
- You can observe state transitions live.
- You can run scenarios in CI and headless environments.
- You can gather traces without clicking through UI flows.

The implication: the agent stops being “an app feature” and becomes an actual runtime you can operate.

## Learning 2: Tool policy is the fastest reliability lever

When the model sees too many tools, it thrashes:

- bad tool selection
- unnecessary calls
- noisy context
- unstable behavior across providers

Policy fixes this by reducing the model’s branching factor.

The important idea is not “more config.” It is **explicit capability boundaries per run**:

- which tools are visible
- which are blocked
- which profile applies in this environment

That gives you repeatability. The same input now means roughly the same tool universe.

## Learning 3: Hooks make experiments safe

Hooks matter because they let you change behavior without editing the core loop.

The key is failure handling: hook failures should degrade to warnings, not crash runs.

Why this matters in practice:

- you can hot-block a broken tool during incidents
- you can inject instrumentation temporarily
- you can ship experiments behind narrow seams

This lowers the cost of experimentation and shortens time-to-fix.

## Learning 4: Context budgets protect reasoning quality

Most “model got worse” bugs are actually context quality bugs.

Large tool outputs silently damage later reasoning.

A budget ratio fixes this more reliably than a fixed cap:

- a small-context model and a large-context model both get sane behavior
- one giant tool result cannot dominate prompt construction
- compaction is less likely to drop critical state

Together with policy and hooks, budgets create predictable runs instead of “it worked yesterday” runs.

## Why this is important

These changes are really about engineering leverage:

- **Faster iteration:** you can test behavior in controlled modes.
- **Safer operations:** you have runtime levers during incidents.
- **Cleaner scaling:** multiple providers and tools stop feeling chaotic.
- **Better evals:** test conditions become explicit and repeatable.

Without these boundaries, every new capability increases uncertainty.

With them, every new capability can be added with known blast radius.

## The practical takeaway

If you are building agent infrastructure, treat this as baseline:

1. Give the system an operator interface (TUI/CLI), not only a GUI.
2. Define a runtime contract for tool visibility and behavior.
3. Add hooks only at stable seams, and make them non-fatal.
4. Budget tool output as a share of context, not an arbitrary fixed number.

This is less exciting than model demos, but it is the difference between a cool prototype and a system you can trust in production.
