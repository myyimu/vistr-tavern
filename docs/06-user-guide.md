# User Guide

This guide describes how to install and test VistrTavern `v0.5.0-alpha`.

VistrTavern is still an experimental MVP. The current goal is to complete one local loop:

```text
install extension
-> start a SillyTavern chat
-> take over one character
-> record a human anomaly line
-> return control to AI
-> inject continuity handoff
-> export structured material
```

## Requirements

- A local SillyTavern installation.
- A chat with at least one character.
- This repository placed inside the SillyTavern user extensions folder.

The recommended path is SillyTavern's GitHub extension installer. Manual folder installation and release zip installation remain useful fallbacks for local testing.

## GitHub Installation

1. Open SillyTavern's extensions panel.
2. Use the GitHub extension installer.
3. Paste `https://github.com/xiaoke5211-star/vistr-tavern`.
4. Install the extension.
5. Restart SillyTavern or reload the browser UI.
6. Open a chat and look for the floating `VT` button.

## Manual Folder Installation

1. Clone or download this repository.
2. Rename the folder to `vistr-tavern` if needed.
3. Place it under your SillyTavern user extensions directory.
4. Restart SillyTavern or reload the browser UI.
5. Open a chat and look for the floating `VT` button.

Expected folder shape:

```text
SillyTavern/
  data/
    default-user/
      extensions/
        vistr-tavern/
          manifest.json
          index.js
          style.css
          core/
          data/
          ui/
```

If the extension does not appear, check the browser console and SillyTavern server logs.

## Basic Workflow

### 1. Open the Panel

Open any SillyTavern chat and click the floating `VT` button.

The panel shows:

- current view mode
- recorded message count
- intrusion count
- pending handoff count
- debug status
- character selector
- scenario preset selector
- intrusion controls
- scene fields
- human anomaly input
- export buttons

Use the `Language` selector in the panel header to switch between English and Chinese. The choice is saved locally in the browser through `localStorage`, so it should persist after reloads on the same browser profile.

### 2. Select a Character

Choose the character that will be temporarily controlled by a human.

The character list is read from the current SillyTavern context. If it is empty, reload the chat or confirm that SillyTavern exposes character data to extensions.

### 3. Select a Scenario Preset

Choose one of the three scenario presets:

- `Web novel / script`: emphasizes conflict escalation, reversals, relationship cracks, and next-chapter hooks.
- `AI murder mystery`: emphasizes clue contamination, testimony conflict, identity misdirection, and suspicious motives.
- `Virtual theater`: emphasizes performance failure, character self-awareness, reality doubt, and stage-rule fractures.

The preset affects Creator Pack and Organized Material output. It does not change SillyTavern's model settings.

### 4. Define the Roleplay Room

Use `Roleplay Room` to describe the local co-creation space:

- `Worldview`: the rules, genre, or setting.
- `Plot background`: what is already happening in the room.
- `Cameo role slots`: which roles a human guest can briefly play.
- `AI world rules`: what the AI should maintain, such as continuity, NPC reactions, and world consequences.

This is local creator metadata for exports and brainstorming. It does not create an online room yet.

### 5. Set Scene and Tension

Fill in:

- `Scene`: short scene name, such as `Royal Banquet`.
- `Mood`: scene atmosphere, such as `oppressive`.
- `Tension`: 0 to 100.

Click `Save Scene`.

These fields are saved into narrative memory and attached to later messages.

### 6. Choose Intrusion Options

Before starting an intrusion, choose:

- `Duration min`: how long human control should last.
- `Anonymous`: whether the takeover is hidden in-world.
- `Director`: whether the takeover is explicit author direction rather than anonymous intrusion.
- `Awareness after recovery`: how the character may interpret the recovery.

Awareness modes:

- `AI 无感`: the character does not express anomaly awareness.
- `断片`: the character may feel hesitation, memory gaps, or loss of control.
- `怀疑`: the character may suspect external will, world rules, or reality instability.

Awareness target:

- `Controlled character`: only the recovered character may express anomaly awareness.
- `Observers`: observer AI characters may notice that the recovered character behaved wrong.
- `Both`: both the recovered character and observers may express synchronized awareness.

For normal immersive testing, use `Anonymous` + `AI 无感` + `Controlled character`.

### 7. Add Human Intent

Open `Human Intent` before starting an intrusion if you want to record why the human cameo exists.

Useful prompts:

- What does the human want to create?
- Who should feel pressure?
- What relationship or rule should be disrupted?
- What secret or impossible knowledge might leak?

Human Intent is saved as creator material and included in exports. It is not a fake AI message.

### 8. Start Intrusion

Click `Start Intrusion`.

The selected character becomes human-controlled inside VistrTavern's state. This does not replace SillyTavern's normal chat UI. It marks the narrative control state and starts a timed intrusion window.

### 9. Record a Human Anomaly Line

Type a human-controlled line into `Human anomaly line`, then click `Record Human Line`.

Example:

```text
Do you really believe the king is still alive?
```

This records a structured message with:

- controller: `human`
- visibility
- scene
- intrusion id
- tension

It also creates a disturbance event.

### 10. Let AI React

Continue the SillyTavern chat and let AI characters respond.

During an active intrusion window, VistrTavern attempts to capture AI responses and bind them to the current intrusion.

This part depends on SillyTavern runtime events and should be verified in your local environment.

### 11. End Intrusion

The intrusion can end in two ways:

- click `End`
- wait until the duration expires

When intrusion ends, VistrTavern returns the character to AI control and creates a continuity handoff.

### 12. Continue the Chat

On the next generation, VistrTavern attempts to inject the pending continuity handoff through SillyTavern's `generate_interceptor`.

The handoff tells the AI:

- the human-controlled events are canonical
- do not ignore or rewrite them
- continue from their emotional, relationship, and world-state consequences
- follow the selected awareness mode
- if awareness is `断片` or `怀疑`, include one short italic inner monologue in the next relevant AI response

After the next AI message is received, the handoff should be marked consumed.

Example inner monologues:

```text
*Why did I say that? That did not feel like me.*
*That sentence came from my mouth, but it did not feel born from my own will. Is this world truly stable?*
```

## Debug Panel

The `Debug` section is intended for alpha testing.

It shows:

- `Version`: extension version.
- `Storage`: current persistence mode, usually `chatMetadata` or `localStorage`.
- `Compatibility`: quick compatibility snapshot for SillyTavern context, character data, chat data, events, and prompt interceptor.
- `Active intrusion`: currently human-controlled character names.
- `Pending handoff`: latest unconsumed handoff.
- `Last injected`: latest handoff inserted through the generation interceptor.
- `Last consumed`: latest handoff consumed by an AI response.
- `Last AI message`: latest AI message captured by VistrTavern.
- `Interceptor`: last generation interceptor result.
- `Last error`: latest runtime error recorded by VistrTavern.

If a pending handoff exists but the prompt interceptor has not been called, the Debug panel shows a visible warning. Generate the next AI reply to trigger the interceptor, or use `Copy Latest Handoff` if automatic injection is unclear.

Use this panel to verify whether the handoff flow is working:

```text
pending
-> injected
-> consumed
```

For browser console checks, the debug snapshot is also published on the extension root element:

```js
JSON.parse(document.getElementById('vistr-tavern-root').dataset.vtDebugState)
```

You can also click `Copy Debug Snapshot` and paste the copied JSON into an alpha feedback or bug report. Review it first and remove private roleplay content if needed.

## Manual Handoff Fallback

If automatic prompt injection does not work in your SillyTavern version, click `Copy Latest Handoff`.

Paste the copied handoff into a suitable temporary context or prompt area before the next AI generation. This is only a fallback for alpha testing; automatic injection through `generate_interceptor` remains the default path.

## Branch Points

Use `Branch Point` when an intrusion opens a route worth developing later.

1. Select the relevant character.
2. Enter a branch title.
3. Choose a branch type, such as `Identity reveal`, `Conspiracy`, or `Clue contamination`.
4. Write a short branch summary.
5. Optionally add up to three possible routes.
6. Click `Mark Branch Point`.

Branch points are saved into local memory. They appear in JSON export, Markdown export, and Creator Pack export. They do not create chat messages.

The saved Branch Points list in the panel is read-only for now. Use it to confirm which routes have already been marked before exporting.

## Material Workbench

Use `Organize Material` when you want a compact creator-facing summary from the current memory.

It collects:

- human anomaly lines
- AI reactions
- conflict hooks
- character / relationship drift
- branch routes
- anomaly awareness material
- next writing moves based on the selected scenario preset

Click `Copy Material` to place the generated material on the clipboard, or `Export Organized Material` to download it as Markdown.

## Inspiration Capture

After an intrusion ends, click `Capture Inspiration`.

VistrTavern will summarize:

- why the cameo felt less routine than normal AI ensemble output
- what confrontation it created
- which relationship crack or branch route became visible
- three possible next writing moves

This is designed for the moment when a real person briefly made a role feel like a separate will instead of another voice from the same model.

## Creator Brainstorm Space

Use `Creator Brainstorm Space` for private notes that should not enter the SillyTavern chat.

Note types:

- `Spark`
- `Character drift`
- `Conflict escalation`
- `Writable scene`
- `Next cameo`

Brainstorm notes are included in exports and Creator Pack output.

## Exporting

Click:

- `Export Markdown` for creator-facing story material.
- `Export Creator Pack` for a condensed writing pack with anomaly lines, AI reactions, conflict hooks, branch routes, awareness events, and handoff context.
- `Export Organized Material` from the Material Workbench for a scenario-focused creator summary.
- `Export Character Prompt` for a copyable prompt that asks an external model to extract character sheets and persona changes.
- `Export JSON` for raw structured memory.

Markdown export includes:

- current scene
- roleplay room setup
- intrusion timeline
- human intent
- human anomaly lines
- AI reactions
- AI recovery continuity handoffs
- AI anomaly awareness events
- inspiration captures
- creator brainstorm notes
- branch points
- high-tension dialogue
- disturbance events
- relationship deltas
- world-state deltas

## What to Verify in Alpha Testing

For `v0.5.0-alpha`, a successful test means:

- the `VT` button appears
- characters load in the selector
- intrusion can start and end
- human anomaly lines are recorded
- handoffs are created after recovery
- pending handoff count changes
- the next AI reply follows the changed story state
- Markdown and JSON export contain the recorded material
- Creator Pack and Character Prompt exports download successfully
- the panel can switch between English and Chinese
- scenario preset changes persist and affect organized material
- saved branch points are visible in the panel
- roleplay room metadata can be saved
- Human Intent is included in handoff/export material
- Inspiration Capture and Creator Brainstorm notes appear in exports

## Troubleshooting

### The extension does not install from GitHub

If the repository is private or GitHub access fails, SillyTavern may not be able to pull it. Use manual folder installation or release zip installation as a fallback.

### The `VT` button does not appear

Check:

- folder name is `vistr-tavern`
- `manifest.json` is at the extension folder root
- SillyTavern was restarted or reloaded
- browser console has no import error

### Characters do not appear

Reload the chat. If the selector is still empty, the current SillyTavern version may expose character data differently.

### AI replies do not appear in the export

AI reaction capture depends on SillyTavern runtime events. This may require compatibility fixes for specific versions.

### Handoff is generated but AI ignores it

Check whether the pending handoff count changes after generation. If it does not, the generation interceptor may not have run or may not have inserted the handoff as expected.

### Handoff pollutes the chat history

This should be checked carefully in real SillyTavern testing. The current implementation inserts a marked system-style message into the generation context, but `v0.5.0-alpha` still needs real-environment verification.

## Privacy Note

VistrTavern records chat-derived story material locally through SillyTavern chat metadata or browser localStorage fallback.

Exports may contain character names, scene notes, dialogue, and story events. Do not publish exports if they include private roleplay content.
