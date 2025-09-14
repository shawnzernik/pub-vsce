# Aici - AI Continuous Improvement VS Code Extension

Artificial Intelligence Continuous Improvement (Aici) integrates AI-powered chat, code workflows, and automated coding assistance into Visual Studio Code using OpenAI models.

---

## Features

- Interactive AI Chat Interface with multi-model support
- AI Workflows:
  - `/update` for automated file edits
  - `/commit` for AI-generated git commit messages
  - `/plan` for change planning
  - `/build` for AI-assisted build, clean, and error fixing
- Secure storage of AI keys with VS Code SecretStorage
- Easy configuration of AI API endpoint, models, and retry settings
- Custom editor for `.convo` conversation files
- Snippet saving and integrated Help and Settings UI
- Real-time metrics and streaming response display

---

## Installation

### Prerequisites

- Node.js 16 or later
- Visual Studio Code

### Steps

1. Clone the repository
2. Navigate to `extensions` folder
3. Run:

```bash
npm install
npm run build
```

4. To package the extension for distribution:

```bash
npm run package
```

---

## Usage

### File Associations

- `.convo` files open with Aici Chat custom editor
- Language ID: `aici-chat`

### Commands & Shortcuts

- `Ctrl+Shift+C` — Open new chat conversation or open `.convo` file in chat editor
- Command Palette:
  - `Aici: Open Aici Chat`
  - `Aici: Open Aici Help`
  - `Aici: Open Aici Settings`
- Explorer Context Menu:
  - Right-click files/folders → `Send to Aici Chat`

### AI Workflows

Start your chat message with the following commands:

- `/update` — AI-driven file updates
- `/commit` — AI-generated git commit messages
- `/plan` — AI change plan summaries
- `/build` — AI assisted build and error diagnostics

### Running Tests

```bash
npm run test
```

---

## Configuration

Configure workspace-level settings in `.vscode/settings.json` or via the Settings UI:

- `aici.aiApi`: AI API provider (e.g., "openai")
- `aici.aiUrl`: AI API endpoint URL
- `aici.aiModel`: Default AI model
- `aici.aiModels`: List of selectable AI models
- `aici.ignoreRegex`: Array of regex patterns to ignore files/folders
- Retry settings: `aici.aiRetries`, `aici.aiRetryDelaySeconds`, `aici.updateRetries`, `aici.buildBuildRetries`
- AI Key (`aici.aiKey`) stored securely in VS Code SecretStorage

---

## Development

- Source code under `extensions` folder
- Shared libraries under `library`
- React-based UI components in `webviews`
- Build using defined VS Code tasks:
  - `task - build` to build all
  - `task - watch` for incremental builds
- Debug using `.vscode/launch.json`
- TypeScript with strict typings and Jest tests

---

## Contributing

Contributions welcome! Please follow code style and open issues or pull requests on GitHub.

---

## License

This project is licensed under the GNU Affero General Public License v3 or later (AGPL-3.0-or-later). See `LICENSE.md` for details.

---

## Maintainer

Shawn Zernik  
GitHub: [shawnzernik/pub-vsce](https://github.com/shawnzernik/pub-vsce)
