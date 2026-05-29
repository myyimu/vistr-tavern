# Changelog

## v0.2.0-alpha

Creator tooling and engineering cleanup release.

### Added

- Creator Pack Markdown export for reusable writing material, AI reactions, conflict hooks, branch routes, awareness events, and continuity handoff context.
- Branch Point marking in the VT panel.
- `branchPoints` memory collection for creator-facing story routes.
- Branch point output in Markdown and JSON exports.
- Branch point data model documentation in English and Chinese.
- `npm run verify` as the single local validation entrypoint.
- Version consistency checks across `package.json`, `manifest.json`, and `data/version.js`.
- English and Chinese engineering notes.

### Changed

- Moved runtime extension version into `data/version.js`.
- Removed completed `v0.1.1` patch-plan documents from the public README navigation.
- Extension version updated to `0.2.0-alpha`.

## v0.1.2-alpha

Public positioning and creator-value update.

### Added

- README positioning for three primary scenarios: web novel/script drafting, AI murder mystery, and virtual theater.
- Example output section on English and Chinese README files.
- `examples/` directory with creator-facing narrative samples.
- Chinese examples for web novel scene seeds, AI murder mystery clue contamination, and virtual theater reality doubt.

### Changed

- Extension version updated to `0.1.2-alpha`.
- README wording now frames VistrTavern more clearly as a creator tool for producing usable dramatic accidents.

## v0.1.1-alpha

Public alpha stabilization patch.

### Added

- `Copy Debug Snapshot` button in the Debug panel for issue reports.
- Visible Debug warning when a pending handoff has not reached the prompt interceptor yet.
- Tested environment table in English and Chinese README files.
- Link to the public alpha feedback issue from README files.
- Screenshot placeholder directory at `docs/assets/screenshots/`.

### Changed

- Extension version updated to `0.1.1-alpha`.
- User guides now explain Debug warnings and debug snapshot copying.

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
