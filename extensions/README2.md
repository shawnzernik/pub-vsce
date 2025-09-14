# Extensions Folder

This folder contains the VS Code extension source implementation for the Aici AI Continuous Improvement tool.

## Purpose

- Hosts extension entrypoints, VS Code API integrations, custom editors, and webview components.
- Implements AI workflows, conversation management, configuration, and secret handling.
- Encapsulates complex workflows such as update, commit, and plan driven by AI models.
- Manages launch/debug configurations, building, testing, packaging, and version bumping.

## Idiomatic Patterns

- Use async/await extensively for all VS Code API calls and shell executions.
- Keep secrets in VS Code SecretStorage, never in plaintext config or code.
- Handle errors gracefully during workflow execution by sending messages to conversations.
- Update UI reactively with post message servers and clients.
- Use strong types and deep copying of conversation/request objects to avoid mutation side effects.
- Follow the Factory pattern for workflow creation and extension activation logic.

## Best Practices

- Use unsupported `runtimeExecutable: "${execPath}"` for extensionHost debugging.
- Compose build and watch tasks with dependencies to ensure consistent incremental builds.
- Structure the codebase into logical folders: `llm`, `vsce`, `system`.
- Use JSON5 for forgiving parsing of settings files.
- Optimize incremental updates using message merging techniques.

## Design Rationale

- Separation of concerns between UI (webviews), workflow logic (llm), and system access (system).
- Leverage TypeScript features for maintainable, clear, and robust code.
- Use bundler-generated outputs and run-time path resolution for prompt files.
- Facilitate extensibility with workflow factory and base classes.

## Anti-patterns to Avoid

- Avoid direct mutation of conversation messages arrays.
- Do not store secrets in settings files or source code.
- Avoid blocking UI thread during long running tasks.
- Avoid mixing UI rendering logic with core extension business logic.

---

*Maintain and update this documentation to reflect significant changes in extension architecture.*