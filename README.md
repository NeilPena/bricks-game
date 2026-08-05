# Breakout — MERN Stack Game

A classic brick-breaker: bounce the ball from the paddle (bottom) up into the
blocks (top), clearing them for points. Lose a life every time the ball gets
past the paddle; the game ends when your lives run out. High scores are
saved to MongoDB through an Express API.

## Stack
- **M**ongoDB — stores high scores
- **E**xpress — REST API (`/api/scores`)
- **R**eact — game rendered on an HTML5 canvas
- **N**ode — server runtime

## Project structure
```
breakout-mern/
├── server/          Express + Mongoose API
│   ├── models/Score.js
│   ├── routes/scores.js
│   └── server.js
└── client/           React app (Create React App)
    └── src/components/Game.jsx   <- the game itself
```

## Setup

### 1. Backend
```bash
cd server
npm install
cp .env.example .env      # edit MONGO_URI if needed
npm start                 # or: npm run dev (nodemon)
```
Runs on http://localhost:5000. Requires a MongoDB instance — either a local
`mongod` on the default port, or a connection string from MongoDB Atlas
pasted into `.env`.

### 2. Frontend
```bash
cd client
npm install
npm start
```
Runs on http://localhost:3000 and proxies API calls to the server (see
`proxy` in `client/package.json`).

## How the game works
- Bricks fill the top of the board in 5 colored rows.
- Drag the paddle with your mouse/touch, or use the Left/Right arrow keys.
- Every brick hit reverses the ball's vertical direction and adds 10 points.
- Hitting the ball off-center on the paddle angles the return shot.
- If the ball passes below the paddle, you lose a life and it resets.
- Clear all bricks to advance a level (bricks respawn, ball speeds up slightly).
- Run out of lives → Game Over → optionally submit your name to the high
  score board (top 10, stored in MongoDB).

## API
| Method | Route          | Body                                  | Description            |
|--------|----------------|----------------------------------------|-------------------------|
| GET    | /api/scores    | —                                      | Top 10 scores           |
| POST   | /api/scores    | `{ playerName, score, level }`         | Save a new score        |

## Notes / possible extensions
- Add user auth so scores are tied to accounts.
- Add power-ups (multi-ball, wider paddle, slow-ball) as bonus bricks.
- Persist in-progress games (currently a full page refresh resets state).
