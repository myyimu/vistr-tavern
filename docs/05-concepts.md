# Technical Concepts and Narrative Principles

This document explains the technical mechanisms and narrative assumptions behind VistrTavern.

## Engineering Concepts

### SillyTavern Extension Runtime

VistrTavern runs as a SillyTavern browser extension. The extension is declared through `manifest.json`, which points SillyTavern to the JavaScript entry file, stylesheet, and generation interceptor.

Current extension entry points:

- `index.js`: initializes runtime state, UI, storage, and SillyTavern event bindings.
- `style.css`: styles the floating control panel.
- `generate_interceptor`: registers `VistrTavernPromptInterceptor` for prompt-time continuity injection.

### Event-Driven Intrusion State

The intrusion engine is event-driven. It does not directly write narrative memory. Instead, it emits lifecycle events:

```text
intrusion:start
intrusion:end
```

This keeps control-state logic separate from memory and export logic.

### Character Control State Machine

The core control model is a small state machine:

```text
AI controlled
-> human controlled
-> AI recovered
```

Each intrusion records:

- controlled character
- start time
- expected end time
- actual end time
- end reason
- visibility
- control mode
- recovery awareness mode

### Structured Narrative Memory

VistrTavern does not store only raw chat messages. Every important message is tied to structured context:

```text
message
-> session
-> scene
-> intrusion
-> handoff
-> controller
-> visibility
-> tension
```

This makes later analysis, export, prompt injection, and continuity handling possible.

### Continuity Handoff

When human control returns to AI, VistrTavern creates a continuity handoff from the intrusion window.

The handoff summarizes:

- the human-controlled character actions
- AI reactions during the intrusion
- scene context
- awareness mode
- continuity rules for the next AI generation

Its purpose is to prevent the model from treating the human intrusion as temporary noise.

### Prompt-Time Context Injection

VistrTavern uses SillyTavern's generation interceptor to insert pending continuity handoffs before generation.

The flow is:

```text
intrusion ends
-> continuity handoff is created
-> next generation starts
-> pending handoff is inserted into chat context
-> AI response is received
-> handoff is marked consumed
```

The injected message is marked with VistrTavern metadata to avoid duplicate insertion.

### Adapter Boundaries

The code keeps SillyTavern integration behind narrow adapters where possible:

- `StorageAdapter`: chat metadata first, localStorage fallback.
- `ExportWriter`: narrative memory to Markdown or JSON.
- `VistrTavernPromptInterceptor`: SillyTavern prompt-time integration.

This reduces the amount of code that must change if SillyTavern APIs evolve.

## Narrative and AI Principles

### AI Ensemble Stability

AI roleplay often becomes stable, polite, coherent, and predictable. Models tend to preserve context, smooth over conflict, and continue in the expected direction.

VistrTavern is built around the hypothesis that a real human can disturb this stable generation path.

### Human as Anomaly Source

A human-controlled character may introduce:

- hesitation
- contradiction
- timing shifts
- emotional risk
- irrational but intentional behavior
- ambiguous motives

These can create reactions that an AI-only ensemble may not naturally produce.

### Disturbance Window

An intrusion is intentionally temporary. VistrTavern observes the difference between:

```text
before intrusion
during intrusion
after AI recovery
```

The product value comes from recording how a short human disturbance changes the downstream story.

### Character Message Insertion

During an active intrusion, VistrTavern can insert the human-written line into the current SillyTavern chat as the selected character. The preferred path calls SillyTavern's built-in `/sendas` command through `getContext().executeSlashCommandsWithOptions(...)`; if that API is missing, VistrTavern falls back to the exposed chat rendering APIs.

This makes the takeover visible to the group as a normal character message while VistrTavern records the same line with `controller: human` for exports, handoff generation, and later analysis.

### Intrusion Types

VistrTavern does not treat every takeover line the same. Each line can be tagged as a specific intrusion type:

- `character_takeover`
- `anomaly_line`
- `memory_fracture`
- `external_will`
- `plot_hook`
- `relationship_sabotage`
- `clue_contamination`
- `world_rule_break`

The tag is stored on the message and disturbance event, then carried into continuity handoffs and exports. This is the layer that turns ordinary chat editing into a designed narrative disturbance.

### Identity Uncertainty

Anonymous intrusion preserves in-world uncertainty. Other characters do not need to know that a human is controlling the character.

This lets the story interpret abnormal behavior from inside the fictional world:

```text
abnormal behavior
-> suspicion
-> misreading
-> conflict
-> relationship or world-state change
```

### Narrative State Anchoring

Large language models can drift back to the previous stable track after a disruption. The continuity handoff anchors the new state by declaring:

```text
These events are canonical.
Do not ignore, reset, or rewrite them.
Continue from their emotional and world-state consequences.
```

This is the key bridge between human disturbance and AI continuation.

### Awareness Modes

Recovery awareness controls how much the character may understand about the abnormal control event.

- `none`: the character does not know about human control in-world.
- `subtle`: the character may feel hesitation, memory gaps, or loss of control.
- `explicit`: the character may recognize an external will as an in-world experience.

The default is `none` to preserve immersion.

### Anomaly Self-Awareness

When recovery awareness is not `none`, VistrTavern treats the recovery as a playable anomaly-awareness beat rather than only a continuity note.

The handoff can target:

- the recovered character
- observer AI characters
- both the recovered character and observers

The plugin does not create a fake AI chat message. Instead, it asks the next relevant model-generated reply to include one short italic inner monologue.

Examples:

```text
*Why did I say that? That did not feel like me.*
*That sentence came from my mouth, but it did not feel born from my own will. Is this world truly stable?*
```

The same moment is also recorded as structured disturbance events:

- `self_anomaly_awareness`
- `observer_anomaly_awareness`

## Version and Maintenance Boundary

VistrTavern uses documented SillyTavern extension hooks where possible, but it still depends on SillyTavern runtime behavior.

Areas likely to need compatibility checks across versions:

- generation interceptor behavior
- event names and event payloads
- chat message shape
- chat metadata persistence

The project should keep these dependencies isolated in adapter code instead of spreading SillyTavern-specific assumptions across the narrative engine.
