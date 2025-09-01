# Aici - AI Continuous Improvement

Artificial Intelligence Continuous Improvement (Aici) is a VS Code extension integrating AI-powered chat, code review, and automated update workflows. It leverages OpenAI models and provides a rich interactive chat UI for developer assistance and continuous coding improvements.

---

## Features

- Interactive AI Chat supporting multiple OpenAI models  
- Automated update workflows with retry and error handling  
- Secure AI key storage via VS Code SecretStorage  
- Configurable AI endpoints, models, and ignore patterns  
- Custom conversation editor with markdown rendering and editing  
- Built-in help, settings, and snippet saving UI  
- Supports retry logic for AI requests and command execution

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 16 or later  
- [Visual Studio Code](https://code.visualstudio.com/)  

### Setup

Clone the repository and install dependencies:

```bash
npm install
npm run build
```

To build and package the VS Code extension:

```bash
npm run package
```

---

## Usage

In VS Code, use the following commands via the Command Palette or keybindings:

- **Ctrl+Shift+C** — Create a new conversation file and open chat view  
- `Aici: Open Aici Help` — Open help documentation  
- `Aici: Open Aici Settings` — Configure AI settings  

To run tests:

```bash
npm run test
```

---

## Configuration

Edit `.vscode/settings.json` or use the Settings UI in VS Code to configure:

- `aici.aiApi` — AI provider key (e.g., "openai")  
- `aici.aiUrl` — AI API endpoint URL  
- `aici.aiModel` — Default AI model  
- `aici.aiModels` — List of available AI models  
- `aici.ignoreRegex` — Array of regex strings to ignore files/folders  
- Retry counts and delays for AI requests and update workflows

**Note:** AI API keys are stored securely via VS Code SecretStorage, and should never be put in plain text settings files. Optionally, you can set environment variables:

- `AICI_AIKEY` or `OPENAI_API_KEY`

---

## Development

### Build Tasks

- `task - clean` — Clean build artifacts  
- `task - build` — Build all packages  
- `task - watch` — Build and watch changes in extensions and webviews  
- `task - package` — Increment version and package VSIX

### Folder Structure Overview

- `/library` — Shared AI and workflow libraries  
- `/extensions` — VS Code extension source  
- `/webviews` — React-based UI webviews  
- `.vscode` — VS Code configs and tasks

---

## License

This project is licensed under the [GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)](https://www.gnu.org/licenses/agpl-3.0.html). See [extensions/LICENSE.md](extensions/LICENSE.md) for details.

© 2025 Shawn Zernik

---

## Contributing

Contributions are welcome! Please open issues or pull requests on GitHub. Follow code style and commit message conventions for smooth integration.

---

## Contact

Maintainer: Shawn Zernik  
GitHub: [shawnzernik/pub-vsce](https://github.com/shawnzernik/pub-vsce)
