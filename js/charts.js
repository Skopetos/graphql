import { sum, formatNumber } from "./ui.js";

function clearSVG(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
function elSVG(tag, attrs={}) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

export function lineChart(
  svg,
  points,
  {
    w = 800,
    h = 320,
    padLeft = 48,
    padRight = 90,   // extra room for the value label
    padTop = 28,     // extra top room so label doesn't clip
    padBottom = 40
  } = {}
) {
  clearSVG(svg);
  if (!points || points.length < 2) {
    svg.appendChild(elSVG("text", { x: 20, y: 40, fill: "#a1a1aa" })).textContent = "Not enough data";
    return;
  }

  // scales
  const xs = points.map(p => +new Date(p.x));
  const ys = points.map(p => +p.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = 0, ymax = Math.max(...ys) || 1;

  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  const sx = v => padLeft + ((v - xmin) / (xmax - xmin || 1)) * innerW;
  const sy = v => padTop + innerH - ((v - ymin) / (ymax - ymin || 1)) * innerH;

  // viewBox
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  // axes
  svg.appendChild(elSVG("line", {
    x1: padLeft, y1: h - padBottom, x2: w - padRight, y2: h - padBottom, stroke: "#334155"
  }));
  svg.appendChild(elSVG("line", {
    x1: padLeft, y1: padTop, x2: padLeft, y2: h - padBottom, stroke: "#334155"
  }));

  // gradient for area
  const defs = elSVG("defs");
  const grad = elSVG("linearGradient", { id: "lc_grad", x1: "0%", y1: "0%", x2: "0%", y2: "100%" });
  grad.appendChild(elSVG("stop", { offset: "0%", "stop-color": "#60a5fa", "stop-opacity": "0.35" }));
  grad.appendChild(elSVG("stop", { offset: "100%", "stop-color": "#60a5fa", "stop-opacity": "0.00" }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  // area path
  const area = [];
  area.push("M", sx(xs[0]), sy(ys[0]));
  for (let i = 1; i < xs.length; i++) area.push("L", sx(xs[i]), sy(ys[i]));
  area.push("L", sx(xs[xs.length - 1]), h - padBottom, "L", sx(xs[0]), h - padBottom, "Z");
  svg.appendChild(elSVG("path", { d: area.join(" "), fill: "url(#lc_grad)" }));

  // line path
  const line = ["M", sx(xs[0]), sy(ys[0])];
  for (let i = 1; i < xs.length; i++) line.push("L", sx(xs[i]), sy(ys[i]));
  svg.appendChild(elSVG("path", { d: line.join(" "), fill: "none", stroke: "#60a5fa", "stroke-width": 2 }));

  // last point marker
  const lx = sx(xs[xs.length - 1]);
  const ly = sy(ys[ys.length - 1]);
  svg.appendChild(elSVG("circle", { cx: lx, cy: ly, r: 3.5, fill: "#60a5fa" }));

  // value label (clamped so it never clips)
  const labelPad = 8;
  const rawX = lx + 8;
  const rawY = ly - 10;

  const xClamped = Math.min(Math.max(rawX, padLeft - labelPad), w - padRight + labelPad);
  const yClamped = Math.min(Math.max(rawY, padTop));

  const t = elSVG("text", {
    x: xClamped,
    y: yClamped,
    "font-size": 12,
    "font-weight": 600,
    fill: "white"
  });
  const finalValue = Math.floor(ys[ys.length - 1]/1000);
  t.textContent = (typeof formatNumber === "function" ? formatNumber(finalValue) : finalValue) + " KB";
  svg.appendChild(t);
}

export function barChart(svg, items, { minBarW = 70, h = 460, padX = 56, padTop = 20, padBottom = 120 } = {}) {
  clearSVG(svg);
  if (!items.length) {
    svg.appendChild(elSVG("text", { x: 20, y: 40, fill: "#a1a1aa" })).textContent = "No data";
    return;
  }

  // dynamic width so labels don't collide (container can scroll)
  const w = Math.max(800, padX * 2 + items.length * minBarW);
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", w);          // allow horizontal overflow/scroll if container is smaller
  svg.setAttribute("height", h);

  const max = Math.max(...items.map(d => d.value)) || 1;
  const innerW = w - padX * 2;
  const barW = innerW / items.length;

  // axis
  const axisY = h - padBottom;
  svg.appendChild(elSVG("line", { x1: padX, y1: axisY, x2: w - padX, y2: axisY, stroke: "#334155" }));

  // bars + labels
  items.forEach((d, i) => {
    const x = padX + i * barW + 8;
    const usableH = axisY - padTop;
    const bh = (d.value / max) * usableH;
    const y = axisY - bh;

    // bar
    const rect = elSVG("rect", { x, y, width: barW - 16, height: bh, fill: "#60a5fa" });
    const tip = elSVG("title"); tip.textContent = `${d.key}\n${d.value}`;
    rect.appendChild(tip);
    svg.appendChild(rect);

    // value above bar (white)
    const val = elSVG("text", {
      x: x + (barW - 16) / 2,
      y: Math.max(y - 8, 12),
      "text-anchor": "middle",
      "font-size": 12,
      fill: "white"
    });
    val.textContent = d.value;
    svg.appendChild(val);

    // rotated label at -45°, right-aligned to avoid overlap
    const lbl = elSVG("text", {
      transform: `translate(${x + (barW - 16) / 2}, ${axisY + 20}) rotate(-45)`,
      "text-anchor": "end",
      "font-size": 12,
      fill: "white"
    });
    lbl.textContent = d.key;                   // full label (readable at an angle)
    const ltip = elSVG("title"); ltip.textContent = d.key; lbl.appendChild(ltip);
    svg.appendChild(lbl);
  });
}

// --- Donut chart: expects [{key:"Up", value:number}, {key:"Down", value:number}]
export function donut(svg, items, { size = 320, inner = 70, strokeW = 30 } = {}) {
  clearSVG(svg);

  const total = items.reduce((s, d) => s + (d.value || 0), 0);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));

  const c = size / 2;

  if (!total) {
    svg.appendChild(elSVG("circle", {
      cx: c,
      cy: c,
      r: inner + strokeW / 2,
      fill: "none",
      stroke: "#334155",
      "stroke-width": strokeW
    }));
    return;
  }

  const radius = inner + strokeW / 2;
  const circ = 2 * Math.PI * radius;

  const colors = { Up: "#22c55e", Down: "#ef4444" };

  let acc = 0;
  items.forEach(d => {
    const frac = (d.value || 0) / total;
    const len = Math.max(0, frac * circ - 0.0001);
    const dash = `${len} ${circ - len}`;
    svg.appendChild(elSVG("circle", {
      cx: c,
      cy: c,
      r: radius,
      fill: "none",
      stroke: colors[d.key] || "#60a5fa",
      "stroke-width": strokeW,
      "stroke-dasharray": dash,
      "stroke-dashoffset": -acc
    }));
    acc += len;
  });

  const up = items.find(i => i.key.toLowerCase() === "up")?.value || 0;
  const down = items.find(i => i.key.toLowerCase() === "down")?.value || 0;
  const ratio = down ? up / down : up ? Infinity : 0;


  //svg.appendChild(elSVG("text", {
    //x: c,
   // y: c - 60,
   // "text-anchor": "middle",
   // fill: "white",
   // "font-size": 11,
   // "opacity": 0.8
 // })).textContent = "Audit ratio";

  svg.appendChild(elSVG("text", {
    x: c,
    y: c + 40,
    "text-anchor": "middle",
    fill: "white",
    "font-size": 100,
    "font-weight": 500
  })).textContent = Number.isFinite(ratio) ? `${ratio.toFixed(2)}` : "∞×";

}
