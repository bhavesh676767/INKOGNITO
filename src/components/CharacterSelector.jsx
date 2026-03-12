import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';

const characterImports = import.meta.glob('/assets/characters/*', {
  eager: false
});

export function CharacterSelector({ selectedId, reservedIds = [], onSelect }) {
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
            return {
              id: path,
              src: mod.default || mod
            };
          })
        );
        if (!cancelled) {
          setCharacters(loaded);
          setLoading(false);

          if (loaded.length) {
            const initialIndex = Math.max(
              0,
              loaded.findIndex((c) => !reservedIds.includes(c.id))
            );
            const safeIndex = Number.isFinite(initialIndex)
              ? initialIndex
              : 0;
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

    gsap.fromTo(
      el,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.1 }
    );

    if (prefersReduced) return;

    const idle = gsap.timeline({
      repeat: -1,
      defaults: { ease: 'sine.inOut', duration: 2.6 }
    });

    idle
      .to(circle, { x: 0.5, y: -0.5 })
      .to(circle, { x: -0.5, y: 0.4 })
      .to(circle, { x: 0, y: 0 });

    return () => {
      idle.kill();
    };
  }, []);

  const currentCharacter =
    !loading && characters.length ? characters[currentIndex] : null;

  const pickRandomIndex = () => {
    if (!characters.length) return 0;

    const available = characters
      .map((c, idx) => ({ c, idx }))
      .filter(
        (entry) =>
          !reservedIds.includes(entry.c.id) && entry.idx !== currentIndex
      );

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
        {
          scale: 1.6,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => burst.remove()
        }
      )
      .play();
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

    const tl = gsap.timeline({
      onComplete: () => {
        setIsShuffling(false);
      }
    });

    if (!prefersReduced) {
      // Phase 1: exit current
      tl.to(circle, {
        scale: 0.92,
        rotation: -5,
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in'
      });

      // Phase 2: quick shuffle flashes
      const flashCount = 3;
      for (let i = 0; i < flashCount; i += 1) {
        tl.add(() => {
          const idx = pickRandomIndex();
          setCurrentIndex(idx);
        });
        tl.to(circle, {
          opacity: 1,
          duration: 0.05 + Math.random() * 0.02,
          ease: 'none'
        });
        tl.to(circle, {
          opacity: 0,
          duration: 0.05 + Math.random() * 0.02,
          ease: 'none'
        });
      }
    }

    // Phase 3: final character
    tl.add(() => {
      const finalIndex = pickRandomIndex();
      setCurrentIndex(finalIndex);
      const finalChar = characters[finalIndex];
      if (finalChar) {
        onSelect?.(finalChar.id);
      }
      runChalkBurst();
    });

    tl.fromTo(
      circle,
      { scale: 0.85, rotation: 6, opacity: 0 },
      {
        scale: 1,
        rotation: 0,
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out'
      }
    );

    if (!prefersReduced) {
      // tiny frame shake + posterized jitter
      tl.to(
        circle,
        {
          x: 0.8,
          y: -0.8,
          duration: 0.06,
          ease: 'power1.inOut'
        },
        '-=0.12'
      )
        .to(circle, {
          x: -0.6,
          y: 0.6,
          duration: 0.06,
          ease: 'power1.inOut'
        })
        .to(circle, {
          x: 0,
          y: 0,
          duration: 0.08,
          ease: 'power1.out'
        });
    }
  };

  return (
    <section
      ref={containerRef}
      class="ink-character-panel ink-chalk-outline"
    >
      <div class="ink-character-header">
        <div class="ink-chalk-heading">Disguise</div>
      </div>

      {loading || !currentCharacter ? (
        <div class="ink-character-loading">Dusting off suspects…</div>
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

