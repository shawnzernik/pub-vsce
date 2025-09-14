# LLM DTOs and Utilities

This folder contains data transfer objects (DTOs) and utilities related to Large Language Model (LLM) interactions for the Aici library.

## Contents

- **Conversation.ts**: Defines conversation interfaces and message sequences.
- **File.ts**: Represents serialized file data with name and contents.
- **FileHelper.ts**: Utility to render files as markdown fenced blocks.
- **Message.ts**: Defines structure for messages exchanged with LLM.
- **Metrics.ts**: Tracks token usage and timing metrics for requests.
- **Request.ts**: Defines the structure for requests sent to LLM services.
- **Response.ts**: Defines the structure for responses received from LLM services.
- **Uuid.ts**: Utility for generating unique IDs used in requests.

## Purpose

These definitions and utilities standardize how requests and responses to AI models are structured and provide helpers for file serialization and unique IDs to be used across the system.