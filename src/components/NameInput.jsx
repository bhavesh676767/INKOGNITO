import { useEffect, useRef } from 'preact/hooks';
import gsap from 'gsap';

export function NameInput({ value, onChange }) {
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
    tl.to(input, {
      '--caret-opacity': 1,
      duration: 0.25,
      ease: 'power1.inOut'
    }).to(input, {
      '--caret-opacity': 0,
      duration: 0.25,
      ease: 'power1.inOut'
    });

    return () => tl.kill();
  }, []);

  return (
    <div
      ref={wrapperRef}
      class="ink-name-input ink-chalk-outline"
      style={{
        padding: '20px 18px 18px',
        marginBottom: '16px',
        position: 'relative'
      }}
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
        <span
          class="ink-blood-accent"
          style={{ fontFamily: 'var(--ink-font-secondary)' }}
        >
          (required)
        </span>
      </label>
      <div
        style={{
          position: 'relative',
          marginTop: '4px'
        }}
      >
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

