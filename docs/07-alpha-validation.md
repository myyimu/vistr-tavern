# Alpha Validation Guide

Use this guide after making the repository public or before cutting a small alpha patch release.

The goal is not to prove that VistrTavern is mature. The goal is to prove that another user can reproduce the core roleplay loop from a clean SillyTavern installation.

## Tested Environment

Fill this table whenever you run a real manual validation pass.

| Item | Value |
| --- | --- |
| VistrTavern version | `v0.4.0-alpha` |
| SillyTavern version | TODO |
| Browser | TODO |
| OS | TODO |
| Install method | GitHub URL install |
| Extension folder | `data/default-user/extensions/vistr-tavern` |

## Clean Install

1. Open SillyTavern's extension installer.
2. Install from `https://github.com/xiaoke5211-star/vistr-tavern`.
3. Restart SillyTavern or reload the web UI.
4. Open any chat.
5. Confirm the floating `VT` button appears.

Screenshot placeholder:

```text
docs/assets/screenshots/vt-button.png
```

## Core Loop

Verify the minimum public-alpha loop:

1. Open the `VT` panel.
2. Confirm the character selector is populated.
3. Switch `Language` between Chinese and English, then continue in either language.
4. Switch scenario preset between the three available scenarios.
5. Keep awareness mode as `AI 无感`.
6. Start an intrusion on one character.
7. Record one human anomaly line.
8. Let the AI reply while intrusion is active.
9. End the intrusion.
10. Confirm a pending continuity handoff appears in Debug.
11. Trigger the next generation.
12. Confirm Debug reports an interceptor call and the handoff becomes consumed.
13. Mark one branch point.
14. Confirm the branch point appears in the saved Branch Points list.
15. Click `Organize Material` and export Markdown / JSON.

Screenshot placeholders:

```text
docs/assets/screenshots/vt-panel.png
docs/assets/screenshots/debug-panel.png
docs/assets/screenshots/handoff-pending.png
docs/assets/screenshots/export-markdown.png
```

## Awareness Modes

Run a short test for each mode:

| Mode | Expected result |
| --- | --- |
| `AI 无感` | No anomaly awareness event. The handoff preserves continuity without meta suspicion. |
| `断片` | Handoff asks the next relevant AI reply to include a short italic inner monologue about the recent line feeling wrong. |
| `怀疑` | Handoff asks for stronger suspicion about external will, world rules, or unstable reality. |

Run target checks:

| Target | Expected result |
| --- | --- |
| `Controlled character` | Creates `self_anomaly_awareness` only. |
| `Observers` | Creates `observer_anomaly_awareness` only. |
| `Both` | Creates both self and observer awareness events. |

## Fallback Check

If automatic injection is unclear:

1. Click `Copy Latest Handoff`.
2. Paste the copied handoff into SillyTavern context manually.
3. Generate the next AI reply.
4. Confirm the reply follows the handoff without the plugin creating a fake AI message.

## Privacy Check

Before sharing screenshots or exports:

- Remove private character cards, private chat text, API keys, and personal paths.
- Do not publish exports that contain private roleplay content.
- Keep Debug screenshots cropped if they contain story text.

## Alpha Feedback Issue

Ask testers to use the `alpha feedback` issue template and include:

- SillyTavern version.
- Install method.
- Whether the `VT` button appeared.
- Whether automatic handoff injection worked.
- Whether `Copy Latest Handoff` worked.
- Which awareness mode and target were tested.
- Console errors or screenshots, with private roleplay content removed.
