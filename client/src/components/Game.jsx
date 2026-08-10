import React, { useEffect, useRef, useState, useCallback } from 'react';
import './Game.css';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 90;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 7;
const BRICK_WIDTH = 58;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 6;
const BRICK_OFFSET_TOP = 45;
const BRICK_OFFSET_LEFT = 12;
const ROW_COLORS = ['#ff4d4d', '#ff9f4d', '#ffe14d', '#8bff4d', '#4dd2ff'];
const LIVES_START = 3;
const API_BASE = '/api/scores';

function buildBricks() {
  const bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
        row: r,
        alive: true,
      });
    }
  }
  return bricks;
}

export default function Game() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Mutable game state that the render loop reads/writes every frame.
  const stateRef = useRef({
    paddleX: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT - 40,
    ballDX: 3,
    ballDY: -3,
    bricks: buildBricks(),
    score: 0,
    lives: LIVES_START,
    level: 1,
    running: false,
  });

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState('idle'); // idle | playing | gameover | win
  const [highScores, setHighScores] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fetchHighScores = useCallback(async () => {
    try {
      const res = await fetch(API_BASE);
      if (res.ok) {
        const data = await res.json();
        setHighScores(data);
      }
    } catch (err) {
      // Backend may not be running; fail silently in the UI.
      console.warn('Could not load high scores:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);

  const resetBallAndPaddle = () => {
    const s = stateRef.current;
    s.paddleX = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    s.ballX = CANVAS_WIDTH / 2;
    s.ballY = CANVAS_HEIGHT - 40;
    const speed = 3 + (s.level - 1) * 0.5;
    s.ballDX = speed;
    s.ballDY = -speed;
  };

  const startGame = () => {
    const s = stateRef.current;
    s.bricks = buildBricks();
    s.score = 0;
    s.lives = LIVES_START;
    s.level = 1;
    s.running = true;
    resetBallAndPaddle();
    setScore(0);
    setLives(LIVES_START);
    setLevel(1);
    setSubmitted(false);
    setPlayerName('');
    setStatus('playing');
  };

  const nextLevel = () => {
    const s = stateRef.current;
    s.bricks = buildBricks();
    s.level += 1;
    s.running = true;
    resetBallAndPaddle();
    setLevel(s.level);
    setStatus('playing');
  };

  const endGame = useCallback((won) => {
    const s = stateRef.current;
    s.running = false;
    setStatus(won ? 'win' : 'gameover');
  }, []);

  const submitScore = async () => {
    const name = playerName.trim() || 'Anonymous';
    try {
      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: name,
          score: stateRef.current.score,
          level: stateRef.current.level,
        }),
      });
      setSubmitted(true);
      fetchHighScores();
    } catch (err) {
      console.warn('Could not submit score:', err.message);
      setSubmitted(true);
    }
  };

  // Paddle controls: mouse / touch / keyboard
  useEffect(() => {
    const canvas = canvasRef.current;

    const movePaddleTo = (clientX) => {
      const rect = canvas.getBoundingClientRect();
	  const scale = CANVAS_WIDTH / rect.width;
      const relativeX = (clientX - rect.left) * scale;
      const s = stateRef.current;
      let x = relativeX - PADDLE_WIDTH / 2;
      x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x));
      s.paddleX = x;
    };

    const onMouseMove = (e) => movePaddleTo(e.clientX);
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        movePaddleTo(e.touches[0].clientX);
        e.preventDefault();
      }
    };

    const keysDown = {};
    const onKeyDown = (e) => {
      keysDown[e.key] = true;
    };
    const onKeyUp = (e) => {
      keysDown[e.key] = false;
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const keyLoop = setInterval(() => {
      const s = stateRef.current;
      const step = 8;
      if (keysDown['ArrowLeft'] || keysDown['a']) {
        s.paddleX = Math.max(0, s.paddleX - step);
      }
      if (keysDown['ArrowRight'] || keysDown['d']) {
        s.paddleX = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, s.paddleX + step);
      }
    }, 16);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(keyLoop);
    };
  }, []);

  // Main render/physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Bricks
      s.bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = ROW_COLORS[b.row % ROW_COLORS.length];
        ctx.fillRect(b.x, b.y, BRICK_WIDTH, BRICK_HEIGHT);
      });

      // Paddle
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(s.paddleX, CANVAS_HEIGHT - 24, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Ball
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc00';
      ctx.fill();
      ctx.closePath();

      if (s.running){

      // Move ball
      s.ballX += s.ballDX;
      s.ballY += s.ballDY;

      // Wall collisions
      if (s.ballX + BALL_RADIUS > CANVAS_WIDTH || s.ballX - BALL_RADIUS < 0) {
        s.ballDX = -s.ballDX;
      }
      if (s.ballY - BALL_RADIUS < 0) {
        s.ballDY = -s.ballDY;
      }

      // Paddle collision
      const paddleTop = CANVAS_HEIGHT - 24;
      if (
        s.ballY + BALL_RADIUS >= paddleTop &&
        s.ballY + BALL_RADIUS <= paddleTop + PADDLE_HEIGHT &&
        s.ballX >= s.paddleX &&
        s.ballX <= s.paddleX + PADDLE_WIDTH &&
        s.ballDY > 0
      ) {
        const hitPos = (s.ballX - s.paddleX) / PADDLE_WIDTH; // 0..1
        const angle = (hitPos - 0.5) * (Math.PI / 2.2); // -~40..~40 degrees
        const speed = Math.hypot(s.ballDX, s.ballDY);
        s.ballDX = speed * Math.sin(angle);
        s.ballDY = -Math.abs(speed * Math.cos(angle));
      }

      // Ball passed the paddle (bottom)
      if (s.ballY - BALL_RADIUS > CANVAS_HEIGHT) {
        s.lives -= 1;
        setLives(s.lives);
        if (s.lives <= 0) {
          endGame(false);
        } else {
          resetBallAndPaddle();
        }
      }

      // Brick collisions
      for (const b of s.bricks) {
        if (!b.alive) continue;
        if (
          s.ballX + BALL_RADIUS > b.x &&
          s.ballX - BALL_RADIUS < b.x + BRICK_WIDTH &&
          s.ballY + BALL_RADIUS > b.y &&
          s.ballY - BALL_RADIUS < b.y + BRICK_HEIGHT
        ) {
          b.alive = false;
          s.ballDY = -s.ballDY;
          s.score += 10;
          setScore(s.score);
          break;
        }
      }

      // Win condition
      if (s.bricks.every((b) => !b.alive)) {
        endGame(true);
      }

	}
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endGame]);

  return (
    <div className="game-wrapper">
      <div className="hud">
        <div>Score: <span>{score}</span></div>
        <div>Lives: <span>{lives}</span></div>
        <div>Level: <span>{level}</span></div>
      </div>

      <div className="overlay">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

        {status !== 'playing' && (
          <div className="overlay-panel">
            {status === 'idle' && (
              <>
                <h2>BlockBreaker</h2>
                <p>Move the paddle to keep the ball from passing the bottom.<br />Clear every block to win the round.</p>
                <button onClick={startGame}>Start Game</button>
              </>
            )}

            {status === 'gameover' && (
              <>
                <h2>Game Over</h2>
                <p>Final Score: {score}</p>
                {!submitted && (
                  <>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      maxLength={20}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                    <button onClick={submitScore}>Save Score</button>
                  </>
               )}
				{submitted && <p style={{ color: '#8bff4d' }}>Score saved!</p>}
				<button onClick={startGame}>Play Again</button>
				</>
			)}

            {status === 'win' && (
              <>
                <h2>Level Cleared!</h2>
                <p>Score: {score}</p>
                <button onClick={nextLevel}>Next Level</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="controls">
        Move with your mouse, touch, or the Left/Right arrow keys.
      </div>

      <div className="high-scores">
        <h3>High Scores</h3>
        {highScores.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888' }}>No scores yet — be the first!</p>
        ) : (
          <ol>
            {highScores.map((s) => (
              <li key={s._id}>
                <span>{s.playerName}</span>
                <span>{s.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
