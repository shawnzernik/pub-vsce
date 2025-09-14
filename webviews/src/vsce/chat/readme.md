# Chat Webview Components

This folder contains React components implementing the chat webview UI for the Aici extension.

## Key Components

- **ChatWebview.tsx**: The main chat UI component managing conversation state, metrics, streaming updates, and user input.
- **Conversation.tsx**: Renders the list of messages in the conversation and manages message editing state.
- **Message.tsx**: Displays individual chat messages with markdown rendering, syntax highlighting, and inline code block actions (copy, save).
- **NewMessage.tsx**: Provides the input box for new messages with resizing and send/reset controls.
- **Attachments.tsx**: Shows attached files with details and removal support.
- **PostMessageClient.ts**: Handles communication between the webview and the extension backend.

## Features

- Live streaming updates with metrics displayed in real time.
- Markdown rendering with syntax highlighting (theme-aware).
- Editable messages with auto-resizing textareas.
- Attachment management inline with messages.
- Integrated Help and Settings buttons triggering extension commands.