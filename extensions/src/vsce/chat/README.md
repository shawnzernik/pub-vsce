# Chat VSCode Webview Folder

This folder contains components implementing the chat custom editor and its related webview for the Aici extension.

## Purpose

- Provide the custom editor and Webview UI for AI chat conversation files (`.convo`).
- Handle real-time communication via post message servers and clients.
- Manage conversation state, updates, streaming responses, and attachments.
- Expose commands and keybindings for user interaction.

## Idiomatic Patterns

- Use VS Code Custom Editor APIs to handle `.convo` files with editable content.
- Implement `PostMessageServer` for backend message handling and logic.
- Use React for the frontend chat interface, including message editing and rendering.
- Implement deep copy and merge semantics to prevent state mutation issues.
- Stream AI responses to display intermediate results to users.

## Best Practices

- Secure API keys and sensitive data using VS Code SecretStorage.
- Ensure all file path manipulations are resolved against repo root.
- Update conversation state only on meaningful content changes.
- Optimize UI responsiveness with selective re-rendering using React lifecycle.

## Design Rationale

- Decouple UI from extension backend using message passing.
- Apply clear separation between data model (Conversation DTOs) and UI rendering.
- Facilitate easy addition of workflows and AI capabilities.

## Anti-patterns to Avoid

- Do not mutate conversation messages directly in place.
- Avoid blocking UI threads with large or synchronous operations.
- Avoid exposing secrets or raw backend state in the front end.

---

*Maintain detailed documentation as chat UI evolves and features expand.*