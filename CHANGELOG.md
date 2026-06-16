# Changelog

## v0.6.1-alpha

Takeover input and panel simplification release.

### Added

- Normal SillyTavern chat-box sends are now routed as the controlled character during an active takeover.
- Native chat-box routing now has focused checks for slash-command pass-through, single-takeover routing, current-chat character filtering, and takeover marker metadata.
- GitHub installer screenshots and more explicit SillyTavern installation steps were added to the README and user guides.
- Chinese-language discussion, usage ideas, and compatibility feedback can be sent to `xiaoke5211@gmail.com`.
- Gitee mirror links were added to the README files.

### Changed

- The primary panel is now reduced to role selection, start/end takeover, status, and a short native-chat-box prompt.
- Fallback panel sending remains available but is no longer the default path.
- Single-character chats now only expose the current AI character for takeover; group chats expose only the group members.
- Takeover chat messages now stay character-native by default and no longer expose VistrTavern human-controller metadata to the visible SillyTavern chat message.
- The AI-like takeover marker inherits the previous real AI message icon/model without treating the current takeover message as its own icon source.
- The GitHub repository account links were updated to `myyimu`.
- Extension version updated to `0.6.1-alpha`.

## v0.6.0-alpha

Intrusion-type gameplay release.

### Added

- Main takeover flow now includes an optional `Intrusion type` selector for character takeover, memory fracture, plot hook, relationship sabotage, and clue contamination.
- Human takeover messages, disturbance events, handoffs, Markdown exports, Creator Pack, and Organized Material now preserve the selected intrusion type.
- Continuity handoff prompts now include intrusion-type directives so AI recovery can treat different disruptions differently.

### Changed

- The plugin now frames role takeover as a designed narrative disturbance, not just a chat-editing shortcut.
- Takeover lines now create a temporary reaction anchor before the next generation, so AI replies are directed to respond to the newly inserted character line instead of drifting back to the previous topic.
- Prompt injection now follows the UI language: Chinese UI creates Chinese continuity/reaction prompts, English UI creates English prompts.
- Extension version updated to `0.6.0-alpha`.

## v0.5.2-alpha

Role takeover message insertion release.

### Added

- `Send as Character & Record` takeover action that sends the human-written line into the current SillyTavern chat as the selected character, then records it in VistrTavern memory.
- Send-as-character compatibility path uses SillyTavern `/sendas` first, with direct chat insertion fallback when slash command execution is unavailable.
- Debug now reports the latest takeover send method and adds compatibility checks for slash command execution and direct chat insertion.

### Changed

- The primary takeover flow now inserts a visible character message instead of only recording internal memory.
- User guides and release checks now validate that takeover messages appear as character messages in SillyTavern.
- Extension version updated to `0.5.2-alpha`.

## v0.5.1-alpha

Low-friction onboarding and UI reduction pass.

### Added

- Takeover guide now clearly tells users which character is being controlled and what to do next.
- Human Intent presets for conflict, routine break, relationship test, plot push, and hidden motive.
- Main panel now exposes a shorter zero-config flow: select character, start intrusion, record one anomaly line, capture inspiration.
- Inline help markers and short descriptions for optional setup, Creative Context, Human Intent, Creator Tools, Inspiration Capture, and Debug.
- Sticky panel header with an explicit Collapse button and Escape-key close behavior so VT does not block SillyTavern controls when not in use.

### Changed

- Advanced creative context, scene, awareness, duration, and intent fields are now grouped under optional setup.
- Branch marking, material exports, and debug controls are moved into secondary sections.
- Debug no longer opens by default.
- Extension version updated to `0.5.1-alpha`.

## v0.5.0-alpha

Creator brainstorm and interaction-inspiration release.

### Added

- Human Intent fields before starting an intrusion: goal, target, intended disruption, and secret/reveal.
- Creative Context notes for story premise, current situation, cameo roles, and AI continuity notes.
- Inspiration Capture after an intrusion, summarizing why the human cameo broke AI ensemble smoothness and what to write next.
- Creator Brainstorm Space for private creator notes that do not enter chat history.
- Markdown exports now include creative context, human intent, inspiration captures, and brainstorm notes.

### Changed

- Product positioning now emphasizes VistrTavern as a roleplay scene space where AI maintains the world and humans create dramatic rupture.
- Extension version updated to `0.5.0-alpha`.

## v0.4.0-alpha

Creator workspace release.

### Added

- Scenario presets for `web novel / script`, `AI murder mystery`, and `virtual theater`.
- Material Workbench in the VT panel for one-click organized creator material.
- Read-only saved branch point list in the VT panel.
- Organized Material Markdown export with anomaly lines, AI reactions, conflict hooks, branch routes, awareness material, and next writing moves.

### Changed

- Documentation now treats SillyTavern GitHub URL installation as the recommended install path, with manual folder and release zip install as fallbacks.
- Creator Pack export now includes the selected scenario package focus.
- Extension version updated to `0.4.0-alpha`.

## v0.3.1-alpha

Small usability patch.

### Added

- Chinese / English language switch inside the VT panel.
- Local language preference persistence through browser `localStorage`.

### Changed

- Extension version updated to `0.3.1-alpha`.

## v0.3.0-alpha

Installation and onboarding release.

### Added

- Character Sheet Prompt export for external model-based role profile extraction.
- First-run guide inside the VT panel.
- Compatibility snapshot in Debug.
- Release zip packaging script via `npm run package:zip`.

### Changed

- Extension version updated to `0.3.0-alpha`.

## v0.2.1-alpha

Character extraction prompt milestone.

### Added

- Character Sheet Prompt export content for extracting stable persona, anomaly drift, in-world explanations, tags, conflicts, and future hooks.

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
