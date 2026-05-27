# Technical Architecture

## Architecture Decision

The first implementation should be a SillyTavern extension.

Do not start with a standalone web app, NestJS backend, user system, or PostgreSQL. Those become appropriate only after the intrusion loop has been proven.

## System Overview

```text
SillyTavern
  -> VistrTavern Extension
      -> UI Layer
      -> Intrusion Engine
      -> Narrative Engine
      -> Memory Layer
      -> Writer Adapter
      -> Storage Adapter
```

## Runtime Responsibility

SillyTavern owns:

- Existing chat UI.
- Character cards.
- Context assembly.
- Model calls.
- Normal AI roleplay flow.

VistrTavern owns:

- Who controls a character at a given moment.
- Whether control identity is hidden or revealed.
- How human intrusion events are recorded.
- How AI reactions are attached to the intrusion context.
- How the session becomes structured narrative material.

## MVP Module Layout

This repository is the extension folder itself. When installed into SillyTavern, it should be placed as `extensions/vistr-tavern/`.

```text
vistr-tavern/
  manifest.json
  index.js
  style.css

  core/
    intrusionEngine.js
    narrativeEngine.js
    narrativeMemory.js
    sceneManager.js
    exportWriter.js

  ui/
    uiOverlay.js
    characterPanel.js
    scenePanel.js
    exportPanel.js

  data/
    schema.js
    storageAdapter.js

  prompts/
    writerAdapterPrompt.md
```

## Core Data Flow

```text
Message created
  -> VistrTavern observes message
  -> Intrusion Engine checks controller
  -> Narrative Memory records controller, scene, tension, visibility
  -> Narrative Engine updates disturbance state
  -> Writer Adapter exports structured material
```

## Main Components

### UI Layer

Provides:

- VistrTavern panel.
- Character takeover controls.
- Countdown display.
- Scene and tension controls.
- Immersion mode and god mode switch.
- Export controls.

The UI must not become the product center. It exists to operate the intrusion system.

### Intrusion Engine

The core control module.

Responsibilities:

- Start role takeover.
- End role takeover.
- Track time-limited control.
- Restore AI control automatically.
- Store visibility mode.
- Emit intrusion lifecycle events.

Key API:

```js
startIntrusion({ characterId, durationMs, visibility, mode })
endIntrusion(characterId, reason)
getController(characterId)
isHumanControlled(characterId)
getActiveIntrusions()
tick(now)
```

### Narrative Engine

Interprets the session as a disturbance experiment.

Responsibilities:

- Track current scene.
- Track tension level.
- Identify disturbance windows.
- Mark AI reactions to human anomaly.
- Maintain relationship and world-state deltas.

MVP should keep this mostly manual or heuristic-based. LLM analysis can be added later.

### Memory Layer

Stores structured evidence, not just raw chat text.

Responsibilities:

- Message records.
- Intrusion lifecycle records.
- Scene records.
- Tension snapshots.
- Relationship changes.
- World-state changes.
- Export sessions.

MVP storage:

- Browser localStorage or IndexedDB.
- JSON schema-first design.

Later storage:

- SQLite for local archives.
- PostgreSQL after multiplayer backend exists.

### Writer Adapter

Transforms narrative memory into creator-facing formats.

Responsibilities:

- Markdown export.
- JSON export.
- LLM prompt pack export.
- Scene cards.
- Key event list.
- Relationship change summary.
- World-state change summary.

Writer Adapter must not generate final prose in the MVP. It prepares material for GPT, Claude, DeepSeek, or human writers.

### Storage Adapter

Separates persistence from core logic.

MVP:

```text
Memory object -> storageAdapter -> localStorage / IndexedDB
```

Later:

```text
Memory object -> storageAdapter -> SQLite / API backend / PostgreSQL
```

## Modes

### Intrusion Mode

The primary mode.

- Human enters as anomaly.
- Identity can be hidden.
- Other participants may not know whether the character is AI or human.
- The system records narrative disturbance.

### Director Mode

Secondary support mode.

- Human intentionally corrects or steers a character.
- Identity can be visible.
- Useful for author-driven scenes.

Director Mode should never replace Intrusion Mode as the project's core identity.

### Immersion Mode

- Does not show AI or human labels during play.
- Reveals control history after the scene.

### God Mode

- Shows AI or human controller labels.
- Used for debugging, analysis, and writing workflows.

## Future Backend Architecture

Only introduce this after Phase 3 or Phase 4.

```text
Client
  -> SillyTavern Extension / Web UI
  -> VistrTavern API Gateway
  -> Session Service
  -> Intrusion Orchestrator
  -> Narrative Memory Service
  -> LLM Provider Adapter
  -> PostgreSQL
  -> Object Storage
```

Backend technology:

- Node.js.
- NestJS.
- Socket.IO.
- PostgreSQL.
- SQLite only for local-first mode.

## Non-Goals For MVP

- No account system.
- No payment system.
- No multiplayer server.
- No public role marketplace.
- No complete web app.
- No automatic novel generation.
