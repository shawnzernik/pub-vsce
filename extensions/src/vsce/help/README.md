# Help VSCode Webview Folder

This folder contains the implementation of the Help webview for the Aici VS Code extension.

## Purpose

- Provide static and interactive help content within a dedicated webview panel.
- Handle simple command and message interactions between webview and extension host.
- Display licensing, key bindings, and configuration instructions.

## Idiomatic Patterns

- Use a dedicated `HelpExtension` class registering command and webview.
- Use a `PostMessageServer` for handling incoming messages and replies.
- Provide user-friendly documentation with embedded links and formatting.

## Best Practices

- Keep help content updated with extension features and version changes.
- Use React or simple static markup as appropriate for rendering.
- Support commands to open help from various contexts.

## Design Rationale

- Separate help UI from main chat or settings to reduce complexity.
- Facilitate extension maintenance by centralizing help content.

## Anti-patterns to Avoid

- Avoid embedding dynamic secret or config info.
- Avoid complex or heavyweight UI in help panel.

---

*Maintain documentation as help content evolves.*