# MVP Development Plan

## MVP Objective

Build a SillyTavern extension that proves the core intrusion loop:

```text
AI ensemble conversation
-> human anonymously takes over one character
-> the character behaves abnormally
-> AI ensemble reacts
-> control returns to AI
-> disturbance is exported as structured material
```

## MVP Scope

Must include:

- Extension loads in SillyTavern.
- VistrTavern control panel.
- Select a character.
- Start temporary takeover.
- End takeover manually or by timeout.
- Record intrusion lifecycle.
- Record messages with controller metadata.
- Set current scene.
- Set tension manually.
- Export Markdown.
- Export JSON.

Should include if simple:

- Immersion mode.
- God mode.
- Basic local persistence.

Must not include:

- Backend server.
- Accounts.
- Multiplayer.
- Payment.
- Automatic novel writing.
- Full creator dashboard.

## Development Milestones

### Milestone 1: Extension Shell

Files:

```text
manifest.json
index.js
style.css
```

Tasks:

- Make SillyTavern load the extension.
- Add a VistrTavern button.
- Open and close a panel.
- Show current extension status.

Exit criteria:

- The extension appears inside SillyTavern.
- The panel can be opened reliably.

Current status:

- Implemented as a floating extension panel.
- Core verification passes with `npm run verify`.

### Milestone 2: Intrusion Engine

Files:

```text
core/intrusionEngine.js
data/schema.js
```

Tasks:

- Implement `startIntrusion`.
- Implement `endIntrusion`.
- Implement `getController`.
- Implement timeout recovery.
- Emit start and end events.

Exit criteria:

- One selected character can be marked human-controlled for a fixed duration.
- Control returns to AI after timeout.

### Milestone 3: Memory Capture

Files:

```text
core/narrativeMemory.js
data/storageAdapter.js
```

Tasks:

- Record intrusion start/end.
- Record messages with controller metadata.
- Record scene and tension values.
- Persist session memory locally.

Exit criteria:

- A session can be reloaded or exported after messages are captured.

### Milestone 4: Scene and Tension Controls

Files:

```text
core/sceneManager.js
ui/scenePanel.js
```

Tasks:

- Set scene name.
- Set mood.
- Set tension value.
- Attach scene metadata to message records.

Exit criteria:

- Every captured message can be tied to a scene and tension level.

### Milestone 5: Export Writer

Files:

```text
core/exportWriter.js
ui/exportPanel.js
prompts/writerAdapterPrompt.md
```

Tasks:

- Export Markdown.
- Export JSON.
- Include intrusion timeline.
- Include high-tension messages.
- Include scene summary placeholders.

Exit criteria:

- A writer can use the export as story material without reading the raw chat only.

### Milestone 6: Modes

Files:

```text
ui/uiOverlay.js
core/intrusionEngine.js
```

Tasks:

- Add immersion mode.
- Add god mode.
- Hide or reveal controller labels based on mode.
- Add delayed reveal summary after scene.

Exit criteria:

- The same session can be experienced either as immersive uncertainty or as explicit analysis.

## MVP Validation Test

Run one manual scenario:

1. Create a scene with at least three AI characters.
2. Start normal AI conversation.
3. Human takes over one character for 3 to 5 minutes.
4. Human says something that contradicts the previous scene direction.
5. AI characters respond.
6. Control returns to AI.
7. Export the session.

The MVP succeeds only if the export clearly answers:

- Which character was intruded?
- When did the intrusion start and end?
- What abnormal behavior happened?
- How did AI characters react?
- What changed in tension, relationships, or world state?
