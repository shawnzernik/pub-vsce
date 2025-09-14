# Webviews Folder

This folder contains React-based UI webviews for the Aici extension, including chat, help, and settings.

## Purpose

- Provide rich interactive front-end interfaces using React and VS Code webview APIs.
- Implement chat UI supporting AI conversations, message editing, and attachments.
- Provide help and settings UI components with live configuration bindings.
- Manage post message communication between webview and extension backend.

## Idiomatic Patterns

- Use React class components for UI with typed props and state.
- Employ specialized reusable components such as Buttons, Flex, Select, TextArea.
- Use post message clients to handle incoming extension messages and dispatch UI state updates.
- Auto-size textareas and maintain VS Code native theme and accessibility.
- Bind webpack bundles dynamically with content security policies.

## Best Practices

- Keep state immutable via deep copies to avoid side-effects.
- Manage streaming message updates to display partial AI responses.
- Devise robust save and reset handlers for conversation editing.
- Securely handle snippet saving request and file system access through extension APIs.

## Design Rationale

- Separation of concerns between UI and extension logic via messaging.
- Use React for component lifecycle and rendering optimizations.
- Facilitate easy maintenance by grouping UI components into a reusable `components` folder.

## Anti-patterns to Avoid

- Avoid manipulating DOM outside React lifecycle methods.
- Do not embed sensitive settings or keys in front end code.
- Avoid synchronous operations blocking UI thread.

---

*Keep this document updated with UI architecture changes.*