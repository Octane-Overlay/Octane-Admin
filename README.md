# 🛠️🚗 Octane-Admin

> 🎛️ The control panel for the [Octane](https://github.com/octane-rl) Rocket League overlay toolkit.

`Octane-Admin` is a tiny React app that lets a caster, producer, or solo streamer set team names, team logos, series length, and the running series score. It talks to [Octane-Bridge](https://github.com/Octane-Overlay/Octane-Bridge) over plain HTTP, and the bridge fans the changes out to every connected overlay in real time. 📡✨

## 📦 What's in the box

* 🏷️ **Team names** for the blue and orange sides.
* 🖼️ **Team logos** uploaded straight from disk (stored as data URLs, ≤ 500 KB).
* 🏆 **Series length** picker (Best of 1, 3, 5, 7, or 9).
* ➕➖ **Series wins** counters, automatically capped to the win threshold.
* 💾 **Auto-save** with a 250 ms debounce. No manual save needed.
* 🔌 **Live connection badge** (`connecting…`, `connection established`, `saving…`, `not connected`).
* 🔁 **Auto-reconnect** every 3s if the bridge goes away mid-session.

## 🚀 Getting started

```bash
npm install
npm start
```

The dev server listens on **port 3001** (CRA's default 3000 is left free for other overlay tooling). Open 👉 [http://localhost:3001](http://localhost:3001).

```bash
npm run build      # 📦 production build into ./build
npm test           # 🧪 react-scripts test runner
```

## 🛠️ Setup

To use the Admin Panel, make sure:

1. 🎯 Rocket League is running (only needed for live overlays, not for editing meta).
2. 🛜 [Octane-Bridge](https://github.com/Octane-Overlay/Octane-Bridge) is running on the same machine.
3. 🔢 The bridge's HTTP/WS port is reachable at `http://127.0.0.1:49124` (the bridge default).

> 🪧 The bridge port is currently hard-coded in `src/App.tsx` as `BRIDGE_URL`. If you've changed the bridge's `WS_PORT` in `app.ini`, edit this constant to match. 🔧

## 🧠 How it works

```
┌───────────────┐   GET  /meta    ┌──────────────┐   /meta WS    ┌──────────────┐
│ Octane-Admin  │ ──────────────▶ │ Octane-Bridge│ ────────────▶ │  Overlays 🎬 │
│   (this app)  │ ◀────── JSON ── │   meta.json  │               │ (Octane-React│
│               │  POST /meta     │   on disk 💾 │               │   consumers) │
└───────────────┘ ──────────────▶ └──────────────┘               └──────────────┘
```

* On load, the admin does a single **`GET /meta`** to pull the current state from the bridge.
* Every edit triggers a debounced **`POST /meta`** with the full meta document.
* The bridge persists to `meta.json` and broadcasts the new meta over WebSocket so every overlay updates instantly via [`useOctaneMeta`](https://github.com/Octane-Overlay/Octane-React).
* If the bridge stops responding, the admin flips to `not connected` and silently retries `GET /meta` every 3s. As soon as the bridge is back, the local edits are pushed up. 🔁

## 🧾 The meta document

The shape on the wire (and in `meta.json`) is:

```ts
type Meta = {
  bestOf: number                 // 1 | 3 | 5 | 7 | 9
  blue:   { name: string; logo: string; wins: number }
  orange: { name: string; logo: string; wins: number }
}
```

* `logo` is a **data URL** (e.g. `data:image/png;base64,...`). Files over 500 KB are rejected client-side to keep the WS payload sane.
* `wins` is clamped to `ceil(bestOf / 2)` whenever `bestOf` shrinks.
* The whole document is sent on every change — there are no partial updates. 🪶

## 🎛️ The UI

| Control 🎟️ | What it does |
| --- | --- |
| 🏆 **Series length** | Pick Best of 1 / 3 / 5 / 7 / 9. Caps both teams' wins automatically. |
| 🏷️ **Name** | Free-form text per team; shown in the overlay scoreboard. |
| 🖼️ **Logo** | File picker; the image is read as a data URL and embedded in `meta`. |
| 🧹 **Clear logo** | Drops the data URL back to an empty string. |
| ➕➖ **Series wins** | Stepper buttons, disabled at the min/max for the chosen series length. |
| 🔌 **Status badge** | Live connection state to the bridge. |

## 🧯 Troubleshooting

* 🔴 **`not connected — is the Bridge running?`** → start the bridge. The admin will reconnect on its own.
* 🟡 **Edits don't show up in the overlay** → make sure your overlay is using [`useOctaneMeta`](https://github.com/Octane-Overlay/Octane-React) and pointed at the same bridge port.
* 🟠 **Logo too large** → the file picker rejects anything over 500 KB. Run it through an optimiser first.
* 🔵 **Wrong port** → edit `BRIDGE_URL` in `src/App.tsx` to match your bridge's `WS_PORT`.

## 🤝 Contributing

PRs welcome! 💚 Please run `npm run build` before opening one to make sure the app works.

## 📜 License

[MIT](./LICENSE) 🆓
