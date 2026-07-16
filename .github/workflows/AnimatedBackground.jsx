import { useEffect, useRef } from "react";

/**
 * Full-app animated background for Superior Staffing Solutions NY.
 * Canvas + requestAnimationFrame + sine-wave math:
 *  - rippling 3D-style dot grid mesh
 *  - flowing diagonal neon wave streams
 *  - glowing node points with constellation line connections
 * Sits behind all content (fixed, -z, pointer-events-none).
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let w, h, dpr;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // colors
    const TEAL = "57,200,220";
    const CYAN = "0,180,255";
    const NEON = "57,255,120";

    const spacing = 46;

    const drawDotMesh = (t) => {
      const cols = Math.ceil(w / spacing) + 1;
      const rows = Math.ceil(h / spacing) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          // layered sine waves for a 3D ripple feel
          const wave =
            Math.sin(i * 0.45 + t * 0.0013) * 8 +
            Math.sin(j * 0.5 + t * 0.0016) * 8 +
            Math.sin((i + j) * 0.3 + t * 0.001) * 6;
          const oy = y + wave;
          const depth = (wave + 22) / 44; // 0..1
          const r = 0.8 + depth * 1.8;
          const peak = depth > 0.78;
          const color = peak ? NEON : depth > 0.5 ? TEAL : CYAN;
          const alpha = 0.12 + depth * 0.5;

          ctx.beginPath();
          ctx.fillStyle = `rgba(${color},${alpha})`;
          if (peak) {
            ctx.shadowColor = `rgba(${NEON},0.9)`;
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.arc(x, oy, r, 0, Math.PI * 2);
          ctx.fill();

          // subtle network links to the right/below neighbors
          if (peak && i < cols - 1) {
            const nx = (i + 1) * spacing;
            const nwave =
              Math.sin((i + 1) * 0.45 + t * 0.0013) * 8 +
              Math.sin(j * 0.5 + t * 0.0016) * 8 +
              Math.sin((i + 1 + j) * 0.3 + t * 0.001) * 6;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${NEON},0.18)`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(x, oy);
            ctx.lineTo(nx, y + nwave);
            ctx.stroke();
          }
        }
      }
      ctx.shadowBlur = 0;
    };

    const drawWaveStream = (t, offset, color, amp, speed, thickness) => {
      ctx.beginPath();
      ctx.lineWidth = thickness;
      ctx.strokeStyle = `rgba(${color},0.55)`;
      ctx.shadowColor = `rgba(${color},0.9)`;
      ctx.shadowBlur = 18;
      for (let x = -50; x <= w + 50; x += 8) {
        const y =
          h * offset +
          Math.sin(x * 0.006 + t * speed) * amp +
          Math.sin(x * 0.013 + t * speed * 0.6) * (amp * 0.5) +
          x * 0.12; // diagonal drift
        if (x === -50) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const render = (t) => {
      ctx.clearRect(0, 0, w, h);
      drawDotMesh(t);
      drawWaveStream(t, 0.28, CYAN, 26, 0.0011, 1.6);
      drawWaveStream(t, 0.55, TEAL, 32, 0.0009, 1.8);
      drawWaveStream(t, 0.78, NEON, 22, 0.0013, 1.4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ background: "linear-gradient(160deg, #060d1f 0%, #04101f 45%, #03131c 100%)" }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}