import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';

const BUNDLE_STYLES = `*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  background-color: #0a0a0a;
}

body {
  font-family: var(--ink-font-label, system-ui, sans-serif);
  color: #ffffff;
  overflow: hidden;
}

#root {
  width: 100vw;
  height: 100vh;
}

input,
button {
  border: none;
  outline: none;
  background: none;
}

button {
  font-family: inherit;
}

img {
  max-width: 100%;
  display: block;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

a {
  color: inherit;
  text-decoration: none;
}

.ink-fullscreen {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.ink-main-layout {
  width: 100vw;
  height: 100vh;
  padding: 40px 40px 30px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 28px;
}

.ink-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ink-center-column {
  display: grid;
  grid-template-columns: 55% 45%;
  gap: 40px;
  align-items: stretch;
}

.ink-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 14px;
  opacity: 0.9;
}

.ink-main-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
}

.ink-main-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 10px;
}

.ink-character-panel {
  padding: 20px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 14px;
}

.ink-character-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ink-character-avatar-wrap {
  position: relative;
  width: 100%;
  padding-top: 100%;
}

.ink-character-avatar-wrap img {
  position: absolute;
  inset: 8%;
  width: 84%;
  height: 84%;
  object-fit: cover;
  border-radius: 999px;
}

.ink-character-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  border: 1px dashed rgba(255, 255, 255, 0.7);
  pointer-events: none;
}

.ink-char-burst {
  position: absolute;
  inset: -8px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.ink-character-loading {
  opacity: 0.8;
  font-style: italic;
}

.ink-character-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0 4px;
}

.ink-character-circle {
  position: relative;
  width: min(260px, 46vw);
  max-width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  overflow: hidden;
}

.ink-character-circle::before {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: inherit;
  border: 2px dashed rgba(255, 255, 255, 0.6);
  opacity: 0.9;
  pointer-events: none;
}

.ink-character-circle-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='noStitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.16'/%3E%3C/svg%3E");
  mix-blend-mode: screen;
  opacity: 0.32;
}

.ink-character-circle-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ink-character-random-btn {
  position: absolute;
  right: 16%;
  bottom: 4%;
  transform: translate(30%, 30%);
  border-radius: 999px;
  padding: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(35, 35, 35, 0.96);
}

.ink-chalk-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px 11px;
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border-radius: 999px;
  cursor: pointer;
  will-change: transform;
  transform-origin: center;
  transition: transform 0.16s ease-out, box-shadow 0.16s ease-out, filter 0.16s ease-out;
}

.ink-chalk-button--primary {
  background-color: #cc0000;
  color: #ffffff;
}

.ink-chalk-button--secondary {
  background-color: #333333;
  color: #ffffff;
}

.ink-chalk-button--ghost {
  border-radius: 999px;
  padding-inline: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.ink-chalk-button:hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 0 18px rgba(204, 0, 0, 0.9);
}

.ink-chalk-button:active {
  transform: translateY(0) scale(0.96);
}

.ink-chalk-button-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ink-chalk-button-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ink-chalk-button-label {
  font-family: var(--ink-font-heading);
}

.ink-how-panel {
  padding: 16px 18px;
  font-size: 14px;
  transform-origin: top;
  clip-path: inset(0% 0% 0% 0% round 12px);
}

.ink-how-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0;
  margin: 0 0 6px;
  cursor: pointer;
}

.ink-how-toggle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  opacity: 0.8;
}

.ink-how-body {
  overflow: hidden;
}

.ink-how-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ink-how-steps li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ink-how-icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.ink-how-icon--blood {
  border-color: var(--ink-blood-bright);
}

.ink-name-input-field {
  width: 100%;
  padding: 12px 14px 10px;
  background: transparent;
  color: #ffffff;
  font-family: var(--ink-font-heading);
  font-size: 28px;
  letter-spacing: 0.04em;
  border-radius: 4px;
  position: relative;
  caret-color: transparent;
  --caret-opacity: 1;
}

.ink-name-input-field::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.ink-name-input-field::after {
  content: '';
}

.ink-name-input-field:focus-visible {
  outline: none;
}

.ink-name-input-border {
  position: absolute;
  left: 0;
  right: 0;
  height: 12px;
  background-repeat: repeat-x;
  background-size: contain;
  opacity: 0.9;
  pointer-events: none;
}

.ink-name-input-border--top {
  top: -10px;
  background-image: url('/assets/ui/UI_borderLine-1.png');
}

.ink-name-input-border--bottom {
  bottom: -10px;
  background-image: url('/assets/ui/UI_borderLine-2.png');
}

.ink-name-input-field {
  position: relative;
}

.ink-name-input-field::after {
  content: '';
  position: absolute;
  right: -2px;
  bottom: 6px;
  width: 2px;
  height: 1.2em;
  background: rgba(255, 255, 255, 0.9);
  opacity: var(--caret-opacity);
  pointer-events: none;
}

.ink-language-toggle {
  position: relative;
}

.ink-language-menu {
  position: absolute;
  right: 32px;
  top: 40px;
  padding: 6px 8px;
  background-color: rgba(35, 35, 35, 0.95);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.ink-language-option {
  padding: 2px 4px;
  text-align: left;
  cursor: pointer;
}

.ink-language-option:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.ink-join-room-row {
  display: flex;
  align-items: center;
  gap: 0;
  margin-top: 4px;
}

.ink-join-input {
  flex: 1 1 auto;
  padding: 10px 12px 9px;
  background-color: transparent;
  border-radius: 6px 0 0 6px;
  border: 2px solid #cc0000;
  border-right: none;
  color: #ffffff;
  font-family: var(--ink-font-heading);
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.ink-join-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.ink-cta-start {
  width: 100%;
  padding: 18px 20px;
  background-color: #cc0000;
  color: #ffffff;
  border-radius: 10px;
  border: none;
  font-family: var(--ink-font-heading);
  font-size: 22px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: center;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    background-color 0.12s ease-out;
}

.ink-cta-start:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 0 18px rgba(204, 0, 0, 0.9);
  background-color: #e00000;
}

.ink-cta-start:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: none;
}

.ink-cta-join {
  flex: 0 0 auto;
  padding: 12px 18px;
  background-color: #cc0000;
  color: #ffffff;
  border-radius: 0 6px 6px 0;
  border: 2px solid #cc0000;
  font-family: var(--ink-font-heading);
  font-size: 16px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: center;
  transition: transform 0.12s ease-out, box-shadow 0.12s ease-out,
    background-color 0.12s ease-out;
}

.ink-cta-join:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 0 16px rgba(204, 0, 0, 0.9);
  background-color: #e00000;
}

.ink-cta-join:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: none;
}

.ink-room-code-note {
  margin-top: 6px;
  font-size: 13px;
}

.ink-room-code-value {
  font-family: var(--ink-font-heading);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}


@media (max-width: 900px) {
  .ink-main-layout {
    grid-template-rows: auto auto auto;
    max-height: none;
  }

  .ink-center-column {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: auto;
  }

  .ink-character-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}


:root {
  --ink-bg: #0a0a0a;
  --ink-chalk: #ffffff;
  --ink-blood: #8b0000;
  --ink-blood-bright: #a30000;

  --ink-font-heading: 'Caveat', system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
  --ink-font-label: 'Patrick Hand', system-ui, -apple-system,
    BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --ink-font-secondary: 'Gloria Hallelujah', system-ui, -apple-system,
    BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --ink-chalk-thickness: 1.5px;
  --ink-chalk-radius: 12px;
  --ink-chalk-shadow-soft: 0 0 0 rgba(0, 0, 0, 0);
}

.ink-app-root {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(163, 0, 0, 0.15), transparent 55%),
    radial-gradient(circle at bottom, rgba(139, 0, 0, 0.22), transparent 60%),
    var(--ink-bg);
  color: var(--ink-chalk);
  font-family: var(--ink-font-label);
  display: flex;
  align-items: stretch;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.ink-layer {
  position: relative;
  z-index: 1;
}

.ink-chalk-surface {
  position: relative;
  border-radius: var(--ink-chalk-radius);
  border: var(--ink-chalk-thickness) solid rgba(255, 255, 255, 0.7);
  box-shadow: var(--ink-chalk-shadow-soft);
  background: radial-gradient(
      circle at top left,
      rgba(255, 255, 255, 0.04),
      transparent 55%
    ),
    radial-gradient(
      circle at bottom right,
      rgba(0, 0, 0, 0.8),
      rgba(0, 0, 0, 0.95)
    );
  overflow: hidden;
  filter: url(#ink-rough-edge);
}

.ink-chalk-surface::before {
  content: '';
  position: absolute;
  inset: -10%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='noStitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.12'/%3E%3C/svg%3E");
  mix-blend-mode: screen;
  opacity: 0.22;
  pointer-events: none;
}

.ink-chalk-surface::after {
  content: '';
  position: absolute;
  inset: -5%;
  background: repeating-linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.03),
    rgba(255, 255, 255, 0.03) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.25;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.ink-chalk-outline {
  border-radius: var(--ink-chalk-radius);
  border: 1.5px dashed rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.ink-jitter-soft {
  will-change: transform;
}

.ink-blood-accent {
  color: var(--ink-blood-bright);
}

.ink-blood-underline {
  position: relative;
}

.ink-blood-underline::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -0.1em;
  height: 0.16em;
  background: linear-gradient(
    90deg,
    rgba(139, 0, 0, 0.92),
    rgba(163, 0, 0, 0.98),
    rgba(139, 0, 0, 0.92)
  );
  border-radius: 999px;
  transform-origin: left;
}

.ink-chalk-heading {
  font-family: var(--ink-font-heading);
  letter-spacing: 0.03em;
}

.ink-chalk-label {
  font-family: var(--ink-font-label);
}

.ink-chalk-secondary {
  font-family: var(--ink-font-secondary);
}

.ink-chalk-noise-overlay {
  pointer-events: none;
  position: fixed;
  inset: -10px;
  mix-blend-mode: soft-light;
  opacity: 0.12;
  z-index: 0;
}

.ink-chalk-noise-overlay canvas {
  width: 100%;
  height: 100%;
  display: block;
}

`;
const STYLE_ID = 'ink-home-bundle-styles';

function ensureStylesInjected() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = BUNDLE_STYLES;
  document.head.appendChild(style);
}

const STORAGE_KEY = 'inkognito-lobby-state-v1';

function loadLobbyState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLobbyState(partial) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadLobbyState() || {};
    const next = { ...current, ...partial };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function generateLobbyId() {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `L-${now}-${rand}`;
}

const ROOM_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(length = 6) {
  let out = '';
  const max = ROOM_CHARS.length;
  for (let i = 0; i < length; i += 1) {
    out += ROOM_CHARS[Math.floor(Math.random() * max)];
  }
  return out;
}

function ChalkNoiseOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrame;

    const resize = () => {
      canvas.width = window.innerWidth * 0.6;
      canvas.height = window.innerHeight * 0.6;
    };

    const drawNoise = () => {
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const buffer = imageData.data;

      for (let i = 0; i < buffer.length; i += 4) {
        const shade = Math.random() * 45;
        buffer[i] = shade;
        buffer[i + 1] = shade;
        buffer[i + 2] = shade;
        buffer[i + 3] = 40;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      drawNoise();
      animationFrame = requestAnimationFrame(loop);
    };

    resize();
    loop();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div class="ink-chalk-noise-overlay">
      <canvas ref={canvasRef} />
    </div>
  );
}

const MIN_SWAP = 0.12;
const MAX_SWAP = 0.2;

function LogoJitter() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const lastSwapRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  const nextDelayRef = useRef(MIN_SWAP + Math.random() * (MAX_SWAP - MIN_SWAP));

  const frames = ['/assets/logo/frame1.png', '/assets/logo/frame2.png'];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const base = { x: 0, y: 0, rotation: 0, scale: 1 };

    const jitterTimeline = gsap.timeline({
      repeat: -1,
      defaults: { ease: 'sine.inOut', duration: 1.4 }
    });

    jitterTimeline
      .to(el, { x: 0.3, y: -0.4, rotation: -0.3, scale: 1.01 })
      .to(el, { x: -0.4, y: 0.2, rotation: 0.25, scale: 0.995 })
      .to(el, { ...base });

    const ticker = (time) => {
      const now = time / 1000;
      const elapsed = now - lastSwapRef.current;
      if (elapsed >= nextDelayRef.current) {
        setCurrent((c) => (c === 0 ? 1 : 0));
        lastSwapRef.current = now;
        nextDelayRef.current = MIN_SWAP + Math.random() * (MAX_SWAP - MIN_SWAP);

        gsap.fromTo(
          el,
          { filter: 'brightness(1.08) contrast(1.1)' },
          { filter: 'brightness(1) contrast(1)', duration: 0.12, ease: 'power1.out' }
        );
      }
    };

    gsap.ticker.add(ticker);

    return () => {
      jitterTimeline.kill();
      gsap.ticker.remove(ticker);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      class="ink-jitter-soft"
      style={{ width: '420px', maxWidth: '70vw', margin: '0 auto 24px' }}
      aria-label="INKOGNITO logo"
    >
      <img
        src={frames[current]}
        alt="INKOGNITO"
        style={{ width: '100%', imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}

function NameInput({ value, onChange }) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 4 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.1 }
    );
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });
    tl.to(input, { '--caret-opacity': 1, duration: 0.25, ease: 'power1.inOut' })
      .to(input, { '--caret-opacity': 0, duration: 0.25, ease: 'power1.inOut' });

    return () => tl.kill();
  }, []);

  return (
    <div
      ref={wrapperRef}
      class="ink-name-input ink-chalk-outline"
      style={{ padding: '20px 18px 18px', marginBottom: '16px', position: 'relative' }}
    >
      <label
        class="ink-chalk-label"
        style={{
          fontSize: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          opacity: 0.95,
          marginBottom: '8px',
          display: 'inline-flex',
          gap: '4px',
          alignItems: 'center'
        }}
      >
        <span style={{ color: '#ffffff' }}>ALIAS</span>
        <span class="ink-blood-accent" style={{ fontFamily: 'var(--ink-font-secondary)' }}>
          (required)
        </span>
      </label>
      <div style={{ position: 'relative', marginTop: '4px' }}>
        <input
          ref={inputRef}
          class="ink-name-input-field"
          type="text"
          maxLength={16}
          placeholder="Enter your name"
          value={value}
          onInput={(e) => onChange?.(e.currentTarget.value)}
        />
        <div class="ink-name-input-border ink-name-input-border--top" />
        <div class="ink-name-input-border ink-name-input-border--bottom" />
      </div>
    </div>
  );
}

const characterImports = import.meta.glob('/assets/characters/*', { eager: false });

function CharacterSelector({ selectedId, reservedIds = [], onSelect }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const containerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const entries = Object.entries(characterImports);
        const loaded = await Promise.all(
          entries.map(async ([path, loader]) => {
            const mod = await loader();
            return { id: path, src: mod.default || mod };
          })
        );
        if (!cancelled) {
          setCharacters(loaded);
          setLoading(false);

          if (loaded.length) {
            const initialIndex = Math.max(0, loaded.findIndex((c) => !reservedIds.includes(c.id)));
            const safeIndex = Number.isFinite(initialIndex) ? initialIndex : 0;
            setCurrentIndex(safeIndex);
            const chosen = loaded[safeIndex];
            if (chosen && !selectedId) {
              onSelect?.(chosen.id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load characters', e);
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [onSelect, selectedId]);

  useEffect(() => {
    const el = containerRef.current;
    const circle = circleRef.current;
    if (!el || !circle) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.1 });

    if (prefersReduced) return;

    const idle = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut', duration: 2.6 } });

    idle.to(circle, { x: 0.5, y: -0.5 }).to(circle, { x: -0.5, y: 0.4 }).to(circle, { x: 0, y: 0 });

    return () => {
      idle.kill();
    };
  }, []);

  const currentCharacter = !loading && characters.length ? characters[currentIndex] : null;

  const pickRandomIndex = () => {
    if (!characters.length) return 0;

    const available = characters
      .map((c, idx) => ({ c, idx }))
      .filter((entry) => !reservedIds.includes(entry.c.id) && entry.idx !== currentIndex);

    const pool = available.length
      ? available
      : characters.map((c, idx) => ({ c, idx })).filter((e) => e.idx !== currentIndex);

    if (!pool.length) return currentIndex;

    const choice = pool[Math.floor(Math.random() * pool.length)];
    return choice.idx;
  };

  const runChalkBurst = () => {
    const circle = circleRef.current;
    if (!circle) return;

    const burst = document.createElement('div');
    burst.className = 'ink-char-burst';
    circle.appendChild(burst);

    gsap
      .fromTo(
        burst,
        { scale: 0.8, opacity: 0.9 },
        { scale: 1.6, opacity: 0, duration: 0.4, ease: 'power2.out', onComplete: () => burst.remove() }
      )
      .play();
  };

  const pickAndSet = (idx) => {
    setCurrentIndex(idx);
    const finalChar = characters[idx];
    if (finalChar) {
      onSelect?.(finalChar.id);
    }
  };

  const handleShuffle = () => {
    if (!characters.length || isShuffling) return;

    const circle = circleRef.current;
    if (!circle) return;

    setIsShuffling(true);

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tl = gsap.timeline({ onComplete: () => setIsShuffling(false) });

    if (!prefersReduced) {
      tl.to(circle, { scale: 0.92, rotation: -5, opacity: 0, duration: 0.15, ease: 'power2.in' });

      const flashCount = 3;
      for (let i = 0; i < flashCount; i += 1) {
        tl.add(() => pickAndSet(pickRandomIndex()));
        tl.to(circle, { opacity: 1, duration: 0.05 + Math.random() * 0.02, ease: 'none' });
        tl.to(circle, { opacity: 0, duration: 0.05 + Math.random() * 0.02, ease: 'none' });
      }
    }

    tl.add(() => {
      const finalIndex = pickRandomIndex();
      pickAndSet(finalIndex);
      runChalkBurst();
    });

    tl.fromTo(
      circle,
      { scale: 0.85, rotation: 6, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
    );

    if (!prefersReduced) {
      tl.to(circle, { x: 0.8, y: -0.8, duration: 0.06, ease: 'power1.inOut' }, '-=0.12')
        .to(circle, { x: -0.6, y: 0.6, duration: 0.06, ease: 'power1.inOut' })
        .to(circle, { x: 0, y: 0, duration: 0.08, ease: 'power1.out' });
    }
  };

  return (
    <section ref={containerRef} class="ink-character-panel ink-chalk-outline">
      <div class="ink-character-header">
        <div class="ink-chalk-heading">Disguise</div>
      </div>

      {loading || !currentCharacter ? (
        <div class="ink-character-loading">Dusting off suspects?</div>
      ) : (
        <div class="ink-character-stage">
          <div ref={circleRef} class="ink-character-circle">
            <div class="ink-character-avatar-wrap">
              <img
                src={currentCharacter.src}
                loading="lazy"
                alt="Selected character"
                class="ink-character-circle-img"
              />
              <div class="ink-character-ring" />
            </div>
            <div class="ink-character-circle-grain" />
          </div>

          <button
            type="button"
            class="ink-character-random-btn"
            onClick={handleShuffle}
            aria-label="Randomize disguise"
          >
            <span class="ink-chalk-button-icon">
              <img src="/assets/ui/UI_Button_Chalk-15.png" alt="" />
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

function ChalkButton({ variant = 'primary', label, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(2)', stagger: 0.04 });
  }, []);

  const handleClick = (e) => {
    const el = ref.current;
    if (!el) {
      onClick?.(e);
      return;
    }

    const tl = gsap.timeline();
    tl.to(el, { scaleX: 0.95, scaleY: 0.9, duration: 0.08, ease: 'power2.in' }).to(el, {
      scaleX: 1.04,
      scaleY: 1.02,
      duration: 0.16,
      ease: 'elastic.out(1.2, 0.4)'
    });

    onClick?.(e);
  };

  return (
    <button type="button" ref={ref} class={`ink-chalk-button ink-chalk-button--${variant}`} onClick={handleClick}>
      <span class="ink-chalk-button-label">{label}</span>
    </button>
  );
}

function HowToPlayPanel() {
  const [open, setOpen] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    gsap.fromTo(panel, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.2 });
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const content = panel.querySelector('.ink-how-body');
    if (!content) return;

    const height = content.scrollHeight;

    if (open) {
      gsap.to(panel, { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 0.55, ease: 'power2.out' });
      gsap.fromTo(content, { height: 0, opacity: 0 }, { height, opacity: 1, duration: 0.55, ease: 'power2.out' });
    } else {
      gsap.to(panel, { clipPath: 'inset(0% 0% 96% 0% round 12px)', duration: 0.45, ease: 'power1.inOut' });
      gsap.to(content, { height: 0, opacity: 0, duration: 0.4, ease: 'power1.in' });
    }
  }, [open]);

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <section ref={panelRef} class="ink-how-panel ink-chalk-outline" aria-expanded={open}>
      <button class="ink-how-header" type="button" onClick={toggleOpen}>
        <div class="ink-chalk-heading ink-blood-underline">HOW TO PLAY</div>
        <span class="ink-how-toggle">{open ? '? close' : '+ open'}</span>
      </button>
      <div class="ink-how-body">
        <ol class="ink-how-steps">
          <li>
            <span class="ink-how-icon">?</span>
            <span>One player is the INKOGNITO.</span>
          </li>
          <li>
            <span class="ink-how-icon">?</span>
            <span>Others know the secret word.</span>
          </li>
          <li>
            <span class="ink-how-icon">?</span>
            <span>Players ask loaded questions.</span>
          </li>
          <li>
            <span class="ink-how-icon">?</span>
            <span>Expose who is faking it.</span>
          </li>
          <li>
            <span class="ink-how-icon ink-how-icon--blood">?</span>
            <span>Blend in. Do not get caught.</span>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function HomePage() {
  const [name, setName] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);
  const [language, setLanguage] = useState('English');
  const [lobbyId, setLobbyId] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [reservedCharacters, setReservedCharacters] = useState([]);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    ensureStylesInjected();
  }, []);

  useEffect(() => {
    const stored = loadLobbyState();
    if (!stored) return;

    if (stored.playerName) setName(stored.playerName);
    if (stored.selectedCharacterId) setSelectedCharacterId(stored.selectedCharacterId);
    if (stored.language) setLanguage(stored.language);
    if (stored.lobbyId) setLobbyId(stored.lobbyId);
    if (stored.roomCode) setRoomCode(stored.roomCode);
    if (Array.isArray(stored.reservedCharacters)) setReservedCharacters(stored.reservedCharacters);
  }, []);

  useEffect(() => {
    saveLobbyState({ playerName: name, selectedCharacterId, language, lobbyId, roomCode, reservedCharacters });
  }, [name, selectedCharacterId, language, lobbyId, roomCode, reservedCharacters]);

  const handleStartGame = () => {
    if (!name || !selectedCharacterId) return;
    const id = lobbyId || generateLobbyId();
    setLobbyId(id);
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const handleCreatePrivateRoom = () => {
    if (!name || !selectedCharacterId) return;
    const code = generateRoomCode();
    setRoomCode(code);
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const handleJoinRoom = () => {
    if (!name || !selectedCharacterId || !joinCode.trim()) return;
    if (!reservedCharacters.includes(selectedCharacterId)) {
      setReservedCharacters((prev) => [...prev, selectedCharacterId]);
    }
  };

  const languages = ['English', 'Hindi', 'Spanish'];

  return (
    <div class="ink-app-root">
      <ChalkNoiseOverlay />
      <main class="ink-fullscreen ink-layer">
        <section class="ink-chalk-surface ink-main-layout">
          <header class="ink-top-bar">
            <div
              style={{
                fontFamily: 'var(--ink-font-heading)',
                letterSpacing: '0.18em',
                fontSize: '13px',
                textTransform: 'uppercase',
                opacity: 0.9
              }}
            >
              <span class="ink-blood-accent">?</span> INKOGNITO LOBBY
            </div>
            <div
              class="ink-chalk-outline ink-language-toggle"
              style={{
                padding: '6px 10px 7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              onClick={() => setLanguageOpen((v) => !v)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.9)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px'
                }}
              >
                ??
              </span>
              <span class="ink-chalk-label">{language}</span>
            </div>
            {languageOpen && (
              <div class="ink-language-menu ink-chalk-outline">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    class="ink-language-option"
                    onClick={() => {
                      setLanguage(lang);
                      setLanguageOpen(false);
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </header>

          <section class="ink-center-column">
            <div class="ink-main-left">
              <LogoJitter />
              <NameInput value={name} onChange={setName} />
              <div class="ink-main-actions">
                <button type="button" class="ink-cta-start" onClick={handleStartGame}>
                  START GAME
                </button>
                <ChalkButton variant="secondary" label="Create Private Room" onClick={handleCreatePrivateRoom} />
                <div class="ink-join-room-row">
                  <input
                    class="ink-join-input"
                    type="text"
                    maxLength={6}
                    placeholder="Enter room code"
                    value={joinCode}
                    onInput={(e) => setJoinCode(e.currentTarget.value.toUpperCase())}
                  />
                  <button type="button" class="ink-cta-join" onClick={handleJoinRoom}>
                    JOIN
                  </button>
                </div>
                {roomCode && (
                  <div class="ink-room-code-note ink-chalk-label">
                    Private room code: <span class="ink-room-code-value">{roomCode}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <CharacterSelector
                selectedId={selectedCharacterId}
                reservedIds={reservedCharacters}
                onSelect={setSelectedCharacterId}
              />
              <HowToPlayPanel />
            </div>
          </section>

          <footer class="ink-footer-bar">
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span>Contact</span>
              <span>Terms of Service</span>
              <span>Privacy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span>Twitter</span>
              <span>Discord</span>
              <span>Instagram</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
