# VistrTavern

English | [中文](README.zh-CN.md)

> Experimental MVP / work in progress.
>
> VistrTavern is an early SillyTavern extension prototype for testing human intrusion, AI recovery, structured narrative memory, and export workflows. It is not a stable end-user plugin yet.

## Core Question

**Can a real human, entering an AI ensemble as an anomaly source, create dramatic tension that traditional AI generation cannot produce?**

VistrTavern is not a general AI writing tool or a full chat platform. It focuses on what happens when a real person briefly takes control of one character inside an AI-driven cast, and how that abnormal behavior changes judgment, relationships, conflict, and world state.

## Positioning

VistrTavern is an AI ensemble narrative disturbance system.

It is designed to validate one complete loop:

```text
AI ensemble runs normally
-> a human anonymously takes over one character
-> AI characters react to the abnormal behavior
-> control returns to AI after a time limit
-> the system records how the disturbance changed the story
-> the session is exported as structured creative material
```

The first target is a SillyTavern extension, not a standalone web app.

## Core Principle

If a feature does not strengthen the dramatic tension caused by a human anomaly entering an AI ensemble, it is not a first-priority feature.

VistrTavern records:

1. When the human anomaly entered and which character was controlled.
2. How human input changed character behavior.
3. How the AI ensemble misread, resisted, amplified, or adapted to the anomaly.
4. What tension, relationship, and world-state changes were caused by the disturbance.

## Current Implementation

- SillyTavern extension manifest.
- Floating VistrTavern control panel.
- Character selection.
- Temporary human intrusion state.
- Timeout-based AI recovery.
- Scene and tension fields.
- Human anomaly line recording.
- AI reaction capture during active intrusion windows.
- AI recovery continuity handoff for preserving the context that the story has already been changed by the human.
- Markdown and JSON export.
- Core module smoke test.

## Current Limitations

- Continuity handoffs are generated, stored, and exported, but are not yet automatically injected into SillyTavern prompts.
- AI reaction capture depends on SillyTavern runtime events and needs broader real-environment testing.
- The UI is still an experimental control panel, not a polished end-user workflow.
- Test coverage is currently limited to a smoke test.
- SillyTavern extension API changes may affect installation and update behavior.

## Local Test

Run the smoke test:

```bash
npm run smoke
```

## Installation Shape

This repository is structured as the extension folder itself. For local testing, place it under the SillyTavern extensions directory and name the folder `vistr-tavern`.

Expected structure:

```text
SillyTavern/
  data/
    default-user/
      extensions/
        vistr-tavern/
          manifest.json
          index.js
          style.css
          core/
          data/
          ui/
```

## Documentation

- [Product Positioning](docs/00-product-positioning.md)
- [Technical Architecture](docs/01-technical-architecture.md)
- [Roadmap](docs/02-roadmap.md)
- [MVP Development Plan](docs/03-mvp-development-plan.md)
- [Data Model](docs/04-data-model.md)

Chinese documentation:

- [产品定位](docs/zh-CN/00-产品定位.md)
- [技术架构](docs/zh-CN/01-技术架构.md)
- [路线图](docs/zh-CN/02-路线图.md)
- [MVP 开发计划](docs/zh-CN/03-MVP开发计划.md)
- [数据模型](docs/zh-CN/04-数据模型.md)

## License

MIT
