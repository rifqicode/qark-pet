# qark-pet

A small Electron desktop pet (a cat) that lives in a transparent, always-on-top window. It reminds you to drink water and take pomodoro breaks, shows your desktop notifications as speech bubbles, and stays out of the way while you type.

> Linux / X11 only for now (uses `xprop`, `xwininfo`, `/proc` and `/sys`). Developed on Pantheon (elementary OS).

## Features

- **Pet behavior:** idles, walks, sleeps, yawns, stretches, scratches; eyes follow the cursor; can be dragged, dropped (falls and lands) and petted by stroking the pointer back and forth over it.
- **Reminders:** drink water every 30 minutes; pomodoro 25 min focus / 5 min break, 15 min long break after 4 rounds. Click the pet to see the pomodoro status.
- **Context aware:** fades while you type over it (and goes click-through), moves to a less covered corner, holds reminder bubbles while you type, and reappears solid after a virtual desktop switch.
- **Notifications:** can replace the system notification daemon (D-Bus `org.freedesktop.Notifications`) so every notification shows as a bubble. Long text is clamped to 3 lines, and clicking a bubble opens the sending app.
- **Do Not Disturb:** the pet falls asleep and bubbles are held (still recorded in history).
- **Right-click menu:** pomodoro status, DND, skip/reset pomodoro, notification history (click an entry to open its app), clear history, quit.
- **System load:** looks busy ("thinking") when CPU or memory use is high.
- **Battery and time awareness:** low battery / charging messages, morning, lunch, evening and past-midnight nudges.
- **Herdr integration:** clicking a [Herdr](https://herdr.dev) notification focuses the matching agent pane.
- State (DND, drink counter, pomodoro, history) persists across restarts.

## Requirements

- Linux with X11
- Node.js 22+
- `xprop` and `xwininfo` (package `x11-utils`)
- `gtk-launch` (optional, fallback for opening apps from bubbles)

## Getting started

```bash
npm install
npm run dev          # Electron + nodemon auto-reload
npm run dev:notify   # same, and the pet becomes the notification server
npm start            # plain run, no auto-reload
npm test             # unit tests for the pure logic
```

### Notification server mode (`dev:notify`)

With `PET_OWN_NOTIFY=1` the pet stops the system daemon (`io.elementary.notifications`), takes over the D-Bus name, and starts the daemon again when it exits.

If the pet is killed with `kill -9`, the daemon is not restored. Start it manually:

```bash
io.elementary.notifications &
```

Notification actions, images and the system history are not supported; bubbles show text only.

## Sending your own events

The pet runs a small local hub on `127.0.0.1:7777`.

```bash
curl -d '{"msg":"build done","mood":"happy","ttl":5000}' localhost:7777/event
```

| Field | Meaning |
| --- | --- |
| `msg` | Text to show |
| `mood` | `alert` (jumps the queue, red-ish bubble) or anything else (normal) |
| `ttl` | Display time in ms (clamped to 2.5–6 s) |
| `soft` | If `true`, held while you are typing (max 90 s) |

## Configuration

| Setting | Where |
| --- | --- |
| `PET_PORT` (default `7777`) | environment |
| `PET_OWN_NOTIFY=1` | environment, enables notification server |
| `PET_IGNORE_APPS=App1,App2` | environment, notifications from these apps are dropped |
| Window size and off-screen padding | `src/lib/config.js` |
| Drink / pomodoro durations | `src/features/reminders.js` |
| CPU / memory "busy" thresholds | `platform/linux.js` (`createLoadMonitor`) |
| Fade opacity | `src/styles/pet.css` (`body.ghost`) |

Note: persisted state lives in `localStorage` for the hub origin, so changing `PET_PORT` starts with fresh state.

## Project structure

```
main.js              Electron main process: window, IPC, right-click menu
preload.js           contextBridge (window.petHost)
server.js            Event hub (SSE) and static server
notify-server.js     D-Bus notification server
platform/linux.js    X11 / /proc / /sys probes (battery, active window, desktop, load)
integrations/herdr.js  Focus the Herdr agent a notification refers to
src/
  index.html
  styles/            CSS
  lib/               config and pure logic (unit tested)
  core/              shared state, event queue, placement, env feed, boot
  ui/                bubble and input handling
  features/          behavior, reminders, awareness
test/                node:test unit tests
```

Scripts in `src/` are plain `<script>` tags sharing one global scope, so the load order in `src/index.html` matters (`state.js` first, `boot.js` last).

## Limitations

- X11 only; Wayland, macOS and Windows are not supported.
- "Typing" is inferred from a still mouse with an active window under the pet; the keyboard is not read.
- Only the pure logic is covered by tests; DOM, Electron and D-Bus code was checked manually.
