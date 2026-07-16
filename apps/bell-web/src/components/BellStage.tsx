import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import "./BellStage.css";

const IDLE_SWAY_SPEED = 1.4; // rad/s (angular frequency of the sine wave)
const IDLE_SWAY_AMPLITUDE = 0.05; // rad
const GLOW_PULSE_SPEED = 1.4;

const RING_DURATION = 0.7; // seconds
const RING_WOBBLE_SPEED = 26; // rad/s
const RING_WOBBLE_AMPLITUDE = 0.55; // rad
const RING_SQUASH_AMPLITUDE = 0.14;
const WAVE_DURATION = 0.6; // seconds
const WAVE_START_SCALE = 1;
const WAVE_END_SCALE = 2.1;
const WAVE_STAGGER = 0.12; // seconds between the two ripple waves

const GOLD_LIGHT = 0xffe9a8;
const GOLD = 0xf5b942;
const GOLD_DARK = 0xd98f1f;
const GOLD_DEEP = 0x8a5a12;

function drawBell(bell: Container) {
  const dome = new Graphics()
    .poly([-70, -20, 70, -20, 95, 42, -95, 42])
    .fill(GOLD)
    .ellipse(0, -30, 66, 52)
    .fill(GOLD_LIGHT);

  const rim = new Graphics().ellipse(0, 42, 95, 15).fill(GOLD_DARK);

  const knob = new Graphics().roundRect(-9, -92, 18, 22, 6).fill(GOLD_DARK);

  const strap = new Graphics().rect(-3, 42, 6, 24).fill(GOLD_DEEP);
  const clapper = new Graphics().circle(0, 74, 13).fill(GOLD_DEEP);

  bell.addChild(dome, rim, knob, strap, clapper);
}

function makeWave(): Graphics {
  return new Graphics().ellipse(0, 20, 100, 60).stroke({ width: 4, color: GOLD, alpha: 0.6 });
}

type Wave = { graphic: Graphics; spawnAt: number };

function mountBellScene(
  app: Application,
  onTap: (() => void) | undefined,
  isDisabled: () => boolean,
) {
  const root = new Container();
  root.label = "bell-root";
  app.stage.addChild(root);

  const glow = new Graphics().circle(0, 0, 105).fill({ color: GOLD, alpha: 0.35 });
  root.addChild(glow);

  const wavesLayer = new Container();
  root.addChild(wavesLayer);

  const bell = new Container();
  bell.pivot.set(0, -20);
  drawBell(bell);
  bell.eventMode = "static";
  bell.cursor = "pointer";
  root.addChild(bell);

  let elapsed = 0;
  let ringStart: number | null = null;
  const pendingWaves: Wave[] = [];
  const activeWaves: Wave[] = [];

  function ring() {
    if (isDisabled() || ringStart !== null) return;
    ringStart = elapsed;
    pendingWaves.push(
      { graphic: makeWave(), spawnAt: elapsed },
      { graphic: makeWave(), spawnAt: elapsed + WAVE_STAGGER },
    );
    onTap?.();
  }

  bell.on("pointertap", ring);

  function layout() {
    root.position.set(app.screen.width / 2, app.screen.height / 2);
  }
  layout();
  app.renderer.on("resize", layout);

  const tick = () => {
    elapsed += app.ticker.deltaMS / 1000;

    const disabled = isDisabled();
    bell.cursor = disabled ? "default" : "pointer";
    root.alpha = disabled ? 0.6 : 1;

    for (let i = pendingWaves.length - 1; i >= 0; i -= 1) {
      const wave = pendingWaves[i];
      if (wave && wave.spawnAt <= elapsed) {
        wavesLayer.addChild(wave.graphic);
        activeWaves.push(wave);
        pendingWaves.splice(i, 1);
      }
    }

    for (let i = activeWaves.length - 1; i >= 0; i -= 1) {
      const wave = activeWaves[i];
      if (!wave) continue;
      const age = elapsed - wave.spawnAt;
      if (age >= WAVE_DURATION) {
        wavesLayer.removeChild(wave.graphic);
        wave.graphic.destroy();
        activeWaves.splice(i, 1);
        continue;
      }
      const progress = age / WAVE_DURATION;
      const scale = WAVE_START_SCALE + (WAVE_END_SCALE - WAVE_START_SCALE) * progress;
      wave.graphic.scale.set(scale);
      wave.graphic.alpha = 1 - progress;
    }

    const glowPulse = Math.sin(elapsed * GLOW_PULSE_SPEED);
    glow.alpha = 0.28 + glowPulse * 0.12;
    glow.scale.set(1 + glowPulse * 0.05);

    let rotation = Math.sin(elapsed * IDLE_SWAY_SPEED) * IDLE_SWAY_AMPLITUDE;
    let scaleX = 1;
    let scaleY = 1;

    if (ringStart !== null) {
      const age = elapsed - ringStart;
      if (age >= RING_DURATION) {
        ringStart = null;
      } else {
        const decay = 1 - age / RING_DURATION;
        rotation += Math.sin(age * RING_WOBBLE_SPEED) * RING_WOBBLE_AMPLITUDE * decay;
        const squash = Math.sin(age * RING_WOBBLE_SPEED) * RING_SQUASH_AMPLITUDE * decay;
        scaleX = 1 + squash;
        scaleY = 1 - squash * 0.7;
      }
    }

    bell.rotation = rotation;
    bell.scale.set(scaleX, scaleY);
  };

  app.ticker.add(tick);

  return () => {
    app.ticker.remove(tick);
    app.renderer.off("resize", layout);
    bell.off("pointertap", ring);
    for (const wave of [...pendingWaves, ...activeWaves]) {
      wave.graphic.destroy();
    }
  };
}

export function BellStage({ onTap, disabled = false }: { onTap?: () => void; disabled?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let cleanupScene: (() => void) | undefined;
    const app = new Application();

    app
      .init({ resizeTo: host, backgroundAlpha: 0, antialias: true })
      .then(() => {
        if (cancelled) {
          app.destroy(true, { children: true });
          return;
        }
        host.appendChild(app.canvas);
        cleanupScene = mountBellScene(
          app,
          () => onTapRef.current?.(),
          () => disabledRef.current,
        );
      })
      .catch(() => {
        // Canvas/WebGL unavailable — leave the host empty rather than crash the page.
      });

    return () => {
      cancelled = true;
      cleanupScene?.();
      if (app.renderer) {
        app.destroy(true, { children: true });
      }
    };
  }, []);

  return <div ref={hostRef} className="bell-stage" role="img" aria-label="Bel game master" />;
}
