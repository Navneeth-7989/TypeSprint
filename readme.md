# SPRINT · Typing Race 🏁

A high-end, **desktop-only** single-player typing race — think TypeRacer, but instead of cars, hand-drawn **human runners** sprint down an athletics track. Every correct keystroke pushes your runner forward. Out-type four bots to win.

No frameworks, no build step. Pure **HTML + CSS + JavaScript** — the runners, dust, motion blur, and animations are all drawn and animated in CSS.

---

## 🎮 The race

You (gold) race against **four bots**:

| Racer  | Difficulty | Speed |
|--------|-----------|-------|
| **Rookie** | Easy   | ~50 WPM (never drops below 50) |
| **Blaze**  | Medium | ~75–80 WPM |
| **Nova**   | Medium | ~75–80 WPM |
| **Titan**  | Hard   | ~90–95 WPM, with random bursts **past 100 WPM** |

To reliably **win** you need to sustain **95+ WPM** with good accuracy — exactly as specified. Titan's occasional surges keep it a nail-biter.

### How to play
1. Pick a race length (Short / Medium / Long).
2. Hit **Start Race** (or press `Enter`).
3. After the `3 · 2 · 1 · GO!` countdown, type the passage.
   - Correct letters turn white and move your runner.
   - Typos highlight red — `Backspace` to fix, or push on (accuracy is tracked).
   - `Esc` quits back to the menu.
4. Cross the line first to win. Confetti + a scoreboard await.

---

## ▶️ Run it locally

It's a static site, so just open it — but a tiny local server avoids browser file restrictions:

```bash
# Option A: Python (already on most machines)
python -m http.server 5173
# then open http://localhost:5173

# Option B: Node
npx serve .
```

Or simply double-click `index.html`. (Best experienced in Chrome/Edge/Firefox on a real keyboard — mobile shows a "desktop only" screen by design.)

---

## 🚀 Deploy

Because it's fully static, it deploys anywhere in seconds. No config needed.

### Vercel (recommended)
```bash
npm i -g vercel
vercel        # from this folder — accept the defaults
vercel --prod # promote to production
```
Or: push this folder to GitHub → **vercel.com** → *New Project* → import the repo → **Deploy**. Framework preset: **Other**. No build command, output dir = `./`.

### Netlify
- Drag-and-drop this folder onto **app.netlify.com/drop**, **or**
```bash
npm i -g netlify-cli
netlify deploy --dir . --prod
```

### GitHub Pages
1. Push these files to a repo.
2. Repo **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Your game goes live at `https://<user>.github.io/<repo>/`.

### Cloudflare Pages
**dash.cloudflare.com → Pages → Create → Direct Upload**, drop the folder, done.

---

## 📁 Files
```
index.html   — markup + screens (menu / race / results)
styles.css   — all visuals: CSS-drawn runners, track, animations
game.js       — race loop, bot AI, typing engine, scoring
```

Everything is self-contained (only Google Fonts is loaded from a CDN). Tweak bot speeds in the `BOTS` array at the top of `game.js`.
