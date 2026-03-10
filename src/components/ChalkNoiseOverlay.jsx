import { useEffect, useRef } from 'preact/hooks';

export function ChalkNoiseOverlay() {
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

