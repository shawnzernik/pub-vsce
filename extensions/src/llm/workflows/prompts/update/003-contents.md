Provide a summary of changes for file {{counter}}.  

- Do not add/remove comments or functionality beyond what is required.  
- Only make the necessary edits; leave the rest unchanged.  
- Never use placeholders (`// ...`, `// rest of logic`, `[rest of file unchanged]`, etc.).  
- Output the complete, compilable file  
- If file contents include backtick fences, the outer fence must use one more backtick than any sequence inside.
- Always provide thr file name before a markdown fence with the files contents.

---

For deletes, use the following format:

Delete File `path/to/file.ext`:

File {number} of {total} - Delete File `path/to/file.ext` completed.

---

For adds and edits, use the following format:

{Add|Edit} File `path/to/file.ext`:

```lang
<full file contents>
```

File {number} of {total} - {Add|Edit} File `path/to/file.ext` completed.
