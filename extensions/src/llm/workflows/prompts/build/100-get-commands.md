Please provide the idiomatic command-line interface (CLI) commands to perform the following tasks in this project environment:

1. The command to clean the project (remove build artifacts, reset state, etc.)
2. The command to build or compile the project.

Note: This may be a multi-project repository with nested subfolders. Please generate CLI commands scoped appropriately, including any necessary directory changes to target the correct subfolder(s).

Respond with a single JSON object containing properties "clean" and "build", each being the corresponding CLI command as a string.

**Output**
Respond only with a single JSON object and do not wrap it in markdown code fences or add any commentary. Provide your output conforming to the following JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "getCliCommands",
  "type": "object",
  "properties": {
    "clean": {
      "type": "string",
      "description": "Command to execute to clean project"
    },
    "build": {
      "type": "string",
      "description": "Command to execute to build project"
    }
  },
  "required": ["clean", "build"],
  "additionalProperties": false
}
```