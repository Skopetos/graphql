import { sum, formatNumber } from "./ui.js";

function clearSVG(svg){ while(svg.firstChild) svg.removeChild(svg.firstChild); }
function elSVG(tag, attrs={}) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

export function lineChart(svg, points, {w=800,h=300,pad=30}={}) {
  clearSVG(svg);
  if (points.length < 2) { svg.appendChild(elSVG("text",{x:20,y:40,fill:"#a1a1aa"})).textContent="Not enough data"; return; }
  const xs = points.map(p=>+new Date(p.x));
  const ys = points.map(p=>p.y);
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const ymin=0, ymax=Math.max(...ys);
  const sx = v => pad + ((v - xmin) / (xmax - xmin || 1)) * (w - pad*2);
  const sy = v => (h - pad) - ((v - ymin) / (ymax - ymin || 1)) * (h - pad*2);

  const axis = elSVG("g",{class:"axis"});
  axis.appendChild(elSVG("line",{x1:pad,y1:h-pad,x2:w-pad,y2:h-pad,stroke:"#334155"}));
  axis.appendChild(elSVG("line",{x1:pad,y1:pad,x2:pad,y2:h-pad,stroke:"#334155"}));
  svg.appendChild(axis);

  const path = ["M", sx(xs[0]), sy(ys[0])];
  for (let i=1;i<xs.length;i++) path.push("L", sx(xs[i]), sy(ys[i]));
  path.push("L", sx(xs[xs.length-1]), h-pad, "L", sx(xs[0]), h-pad, "Z");
  svg.appendChild(elSVG("path",{ d:path.join(" "), fill:"url(#grad)" , opacity:"0.25"}));

  const defs = elSVG("defs",{});
  const grad = elSVG("linearGradient",{id:"grad",x1:"0%",y1:"0%",x2:"0%",y2:"100%"});
  grad.appendChild(elSVG("stop",{offset:"0%","stop-color":"#60a5fa"}));
  grad.appendChild(elSVG("stop",{offset:"100%","stop-color":"#60a5fa","stop-opacity":"0"}));
  defs.appendChild(grad);
  svg.appendChild(defs);

  const linePath = ["M", sx(xs[0]), sy(ys[0])];
  for (let i=1;i<xs.length;i++) linePath.push("L", sx(xs[i]), sy(ys[i]));
  svg.appendChild(elSVG("path",{ d: linePath.join(" "), fill:"none", stroke:"#60a5fa", "stroke-width":2 }));

  const lastX = sx(xs[xs.length-1]), lastY = sy(ys[ys.length-1]);
  const label = elSVG("text",{x:lastX+6,y:lastY-6});
  label.textContent = formatNumber(ys[ys.length-1]) + " XP";
  svg.appendChild(label);
}

export function donut(svg, parts, {r=110,th=36,cx=160,cy=160}={}) {
  clearSVG(svg);
  const total = sum(parts,p=>p.value) || 1;
  let a0 = -Math.PI/2;
  parts.forEach(p=>{
    const a1 = a0 + 2*Math.PI*(p.value/total);
    const large = (a1-a0) > Math.PI ? 1 : 0;
    const x0=cx + r*Math.cos(a0), y0=cy + r*Math.sin(a0);
    const x1=cx + r*Math.cos(a1), y1=cy + r*Math.sin(a1);
    const path = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${cx + (r-th)*Math.cos(a1)} ${cy + (r-th)*Math.sin(a1)} A ${r-th} ${r-th} 0 ${large} 0 ${cx + (r-th)*Math.cos(a0)} ${cy + (r-th)*Math.sin(a0)} Z`;
    const color = p.key === "Pass" ? "var(--ok)" : "var(--bad)";
    svg.appendChild(elSVG("path",{ d:path, fill: color, opacity: .9 }));
    a0 = a1;
  });
  const pass = parts.find(p=>p.key==="Pass")?.value||0;
  const fail = parts.find(p=>p.key==="Fail")?.value||0;
  const ratio = (pass+fail)? (pass/(pass+fail))*100:0;
  const t1 = elSVG("text",{x:cx,y:cy-4,"text-anchor":"middle","font-size":28,"font-weight":"700"});
  t1.textContent = `${ratio.toFixed(1)}%`;
  const t2 = elSVG("text",{x:cx,y:cy+18,"text-anchor":"middle","font-size":12,fill:"#a1a1aa"});
  t2.textContent = "pass rate";
  svg.appendChild(t1); svg.appendChild(t2);
}

export function barChart(svg, items, {w=800,h=400,pad=40}={}) {
  clearSVG(svg);
  if (!items.length) { svg.appendChild(elSVG("text",{x:20,y:40,fill:"#a1a1aa"})).textContent = "No data"; return; }
  const max = Math.max(...items.map(d => d.value));
  const barW = (w - pad*2) / items.length;
  svg.appendChild(elSVG("line",{x1:pad,y1:h-pad,x2:w-pad,y2:h-pad,stroke:"#334155"}));
  items.forEach((d,i)=>{
    const x = pad + i*barW + 4;
    const bh = (d.value/max) * (h - pad*2);
    const y = h - pad - bh;
    svg.appendChild(elSVG("rect",{x,y,width:barW-8,height:bh,fill:"#60a5fa"}));
    const label = elSVG("text",{x:x+(barW-8)/2,y:h-pad+12,"text-anchor":"middle",transform:`rotate(45 ${x+(barW-8)/2} ${h-pad+12})`,"font-size":10,fill:"#a1a1aa"});
    label.textContent = d.key.slice(0,18);
    svg.appendChild(label);
    const val = elSVG("text",{x:x+(barW-8)/2,y:y-6,"text-anchor":"middle","font-size":11});
    val.textContent = d.value;
    svg.appendChild(val);
  });
}