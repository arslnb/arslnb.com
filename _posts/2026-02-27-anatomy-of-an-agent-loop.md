---
layout: post
title: "Agent Loop"
description: "Tool-calling loops, context management, error recovery, and the engineering that turns a chat completion into an autonomous system."
date: 2026-02-27
---

Most people building with LLMs stop at the chat completion API. You send a message, you get a response. But the interesting systems -- the ones that actually do work -- are built around a loop. A real agent loop, where the model calls tools, observes results, and decides what to do next, indefinitely, until the task is done or something blocks it.

I spent the last year building one. Here is what I learned.

## The core abstraction

An agent loop is conceptually simple. Pseudocode:

```
function run_agent_loop(messages, tools):
    while true:
        response = call_model(messages, tools)

        if response.stop_reason == "end_turn":
            return response.text

        if response.stop_reason == "tool_use":
            for tool_call in response.tool_calls:
                result = execute_tool(tool_call.name, tool_call.input)
                messages.append(tool_result(tool_call.id, result))

        messages.append(assistant_message(response))
```

That is the skeleton. It fits on a whiteboard. But every real system I have seen diverges from this in at least six important ways, and the divergences are where the actual engineering lives.

## Divergence 1: No round cap

The naive approach is to set a maximum number of rounds. "Run for at most 10 tool calls." This is a mistake. Real tasks -- installing dependencies, debugging build errors, writing five files -- can easily require 30, 50, 100 tool calls. If you cap the loop, the model hits a wall mid-task and returns a half-finished answer.

The correct design is to run until the model explicitly says it is done (stop_reason == "end_turn") or until it is cancelled externally. No artificial ceiling.

```python
# Bad
for i in range(MAX_ROUNDS):
    response = call_model(messages, tools)
    ...

# Good
while True:
    response = call_model(messages, tools)
    if response.stop_reason == "end_turn":
        break
    ...
```

## Divergence 2: Safe points and cancellation

If the loop runs indefinitely, you need a way to interrupt it. But you cannot just kill the loop at any point -- you might be mid-tool-execution, holding a file handle, or halfway through an API call.

The solution is safe points. You drain an inbox of control events at well-defined stages:

```
function drain_safe_point(run_id, messages, stage):
    events = inbox.drain(run_id)
    for event in events:
        if event.type == "CANCEL":
            return CANCELLED
        if event.type == "PAUSE":
            wait_until_resumed_or_cancelled(run_id)
        if event.type == "USER_STEER":
            messages.append(user_message(event.text))
    return OK
```

You check this before calling the model, after the model returns, and after each tool execution. Three safe points per round. This gives you clean cancellation semantics without race conditions.

The inbox itself is a bounded per-execution queue. Control events (cancel, pause, resume) are high priority. User steers (follow-up messages injected mid-run) are normal priority. Telemetry is low priority.

## Divergence 3: Approval gates

Some tools are dangerous. Sending an email. Deleting a file. Running a shell command that modifies the filesystem. You need an approval system.

The pattern looks like this:

```
if tool_requires_approval(tool_name):
    approval = await approval_callback(tool_name, tool_input)
    if approval.denied:
        result = "approval_denied"
        continue
    if approval.cancelled:
        return CANCELLED
    token = approval.token
    validate_and_consume_token(token, run_id, tool_name)
```

The key insight: approval tokens are single-use. You generate a token when the user approves, validate it before execution, and consume it atomically. This prevents replay attacks where a stale approval is reused for a different invocation.

You also need a retry path. When a sandboxed command fails with permission denied, the loop can request expanded permissions, get a new approval, and retry the same tool call with augmented scope. One retry, not infinite.

## Divergence 4: Context window management

Long-running loops accumulate messages. Tool results can be enormous -- a web page fetch might return 80K characters. Eventually you hit the context window limit.

Two mechanisms handle this:

**Truncation at the tool level.** Every tool result is capped at a fixed character limit before it enters the message history. In practice, 80K chars per tool result is generous enough for most use cases while keeping the window manageable.

```python
MAX_TOOL_RESULT_CHARS = 80_000

result_str = truncate_with_marker(result_str, MAX_TOOL_RESULT_CHARS)
```

**Compaction on overflow.** When the model returns a context-window-exceeded error, the loop compacts older messages into a bounded summary and retries. You keep the most recent N messages verbatim and summarize everything before them into a single text block.

```
function compact_messages(messages, reason):
    tail = messages[-KEEP_TAIL:]
    older = messages[:-KEEP_TAIL]
    summary = summarize(older, max_chars=12000)
    return [system_message(summary)] + tail
```

This gives you a maximum of two compaction attempts before giving up. If two compactions are not enough, the task was probably too large for a single run.

## Divergence 5: CRM enforcement

If your agent sends messages to people (email, iMessage), you need to ensure it records the interaction in your CRM. The naive approach is to trust the model to remember. The correct approach is to enforce it at the loop level.

```
pending_crm_updates = 0

for tool_call in response.tool_calls:
    result = execute(tool_call)
    if tool_call.name == "send_imessage" and result.status == "sent":
        pending_crm_updates += 1
    if tool_call.name == "people_record_interaction" and result.ok:
        pending_crm_updates -= 1

if response.stop_reason == "end_turn" and pending_crm_updates > 0:
    messages.append("You must call people_record_interaction before ending.")
    continue  # force the loop to keep going
```

The loop literally refuses to terminate until the CRM write-back is complete. The model cannot end its turn with pending outbound communication that has not been recorded.

## Divergence 6: Streaming with tool interleaving

Users expect to see text as it is generated, not after the entire loop completes. But the model alternates between text output and tool calls, sometimes in the same response.

The pattern is an async generator that yields incremental steps:

```python
async def run_tool_loop(messages, tools):
    while True:
        async with model.stream(messages, tools) as stream:
            accumulated = ""
            async for event in stream:
                text = extract_text_delta(event)
                if text:
                    accumulated += text
                    yield {"text": accumulated, "is_final": False}

            response = await stream.get_final_message()

        if response.stop_reason == "end_turn":
            yield {"text": accumulated, "is_final": True}
            return

        for tool_call in response.tool_calls:
            yield {"tool_activity": describe(tool_call)}
            result = await execute(tool_call)
            messages.append(tool_result(result))
```

Each yield is a step: partial text, a tool activity indicator, a tool output preview, or a final response. The consumer (your UI) renders these incrementally. The user sees "Searching the web for X" while the tool runs, then sees the response stream in real time.

## The meta-lesson

The skeleton of an agent loop is trivial. The engineering is in the six divergences above, plus a hundred smaller details: how you handle model fallbacks when a model name is not found, how you strip inline images when a provider does not support them, how you manage per-execution sandbox state, how you route between Anthropic and OpenAI-compatible providers with the same loop structure.

Every one of these details is a lesson learned from a production failure. The loop looks simple on a whiteboard because the complexity is distributed across the edges.

If you are building an agent system, start with the simple loop. Then let your production traffic teach you which divergences matter for your use case. Do not over-engineer upfront. But do not be surprised when the loop file grows to 3,000 lines.
