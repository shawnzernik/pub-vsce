For file {{counter}}, I'll ask you to provide action and the full path file name, and for add and edits I'll want the full contents of the file.

**Formatting Constraints**
- Reuse existing code before creating new code.
- Do not remove functionality unless explicitly asked.
- Do not add/remove comments or functionality beyond what is required.  
- Only make the necessary edits; leave the rest unchanged.  
- Never use placeholders (`// ...`, `// rest of logic`, `[rest of file unchanged]`, etc.).  
- Output the complete, compilable file  
- Always provide the full path file name before files contents.

**Output**
Respond only with a single JSON object and do not wrap it in markdown code fences or add any commentary.
Provide your output conforming to the following JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "step3ContentsResponse",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Full path and file name in `path/to/file.ext` format"
    },
    "action": {
      "type": "string",
      "enum": ["add", "edit", "delete"]
    },
    "contents": {
      "type": "string",
      "description": "File contents (required only for add/edit)"
    }
  },
  "required": ["name", "action"],
  "additionalProperties": false
}
```
