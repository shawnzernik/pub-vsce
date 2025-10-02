# Developer Guide: Creating AI Workflows in Aici Extension

This document outlines complete instructions for developers and language models to create and integrate new AI workflows from scratch within the Aici VS Code extension.

---

## Contents

1. Overview  
2. Folder Structure and File Locations  
3. Workflow Class Implementation  
4. Prompt File Management  
5. Workflow Factory Registration  
6. AI Request and Metrics Handling  
7. Error Handling and Resilience  
8. Streaming Response Support and Updater Usage  
9. Best Practices and Conventions  
10. Testing and Maintenance  

---

## 1. Overview

Workflows automate AI-driven tasks like file updates, commits, and planning by orchestrating prompt generation, AI calls, and repository changes. They aim for modularity, maintainability, and seamless UI integration.

---

## 2. Folder Structure and File Locations

- Workflow classes live in:

  ```
  extensions/src/llm/workflows/
  ```

- Prompts are stored in subfolders under:

  ```
  extensions/src/llm/workflows/prompts/{workflowName}/
  ```

- The factory registering workflows is:

  ```
  extensions/src/llm/workflows/WorkflowFactory.ts
  ```

- Base Workflow logic is defined in:

  ```
  extensions/src/llm/workflows/WorkflowBase.ts
  ```

---

## 3. Workflow Class Implementation

- Create a new `.ts` file, e.g., `NewWorkflow.ts`.

- Import:

  ```ts
  import { Request } from "@lvt/aici-library/dist/llm/Request";
  import { WorkflowBase } from "./WorkflowBase";
  import { Repository } from "../../system/Repository";
  import { Config } from "../../config";
  ```

- Define class extending `WorkflowBase` with:

  - Static `create()` factory:

    ```ts
    public static create(
      config: Config,
      repository: Repository,
      updater: (me: WorkflowBase) => void = () => {}
    ): NewWorkflow {
      return new NewWorkflow(config, repository, updater);
    }
    ```

  - Override `execute(request: Request): Promise<Request>`:

    - Set `this.request = request`.

    - Use `try/catch` to manage errors.

    - Read prompt(s) using `await this.readBundledPrompt("...")`.

    - Send prompt to AI using `await this.sendUserMessage(prompt)`.

    - Manipulate messages or repository files as needed.

    - Return updated `this.request`.

  Example skeleton:

  ```ts
  protected override async execute(request: Request): Promise<Request> {
    this.request = request;
    try {
      const prompt = await this.readBundledPrompt("newworkflow/001-start.md");
      const response = await this.sendUserMessage(prompt);
  
      // Custom workflow logic here
  
      return this.request;
    } catch (err) {
      const error = err as Error;
      const errorMessage =
        `Workflow error:\n\n` +
        `${error.message}\n\n` +
        `${error.stack || ""}\n\nPlease fix the issue and retry.`;
      this.request.messages.push({ role: "assistant", content: errorMessage });
      return this.request;
    }
  }
  ```

---

## 4. Prompt File Management

- Create prompts as markdown `.md` files in:

  ```
  extensions/src/llm/workflows/prompts/{workflow_name}/
  ```

- Structure prompts clearly, using fenced code blocks and placeholders for dynamic content.

- Employ versioned naming (e.g., `001-start.md`, `002-step.md`).

- Keep prompts external for easier updates and reuse.

- Use `readBundledPrompt(relPath)` to load prompts, which supports flexible fallback paths.

---

## 5. Workflow Factory Registration

- Add your workflow class to:

  ```
  extensions/src/llm/workflows/WorkflowFactory.ts
  ```

- Import your class.

- Register with a lowercase key matching the workflow command:

  ```ts
  private static workflows: Dictionary<...> = {
    update: UpdateWorkflow.create,
    commit: CommitWorkflow.create,
    plan: PlanWorkflow.create,
    build: BuildWorkflow.create,
  }
  ```

- This key is referenced at runtime to instantiate your workflow when the user sends `/newworkflow`.

+**Note:** Whenever you add a new workflow class, ensure you import it and register it here with the exact lowercase key used to invoke the workflow. Missing this step will cause "Unknown workflow" errors at runtime.

---

## 6. AI Request and Metrics Handling

- Use AI connection with retries and delay parameters from `Config`.

- `sendUserMessage()` handles AI call, token counting, and response timing.

- Update metrics via:

  ```ts
  this.updateMetrics({ requestTokens, responseTokens, seconds });
  ```

- Emit incremental updates to UI using the updater callback passed to constructor.

---

## 7. Error Handling and Resilience

- Wrap `execute()` contents in `try/catch`.

- For errors, append a message with role `"assistant"` containing error details.

- Consider providing self-correction prompts (as used in `UpdateWorkflow`) when parsing AI responses.

---

## 8. Streaming Response Support and Updater Usage

- The updater callback `(me: WorkflowBase) => void` should be called during AI streaming events or long processes to update UI live.

- Currently, the OpenAI SDK wrapper sends full responses, but architecture supports extending for streaming.

---

## 9. Best Practices and Conventions

- Avoid mutating input requests directly; use deep copies.

- Keep logic out of UI code; use updater to communicate state.

- Maintain consistent error and metrics reporting.

- Use descriptive prompt file naming and clear messaging.

- Limit functionality changes to what is necessary; avoid overcomplexity.

---

## 10. Testing and Maintenance

- Develop unit/integration tests covering prompt generation, AI parsing, and repository interaction.

- Document your workflow, prompt usage, and commands in extension README or docs.

- Follow existing code conventions: strict TypeScript, coding style, and comments.

---

# ### Generalized Workflow Best Practices

Additions to emphasize workflow design consistent across all implementations:

- Use exclusively external markdown prompt files for all AI instructions and context; avoid hardcoding prompts.
- Create isolated minimal AI message context per workflow execution to minimize token usage and side effects.
- Strictly parse AI responses as JSON where required; implement retry and self-correct via designated self-correct prompt files.
- Avoid mutating input Request objects; always operate on deep copies or isolated Requests.
- All AI calls should use standardized Connection abstractions configured via global Config parameters.
- Implement graceful error handling inside workflows by catching and appending assistant error messages for UI visibility.
- Read prompt files fresh on every workflow run; do not cache prompts in code unless critical for performance.
- Use Updater callbacks to emit streaming partial updates and metrics to UI regularly.
- Design workflows modularly for reusability and factory-based instantiation enabling easy extension and maintenance.

---

# Summary

This guide empowers developers or AI systems to design robust, maintainable, and integrated AI workflows for the Aici extension, leveraging existing foundations for consistent developer and user experience.