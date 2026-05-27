# VistrTavern

> Experimental MVP / work in progress.
>
> VistrTavern is an early SillyTavern extension prototype for testing human intrusion, AI recovery, structured narrative memory, and export workflows. It is not a stable end-user plugin yet.

VistrTavern is an AI ensemble narrative disturbance system.

Its core question is:

> What happens when a real human, as an anomaly source, anonymously enters an AI-driven cast and briefly changes one character's behavior?

The project is not an AI writing platform, a generic chat UI, or a social app. It is a tool for creating, observing, and recording dramatic tension caused by human intrusion inside AI roleplay.

## Core Positioning

VistrTavern focuses on three things:

1. Human anomaly enters an AI ensemble.
2. AI characters react to the anomaly.
3. The system records how the anomaly changes tension, relationships, events, and world state.

Everything else is supporting infrastructure.

## First Target

The first implementation target is a SillyTavern extension, not a standalone app.

This repository is structured as the extension folder itself. To test it locally, place or clone this repository under your SillyTavern extensions directory as `vistr-tavern`.

The MVP should prove one complete loop:

```text
AI ensemble runs normally
-> human anonymously takes over one character
-> AI characters react to the abnormal behavior
-> control returns to AI after a time limit
-> the session is exported as structured narrative material
```

## Documentation

- [Product Positioning](docs/00-product-positioning.md)
- [Technical Architecture](docs/01-technical-architecture.md)
- [Roadmap](docs/02-roadmap.md)
- [MVP Development Plan](docs/03-mvp-development-plan.md)
- [Data Model](docs/04-data-model.md)

## Current Implementation

Implemented baseline:

- SillyTavern extension manifest.
- Floating VistrTavern panel.
- Character selection.
- Temporary human intrusion state.
- Timeout-based AI recovery.
- Manual scene and tension fields.
- Human anomaly line recording.
- AI reaction capture during active intrusion windows.
- AI recovery continuity handoff for canonical post-intrusion context.
- Markdown and JSON export.
- Local smoke test for the core modules.

## Current Limitations

- Continuity handoffs are generated, stored, and exported, but are not yet automatically injected into SillyTavern prompts.
- AI reaction capture depends on SillyTavern runtime events and still needs broader real-environment testing.
- The UI is an experimental control panel, not a polished user-facing workflow.
- Test coverage is limited to a local smoke test.
- Installation and update behavior may change with SillyTavern extension API changes.

Run the smoke test:

```bash
npm run smoke
```

## Local Install Shape

Expected folder shape inside SillyTavern:

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

## 中文文档

- [产品定位](docs/zh-CN/00-产品定位.md)
- [技术架构](docs/zh-CN/01-技术架构.md)
- [路线图](docs/zh-CN/02-路线图.md)
- [MVP 开发计划](docs/zh-CN/03-MVP开发计划.md)
- [数据模型](docs/zh-CN/04-数据模型.md)

## License

MIT
