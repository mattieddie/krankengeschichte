import { SYMPTOMS, OTHER_COLOR } from "./symptoms.js";

export const VIEW_W = 200;
export const VIEW_H = 400;

// Vereinfachte, aber proportionierte Körper-Silhouette (Kreis-Kopf, Rumpf als
// weiche Trapezform, Arme/Beine als abgerundete "Kapseln"). Für die Rückansicht
// wird zusätzlich eine Wirbelsäulen-Linie gezeichnet, damit Vorder-/Rückseite
// auch optisch unterscheidbar sind.
function silhouetteParts(fill, stroke, view) {
  const limb = (d, width) => `
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width + 3}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="${fill}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  const spine = view === "back" ? `<path d="M100,72 L100,175" stroke="${stroke}" stroke-width="1.5" fill="none" opacity="0.6"/>` : "";
  return `
    <circle cx="100" cy="34" r="22" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <rect x="90" y="52" width="20" height="14" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <path d="M64,70 C64,56 136,56 136,70 L126,148 Q131,178 133,181 L67,181 Q69,178 74,148 Z"
          fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
    ${spine}
    ${limb("M67,74 C50,95 42,130 39,168 C38,185 37,200 36,214", 15)}
    ${limb("M133,74 C150,95 158,130 161,168 C162,185 163,200 164,214", 15)}
    ${limb("M85,178 C82,220 80,260 78,295 C77,320 76,345 74,368", 19)}
    ${limb("M115,178 C118,220 120,260 122,295 C123,320 124,345 126,368", 19)}
  `;
}

export function silhouetteMarkup(points, view, opts = {}) {
  const width = opts.width || 110;
  const height = opts.height || 220;
  const fill = opts.fill || "#e2e8f0";
  const stroke = opts.stroke || "#94a3b8";
  const pts = (points || []).filter((p) => p.view === view);
  const markers = pts
    .map((p) => `<circle cx="${(p.x * VIEW_W).toFixed(1)}" cy="${(p.y * VIEW_H).toFixed(1)}" r="7" fill="${p.color}" stroke="white" stroke-width="1.5"/>`)
    .join("");
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${silhouetteParts(fill, stroke, view)}${markers}</svg>`;
}

function makeSvg(view) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute("class", "bodymap-svg");
  svg.dataset.view = view;
  svg.innerHTML = silhouetteParts("var(--body-fill)", "var(--body-stroke)", view);
  return svg;
}

export function renderBodyMap(container, points, onChange) {
  container.innerHTML = "";
  let activeSymptomKey = SYMPTOMS[0].key;
  let activeView = "front";
  const localPoints = [...points];

  const wrap = document.createElement("div");
  wrap.className = "bodymap";

  const viewToggle = document.createElement("div");
  viewToggle.className = "bodymap-view-toggle";
  const frontBtn = document.createElement("button");
  frontBtn.type = "button";
  frontBtn.textContent = "Vorderseite";
  frontBtn.className = "chip active";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "Rückseite";
  backBtn.className = "chip";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Punkte zurücksetzen";
  resetBtn.className = "chip reset-chip";
  viewToggle.append(frontBtn, backBtn, resetBtn);

  const svgHolder = document.createElement("div");
  svgHolder.className = "bodymap-svg-holder";

  const legend = document.createElement("div");
  legend.className = "bodymap-legend";
  SYMPTOMS.forEach((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "legend-dot" + (i === 0 ? " active" : "");
    b.style.setProperty("--dot-color", s.color);
    b.textContent = s.label;
    b.addEventListener("click", () => {
      activeSymptomKey = s.key;
      legend.querySelectorAll(".legend-dot").forEach((d) => d.classList.remove("active"));
      b.classList.add("active");
    });
    legend.appendChild(b);
  });

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Symptom oben wählen, dann auf die Körperstelle tippen. Nochmal auf einen Punkt tippen entfernt ihn.";

  function drawMarkers(svg) {
    svg.querySelectorAll(".bodymap-marker").forEach((m) => m.remove());
    localPoints
      .filter((p) => p.view === svg.dataset.view)
      .forEach((p) => {
        const NS = "http://www.w3.org/2000/svg";
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", p.x * VIEW_W);
        c.setAttribute("cy", p.y * VIEW_H);
        c.setAttribute("r", "7");
        c.setAttribute("fill", p.color);
        c.setAttribute("stroke", "white");
        c.setAttribute("stroke-width", "1.5");
        c.setAttribute("class", "bodymap-marker");
        c.addEventListener("click", (e) => {
          e.stopPropagation();
          const globalIdx = localPoints.indexOf(p);
          localPoints.splice(globalIdx, 1);
          drawMarkers(svg);
          onChange([...localPoints]);
        });
        svg.appendChild(c);
      });
  }

  function buildSvg(view) {
    const svg = makeSvg(view);
    svg.addEventListener("click", (e) => {
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const symptom = SYMPTOMS.find((s) => s.key === activeSymptomKey);
      localPoints.push({
        view,
        x,
        y,
        symptomKey: activeSymptomKey,
        color: symptom ? symptom.color : OTHER_COLOR,
      });
      drawMarkers(svg);
      onChange([...localPoints]);
    });
    drawMarkers(svg);
    return svg;
  }

  function showView(view) {
    activeView = view;
    svgHolder.innerHTML = "";
    svgHolder.appendChild(buildSvg(view));
    frontBtn.classList.toggle("active", view === "front");
    backBtn.classList.toggle("active", view === "back");
  }

  frontBtn.addEventListener("click", () => showView("front"));
  backBtn.addEventListener("click", () => showView("back"));
  resetBtn.addEventListener("click", () => {
    if (localPoints.length === 0) return;
    if (!confirm("Alle Punkte auf dem Körper (Vorder- und Rückseite) entfernen?")) return;
    localPoints.length = 0;
    showView(activeView);
    onChange([...localPoints]);
  });

  wrap.append(legend, viewToggle, svgHolder, hint);
  container.appendChild(wrap);
  showView(activeView);
}
