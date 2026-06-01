# Release Checklist

Use this checklist before publishing `v0.6.0-alpha`.

## Repository

- [ ] Repository name is `vistr-tavern`.
- [ ] Repository visibility is public.
- [ ] `manifest.json` `homePage` points to `https://github.com/xiaoke5211-star/vistr-tavern`.
- [ ] `package.json`, `manifest.json`, and `data/version.js` versions are `0.6.0-alpha`.
- [ ] `README.md`, `README.zh-CN.md`, and user guides mention GitHub URL install plus manual/zip fallbacks.

## Local Verification

- [ ] Run `npm run verify`.
- [ ] Confirm Markdown export includes intrusion timeline, human line, AI reaction, and continuity handoff.
- [ ] Confirm Markdown export includes the `AI 异常察觉` section when awareness is enabled.
- [ ] Confirm Markdown export includes branch points when marked.
- [ ] Confirm Creator Pack export includes anomaly lines, AI reactions, conflict hooks, branch routes, and handoff context.
- [ ] Confirm Organized Material export changes focus based on the selected scenario preset.
- [ ] Confirm exports include creative context, human intent, inspiration captures, and brainstorm notes.
- [ ] Confirm Character Prompt export includes persona extraction instructions and recorded material.
- [ ] Confirm JSON export includes `intrusions`, `messages`, `handoffs`, and `branchPoints`.
- [ ] Run `npm run package:zip` and confirm `dist/vistr-tavern-0.6.0-alpha.zip` is created.

## SillyTavern Install

- [ ] GitHub installer accepts `https://github.com/xiaoke5211-star/vistr-tavern`.
- [ ] Install folder is `data/default-user/extensions/vistr-tavern`.
- [ ] No duplicate `VistrTavern` extension folder remains.
- [ ] SillyTavern loads the extension without console errors.
- [ ] Floating `VT` button appears in a chat.
- [ ] The language selector switches the panel between Chinese and English.
- [ ] The scenario preset selector offers web novel/script, AI murder mystery, and virtual theater.
- [ ] Creative Context notes save and reload.
- [ ] Human Intent fields can be recorded with an intrusion.
- [ ] Character selector is populated.
- [ ] `Debug` panel shows version and storage mode.
- [ ] `Debug` panel shows compatibility status.
- [ ] First-run guide appears on a fresh browser profile or after clearing `vistr-tavern:first-run-dismissed`.

## Core Flow

- [ ] Start intrusion on a character.
- [ ] Use `Send as Character & Record` and confirm the line appears in SillyTavern as the selected character.
- [ ] Change `Intrusion type` to `Clue contamination` or `Relationship sabotage` and confirm it appears in export/handoff output.
- [ ] Confirm Debug shows the latest takeover send method.
- [ ] Use `Record Only` once and confirm it records memory without inserting a chat message.
- [ ] Let AI reply while intrusion is active.
- [ ] End intrusion manually or by timeout.
- [ ] Confirm continuity handoff is created.
- [ ] Confirm pending handoff count changes.
- [ ] Trigger next generation.
- [ ] Confirm interceptor call is visible in Debug.
- [ ] Confirm handoff becomes consumed after AI reply.
- [ ] Confirm handoff does not persist as normal chat history.
- [ ] Select `Memory fracture`/`断片` with `Controlled character` and confirm the handoff asks for a short italic inner monologue.
- [ ] Select `Reality doubt`/`怀疑` with `Both` and confirm self and observer awareness events are exported.
- [ ] Mark a branch point and confirm it appears in the saved Branch Points list.
- [ ] Capture inspiration after an intrusion ends.
- [ ] Save at least one Creator Brainstorm note.

## Fallback and Export

- [ ] `Copy Latest Handoff` copies handoff text.
- [ ] `Organize Material` fills the Material Workbench preview.
- [ ] `Copy Material` copies the organized material.
- [ ] Markdown export downloads successfully.
- [ ] JSON export downloads successfully.
- [ ] Organized Material export downloads successfully.
- [ ] Creator Pack export downloads successfully.
- [ ] Character Prompt export downloads successfully.
- [ ] Exports do not include unexpected private data beyond local session story content.

## GitHub Release

- [ ] Commit all release changes.
- [ ] Tag `v0.6.0-alpha`.
- [ ] Push branch and tag.
- [ ] Create GitHub Release with alpha status and known limitations.
