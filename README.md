# QuizForge

Live quiz games by ByteForge Studios. Host with a PIN, play solo against bots, or run the desktop app offline and on your local Wi-Fi.

## 16 game modes (each with its own soundtrack)
- Speed & racing: **Classic Race**, **Space Race** (first to the finish), **Blitz** (faster answers score more), **Summit** (climb, slip on wrong answers)
- Luck & strategy: **Gold Rush** (chests, steals, swaps), **Lucky Spin** (prize wheel), **Dig Site** (gold, gems and bombs), **Deep Dive** (fishing, rarer fish with streaks), **Forge Factory** (build machines that earn every second)
- Battle: **Knockout** (3 hearts, take hearts from others), **Sudden Death** (one wrong answer and you're out), **Tower Defense**, **Color Wars** (claim and steal tiles on a shared map)
- Teams & co-op: **Core Clash**, **Tug of War**, **Boss Battle** (everyone vs one boss)

Each mode has its own synthesized competitive soundtrack that speeds up in the last 30 seconds.

## Question library
122 official sets with 2,644 questions across Math, Science, English, Social Studies, Geography, World Languages, Computer Science, Health and Arts & Music, each labeled with grade band and difficulty. Math sets are generated with exact answers and wrong answers based on common mistakes. To change or add official sets, edit the files in `tools/` and run `python tools/build_sets.py`, then bump `VERSION` in that file so servers re-import them.

## Making quizzes
- Build quizzes by hand. AI is optional.
- Question types: multiple choice (one or more right answers), true or false, and type the answer (several accepted answers, forgiving of capitals and small typos).
- Add your own picture to any question. Pictures are shrunk automatically.
- Reorder questions, paste many at once, or generate them with AI from a topic or your notes.
- Give your set a subject, grade and difficulty, then publish it to Discover. Anyone can find it with search and filters, play it, or copy it.

## Accounts and progress
- Sign up with a username and password. Guests can still join and play.
- Earn coins and XP from every game, plus a daily bonus.
- Open Wild, Cosmic and Forge packs in the Shop for collectible Forgelings, from Uncommon to Legendary.
- Game history saves every game you host, with per-question accuracy.

## Run
```
npm install
npm start          # web version on http://localhost:3000
npm run desktop    # desktop app
npm run dist       # Windows build into dist/win-unpacked, then compile installer/quizforge.iss
```

## Environment variables
- `DATABASE_URL`: Neon connection string. Without it, data is saved in `userdata/db.json`.
- `APP_SECRET`: encrypts the AI keys people save in Settings.
- `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`: optional shared keys for AI question sets. People can also save their own Anthropic or Gemini key in Settings.
- `AI_MODEL`: optional, defaults to `claude-haiku-5-5`. `GEMINI_MODEL`: optional, defaults to `gemini-flash-latest` (falls back to `gemini-2.5-flash`).
- `PGSSL=off`: only for testing against a local Postgres without SSL.

## Deploy to Render
Use `render.yaml`, then set `DATABASE_URL` (and optionally the AI keys) in the Render dashboard.
Free Render instances sleep after a while without visitors, and the first visit then shows Render's wake-up screen for up to a minute. The desktop app shows its own connecting screen instead. To avoid sleeping entirely, use a paid instance type.

## Layout
- `server/index.js` routes, `server/games.js` live games, `server/store.js` question sets
- `server/db.js` Neon or file storage · `server/auth.js` accounts · `server/progress.js` Forgelings, packs, rewards · `server/ai.js` AI sets
- `public/` client · `desktop/main.js` Electron · `installer/quizforge.iss` Inno Setup
