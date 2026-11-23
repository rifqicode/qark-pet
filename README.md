# qark-pet

<p align="center">
  <img src="assets/pet-idle.gif" alt="qark-pet Idle" width="140" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/pet-peeking.gif" alt="qark-pet Peeking" width="240" />
</p>

A lightweight, transparent Electron desktop pet (an orange cat) that lives on your screen. It keeps you healthy with water, eye-rest, and pomodoro breaks, acts as your desktop notification bubble, jams to your music, and automatically tucks itself into screen-edge **Peeking Mode** whenever you enter fullscreen so it never blocks your work.

> Linux / X11 only for now (uses `xprop`, `xwininfo`, `/proc`, `/sys`, and D-Bus MPRIS). Developed on Pantheon (elementary OS).

---

## What the Pet Looks Like

- **Appearance:** A warm, chubby orange cat (`#ffb86b`) with soft shading, cute triangular ears, and a wagging tail.
- **Expressive Face:** Round dark eyes that follow your cursor or look toward your active window, blushing cheeks (`#ff8a8a`), and interactive blinking.
- **Dynamic Animations & States:**
  - **Idle / Breathing:** Rhythmic, gentle breathing and tail-wagging.
  - **Walking / Hopping:** Bouncy, energetic hops when navigating across the floor of your workspace.
  - **Peeking Mode ("Mode Ngintip"):** When an active window is maximized or fullscreen, the pet dashes to the nearest screen edge and tucks 50% of its body behind the screen bezel, leaning in with one paw resting on the bezel and twitching its ear. Symmetrically mirrored for both left and right screen borders.
  - **Music Jamming:** Grooves and sways rhythmically (`animation: groove`) when music playback is active via MPRIS (Spotify, Chrome, VLC, Cider, etc.).
  - **Ghost / Click-Through:** Softly fades (`opacity: .4` or `.25`) and passes mouse clicks through while you are typing over it or working in fullscreen.
  - **Petting & Dragging:** Click and drag to pick it up, drop to watch it fall and land with a squash-and-stretch bounce, or stroke back and forth to pet it and make hearts float up.
  - **Sleeping:** Drifts off to sleep with floating `z z` when idle for too long or in Do Not Disturb mode.

---

## Features

- **Fullscreen Edge Peeking:** Detects maximized and fullscreen windows (`_NET_WM_STATE_FULLSCREEN`, `_NET_WM_STATE_MAXIMIZED_HORZ`/`VERT`). Quickly scurries to the screen border, maintains a steady leaning angle into the screen, and displays notification bubbles cleanly without jumping.
- **Desktop Clutter Awareness:** Monitors total open application windows and browser tabs across Chrome, Chromium, Firefox, Edge, Brave, etc., giving friendly nudges when your workspace becomes too busy.
- **App & Coding Streak Tracking:** Identifies active window categories (code editor, terminal, browser, design, chat). Tracks continuous coding sessions and reminds you to commit your progress and rest your eyes after 45 minutes of non-stop work.
- **Media Player Integration:** Connects to D-Bus MPRIS (`org.mpris.MediaPlayer2.*`) to detect playback status and track titles, bobbing along to your music and announcing new tracks.
- **Health Reminders:**
  - Water reminder every 30 minutes.
  - 20-20-20 rule: looks away 20 feet for 20 seconds after 20 minutes of focus.
  - Pomodoro timer: 25 min work / 5 min short break, with a 15 min long break every 4 rounds. Click the pet to inspect pomodoro status.
- **Desktop Notification Server:** Can replace the system notification daemon (`org.freedesktop.Notifications`). Notifications appear as speech bubbles beside the pet, clamped to readable length, and clicking a bubble focuses the sender application.
- **Do Not Disturb (DND):** Silences notifications, puts the pet to sleep, and queues alerts in history.
- **Right-Click Context Menu:** Direct access to DND, pomodoro reset/skip, notification history with sender app recall, and quit.
- **System Load & Battery Awareness:** Displays "thinking" state when CPU or RAM usage spikes, and alerts on low battery or charger connection.
- **Persistence:** Remembers DND state, drink count, pomodoro timers, and notification history across reboots via local storage.

---

## Requirements

- Linux with X11 display server
- Node.js 22+
- `xprop` and `xwininfo` (`sudo apt install x11-utils`)
- `dbus-next` (included in package dependencies for MPRIS and notifications)
- `gtk-launch` (optional, for launching apps when notification bubbles are clicked)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start in development mode with auto-reload
npm run dev

# Start as the primary desktop notification server
npm run dev:notify

# Run standard production mode
npm start

# Run unit tests
npm test
```

### Notification Server Mode (`dev:notify` / `PET_OWN_NOTIFY=1`)

When running with `PET_OWN_NOTIFY=1`, the pet temporarily takes over the `org.freedesktop.Notifications` D-Bus bus name, restoring the default system notification daemon (such as `io.elementary.notifications`) upon clean exit.

If the pet is killed abruptly via `kill -9`, restore your desktop daemon manually:

```bash
io.elementary.notifications &
```

---

## Sending Custom Events

The pet runs a local HTTP event hub on `127.0.0.1:7777`. You can broadcast custom speech bubbles from bash scripts, cron jobs, or CI pipelines:

```bash
curl -d '{"msg":"Build completed successfully!","mood":"happy","ttl":5000}' http://127.0.0.1:7777/event
```

| Field | Description |
| --- | --- |
| `msg` | Text message to display inside the speech bubble. |
| `mood` | `'alert'` (highlighted reddish bubble, jumps queue) or `'happy'` (standard bubble). |
| `ttl` | Display duration in milliseconds (clamped between 2500ms and 6000ms). |
| `soft` | If `true`, suppresses the bubble while the user is actively typing. |

---

## Configuration

| Setting | Location | Description |
| --- | --- | --- |
| `PET_PORT` | Environment (default `7777`) | Local HTTP hub port. |
| `PET_OWN_NOTIFY=1` | Environment | Take over system notification service. |
| `PET_IGNORE_APPS` | Environment | Comma-separated list of application names to silence. |
| Window geometry & margins | `src/lib/config.js` | Base window width, height, and off-screen clamping (`PAD`). |
| Reminder intervals | `src/features/reminders.js` | Durations for water, 20-20-20, and Pomodoro phases. |
| Clutter & streak thresholds | `src/lib/logic.js` | Tab count thresholds and coding streak duration. |
| CPU / RAM thresholds | `platform/linux.js` | High system load detection limits. |
| CSS styling & animations | `src/styles/pet.css` | Opacities, keyframe animations, and peeking transforms. |

---

## Project Structure

```
desktop-pet/
├── assets/                  Preview GIFs and static assets
├── bin/
│   └── start.sh             Startup shell script with daemon fallback protection
├── platform/
│   └── linux.js             X11, /proc, /sys, and D-Bus MPRIS environment probes
├── integrations/
│   └── herdr.js             Herdr agent focus integration
├── src/
│   ├── index.html           Main DOM structure
│   ├── core/                State, events, environment feed, and placement
│   ├── features/            Behavior loop, health reminders, and awareness
│   ├── lib/                 Geometry config and pure logic (unit tested)
│   ├── styles/              CSS styling, sprites, and keyframe animations
│   └── ui/                  Speech bubble and pointer input handlers
├── test/                    node:test unit test suite
├── main.js                  Electron main process and native window manager
├── notify-server.js         D-Bus org.freedesktop.Notifications provider
└── server.js                Local SSE and HTTP hub server
```

---

## Limitations

- Native to X11 Linux environments (tested on elementary OS Gala / Pantheon). Wayland, macOS, and Windows are not currently supported.
- Typing detection is based on mouse stillness over active window geometry; no keyboard keystrokes are logged or monitored.
