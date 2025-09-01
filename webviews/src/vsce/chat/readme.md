# Chat Webview – Developer Notes

This document describes the **implementation details**, **data flow**, and **maintenance guidelines** for the chat UI located in `webviews/src/vsce/chat/`.

It is intended to help future maintainers avoid breaking core functionality such as **autoscroll**, **live metrics updates**, and **editing** when making changes.

---

## 📂 File Overview

### `ChatWebview.tsx`
- Main entry point for rendering the chat interface.
- Handles:
  - **Message list rendering** from conversation state.
  - **Metrics display** (Prompt Tokens, Completion Tokens, Seconds, Tokens/sec).
  - **Autoscroll behavior** when new messages arrive.
  - **Streaming updates** from the extension.
  - Header controls for **Help** and **Settings** (top-right icons). Clicking these sends `ui:openHelp` and `ui:openSettings` messages, which the extension handles by opening the appropriate views.

### `Conversation.tsx`
- Receives the conversation data from `ChatWebview`.
- Renders a list of `Message` components.
- Responsible for keeping the correct message order and preserving state during edits.

### `Message.tsx`
- Renders individual chat messages.
- Supports:
  - Markdown rendering.
  - Code block formatting.
  - Double-click **edit mode** with an autosizing `<textarea>` for raw text editing.
- Editing flow:
  - Double-click → Switch to edit mode → Textarea auto-resizes to fit content height.
  - On save, sends updated content back to `ChatWebview` via callback for persistence.

---

## 🔄 Data Flow

1. **Extension → Webview**
   - Extension sends conversation updates over `postMessage`.
   - Messages contain:
     - Role (`user`, `assistant`, `system`).
     - Content.
     - Metrics (promptTokens, completionTokens, seconds, tokensPerSecond).
   - `ChatWebview` updates state and triggers re-render.

2. **Webview → Extension**
   - On **edit save**, updated message content is sent to the extension via `postMessage` for **disk persistence**.
   - On streaming tokens, `ChatWebview` receives partial updates and immediately re-renders **metrics live**.
   - Header icon actions for **Help** and **Settings** emit `ui:openHelp` and `ui:openSettings`.

---

## 📊 Metrics Updating

- Metrics update **in real time** while streaming:
  - Achieved by updating `metrics` in the message object as new data arrives.
  - `ChatWebview` re-renders without losing scroll position.
- Important: Avoid **batching only at the end**, as this breaks live updates.

---

## 🖱 Autoscroll Behavior

- Autoscroll works **only when the user is near the bottom**:
  ```ts
  if (isUserNearBottom()) scrollToBottom();
  ```
