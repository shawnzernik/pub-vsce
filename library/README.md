# Library Folder

This folder contains the core shared AI and workflow libraries used across the Aici extension and webviews.

## Purpose

- Encapsulate LLM DTOs (Data transfer objects) and helper utilities.
- Provide foundational types for conversations, messages, requests, and responses.
- Offer utilities for JSON handling, string buffering, UUID generation, and markdown file serialization.
- Isolate shared logic from client-specific concerns.

## Idiomatic Patterns

- Use strict TypeScript with exact optional property types and no unused locals/params.
- Employ Jest for unit testing to validate logic and ensure stability.
- Pack as commonjs with explicit versioning for downstream referencing.
- Avoid any VS Code or UI dependencies to retain library portability.

## Best Practices

- Keep public interfaces minimal and strongly typed.
- Maintain DTO immutability via deep copying in helpers.
- Ensure async operations are handled outside this library; it remains sync and pure.
- Use clear, descriptive file, class, and interface names.

## Design Rationale

- Decoupling AI DTOs and utilities enables reuse and prevents circular deps.
- Strict TS config enforces correctness and maintainability.
- Packaging as local tgz allows controlled integration into extensions and webviews.

## Anti-patterns to Avoid

- Avoid mutable shared state or singletons; the library is stateless.
- Do not add UI concerns or workspace-specific code here.
- Avoid dependencies on environment or platform-specific APIs.

---

*This document should be maintained alongside library code enhancements.*