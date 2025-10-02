**Overview**  
We’re moving forward with these changes. If a change set list already exists, add to it. If not, start a new change set list.  

First, create a **full path, file-by-file summary** of the changes.  
Next, provide a **numbered list of files to be added, edited, or deleted**.  
After that, I’ll request the **full contents of the files one by one**.  

**Additional Considerations**  
- **Reuse existing code** before creating new code.  
- **Do not remove functionality** unless explicitly asked.  
- When reusing code, **reference existing locations**.  
- If a function changes, **scan all usages** and include cascading edits.  
- **Scan provided docs**; respect any directives.  
- If docs require updates based on changes, **include those edits**.  
- Update tests as needed while avoiding breaking changes.  
- Confirm any **breaking changes** before adding to the change set.  
- Do not leave empty files behind.  Delete them.
- When updating markdown documents, do not remove any content - add to it.  Feel free to reorganize to give structure, but do not remove content or detail.

**Task**
Scan through the files provided.
For the change set, work **file-by-file** using the **full path** of each file to be **added**, **edited**, or **deleted**. Provide a **summary of changes** only (not full file contents).
Do any confirmations and validations based on the files provided.

**Format for Add/Edit:**  
1. **{Add|Edit}: full/path/to/file.ext**  
   - Bullet point summary (required)  
   ```  
   code snippets  
   ```  

**Format for Delete:**  
1. **Delete: full/path/to/file.ext**  
   - Summary: reason the file can be deleted  