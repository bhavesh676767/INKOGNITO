import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';

export function HowToPlayPanel() {
  const [open, setOpen] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    gsap.fromTo(
      panel,
      { y: -12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.2 }
    );
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const content = panel.querySelector('.ink-how-body');
    if (!content) return;

    const height = content.scrollHeight;

    if (open) {
      gsap.to(panel, {
        clipPath: 'inset(0% 0% 0% 0% round 12px)',
        duration: 0.55,
        ease: 'power2.out'
      });
      gsap.fromTo(
        content,
        { height: 0, opacity: 0 },
        { height, opacity: 1, duration: 0.55, ease: 'power2.out' }
      );
    } else {
      gsap.to(panel, {
        clipPath: 'inset(0% 0% 96% 0% round 12px)',
        duration: 0.45,
        ease: 'power1.inOut'
      });
      gsap.to(content, {
        height: 0,
        opacity: 0,
        duration: 0.4,
        ease: 'power1.in'
      });
    }
  }, [open]);

  const toggleOpen = () => setOpen((v) => !v);

  return (
    <section
      ref={panelRef}
      class="ink-how-panel ink-chalk-outline"
      aria-expanded={open}
    >
      <button
        class="ink-how-header"
        type="button"
        onClick={toggleOpen}
      >
        <div class="ink-chalk-heading ink-blood-underline">
          HOW TO PLAY
        </div>
        <span class="ink-how-toggle">{open ? '– close' : '+ open'}</span>
      </button>
      <div class="ink-how-body">
        <ol class="ink-how-steps">
          <li>
            <span class="ink-how-icon">?</span>
            <span>One player is the INKOGNITO.</span>
          </li>
          <li>
            <span class="ink-how-icon">✎</span>
            <span>Others know the secret word.</span>
          </li>
          <li>
            <span class="ink-how-icon">☁</span>
            <span>Players ask loaded questions.</span>
          </li>
          <li>
            <span class="ink-how-icon">◎</span>
            <span>Expose who is faking it.</span>
          </li>
          <li>
            <span class="ink-how-icon ink-how-icon--blood">❖</span>
            <span>Blend in. Do not get caught.</span>
          </li>
        </ol>
      </div>
    </section>
  );
}

