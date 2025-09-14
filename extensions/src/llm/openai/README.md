# OpenAI Connection Folder

This folder contains the OpenAI SDK-backed connection class implementation for AI requests.

## Purpose

- Wrap OpenAI SDK APIs with retry and delay mechanisms suitable for extension workflows.
- Abstract connection details to make AI calls consistent and recoverable.
- Manage streaming and non-streaming response handlings with metrics.

## Idiomatic Patterns

- Use computed base URL for flexible endpoint usage.
- Define retry logic with increasing delay between attempts.
- Log errors in detail for troubleshooting.
- Encapsulate request sending inside a `send()` async method.

## Best Practices

- Validate presence of necessary SDK functions before use.
- Provide default retry counts and delay values.
- Update response states incrementally to notify UI.

## Design Rationale

- Abstract SDK details so workflows need not manage low-level API calls.
- Provide robust error handling and logging to improve reliability.
- Facilitate future extension for other AI providers switching.

## Anti-patterns to Avoid

- Avoid blocking or synchronous API calls.
- Do not hardcode SDK versions or internal APIs.
- Avoid swallowing errors silently; propagate appropriately.

---

*Keep this documentation updated with SDK or API version changes.*