import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: "star" | "ember";
  pulse: number;
  pulseSpeed: number;
}

interface Dragon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  wingAngle: number;
  wingSpeed: number;
  tailSegments: { x: number; y: number }[];
  color: string;
  breathTimer: number;
  breathActive: boolean;
}

interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: "phoenix" | "serpent" | "spirit";
  angle: number;
  rotSpeed: number;
  trail: { x: number; y: number; opacity: number }[];
  glowIntensity: number;
}

const PRIMARY_HSL = [15, 88, 58];
const ACCENT_HSL = [25, 95, 55];

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function createDragon(w: number, h: number): Dragon {
  const fromLeft = Math.random() > 0.5;
  return {
    x: fromLeft ? -40 : w + 40,
    y: Math.random() * h * 0.6 + h * 0.1,
    vx: (fromLeft ? 1 : -1) * (0.3 + Math.random() * 0.4),
    vy: (Math.random() - 0.5) * 0.15,
    size: 12 + Math.random() * 8,
    wingAngle: 0,
    wingSpeed: 0.06 + Math.random() * 0.03,
    tailSegments: Array.from({ length: 6 }, () => ({ x: 0, y: 0 })),
    color: Math.random() > 0.5
      ? hsl(PRIMARY_HSL[0], PRIMARY_HSL[1], PRIMARY_HSL[2])
      : hsl(ACCENT_HSL[0], ACCENT_HSL[1], ACCENT_HSL[2]),
    breathTimer: 0,
    breathActive: false,
  };
}

function createCreature(w: number, h: number): Creature {
  const types: Creature["type"][] = ["phoenix", "serpent", "spirit"];
  return {
    x: Math.random() * w,
    y: Math.random() * h * 0.7 + h * 0.1,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.2,
    size: 6 + Math.random() * 6,
    type: types[Math.floor(Math.random() * types.length)],
    angle: Math.random() * Math.PI * 2,
    rotSpeed: 0.01 + Math.random() * 0.02,
    trail: [],
    glowIntensity: 0.3 + Math.random() * 0.4,
  };
}

function drawDragon(ctx: CanvasRenderingContext2D, d: Dragon) {
  ctx.save();
  const dir = d.vx > 0 ? 1 : -1;

  // Body
  ctx.fillStyle = d.color;
  ctx.shadowColor = d.color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.size, d.size * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const headX = d.x + dir * d.size * 1.1;
  const headY = d.y - d.size * 0.15;
  ctx.beginPath();
  ctx.arc(headX, headY, d.size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = hsl(50, 100, 80, 0.9);
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(headX + dir * 2, headY - 1, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  const wingY = Math.sin(d.wingAngle) * d.size * 0.7;
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(d.x, d.y - d.size * 0.3);
  ctx.quadraticCurveTo(
    d.x - dir * d.size * 0.5,
    d.y - d.size - wingY,
    d.x - dir * d.size * 0.2,
    d.y - d.size * 0.6 - wingY * 0.5
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(d.x, d.y - d.size * 0.3);
  ctx.quadraticCurveTo(
    d.x - dir * d.size * 0.8,
    d.y - d.size * 0.8 - wingY,
    d.x - dir * d.size * 0.4,
    d.y - d.size * 0.4 - wingY * 0.3
  );
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Tail
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(d.x - dir * d.size, d.y);
  d.tailSegments.forEach((seg) => {
    ctx.lineTo(seg.x, seg.y);
  });
  ctx.stroke();

  // Fire breath
  if (d.breathActive) {
    const grad = ctx.createRadialGradient(headX, headY, 0, headX + dir * 20, headY, 18);
    grad.addColorStop(0, hsl(40, 100, 70, 0.6));
    grad.addColorStop(0.5, hsl(20, 100, 55, 0.3));
    grad.addColorStop(1, hsl(0, 100, 50, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(headX, headY - 3);
    ctx.lineTo(headX + dir * 22, headY - 6);
    ctx.lineTo(headX + dir * 22, headY + 6);
    ctx.lineTo(headX, headY + 3);
    ctx.fill();
  }

  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature) {
  ctx.save();
  const baseColor =
    c.type === "phoenix"
      ? hsl(PRIMARY_HSL[0], PRIMARY_HSL[1], PRIMARY_HSL[2])
      : c.type === "serpent"
      ? hsl(180, 70, 55)
      : hsl(270, 60, 65);

  // Trail
  c.trail.forEach((t) => {
    ctx.fillStyle = baseColor.replace(/[\d.]+\)$/, `${t.opacity * 0.3})`);
    ctx.beginPath();
    ctx.arc(t.x, t.y, c.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.shadowColor = baseColor;
  ctx.shadowBlur = 10 + c.glowIntensity * 8;

  if (c.type === "phoenix") {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - c.size);
    ctx.lineTo(c.x - c.size * 0.6, c.y + c.size * 0.5);
    ctx.lineTo(c.x + c.size * 0.6, c.y + c.size * 0.5);
    ctx.closePath();
    ctx.fill();
    // Wings
    const wing = Math.sin(c.angle * 3) * c.size;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.quadraticCurveTo(c.x - c.size * 2, c.y - wing, c.x - c.size, c.y + c.size * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.quadraticCurveTo(c.x + c.size * 2, c.y - wing, c.x + c.size, c.y + c.size * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (c.type === "serpent") {
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = c.size * 0.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const sx = c.x + Math.cos(c.angle + i * 0.6) * i * c.size * 0.4;
      const sy = c.y + Math.sin(c.angle + i * 0.6) * i * c.size * 0.25;
      i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  } else {
    // Spirit orb
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
    grad.addColorStop(0, baseColor.replace(/[\d.]+\)$/, "0.8)"));
    grad.addColorStop(1, baseColor.replace(/[\d.]+\)$/, "0)"));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size * (1 + Math.sin(c.angle) * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export const NavbarCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.parentElement!.offsetWidth;
    let h = canvas.parentElement!.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    // Create entities
    const particles: Particle[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.4,
      type: Math.random() > 0.5 ? "star" : "ember",
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    }));

    const dragons: Dragon[] = [createDragon(w, h)];
    const creatures: Creature[] = Array.from({ length: 2 }, () => createCreature(w, h));

    let dragonTimer = 0;

    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const alpha = p.opacity * (0.5 + Math.sin(p.pulse) * 0.5);
        if (p.type === "star") {
          ctx.fillStyle = hsl(40, 30, 90, alpha);
        } else {
          ctx.fillStyle = hsl(PRIMARY_HSL[0], PRIMARY_HSL[1], PRIMARY_HSL[2], alpha);
        }
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Dragons
      dragons.forEach((d, i) => {
        d.x += d.vx;
        d.y += d.vy;
        d.wingAngle += d.wingSpeed;
        d.vy += (Math.random() - 0.5) * 0.01;
        d.vy = Math.max(-0.3, Math.min(0.3, d.vy));

        // Tail physics
        let prevX = d.x - (d.vx > 0 ? 1 : -1) * d.size;
        let prevY = d.y;
        d.tailSegments.forEach((seg, si) => {
          const targetX = prevX - (d.vx > 0 ? 1 : -1) * (d.size * 0.5);
          const targetY = prevY + Math.sin(d.wingAngle + si * 0.8) * 3;
          seg.x += (targetX - seg.x) * 0.15;
          seg.y += (targetY - seg.y) * 0.15;
          prevX = seg.x;
          prevY = seg.y;
        });

        // Fire breath
        d.breathTimer++;
        if (d.breathTimer > 200 + Math.random() * 300) {
          d.breathActive = !d.breathActive;
          d.breathTimer = 0;
        }

        drawDragon(ctx, d);

        // Reset if off screen
        if (d.x < -80 || d.x > w + 80) {
          dragons[i] = createDragon(w, h);
        }
      });

      // Spawn new dragon occasionally
      dragonTimer++;
      if (dragonTimer > 600 && dragons.length < 3) {
        dragons.push(createDragon(w, h));
        dragonTimer = 0;
      }

      // Creatures
      creatures.forEach((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.rotSpeed;
        c.glowIntensity = 0.3 + Math.sin(c.angle * 2) * 0.3;

        // Trail
        c.trail.unshift({ x: c.x, y: c.y, opacity: 1 });
        c.trail = c.trail.slice(0, 8).map((t, i) => ({ ...t, opacity: 1 - i / 8 }));

        // Bounce
        if (c.x < 0 || c.x > w) c.vx *= -1;
        if (c.y < 0 || c.y > h) c.vy *= -1;
        c.vx += (Math.random() - 0.5) * 0.02;
        c.vy += (Math.random() - 0.5) * 0.02;
        c.vx = Math.max(-0.6, Math.min(0.6, c.vx));
        c.vy = Math.max(-0.3, Math.min(0.3, c.vy));

        drawCreature(ctx, c);
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      w = canvas.parentElement!.offsetWidth;
      h = canvas.parentElement!.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};
