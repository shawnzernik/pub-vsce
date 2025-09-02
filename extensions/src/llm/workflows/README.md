# Workflow Development Guide

This folder contains AI-driven workflows that implement various automated tasks using AI LLM calls.

## Workflow Lifecycle

1. **create()**  
   Static factory method to create a workflow instance with config, repository, and optional update callback.

2. **send(request: Request): Promise<Request>**  
   Public entry point to run the workflow. Copies and prepares the request, invokes `execute()`, and returns the updated request.

3. **execute(request: Request): Promise<Request>**  
   Abstract method subclasses must implement. Contains the workflow-specific logic:
   - Prepare prompt messages.
   - Call AI with streaming updates.
   - Process and apply results (write files, run commands, etc).
   - Update internal metrics and status.
   - Return modified request reflecting conversation updates.

## Common Patterns

- Workflows typically push user and assistant messages onto the request in sequence for AI calls.
- AI calls use Connection with streaming to update response and metrics live.
- Use `createUpdater()` from `WorkflowBase` to get a callback that updates metrics and syncs last message on each token.
- Use `sendWithConnection()` helper to send requests with retry, streaming, and metrics handling encapsulated.

## Creating New Workflows

- Extend `WorkflowBase` and implement `execute()`.
- Use `this.createUpdater()` and `this.sendWithConnection()` to simplify AI interaction and live updates.
- Push prompt messages (`user` role) before sending.
- Handle AI response edits, file writes, commands, error retries as needed.
- Call `this.updated(this)` after state changes to notify UI.

## Notes

- Do not mutate the incoming request directly; copy it before modifications if needed.
- The last message in the request is often the workflow command prompt and is replaced or removed during execution.
- `metrics` track token usage and elapsed time; keep these updated for user feedback.

## References

- WorkflowBase.ts - Base class with helpers and lifecycle definition.
- UpdateWorkflow.ts / CommitWorkflow.ts / BuildWorkflow.ts - Examples of workflows using these patterns.

---

Keep this guide updated as workflows evolve to ensure smooth development and maintenance.