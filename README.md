# VistrTavern

English | [中文](README.zh-CN.md)

Mirrors: [GitHub](https://github.com/xiaoke5211-star/vistr-tavern) | [Gitee](https://gitee.com/zyimu/vistr-tavern)

> Experimental MVP / work in progress.
>
> VistrTavern is an early SillyTavern extension prototype. It lets you temporarily take over an AI character, then type in the normal SillyTavern chat box so the message appears as that AI character speaking. It is not a stable end-user plugin yet.

Shortest flow:

1. Open `VT` and choose the character to take over.
2. Click `Start Intrusion`.
3. Type and send in the normal SillyTavern chat box.
4. The message is inserted as the controlled character and recorded by VT.
5. Click `End`, then let the AI continue.

## Core Question

**If a real human can briefly speak as one AI character, will the AI cast produce more useful dramatic change?**

VistrTavern is not a general AI writing tool or a full chat platform. It focuses on what happens when a real person briefly takes control of one character inside an AI-driven cast, and how that abnormal behavior changes judgment, relationships, conflict, and world state.

## Primary Use Cases

VistrTavern is aimed at creator workflows where the interesting material comes from a controlled rupture in the story:

- **Web novel and script drafting**: turn a human-tampered character line into conflict material, reversal points, relationship cracks, and follow-up scene hooks.
- **AI murder mystery / script-kill games**: let a player briefly take over a role to contaminate clues, contradict testimony, or create identity drift that the AI cast must explain in-world.
- **Virtual theater**: use the human as an outside director who interrupts an AI ensemble, then watch the cast repair continuity, misread the intrusion, or begin doubting reality.

In short: it is less about making the AI write better on its own, and more about giving creators a tool for producing usable dramatic accidents.

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

## Release Target

`v0.6.0-alpha` means the extension can be installed through SillyTavern's GitHub extension installer, by manual folder placement, or from a release zip for local testing. It is not ready for broad end-user support yet.

## Tested Environments

Public compatibility is still being collected. If you test VistrTavern, please report results in the [alpha feedback thread](https://github.com/xiaoke5211-star/vistr-tavern/issues/1).

| VistrTavern | SillyTavern | OS | Browser | Status |
| --- | --- | --- | --- | --- |
| `v0.6.0-alpha` | Awaiting public validation | TODO | TODO | TODO |

## Example Outputs

The best way to understand VistrTavern is to read the output shape:

- [Web novel scene seed](examples/zh-CN/web-novel-scene.md)
- [AI murder mystery clue contamination](examples/zh-CN/ai-murder-mystery.md)
- [Virtual theater reality doubt](examples/zh-CN/virtual-theater.md)

## Core Principle

If a feature does not strengthen the dramatic tension caused by a human anomaly entering an AI ensemble, it is not a first-priority feature.

Multi-character AI interaction is powerful, but it can become fake in a specific way: every character is still ultimately shaped by one model rhythm. VistrTavern treats the human cameo as the rupture that breaks that sameness. AI maintains the world. Humans create the unpredictable intent, resistance, and confrontation that can turn a smooth ensemble scene into usable creative material.

The long-term direction is closer to a roleplay scene space than a generic AI tavern: a scene has roles and dramatic pressure; a human can briefly cameo as one role; the AI cast keeps continuity; the resulting chat becomes script material, prose fragments, character-growth records, and co-creation logs.

VistrTavern records:

1. When the human anomaly entered and which character was controlled.
2. How human input changed character behavior.
3. How the AI ensemble misread, resisted, amplified, or adapted to the anomaly.
4. What tension, relationship, and world-state changes were caused by the disturbance.

## Current Implementation

- SillyTavern extension manifest.
- Floating VistrTavern control panel.
- Low-friction main flow: select a character, start intrusion, then send a takeover line from the normal SillyTavern chat box.
- UI language switch for Chinese and English.
- Character selection.
- Temporary human intrusion state.
- Timeout-based AI recovery.
- Scene and tension fields.
- Scenario presets for web novel/script drafting, AI murder mystery, and virtual theater.
- Creative Context notes for story premise, current situation, cameo roles, and AI continuity notes.
- Human Intent fields for the creator's desired confrontation, target, disruption, and reveal.
- During takeover, normal SillyTavern chat-box sends are routed through `/sendas` so they appear as the controlled character; panel send and direct chat insertion remain as fallbacks.
- Human anomaly line recording.
- Intrusion type tagging for character takeover, memory fracture, plot hook, relationship sabotage, and clue contamination.
- AI reaction capture during active intrusion windows.
- AI recovery continuity handoff for preserving the context that the story has already been changed by the human.
- AI anomaly awareness modes: no awareness, memory fracture, and reality doubt.
- Prompt injection through SillyTavern `generate_interceptor` for pending continuity handoffs.
- Alpha Debug panel with storage, handoff, interceptor, AI capture, and error status.
- Manual `Copy Latest Handoff` fallback.
- Markdown and JSON export.
- Creator Pack export for reusable writing material, conflict hooks, branch routes, and handoff context.
- Material Workbench for one-click organized creator material.
- Inspiration Capture for turning an intrusion into next-scene creative prompts.
- Creator Brainstorm Space for private notes that do not enter the chat.
- Character Sheet Prompt export for organizing role definitions with an external model.
- Branch Point marking for relationship, conspiracy, identity, world-fracture, clue-contamination, and emotional rupture routes.
- Read-only saved Branch Points list in the VT panel.
- First-run guide inside the VT panel.
- Compatibility snapshot in Debug.
- Release zip packaging via `npm run package:zip`.
- Core module smoke test.

## Current Limitations

- Continuity handoff prompt injection is implemented through SillyTavern `generate_interceptor`, but still needs broader real-environment testing.
- AI reaction capture depends on SillyTavern runtime events and may need compatibility fixes across versions.
- The UI is still experimental, though the default path now hides advanced fields until needed.
- Test coverage is currently limited to a smoke test.
- SillyTavern extension API changes may affect installation and update behavior.

## Local Test

Run the smoke test:

```bash
npm run verify
```

## Installation Shape

This repository is structured as the extension folder itself.

Recommended GitHub install:

1. Open SillyTavern's extensions panel.
2. Use the GitHub extension installer.
3. Paste `https://github.com/xiaoke5211-star/vistr-tavern`.
4. Install, then restart SillyTavern or reload the web UI.
5. Open a chat and look for the floating `VT` button.

Manual folder install:

1. Clone or download this repository.
2. Rename the folder to `vistr-tavern` if needed.
3. Place it under your SillyTavern user extensions directory.
4. Restart SillyTavern or reload the web UI.
5. Open a chat and look for the floating `VT` button.

Release zip install:

1. Download `vistr-tavern-<version>.zip` from a GitHub Release.
2. Extract it under your SillyTavern user extensions directory.
3. Confirm the extracted folder is named `vistr-tavern`.
4. Restart SillyTavern or reload the web UI.

Build a local zip package:

```bash
npm run package:zip
```

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
- [Technical Concepts and Narrative Principles](docs/05-concepts.md)
- [User Guide](docs/06-user-guide.md)
- [Alpha Validation Guide](docs/07-alpha-validation.md)
- [Engineering Notes](docs/08-engineering.md)
- [Release Checklist](docs/release-checklist.md)
- [Examples](examples/README.md)

Chinese documentation:

- [产品定位](docs/zh-CN/00-产品定位.md)
- [技术架构](docs/zh-CN/01-技术架构.md)
- [路线图](docs/zh-CN/02-路线图.md)
- [MVP 开发计划](docs/zh-CN/03-MVP开发计划.md)
- [数据模型](docs/zh-CN/04-数据模型.md)
- [技术与原理](docs/zh-CN/05-技术与原理.md)
- [AI perspective narrative sample](docs/zh-CN/06-AI视角叙事样例.md) (Chinese)
- [使用手册](docs/zh-CN/07-使用手册.md)
- [发布检查清单](docs/zh-CN/08-发布检查清单.md)
- [Alpha 验证指南](docs/zh-CN/09-alpha验证指南.md)
- [工程化说明](docs/zh-CN/10-工程化.md)
- [案例示例](examples/README.md)

## Changelog

- [CHANGELOG.md](CHANGELOG.md)

## P.S.

In fictional roleplay terms, VistrTavern accidentally turned out to be very good at making an AI character take the blame for strange lines. Even funnier: the real toy is not only changing what an AI said, but inventing rumors about what the AI "must have meant" afterward.

## License

MIT
