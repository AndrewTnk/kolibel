import { useEffect, useRef } from "react";

/* GraphHero — живой граф связей Kolibel на canvas.
   Узлы-люди — круги, узлы-компании — скруглённые квадраты.
   Центр (вы) — коралл, 1-й уровень — коралл, 2-й — приглушённый коралл.
   Мягкий орбитальный дрейф + бегущие «сигналы» по связям.
   Порт 1:1 из design/graph-hero.jsx. */

const HERO_COLORS = {
  me: "#ff7f50",
  first: "#ff7f50",
  second: "#f3b89e",
  link: "rgba(61, 43, 31, 0.16)",
  linkSecond: "rgba(61, 43, 31, 0.10)",
  signal: "#ff7f50",
};

type Kind = "person" | "company";

type Node = {
  id: string;
  degree: 0 | 1 | 2;
  kind: Kind;
  r: number;
  base: { x: number; y: number };
  initials: string;
  phase?: number;
  amp?: number;
};

type Edge = { a: string; b: string; degree: 1 | 2 };

type Signal = { edge: Edge; t: number; speed: number };

// Курируемая сеть: 1 центр, кольцо 1-го уровня, внешнее кольцо 2-го уровня.
function buildNetwork(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  nodes.push({ id: "me", degree: 0, kind: "person", r: 26, base: { x: 0, y: 0 }, initials: "" });

  const firstNames: { initials: string; kind: Kind }[] = [
    { initials: "АК", kind: "person" },
    { initials: "МД", kind: "person" },
    { initials: "", kind: "company" },
    { initials: "СВ", kind: "person" },
    { initials: "ЛР", kind: "person" },
    { initials: "", kind: "company" },
    { initials: "ИП", kind: "person" },
    { initials: "ТО", kind: "person" },
  ];
  const n1 = firstNames.length;
  const ring1 = 150;
  firstNames.forEach((f, i) => {
    const a = (i / n1) * Math.PI * 2 + 0.25;
    const jitter = 0.86 + ((i * 37) % 10) / 40;
    const id = "f" + i;
    nodes.push({
      id,
      degree: 1,
      kind: f.kind,
      initials: f.initials,
      r: f.kind === "company" ? 17 : 15,
      base: { x: Math.cos(a) * ring1 * jitter, y: Math.sin(a) * ring1 * jitter },
      phase: i * 1.3,
      amp: 6 + (i % 3) * 2,
    });
    edges.push({ a: "me", b: id, degree: 1 });
  });

  // 2-й уровень — по 1–2 на каждый узел 1-го уровня
  let k = 0;
  firstNames.forEach((_f, i) => {
    const parent = nodes.find((n) => n.id === "f" + i)!;
    const count = i % 3 === 0 ? 2 : 1;
    for (let j = 0; j < count; j++) {
      const a = Math.atan2(parent.base.y, parent.base.x) + (j === 0 ? -0.32 : 0.32);
      const dist = 118 + ((k * 23) % 40);
      const id = "s" + k;
      nodes.push({
        id,
        degree: 2,
        kind: k % 5 === 0 ? "company" : "person",
        initials: "",
        r: k % 5 === 0 ? 10 : 9,
        base: {
          x: parent.base.x + Math.cos(a) * dist,
          y: parent.base.y + Math.sin(a) * dist,
        },
        phase: k * 0.9 + 2,
        amp: 4 + (k % 3) * 2,
      });
      edges.push({ a: parent.id, b: id, degree: 2 });
      k++;
    }
  });

  return { nodes, edges };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.closePath();
}

type Props = {
  /** 0..1 — прореживание 2-го круга для средних экранов. */
  density?: number;
};

export function GraphHero({ density = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const net = buildNetwork();

    // Прореживание по density
    if (density < 1) {
      const keep = net.nodes.filter((n) => n.degree < 2 || Math.random() < density);
      const ids = new Set(keep.map((n) => n.id));
      net.nodes = keep;
      net.edges = net.edges.filter((e) => ids.has(e.a) && ids.has(e.b));
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0,
      H = 0,
      dpr = 1,
      cx = 0,
      cy = 0,
      lastTime = 0,
      ready = false;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * 0.58;
      cy = H / 2;
      if (ready) draw(lastTime); // перерисовать сразу при ресайзе
    }

    // Сигналы, бегущие по связям 1-го уровня
    const firstEdges = net.edges.filter((e) => e.degree === 1);
    const signals: Signal[] = [];
    function spawnSignal() {
      const e = firstEdges[Math.floor(Math.random() * firstEdges.length)];
      signals.push({ edge: e, t: 0, speed: 0.012 + Math.random() * 0.01 });
    }
    let signalTimer = 0;

    const start = performance.now();

    function pos(node: Node, time: number) {
      if (node.degree === 0) return { x: cx, y: cy };
      const drift = node.amp || 5;
      const x = cx + node.base.x + Math.sin(time * 0.0005 + (node.phase || 0)) * drift;
      const y = cy + node.base.y + Math.cos(time * 0.0004 + (node.phase || 0)) * drift;
      return { x, y };
    }
    const posCache = new Map<string, { x: number; y: number }>();

    function frame(now: number) {
      const time = now - start;
      draw(time);
      rafRef.current = requestAnimationFrame(frame);
    }

    function draw(time: number) {
      lastTime = time;
      ctx!.clearRect(0, 0, W, H);
      posCache.clear();
      net.nodes.forEach((n) => posCache.set(n.id, pos(n, time)));

      // связи
      net.edges.forEach((e) => {
        const pa = posCache.get(e.a),
          pb = posCache.get(e.b);
        if (!pa || !pb) return;
        ctx!.beginPath();
        ctx!.moveTo(pa.x, pa.y);
        ctx!.lineTo(pb.x, pb.y);
        ctx!.strokeStyle = e.degree === 1 ? HERO_COLORS.link : HERO_COLORS.linkSecond;
        ctx!.lineWidth = e.degree === 1 ? 1.4 : 1;
        ctx!.stroke();
      });

      // сигналы (только при анимации)
      if (!reduceMotion) {
        signalTimer += 1;
        if (signalTimer > 38 && signals.length < 4) {
          spawnSignal();
          signalTimer = 0;
        }
        for (let i = signals.length - 1; i >= 0; i--) {
          const s = signals[i];
          s.t += s.speed;
          if (s.t >= 1) {
            signals.splice(i, 1);
            continue;
          }
          const pa = posCache.get(s.edge.a),
            pb = posCache.get(s.edge.b);
          if (!pa || !pb) {
            signals.splice(i, 1);
            continue;
          }
          const x = pa.x + (pb.x - pa.x) * s.t;
          const y = pa.y + (pb.y - pa.y) * s.t;
          const g = ctx!.createRadialGradient(x, y, 0, x, y, 7);
          g.addColorStop(0, "rgba(255,127,80,0.9)");
          g.addColorStop(1, "rgba(255,127,80,0)");
          ctx!.fillStyle = g;
          ctx!.beginPath();
          ctx!.arc(x, y, 7, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // узлы (от дальних к ближним)
      const ordered = [...net.nodes].sort((a, b) => b.degree - a.degree);
      ordered.forEach((n) => {
        const p = posCache.get(n.id)!;
        const color = n.degree === 0 ? HERO_COLORS.me : n.degree === 1 ? HERO_COLORS.first : HERO_COLORS.second;

        // мягкая тень
        ctx!.save();
        ctx!.shadowColor = "rgba(61, 43, 31, 0.18)";
        ctx!.shadowBlur = n.degree === 0 ? 26 : 14;
        ctx!.shadowOffsetY = 6;
        ctx!.fillStyle = "#fff";
        if (n.kind === "company") roundRect(ctx!, p.x - n.r, p.y - n.r, n.r * 2, n.r * 2, n.r * 0.42);
        else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, n.r, 0, Math.PI * 2);
        }
        ctx!.fill();
        ctx!.restore();

        // заливка
        ctx!.fillStyle = color;
        if (n.kind === "company") roundRect(ctx!, p.x - n.r, p.y - n.r, n.r * 2, n.r * 2, n.r * 0.42);
        else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, n.r, 0, Math.PI * 2);
        }
        ctx!.fill();

        // белая обводка-кольцо
        ctx!.lineWidth = n.degree === 0 ? 3 : 2;
        ctx!.strokeStyle = "rgba(255,255,255,0.9)";
        if (n.kind === "company") roundRect(ctx!, p.x - n.r, p.y - n.r, n.r * 2, n.r * 2, n.r * 0.42);
        else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, n.r, 0, Math.PI * 2);
        }
        ctx!.stroke();

        // центр: значок «гнезда» (две дуги) намёком на лого
        if (n.degree === 0) {
          ctx!.strokeStyle = "rgba(255,255,255,0.95)";
          ctx!.lineWidth = 3;
          ctx!.lineCap = "round";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y + 3, n.r * 0.52, Math.PI * 0.12, Math.PI * 0.88);
          ctx!.stroke();
          ctx!.beginPath();
          ctx!.arc(p.x, p.y - n.r * 0.34, n.r * 0.16, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(255,255,255,0.95)";
          ctx!.fill();
        } else if (n.initials) {
          ctx!.fillStyle = "rgba(255,255,255,0.95)";
          ctx!.font = "700 11px Manrope, sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(n.initials, p.x, p.y + 0.5);
        } else if (n.kind === "company") {
          // намёк на бейдж компании
          ctx!.fillStyle = "rgba(255,255,255,0.9)";
          roundRect(ctx!, p.x - n.r * 0.32, p.y - n.r * 0.32, n.r * 0.64, n.r * 0.64, n.r * 0.18);
          ctx!.fill();
        }
      });
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Синхронный первый кадр — чтобы граф был виден сразу,
    // даже если requestAnimationFrame троттлится (неактивная вкладка).
    ready = true;
    draw(0);
    // prefers-reduced-motion: только статичный кадр, без rAF-цикла и сигналов.
    if (!reduceMotion) rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
