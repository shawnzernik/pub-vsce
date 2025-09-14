# System Folder

This folder contains core system utilities used by the extension to interact with the OS and filesystem.

## Purpose

- Provide abstractions for executing shell commands both interactively and non-interactively.
- Implement reliable file system access, path resolution, and repository root determination.
- Manage configuration and secret handling across the extension.

## Idiomatic Patterns

- Use async/await and Promises for all shell execution and I/O.
- Encapsulate native child_process spawn logic to simplify error handling and output buffering.
- Cache configurations and regex patterns for performance.
- Expose repository operations with safeguards to prevent path escapes.

## Best Practices

- Always verify file paths are within repository boundaries before access or mutation.
- Handle spawn error and exit codes gracefully.
- Use TextDecoder with UTF-8 and strict encoding checks.
- Wrap complex git interactions to avoid UI disruptions.

## Design Rationale

- Decoupling system-specific logic improves testability.
- Wrapping shell commands enables retry and fallback logic.
- Cache regex and configurations for performance.

## Anti-patterns to Avoid

- Do not allow unchecked filesystem writes outside repo.
- Avoid blocking calls or synchronous spawn that can freeze UI.
- Do not duplicate regex compilation unnecessarily.

---

*Update this document to track system utilities evolution.*