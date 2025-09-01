# Aici - AI Continuous Improvement

© 2025 Shawn Zernik

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of **MERCHANTABILITY** or **FITNESS FOR A PARTICULAR PURPOSE**. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see [http://www.gnu.org/licenses/](http://www.gnu.org/licenses/).

---

## Key Bindings

By default, the following key bindings are used:

- **Ctrl+Shift+C** — Creates a convo file and opens chat

Help and Settings are available from the Chat header (top right, question mark and gear icons) or via the Command Palette:
- “Aici: Open Aici Help”
- “Aici: Open Aici Settings”

---

## Configuration

Secrets (AI Key) are stored securely in VS Code SecretStorage and should not be put into settings.json.

- Open the Settings UI using the gear icon in the Chat header, or via the Command Palette “Aici: Open Aici Settings”.
- Set or clear your AI Key from the Settings UI. It is stored in VS Code Secrets and never written to disk.
- Non-secret values can be edited in the Settings UI or directly in your `~/.vscode/settings.json`.

Optional: You can set an environment variable as a fallback for the AI Key (used if no secret is stored):
- macOS (launchd):
```
launchctl setenv AICI_AIKEY "sk-..."
launchctl getenv AICI_AIKEY
```
- Shell session example:
```
export AICI_AIKEY="sk-..."
```

Example non-secret settings in `~/.vscode/settings.json`:
```json
{
	"aici.aiApi": "openai",
	"aici.aiUrl": "https://api.openai.com/v1/chat/completions",
	"aici.aiModel": "gpt-4o-mini",
	"aici.ignoreRegex": [
		".*/node_modules/.*"
	],
	"aici.aiModels": [
		"gpt-5-nano",
		"gpt-4o-mini",
		"gpt-5-mini",
		"gpt-4o",
		"chatgpt-4o-latest"
	]
}
```

Note:
- The AI Key is stored via the Aici Settings UI in VS Code Secrets. Do not include it in settings.json.
- Saving from the Settings UI updates non-secret fields in `~/.vscode/settings.json`. Secrets remain in SecretStorage.

---

## Usage Notes

- When writing or reading files programmatically, resolve these relative paths against the repository root.
- Prompts and workflows expect all file paths to be relative paths with no URI scheme prefix.
- This standardization reduces confusion and improves reliability in LLM interaction.
