# LLM Folder

This folder contains core Large Language Model (LLM) DTOs and AI workflow implementations used by the extension.

## Purpose

- Define data transfer objects such as Conversation, Message, Request, Response, and Metrics.
- Implement AI-driven workflows like Update, Commit, Plan with a unified interface.
- Provide base classes and factories to manage workflow lifecycle and AI request sending.
- Offer utilities for parsing and handling AI interaction output.

## Idiomatic Patterns

- Use deep copies of Request/Conversation objects to avoid side effects.
- Implement `WorkflowBase` abstract class with lifecycle hooks `create()`, `sendRequest()`, and `execute()`.
- Use Updater callbacks to track metrics and streaming response updates.
- Adhere to JSON schemas for structured AI output to enable reliable parsing.

## Best Practices

- Compose workflows from packages to maximize code reuse.
- Use prompt files stored in extension resources for maintainability.
- Ensure workflows handle errors gracefully and report via conversation messages.
- Centralize AI key and URL configuration via Config class.
- Use typed SDK clients (like OpenAI) wrapped inside connection classes.

## Design Rationale

- Decouples AI interaction logic from UI and VS Code API.
- Facilitates adding future AI services by abstracting connection and workflow interfaces.
- Supports retry and delay strategies for robustness.
- Enables streaming partial response updates to UI for better user experience.

## Anti-patterns to Avoid

- Avoid mutating request objects in place.
- Avoid mixing AI service provider details into UI components.
- Avoid direct file writes in workflow logic except through repository abstraction.

---

*Keep this document updated as workflows and AI integration evolve.*