# Changelog

## v0.1.0-alpha

Initial public alpha target.

### Added

- SillyTavern extension manifest and floating `VT` control panel.
- Temporary human intrusion state with manual end and timeout recovery.
- Scene, mood, tension, controller, visibility, and intrusion-aware narrative memory.
- Human anomaly line recording and disturbance event capture.
- AI reaction capture during active intrusion windows.
- Continuity handoff generation when AI control is restored.
- Prompt-time handoff injection through SillyTavern `generate_interceptor`.
- Handoff injection and consumption tracking.
- AI anomaly awareness modes: no awareness, memory fracture, and reality doubt.
- Awareness targets for controlled character, observers, or both.
- Structured `self_anomaly_awareness` and `observer_anomaly_awareness` disturbance events.
- Alpha debug panel with storage mode, active intrusion, pending handoff, injection status, last captured AI message, and last error.
- `Copy Latest Handoff` fallback for manual prompt/context use.
- Markdown and JSON export.
- English and Chinese README files, user guide, technical concepts, and narrative sample documentation.

### Known Limitations

- Real SillyTavern environment validation is still required for prompt interceptor behavior.
- AI reaction capture depends on SillyTavern runtime events and may need version-specific compatibility fixes.
- The UI is an experimental control panel, not a polished end-user workflow.
- Handoff injection must be checked to ensure it does not persist as normal chat history in target SillyTavern versions.
- Test coverage is limited to smoke and syntax checks.

### Privacy Notes

- VistrTavern stores narrative memory locally through SillyTavern chat metadata or localStorage fallback.
- Exports may include character names, dialogue, scene notes, and story events.
- Do not publish exports that contain private roleplay content.
