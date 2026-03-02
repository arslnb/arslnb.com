---
layout: post
title: "Tool runtime config: policy, hooks, and context budgets"
description: "A diff-driven tour of Zeus's new tool runtime config layer: allowlists, provider-specific tool policies, hook points, and tool result budgeting."
date: 2026-03-02
---

I shipped a chunk of infrastructure in Zeus this week that I have wanted for a long time: a **runtime config layer for tools**.

If you have ever built an agent loop, you know the failure mode: you add tools, you add providers, you add evals, and pretty soon the tool layer is a hairball of one-off flags.

This diff is the opposite move. It is a single place to answer:

- *Which tools are allowed for this run?* (globally, and per provider)
- *How big are tool results allowed to be?* (and how do we cap them)
- *Can I inject small bits of behavior around model selection, prompt building, or tool execution?*

This post is a diff tour of what changed and why.

## The problem: tool sprawl without a runtime contract

In early versions of Zeus, tools were mostly static. The loop handed the model a fixed list of tool schemas and hoped for the best.

That breaks down once you need any of these:

- a **“minimal” profile** for constrained runs (readonly-ish debugging)
- a **provider-specific tool subset** (some models are better with fewer tools)
- a way to **turn on hooks** for experiments without rebuilding the binary
- **predictable budgets** for tool outputs so the prompt does not explode

The diff adds three files that together act like a runtime contract for tools:

- `llm/tool_runtime_config.py`
- `llm/tool_policy_pipeline.py`
- `llm/tool_hook_pipeline.py`

And then it wires them into the loop and tool dispatcher.

## 1) Tool runtime config: defaults + normalization

The core is `tool_runtime_config.py`. It defines a default config and a normalizer that is deliberately strict. If the config is missing or malformed, it snaps back to defaults.

A few things I like about this design:

### A. There is a default per-tool envelope

A tool like `shell` has a natural set of runtime tunables:

```python
"shell": {
  "max_result_chars": 40_000,
  "timeout_sec": 20,
  "security": "full",
  "ask": "off",
  "yield_ms": 10_000,
  "safe_bins": [],
}
```

Same for `web_fetch` (timeouts, redirect limits, cache TTL, readability) and for `read` and `apply_patch` (input limits).

The important bit is not the exact numbers. It is that **every tool now has a place where its runtime knobs live**.

### B. Normalization is copy-on-write, with clamping

The normalizer does a deep copy of defaults, then merges user-supplied overrides, but clamps obvious footguns:

- integer fields have min/max bounds
- string lists are de-duplicated
- hooks are normalized into dict entries

This sounds boring, but it is the difference between a “config file” and a config system you can actually ship.

## 2) Tool policy pipeline: filtering the tool set

`tool_policy_pipeline.py` implements a small but crucial feature: take a list of tool schemas, and filter it down according to a policy block.

There are two layers of policy:

1. **Global policy**
2. **Provider override** (eg “grok gets minimal tools, claude gets full tools”)

The code resolves an `available` tool name set from the schemas, applies:

- `profile` (eg `minimal`)
- `allow` (hard set)
- `also_allow` (union)
- `deny` (subtract)

Then returns a filtered schema list plus some debug metadata.

### The “minimal” profile is explicit

Right now the predefined toolsets are intentionally small:

```python
"minimal": {
  "read",
  "file_search",
  "web_fetch",
  "web_search",
  "memory",
  "knowledge",
  "ask_user",
}
```

This is not security. It is operational: sometimes you want a run that cannot mutate anything. (And it is a clean way to reproduce failures in evals.)

## 3) Hook pipeline: experiment without forking the loop

The other half of “runtime control” is hooks.

`tool_hook_pipeline.py` adds four phases:

- `before_model_resolve` (provider or model selection)
- `before_prompt_build` (system prompt patching)
- `before_tool_call` (block tool, merge input, inject context)
- `after_tool_call` (append a note, set a field, truncate)

Hooks are intentionally **non-fatal**. If a hook throws, Zeus records a warning and keeps going.

A couple of patterns that already feel useful:

### A. Provider forcing

You can force a provider/model from config without touching code:

- `set_provider`
- `set_model`
- `set_provider_and_model`

This is the kind of thing you want for eval harnesses and A/B testing.

### B. Tool blocking at runtime

In `before_tool_call`, you can block a specific tool (or all tools) with a message:

- `block_tool`

This gives you a way to temporarily “pull the plug” on a tool in production while keeping the rest of the agent usable.

### C. Light input patching

`merge_input` is a small hammer that goes a long way. You can inject a timeout, change a parameter, or nudge a tool into a safer mode.

## 4) Tool result budgeting: context share ratio

The agent loop also got a concrete improvement: tool result sizes are now capped by a mix of:

- per-tool `max_result_chars`
- and a global `result_context_share_ratio`

The logic (in `loop.py`) is basically:

1. take the tool's hard cap
2. compute a share of the model's context window
3. clamp the share between a minimum and the hard cap

This is the difference between “the agent sometimes goes off the rails when `rg` returns 200k chars” and “tool outputs are predictable”.

I defaulted the ratio to ~0.22 and the minimum to 1200 chars. The specific numbers are easy to tune once you have the mechanism.

## 5) Why this matters

This diff is not flashy. But it unlocks a bunch of engineering moves:

- ship new tools without adding ad-hoc config flags
- run evals under strict tool profiles
- do provider-specific toolsets without branching schemas
- patch system prompts in a controlled way
- keep the loop stable under large outputs

It is also a step toward a clean separation:

- the loop is the loop
- the tools are the tools
- the runtime config defines the envelope they run inside

That separation is what makes an agent system maintainable.

## Appendix: the three new files

- `apps/client-mac/zeus/Resources/server/llm/tool_runtime_config.py`
- `apps/client-mac/zeus/Resources/server/llm/tool_policy_pipeline.py`
- `apps/client-mac/zeus/Resources/server/llm/tool_hook_pipeline.py`

If you want to play with this yourself, the implementation is small enough to read end-to-end.
