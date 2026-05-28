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
  "activeSceneId": "scene_001"
}
```

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
- High-tension dialogue.
- AI reactions to the intrusion.
- Relationship changes.
- World-state changes.
- Raw JSON appendix when needed.

