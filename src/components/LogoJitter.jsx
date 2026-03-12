import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';

const MIN_SWAP = 0.12;
const MAX_SWAP = 0.2;

export function LogoJitter() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);
  const lastSwapRef = useRef(performance.now());
  const nextDelayRef = useRef(
    MIN_SWAP + Math.random() * (MAX_SWAP - MIN_SWAP)
  );

  const frames = [
    '/assets/logo/frame1.png',
    '/assets/logo/frame2.png'
  ];

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
        nextDelayRef.current =
          MIN_SWAP + Math.random() * (MAX_SWAP - MIN_SWAP);

        gsap.fromTo(
          el,
          { filter: 'brightness(1.08) contrast(1.1)' },
          {
            filter: 'brightness(1) contrast(1)',
            duration: 0.12,
            ease: 'power1.out'
          }
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
      style={{
        width: '420px',
        maxWidth: '70vw',
        margin: '0 auto 24px'
      }}
      aria-label="INKOGNITO logo"
    >
      <img
        src={frames[current]}
        alt="INKOGNITO"
        style={{
          width: '100%',
          imageRendering: 'crisp-edges'
        }}
      />
    </div>
  );
}

