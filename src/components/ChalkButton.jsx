import { useEffect, useRef } from 'preact/hooks';
import gsap from 'gsap';

export function ChalkButton({ variant = 'primary', label, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'back.out(2)',
        stagger: 0.04
      }
    );
  }, []);

  const handleClick = (e) => {
    const el = ref.current;
    if (!el) {
      onClick?.(e);
      return;
    }

    const tl = gsap.timeline();
    tl.to(el, {
      scaleX: 0.95,
      scaleY: 0.9,
      duration: 0.08,
      ease: 'power2.in'
    }).to(el, {
      scaleX: 1.04,
      scaleY: 1.02,
      duration: 0.16,
      ease: 'elastic.out(1.2, 0.4)'
    });

    onClick?.(e);
  };

  return (
    <button
      type="button"
      ref={ref}
      class={'ink-chalk-button ink-chalk-button--' + variant}
      onClick={handleClick}
    >
      <span class="ink-chalk-button-label">{label}</span>
    </button>
  );
}

