---
layout: post
title: "Three Layers of Evals"
description: "A personal account of how we test Zeus day to day: fast unit checks, end to end scenarios, and dogfooding, plus the metrics we watch and the CLI commands I use." 
date: 2026-02-28
---

I used to think “evals” meant *a benchmark*.

Now I think of evals as a feedback system that lets me change an agent stack without constantly wondering if I just broke something subtle.

In Zeus, we run three layers of evals:

1. **Unit evals**: fast, deterministic checks on primitives.
2. **Scenario evals**: end to end tasks with tools in the loop.
3. **Dogfooding**: human-in-the-loop use on a real machine, with real permissions, real interruptions, real social consequences.

This post is the personal, non-marketing version: what I run, what I measure, and what I’ve learned the hard way.

## The rule: failures flow downhill

When something annoys me in dogfooding, I try to turn it into a scenario. If the scenario failure is clearly a primitive bug, I turn it into a unit test.

Over time, the expensive “human found it” failures get converted into cheap, fast failures.

That’s the whole game.

---

## Layer 1: Unit evals (fast, deterministic, boring)

Unit evals are where I test things that should not require model “creativity”:

- tool schemas and validation
- parsing and normalization (tool outputs, timestamps, ids)
- routing rules (“user asked X → we should choose tool Y”)
- prompt templates (required fields, structure, JSON schema compliance)
- context compaction (does it drop the right things, keep the right things)

If these fail, I want it to fail in under a minute with an error message I can act on.

### How I run it (no UI)

Locally, I run unit evals from the repo root.

```bash
# run fast checks
make eval-unit

# or a narrower target when I'm iterating
make eval-unit TEST=tool_schema
```

(Exact targets change as the repo evolves, but the intent is consistent: **tight loop, low variance**.)

### Metrics I actually care about here

Unit evals are mostly pass/fail, but there are still a couple numbers I watch:

- **flake rate**: if a unit test flakes, I treat it as broken
- **runtime**: if the suite creeps past a couple minutes, people stop running it
- **error locality**: failures should point to one module, not “something somewhere in the agent”

What unit tests buy me is *confidence to refactor*. If I’m scared to touch the code, I don’t ship.

---

## Layer 2: Scenario evals (end to end, tool-in-the-loop)

Scenario evals are the closest thing we have to a flight simulator.

A scenario is a real task, with the full loop:

- plan
- call tools
- interpret results
- recover from failure
- finish with the artifact we wanted

Examples I regularly use:

- “find relevant files, patch them, run tests, iterate until green”
- “read an email thread, draft a reply, create a Gmail draft”
- “schedule a meeting respecting calendar constraints”
- “investigate a failing command, apply fix, rerun”

### How I run it (no UI)

This is the stuff I run before I push big changes.

```bash
# run the main scenario suite
make eval-suite

# compare current branch vs main on the full suite
make eval-suite-compare-full

# run a single scenario while iterating
make eval-scenario SCENARIO=calendar_schedule
```

Scenario runs are where you discover the weird composition bugs:

- a tool wrapper output changed slightly, and the next step derails
- retries interact with timeouts and you get a loop
- context grows, compaction triggers, a key detail gets dropped
- the agent chooses the wrong tool and then rationalizes its way forward

### Metrics we measure (and why)

Pass/fail is not enough. When something regresses, I want to know *how*.

Here are the numbers I care about and what they tell me:

- **Task success rate**: obvious, but you need it as a headline.
- **Step count / tool calls per task**: efficiency, but also a proxy for thrash.
- **Time to completion**: catches slow degradation and “it technically works but takes forever.”
- **Retry count**: rising retry counts usually mean a brittle tool contract.
- **Permission/approval incidents**: loops like “permission denied → try again” are a real failure mode.
- **Invalid tool calls**: schema mismatches, missing required fields, wrong types.
- **Recovery rate**: when a tool fails once, does the agent recover or spiral.

A lot of my improvements come from staring at a failure and asking:

> could I have detected this earlier with a smaller, cheaper test?

That question is basically my eval roadmap.

---

## Layer 3: Dogfooding (human-in-the-loop, real stakes)

Dogfooding is where the truth is.

Automated evals can tell you if the agent *can* complete tasks. Dogfooding tells you if the agent is something you actually want to *live with*.

This is where all the “not in the benchmark” stuff shows up:

- I change my mind mid-run
- I’m multitasking and come back 10 minutes later
- a permission prompt appears and the wording matters
- the answer is technically correct but socially wrong (tone, context, intent)
- I need the agent to stop, summarize, and ask a single sharp question

### What I watch during dogfooding

These aren’t clean metrics, but they’re the real ones:

- **trust**: do I let it keep running, or do I stop it early
- **clarification quality**: does it ask the right question at the right time (not 5 questions)
- **approval UX**: can I approve in one glance without reading a wall of text
- **stuck behavior**: does it degrade gracefully or thrash
- **state handling**: does it remember what we’re doing without hallucinating continuity

### Turning dogfooding pain into evals

Every repeated annoyance gets converted:

- If it’s a repeatable workflow: add/extend a **scenario**.
- If it’s a primitive contract issue: add a **unit** test.

That’s how “random frustration” becomes “a regression we never ship again.”

---

## What changed my mind about evals

The biggest shift: as the model gets more capable, the primary failure mode moves.

It’s less “the model is dumb” and more:

- the system leaked state
- the tool contract drifted
- an approval boundary was unclear
- context got compacted at the wrong time
- a retry policy turned a transient error into a loop

Three layers is how I keep shipping without breaking everything every week.

And the personal truth is: I don’t want evals because I like measurement.

I want evals because I like sleeping.
