# dsh-subagent-catalog

A session-header control for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web client that lists every subagent beneath the current session. Running subagents come first, and each row states the model and reasoning effort that subagent actually uses.

## Install

```sh
dsh plugin --profile web add dsh-subagent-catalog
```

Then restart `dsh web`: the profile is composed at startup, so a new row takes effect on the next boot.

## What it does

The plugin contributes one control to the public `conversation.session.header.actions` slot. It adds no host code, no RPC, and no session-log event: every fact it shows already reaches the browser through the session list.

- **Running first** — siblings are ordered running-first, then by session id, so a refresh only moves a row when its activity actually changes.
- **Model and reasoning effort** — read from the durable `modelSelection` projection. `lastUsed` is what a recorded request used; `next` may be a choice the session has not requested with yet, so such a row is labelled `Selected` or `Next` and never described as something that already happened. A subagent with no usable record says so instead of implying an inherited model.
- **Depth** — descendants are listed in pre-order with an indentation and guide line per level.

Information is separated by structure rather than colour alone: a state mark distinguishes running from idle, the title line carries identity, and a badge line carries the model facts with one tone per meaning.

## Requirements

- A dsh build whose web profile exposes the `conversation.session.header.actions` slot and the shared client primitives (`@deepseek-ai/dsh-client-ui-primitives`).
- The browser half resolves `react`, `react-dom`, and the primitives from the shell's module table; nothing else is required at runtime.

## Known limitations

- The control is a second entry point; it does not modify the catalog dropdown that `@deepseek-ai/dsh-client-ui-subagent` renders in the session header. That dropdown's rows are a private implementation behind a `single` slot, so an out-of-tree plugin cannot change them.
- It lists and opens subagents; it does not offer the native dropdown's tree expansion or its "open in sidebar" action.
- One-shot subagents carry no model fields in their durable descriptor, so model information depends entirely on the `modelSelection` projection and shows as unrecorded until that projection reaches the client.

## License

MIT
