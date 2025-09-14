# UI Components Folder

This folder contains reusable React UI components used by various webviews in the Aici extension.

## Purpose

- Provide common styled components such as Button, Flex container, Select dropdown, and TextArea.
- Promote consistency in look and behavior across different UI views.
- Abstract common logic for autosizing, event handling, and theming.

## Idiomatic Patterns

- Use React class components with typed props and state for clarity.
- Define default styles but allow style overrides via props.
- Employ composition by accepting children React nodes for flexibility.
- Keep components stateless where possible, else manage internal state carefully.

## Best Practices

- Avoid inline styles in favor of default style objects merged with props.
- Use semantic HTML elements and accessibility attributes as needed.
- Keep components focused and generic for reuse.

## Design Rationale

- Centralized component definitions reduce duplication and maintenance.
- Eases switching themes or style updates in a single place.

## Anti-patterns to Avoid

- Avoid direct DOM manipulation; rely on React lifecycle.
- Avoid mixing UI logic with data fetching or side effects.

---

*Maintain this document as components evolve or expand.*