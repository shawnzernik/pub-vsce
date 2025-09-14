# Workflows Folder

This folder contains AI-driven workflows that implement various automated tasks using AI LLM calls.

## Purpose

- Implement stepwise AI workflows for update, commit, plan, and related operations.
- Provide a base class `WorkflowBase` defining common lifecycle and helpers.
- Use workflows to manage prompt generation, AI requesting, response parsing, and file/command execution.

## Idiomatic Patterns

- Use `create()` static factory methods for initialization.
- Use `sendRequest()` to run workflows asynchronously with deep copies of requests.
- Implement `execute()` abstractly to contain core logic per workflow.
- Use updater callbacks for real-time metrics and partial message updates.
- Manage retry and error reporting within workflows.

## Best Practices

- Keep prompt files in `prompts/` subfolder and load from resources.
- Always deep copy mutable objects before mutation.
- Handle AI JSON output parsing robustly with fallback corrections.
- Integrate metrics updates with UI through streaming response handlers.

## Design Rationale

- Modular workflow design supports extensibility and addition of new workflows.
- Base class encapsulates common logic to reduce code duplication.
- Use of typed messages and metrics improves reliability and maintainability.

## Anti-patterns to Avoid

- Avoid mutating input requests directly; always work on copies.
- Don’t embed prompt strings directly in code logic outside prompt files.
- Avoid swallowing errors silently; report via assistant messages.

---

*Keep this guide updated as workflows change and expand.*