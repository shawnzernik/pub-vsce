# VSCode Extension (VSCE) Folder

This folder contains the components related to the VS Code extension UI including webviews, custom editors, and post message communication.

## Purpose

- Implement custom editors and webview panels for features like chat, help, and settings.
- Handle bi-directional messaging between VS Code extension host and webview React components.
- Provide reusable base classes for extension activation and message handling.
- Define commands, keybindings, and menus in the extension manifest.

## Idiomatic Patterns

- Use `BaseExtension` and `BasePostMessageServer` as foundational classes to reduce boilerplate.
- Isolate post message handling logic per feature in dedicated `PostMessageServer` classes.
- Use React for front-end UI with strictly typed message clients.
- Bind webpack bundles dynamically and secure content using Content-Security-Policy headers.
- Use event-driven updates of conversation and settings data.

## Best Practices

- Register commands and webview providers in the main extension activation.
- Handle multiple editors per document carefully with event subscriptions.
- Store snapshots and apply edits through the VS Code Custom Editor API.
- Protect secrets by excluding API keys from UI code.
- Provide consistent UX with key bindings and command palette integration.

## Design Rationale

- Separate UI concerns from business logic by decoupling workflows from extension messaging.
- Enable incremental UI updates via streaming message handlers.
- Leverage VS Code APIs fully to provide rich editor experiences.
- Facilitate extensibility and maintainability with modular design.

## Anti-patterns to Avoid

- Avoid mixing synchronous and asynchronous message handlers to prevent deadlocks.
- Do not embed secrets or API keys in the front end.
- Avoid direct DOM manipulation outside React lifecycle.
- Do not circumvent VS Code API for file system writes or configuration.

---

*Keep this documentation up to date as UI components evolve.*