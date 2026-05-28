# User Guide

This guide describes how to manually install and test VistrTavern `v0.1.0-alpha`.

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

The extension currently targets manual local installation. Marketplace-style installation and automatic updates are not the focus of `v0.1.0-alpha`.

## Manual Installation

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
- character selector
- intrusion controls
- scene fields
- human anomaly input
- export buttons

### 2. Select a Character

Choose the character that will be temporarily controlled by a human.

The character list is read from the current SillyTavern context. If it is empty, reload the chat or confirm that SillyTavern exposes character data to extensions.

### 3. Set Scene and Tension

Fill in:

- `Scene`: short scene name, such as `Royal Banquet`.
- `Mood`: scene atmosphere, such as `oppressive`.
- `Tension`: 0 to 100.

Click `Save Scene`.

These fields are saved into narrative memory and attached to later messages.

### 4. Choose Intrusion Options

Before starting an intrusion, choose:

- `Duration min`: how long human control should last.
- `Anonymous`: whether the takeover is hidden in-world.
- `Director`: whether the takeover is explicit author direction rather than anonymous intrusion.
- `Awareness after recovery`: how the character may interpret the recovery.

Awareness modes:

- `None`: the character does not know about human control in-world.
- `Subtle`: the character may feel hesitation, memory gaps, or loss of control.
- `Explicit`: the character may recognize an external will as an in-world experience.

For normal immersive testing, use `Anonymous` + `None`.

### 5. Start Intrusion

Click `Start Intrusion`.

The selected character becomes human-controlled inside VistrTavern's state. This does not replace SillyTavern's normal chat UI. It marks the narrative control state and starts a timed intrusion window.

### 6. Record a Human Anomaly Line

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

### 7. Let AI React

Continue the SillyTavern chat and let AI characters respond.

During an active intrusion window, VistrTavern attempts to capture AI responses and bind them to the current intrusion.

This part depends on SillyTavern runtime events and should be verified in your local environment.

### 8. End Intrusion

The intrusion can end in two ways:

- click `End`
- wait until the duration expires

When intrusion ends, VistrTavern returns the character to AI control and creates a continuity handoff.

### 9. Continue the Chat

On the next generation, VistrTavern attempts to inject the pending continuity handoff through SillyTavern's `generate_interceptor`.

The handoff tells the AI:

- the human-controlled events are canonical
- do not ignore or rewrite them
- continue from their emotional, relationship, and world-state consequences
- follow the selected awareness mode

After the next AI message is received, the handoff should be marked consumed.

## Exporting

Click:

- `Export Markdown` for creator-facing story material.
- `Export JSON` for raw structured memory.

Markdown export includes:

- current scene
- intrusion timeline
- human anomaly lines
- AI reactions
- AI recovery continuity handoffs
- high-tension dialogue
- disturbance events
- relationship deltas
- world-state deltas

## What to Verify in Alpha Testing

For `v0.1.0-alpha`, a successful test means:

- the `VT` button appears
- characters load in the selector
- intrusion can start and end
- human anomaly lines are recorded
- handoffs are created after recovery
- pending handoff count changes
- the next AI reply follows the changed story state
- Markdown and JSON export contain the recorded material

## Troubleshooting

### The extension does not install from GitHub

If the repository is private, SillyTavern may not be able to pull it. Use manual installation or make the repository public.

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

This should be checked carefully in real SillyTavern testing. The current implementation inserts a marked system-style message into the generation context, but `v0.1.0-alpha` still needs real-environment verification.

## Privacy Note

VistrTavern records chat-derived story material locally through SillyTavern chat metadata or browser localStorage fallback.

Exports may contain character names, scene notes, dialogue, and story events. Do not publish exports if they include private roleplay content.
