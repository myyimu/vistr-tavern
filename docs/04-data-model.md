# Data Model

The data model must preserve the core experiment:

> A human anomaly enters an AI ensemble and changes the narrative.

Do not store only raw chat messages. Every important record should carry controller, visibility, scene, and disturbance context.

## Session

```json
{
  "id": "session_001",
  "title": "Royal Banquet Disturbance",
  "createdAt": "2026-05-27T12:00:00.000Z",
  "updatedAt": "2026-05-27T12:30:00.000Z",
  "mode": "immersion",
  "activeSceneId": "scene_001",
  "scenarioPreset": "web_novel",
  "room": {
    "worldview": "A court where rumors can become law.",
    "background": "The king may already be dead.",
    "roleSlots": "Princess, chancellor, envoy",
    "aiWorldRules": "AI maintains continuity while humans create rupture."
  }
}
```

`scenarioPreset` controls creator-facing organization and export focus. Supported values are `web_novel`, `murder_mystery`, and `virtual_theater`.

`room` describes the local roleplay scene space. It is not an online room yet; it records worldview, plot background, cameo role slots, and AI world-maintenance rules for export and brainstorming.

## Character

```json
{
  "id": "char_eileen",
  "name": "Eileen",
  "defaultController": "ai",
  "currentController": "ai",
  "state": {
    "emotion": "suspicious",
    "trust": 42
  }
}
```

## Scene

```json
{
  "id": "scene_001",
  "name": "Royal Banquet",
  "mood": "oppressive",
  "tension": 75,
  "participants": ["char_eileen", "char_chancellor", "char_knight"],
  "createdAt": "2026-05-27T12:00:00.000Z"
}
```

## Intrusion

```json
{
  "id": "intrusion_001",
  "sessionId": "session_001",
  "characterId": "char_eileen",
  "mode": "intrusion",
  "visibility": "anonymous",
  "controller": "human",
  "humanIntent": {
    "goal": "force a treasonous suspicion into the banquet",
    "target": "Chancellor",
    "disrupt": "break court trust",
    "secret": "the king may be dead"
  },
  "startedAt": "2026-05-27T12:05:00.000Z",
  "endsAt": "2026-05-27T12:10:00.000Z",
  "endedAt": "2026-05-27T12:10:03.000Z",
  "endReason": "timeout"
}
```

## Message

```json
{
  "id": "msg_001",
  "sessionId": "session_001",
  "sceneId": "scene_001",
  "intrusionId": "intrusion_001",
  "characterId": "char_eileen",
  "speakerName": "Eileen",
  "controller": "human",
  "visibility": "anonymous",
  "intrusionKind": "clue_contamination",
  "content": "Do you really believe the king is still alive?",
  "tension": 82,
  "createdAt": "2026-05-27T12:06:00.000Z"
}
```

## Disturbance Event

```json
{
  "id": "event_001",
  "sessionId": "session_001",
  "sceneId": "scene_001",
  "intrusionId": "intrusion_001",
  "handoffId": null,
  "characterId": "char_eileen",
  "intrusionKind": "clue_contamination",
  "awareness": null,
  "awarenessScope": null,
  "type": "anomaly_detected",
  "severity": 4,
  "summary": "Eileen implied the king may already be dead, contradicting the court's public narrative.",
  "relatedMessageIds": ["msg_001", "msg_002"],
  "createdAt": "2026-05-27T12:06:30.000Z"
}
```

## Continuity Handoff

Created when control returns from human to AI. This is the canonical bridge that helps the AI continue from the human-changed story state.

```json
{
  "id": "handoff_001",
  "sessionId": "session_001",
  "sceneId": "scene_001",
  "intrusionId": "intrusion_001",
  "characterId": "char_eileen",
  "characterName": "Eileen",
  "visibility": "anonymous",
  "intrusionKinds": ["clue_contamination"],
  "awareness": "none",
  "awarenessScope": "controlled",
  "summary": "Eileen returned to AI control after 1 canonical human-controlled line(s) and 1 AI reaction(s).",
  "prompt": "[VistrTavern Continuity Handoff]\\nThese events are canonical...",
  "relatedMessageIds": ["msg_001", "msg_002"],
  "createdAt": "2026-05-27T12:10:03.000Z"
}
```

Awareness modes:

- `none`: the character does not know about human control in-world.
- `subtle`: the character may feel hesitation, memory gaps, or loss of control.
- `explicit`: the character may recognize an external will as an in-world experience.

Awareness scopes:

- `controlled`: only the recovered character may express anomaly awareness.
- `observers`: observer AI characters may notice the anomaly.
- `both`: both the recovered character and observers may express anomaly awareness.

Awareness events:

- `self_anomaly_awareness`: the recovered character notices that their own words or actions felt wrong.
- `observer_anomaly_awareness`: observer AI characters notice that the recovered character behaved abnormally.

Intrusion kind values:

- `character_takeover`
- `anomaly_line`
- `memory_fracture`
- `external_will`
- `plot_hook`
- `relationship_sabotage`
- `clue_contamination`
- `world_rule_break`

## Branch Point

Branch points mark creator-facing story routes opened by an intrusion. They do not create chat messages.

```json
{
  "id": "branch_001",
  "sessionId": "session_001",
  "sceneId": "scene_001",
  "intrusionId": "intrusion_001",
  "characterId": "char_eileen",
  "characterName": "Eileen",
  "type": "identity",
  "title": "Forbidden bloodline reveal",
  "summary": "Eileen may know royal secrets that should be impossible for her to know.",
  "options": ["Expose the bloodline", "Hide the memory gap", "Let the chancellor weaponize the secret"],
  "createdAt": "2026-05-27T12:11:00.000Z"
}
```

## Inspiration Capture

```json
{
  "id": "inspiration_001",
  "sessionId": "session_001",
  "intrusionId": "intrusion_001",
  "characterId": "char_eileen",
  "characterName": "Eileen",
  "antiRoutine": "The moment feels non-routine because a real human intent entered the role.",
  "confrontation": "The cameo creates direct pressure toward Chancellor.",
  "relationshipCrack": "Court trust is damaged.",
  "nextDirections": [
    "Turn the anomaly line into a rumor.",
    "Let an observer accuse Eileen.",
    "Mark the first relationship crack."
  ],
  "createdAt": "2026-05-27T12:16:00.000Z"
}
```

## Brainstorm Note

```json
{
  "id": "brainstorm_001",
  "sessionId": "session_001",
  "kind": "conflict",
  "content": "Let the chancellor weaponize the rumor as false testimony.",
  "characterId": "char_chancellor",
  "createdAt": "2026-05-27T12:17:00.000Z"
}
```

Branch types:

- `relationship`
- `conspiracy`
- `identity`
- `world_fracture`
- `clue_contamination`
- `emotional_rupture`
- `other`

## Relationship Delta

```json
{
  "id": "rel_delta_001",
  "sessionId": "session_001",
  "sourceCharacterId": "char_eileen",
  "targetCharacterId": "char_chancellor",
  "dimension": "trust",
  "before": 42,
  "after": 30,
  "reason": "Eileen publicly challenged the official royal narrative.",
  "relatedMessageIds": ["msg_001"],
  "createdAt": "2026-05-27T12:08:00.000Z"
}
```

## World State Delta

```json
{
  "id": "world_delta_001",
  "sessionId": "session_001",
  "key": "royal_court.stability",
  "before": "stable",
  "after": "unstable",
  "reason": "The possibility of the king's death entered public suspicion.",
  "relatedMessageIds": ["msg_001", "msg_004"],
  "createdAt": "2026-05-27T12:12:00.000Z"
}
```

## Export Contract

Every export should include:

- Session summary.
- Scene list.
- Intrusion timeline.
- AI recovery continuity handoffs.
- AI anomaly awareness events.
- Branch points.
- Human intent.
- Inspiration captures.
- Creator brainstorm notes.
- Creator Pack Markdown for reusable writing material, conflict hooks, branch routes, and continuity handoff context.
- Organized Material Markdown for scenario-focused anomaly lines, AI reactions, conflict hooks, branch routes, awareness material, and next writing moves.
- High-tension dialogue.
- AI reactions to the intrusion.
- Relationship changes.
- World-state changes.
- Raw JSON appendix when needed.

