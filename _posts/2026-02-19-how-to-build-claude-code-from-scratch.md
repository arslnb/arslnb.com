---
layout: post
title: "Building a Code Agent from Scratch"
description: "System prompts, tool definitions, sandboxed execution, and the seven layers of architecture behind a production code agent."
date: 2026-02-19
---

Claude Code, Cursor, Windsurf, Aider -- all of these are, at their core, the same architecture. A tool-calling loop wrapped around a code-aware system prompt with filesystem access. I built something similar from the ground up. Here is the blueprint.

## The architecture in one sentence

A persistent daemon that takes natural language input, builds a system prompt with runtime context, calls a language model with tool definitions, executes the tool calls in a sandboxed environment, and loops until the model says it is done.

That is it. Everything else is details.

## Layer 1: The process model

You need two processes:

1. **A UI layer** that handles user interaction (text input, rendering responses, managing settings).
2. **A runtime daemon** that does the actual work (model calls, tool execution, persistence).

These communicate over a local RPC boundary. In my case it is gRPC over localhost, but a simple HTTP API or Unix socket works fine.

```
UI (Swift/Electron/Terminal)
    |
    | gRPC / HTTP
    |
Daemon (Python)
    |-- communicator (handles RPC)
    |-- task_manager (routes work to agent loops)
    |-- tool_loop (model + tool execution)
    |-- sandbox (process isolation)
    |-- persistence (SQLite)
```

The key principle: UI and runtime are fully decoupled. The daemon owns all state. If the UI crashes, nothing is lost.

## Layer 2: The system prompt

The system prompt is not a static string. It is assembled at runtime from several sources:

```python
def build_system_prompt():
    parts = []
    parts.append(IDENTITY_BLOCK)        # who you are, what you do
    parts.append(runtime_context())      # timestamp, OS, hostname, python version
    parts.append(BEHAVIOR_BLOCK)         # operational rules
    parts.append(load_soul())            # personality/voice (from SOUL.md)
    parts.append(load_user_memory())     # persistent user profile (from USER.md)
    parts.append(build_tools_block())    # XML-formatted tool inventory
    parts.append(mcp_discovery_hint())   # MCP server catalog location
    parts.append(build_skills_block())   # installed skill summaries
    return "\n\n".join(parts)
```

The runtime context block is surprisingly important. Without it, the model does not know what OS it is on, what time it is, or what Python version is available. These matter for generating correct shell commands.

The user memory block (`USER.md`) is a concise, continuously-updated profile. It is not the full memory -- it is a summary. Deeper memory is available on-demand through a `recall_memories` tool, so the prompt stays within a stable token budget.

## Layer 3: Tool definitions

Tools are the interface between the model and the real world. Each tool is a JSON schema:

```python
TOOLS = [
    {
        "name": "bash_executor",
        "description": "Run shell commands in a sandbox...",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string"},
                "cwd": {"type": "string"},
                "timeout_sec": {"type": "integer"},
                "allow_network": {"type": "boolean"},
            },
            "required": ["command"],
        },
    },
    # file_read, file_search, text_editor, web_fetch, ...
]
```

The minimum viable tool set for a code agent:

- `bash_executor` -- run shell commands
- `file_read` -- read files (preferred over cat/head/tail)
- `file_search` -- ripgrep-based search
- `text_editor` -- write/replace/append/delete/move files

That gets you surprisingly far. Add `web_fetch` and `web_search` and you have a general-purpose agent.

The tool registry is rebuilt at the start of each run but stays stable within a run. This matters for prompt caching -- if the tool list changes mid-run, you invalidate the cache prefix.

## Layer 4: The sandbox

Every `bash_executor` call runs inside a macOS Seatbelt sandbox. The profile strategy is `(allow default)` with targeted denies:

```scheme
(version 1)
(allow default)

; Deny all file writes, then re-allow specific paths
(deny file-write* (with message "ZEUS_CMD_abc123"))
(allow file-write*
    (subpath "/Users/me/project")
    (subpath "/tmp")
    (subpath "/private/tmp"))

; Deny writes to protected paths even within allowed roots
(deny file-write*
    (subpath "/Users/me/project/.git/hooks")
    (subpath "/Users/me/project/.zshrc"))

; Network: deny all, allow only localhost (when gate is active)
(deny network* (with message "ZEUS_CMD_abc123"))
(allow network-outbound (remote ip "localhost:*"))
```

The profile is generated per-command with a unique log tag. If the command fails with "operation not permitted", the sandbox parser detects the log tag in stderr and knows it was a sandbox denial, not a random permission error.

Mandatory deny paths protect sensitive files (`.git/hooks`, `.bashrc`, `.zshrc`, `.gitconfig`) even inside writable roots. You do not want the model modifying your shell configuration or injecting git hooks.

Network access goes through a separate gate: a local DNS interceptor + HTTP proxy that enforces per-domain approval. LLM API domains are pre-approved. Everything else prompts the user.

## Layer 5: Memory and persistence

State lives in SQLite. Three databases:

```
zeus.sqlite          -- threads, sessions, messages, tasks, approvals
user_learning.sqlite -- learned user preferences and facts
knowledge.sqlite     -- project/world knowledge from web fetches and conversations
```

The memory architecture has clear routing boundaries:

- Facts about the primary user go to `user_learning`
- Facts about other people go to a People CRM (markdown files + SQLite index)
- Project/domain knowledge goes to `knowledge.sqlite`

After each assistant response, an async reflection job reads the conversation and routes any new facts to the appropriate store. `USER.md` is regenerated only when material facts change.

Retrieval is hybrid: BM25/FTS5 for lexical matching plus cosine similarity over embeddings (via sqlite-vec when available). The model calls `recall_memories` or `recall_knowledge` when it decides it needs context -- the system does not pre-stuff the prompt with everything it knows.

## Layer 6: Approval and safety

Every tool has metadata: risk level, tier, required approvals.

```python
def tool_requires_approval(name):
    metadata = get_tool_metadata(name)
    return metadata.get("requires_approval", False)
```

Tools that read the filesystem do not require approval. Tools that write files, send messages, or access the network do. The approval flow:

1. Model requests a tool call.
2. Loop checks if approval is required.
3. If yes, pauses execution and sends an approval request to the UI.
4. User approves or denies.
5. Loop validates the approval token (single-use, scoped to this run and tool).
6. Tool executes.

There are also auto-approval policies: task-scoped (for this specific task, always allow `file_read`) and app-scoped (globally, always allow network to `github.com`). These reduce approval fatigue without removing the safety boundary entirely.

## Layer 7: Subagents

For complex tasks, the main loop can spawn child agents with their own tool loops:

```
Parent agent
    |-- spawn("research", prompt="Find papers on X", tools=["web_search", "web_fetch"])
    |-- spawn("writer", prompt="Write the summary", tools=["text_editor", "file_read"])
    |-- wait(research_id)
    |-- wait(writer_id)
```

Each child runs its own `run_tool_loop()` with a scoped run ID, optional tool allowlist, and an approval callback that auto-denies interactive prompts (children cannot ask the user questions). Results are collected by the parent.

## Putting it together

The full flow for a single user request:

```
1. User types "install numpy and write a test file"
2. Communicator receives gRPC Ask, persists message, enqueues work
3. Task manager creates execution context (inbox, sandbox)
4. run_tool_loop() starts:
   a. Build system prompt (identity + context + user memory + tools)
   b. Load conversation history from SQLite
   c. Call model with streaming
   d. Model returns tool_use: bash_executor("pip install numpy")
   e. Sandbox generates Seatbelt profile, runs pip in sandbox_exec
   f. Tool result appended to messages
   g. Model returns tool_use: text_editor(write "test_numpy.py")
   h. File written to task artifacts directory
   i. Model returns end_turn: "Done. Installed numpy and wrote test."
5. Final response persisted, async reflection job extracts learnings
6. Sandbox destroyed, execution resources cleaned up
```

Each step has error handling, cancellation checks, and approval gates. But the core flow is linear.

## What I would do differently

If I started over:

1. **Start with fewer tools.** `bash_executor` + `file_read` + `text_editor` covers 90% of coding use cases. Add tools only when you find the model reaching for something it does not have.

2. **Use SQLite from day one.** Not files, not Redis, not Postgres. SQLite gives you transactions, FTS5, and zero operational overhead. It is the right default for a local-first system.

3. **Build the sandbox before anything else.** Running model-generated shell commands without isolation is terrifying. The sandbox should be the first thing you build, not the last.

4. **Do not build a triage/routing model.** One model, one loop, one tool set. Routing adds latency and complexity. Let the model decide what to do.

The system described here is roughly 8,000 lines of Python for the daemon, 4,000 lines of Swift for the UI, and took about a year of evenings to build. But the core -- the loop, the tools, the sandbox -- came together in the first two weeks. Everything after that was edge cases.
