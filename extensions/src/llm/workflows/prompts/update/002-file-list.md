Provide a complete list of full path files for the change set to be added, edited, and/or deleted.  Do not use wildcards, but instead list out each individual file.  If the change is for code where indentation is not important, do not include the file if the changes are in whitespace only.

**Output**
Respond only with a single JSON array and do not wrap it in markdown code fences or add any commentary.
Provide your output conforming to the following JSON schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "step2FileList",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Full path and file name in `path/to/file.ext` format"
      },
      "action": {
        "type": "string",
        "enum": ["add", "edit", "delete"]
      }
    },
    "required": ["name", "action"],
    "additionalProperties": false
  }
}
```
