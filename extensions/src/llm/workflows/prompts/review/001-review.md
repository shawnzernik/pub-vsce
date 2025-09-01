### Code Review Prompt

**Provide a thorough code review of the submitted code. Evaluate it against the following principles and practices. Do NOT reduce functionality. Prefer changes that are backward-compatible and reduce brittleness.**

1. **DRY**
   - Identify duplication; recommend shared utilities/abstractions.
   - Consolidate logic safely; verify outputs remain identical.

2. **SOLID**
   - **SRP, OCP, LSP, ISP, DIP** — call out violations and possible solutions

3. **Clean Code**
   - Readable, intention-revealing, small functions, minimal params.
   - Classes/modules must be cohesive and logically organized.
   - One class OR one interface per file, with the exception of small helper classes, interfaces, or types that are not exported or exposed outside the file.
   - Avoid cleverness; keep constructs simple for entry-level devs.
   - Remove comments **unless critical for understanding** (keep API/contract docs). 
   - Use self-describing names instead of commentary.

4. **Idiomatic Practices**
   - Follow stack conventions (language/framework/libs).
   - Flag **non-idiomatic patterns** (e.g., reinventing common library functions, overusing conditionals instead of polymorphism).  
   - Recommend idiomatic refactoring to align with community standards and project conventions.  
   - Idiomatic error handling, resource management, and security must be enforced.

5. **Dead Code & Smells**
   - Remove unused imports/vars/branches; flatten deep nesting; avoid unnecessary abstractions.

6. **Identifiers & File Naming**
   - Names: **accurate, concise, unambiguous**; add adjectives when needed.  
   - **Plurality rule:** collections, lists, arrays, dictionaries, maps, sets, and repositories must be given **plural names** to clearly reflect their collective nature (e.g., `users`, `accounts`, `transactions`). Singular names reserved for single entities only.  
   - **Repository naming rule:** repositories must be named as **plural noun + Repository** (e.g., `UsersRepository`, `OrdersRepository`).  
   - **Filename must literally match the contained type** (and project naming conventions).  
   - **No shims or aliases when renaming.** If a file or class is incorrectly named, it must be **renamed directly** and **all references updated**. Do not keep legacy exports.

7. **Complexity (Cognitive & Cyclomatic)**
   - Flag high complexity; target **nesting ≤ 2–3 levels**.
   - Techniques: early returns, guard clauses, small helpers, strategy/polymorphism.
   - Keep public API unchanged where possible.

8. **Type Safety**
   - **No untyped anonymous classes/objects.** Must be explicitly typed or clearly inferred (e.g., generics/interfaces/typedefs).
   - Prefer explicit types at boundaries (I/O, APIs, events).

9. **Formatting & Style (CONSISTENT)**
   - **One logical statement per line.** Compact but clear.
   - **IF style (preferred):**
     ```
     if (condition)
         statement;
     ```
     Avoid:
     ```
     if (condition) statement;
     ```
     And prefer the compact single-statement style over:
     ```
     if (condition) {
         statement;
     }
     ```
   - **Case formatting (preferred):**
     ```
     case (v) {
         value: return functionCall();
     }
     ```
     Prefer returning instead of `statement; break;`:
     ```
     case (v) {
         value: statement; break;
         default: statement; break;
     }
     ```

10. **Isomorphic / Universal Code**
    - Shared libraries intended for both **browser and Node** must be **isomorphic** (a.k.a. universal).  
    - Code must be **line-by-line executable in both environments** with no direct Node-only (`fs`, `path`, `process`) or browser-only (`window`, `document`, `localStorage`) references.  
    - Use only pure ECMAScript/TypeScript APIs or abstractions.  
    - If environment-specific behavior is required, encapsulate it behind adapters or provide separate entry points (`node.ts`, `browser.ts`) with exports mapped in `package.json`.  
    - Flag any code in shared modules that violates this guarantee.  
	- Ensure `/common` stays universally usable.

11. **Architecture & Design**
    - Check for proper **separation of concerns/duties** across layers:  
      - Technical: UI vs service vs data access.  
      - Business domain: logic must live in the correct service/module.  
    - Domain logic must not leak into infrastructure or UI.  
    - Ensure business rules are encapsulated in the proper bounded context.  
    - Validate layering (e.g., controllers shouldn’t contain persistence logic).  
    - Recommend architectural refactoring if violations are found.  

---

Protect the codebase from brittleness.
Always preserve the original full paths using the "aici://" schema.
When referencing files, provide the full path.
Provide a uniquely numbered list of changes file by file.