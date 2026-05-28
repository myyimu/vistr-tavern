# Release Checklist

Use this checklist before publishing `v0.1.0-alpha`.

## Repository

- [ ] Repository name is `vistr-tavern`.
- [ ] Repository visibility is public.
- [ ] `manifest.json` `homePage` points to `https://github.com/xiaoke5211-star/vistr-tavern`.
- [ ] `package.json` and `manifest.json` versions are `0.1.0-alpha`.
- [ ] `README.md`, `README.zh-CN.md`, and user guides mention manual install.

## Local Verification

- [ ] Run `npm run smoke`.
- [ ] Run `node --check index.js core/narrativeMemory.js core/exportWriter.js ui/uiOverlay.js`.
- [ ] Confirm Markdown export includes intrusion timeline, human line, AI reaction, and continuity handoff.
- [ ] Confirm Markdown export includes the `AI 异常察觉` section when awareness is enabled.
- [ ] Confirm JSON export includes `intrusions`, `messages`, and `handoffs`.

## SillyTavern Manual Install

- [ ] Install folder is `data/default-user/extensions/vistr-tavern`.
- [ ] No duplicate `VistrTavern` extension folder remains.
- [ ] SillyTavern loads the extension without console errors.
- [ ] Floating `VT` button appears in a chat.
- [ ] Character selector is populated.
- [ ] `Debug` panel shows version and storage mode.

## Core Flow

- [ ] Start intrusion on a character.
- [ ] Record a human anomaly line.
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

## Fallback and Export

- [ ] `Copy Latest Handoff` copies handoff text.
- [ ] Markdown export downloads successfully.
- [ ] JSON export downloads successfully.
- [ ] Exports do not include unexpected private data beyond local session story content.

## GitHub Release

- [ ] Commit all release changes.
- [ ] Tag `v0.1.0-alpha`.
- [ ] Push branch and tag.
- [ ] Create GitHub Release with alpha status and known limitations.
