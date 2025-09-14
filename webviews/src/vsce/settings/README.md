# Settings VSCode Webview Folder

This folder contains components for the Settings webview UI in the Aici VS Code extension.

## Purpose

- Provide a UI for managing AI configuration settings and secret keys.
- Support live loading and saving of settings via post message communication.
- Allow editing of API endpoints, model selections, retry counts, and ignore patterns.
- Enable secure entry and storage of the AI key using VS Code SecretStorage.

## Idiomatic Patterns

- Use React for declarative UI components with typed state and props.
- Use autosizing textareas to improve UX for multiline inputs.
- Parse multiline strings into arrays on save for settings.
- Use post message clients and servers to separate UI from extension backend logic.

## Best Practices

- Do not expose AI keys or secrets in plain text or config files.
- Validate numeric inputs and provide sane defaults.
- Persist non-secret settings to workspace `settings.json`.
- Provide user feedback on save actions.

## Design Rationale

- Use dedicated webview rather than native VS Code settings to enable secure secrets storage.
- React components layout promotes maintainability and extensibility.
- Decouples UI state from extension API interactions.

## Anti-patterns to Avoid

- Avoid storing secrets in unencrypted configuration files.
- Avoid mixing UI and business logic directly.
- Do not block UI during async saves or loads.

---

*Update this documentation as settings UI evolves and functionality expands.*