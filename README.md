# Aici - AI Continuous Improvement

Artificial Intelligence Continuous Improvement (Aici) is a VS Code extension that integrates AI-powered chat, code review, and automated workflows leveraging OpenAI models.

---

## Features

- Interactive AI chat supporting multiple OpenAI models
- AI-driven workflows: `/update`, `/commit`, `/plan`, `/build`
- Secure AI key storage with VS Code SecretStorage
- Configurable AI API endpoint, models, regex for file ignoring, and retry parameters
- Custom conversation editor for `.convo` JSON chat files
- Snippet saving and integrated Help and Settings UI
- Real-time streaming response and usage metrics display

---

## Installation

### Prerequisites

- Node.js 16 or later
- Visual Studio Code

### Setup

Clone the repository and install dependencies:

```
npm install
npm run build
```

To package the extension:

```
npm run package
```

---

## Usage

### File Associations

- Conversation files with extension `.convo` use custom editor "Aici Chat"
- Language ID: `aici-chat`

### Hotkeys and Commands

- `Ctrl+Shift+C` — Open new chat conversation or open `.convo` file in chat editor
- Command Palette:
  - `Aici: Open Aici Chat`
  - `Aici: Open Aici Help`
  - `Aici: Open Aici Settings`
- Right-click in Explorer: `Send to Aici Chat` to send files/folders content to chat

### AI Workflows

Type these as chat messages to invoke workflows:

- `/update` — AI automated file updates
- `/commit` — AI-generated git commit messages
- `/plan` — AI file change plans
- `/build` — AI-assisted build commands with error fixes

### Running Tests

```
npm run test
```

---

## Configuration

- All relative file paths used by the extension, AI workflows, and configurations are relative to the VS Code workspace folder root for consistency and security.

Configure workspace `.vscode/settings.json` or use Aici Settings UI for:

- `aici.aiApi`: AI provider key (e.g., "openai")
- `aici.aiUrl`: AI API endpoint URL
- `aici.aiModel`: Default AI model
- `aici.aiModels`: Array of available AI models
- `aici.ignoreRegex`: Regex array to ignore files
- Retry counts: `aici.aiRetries`, `aici.aiRetryDelaySeconds`, `aici.updateRetries`, `aici.buildBuildRetries`
- AI key (`aici.aiKey`) is stored securely in SecretStorage and not saved in plaintext

---

## Development

- Folder structure:
  - `/extensions`: main extension source code
  - `/library`: shared AI DTOs and utilities
  - `/webviews`: React UI components for chat, help, settings
  - `/system`: OS and file system helpers
- Build/watch using `.vscode/tasks.json`, e.g. `task - build`, `task - watch`
- Debug using `.vscode/launch.json`
- Uses TypeScript with Jest for unit tests

---

## Contributing

- Follow repo coding style and commit message guidelines
- Report issues and submit pull requests on GitHub

---

## License

Licensed under the GNU Affero General Public License v3 or later (AGPL-3.0-or-later). See `extensions/LICENSE.md` for details.

---

## Contact

Maintainer: Shawn Zernik  
GitHub: [shawnzernik/pub-vsce](https://github.com/shawnzernik/pub-vsce)
