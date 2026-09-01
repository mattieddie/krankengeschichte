import { SYMPTOMS, OTHER_COLOR } from "./symptoms.js";

// Vereinfachte Körper-Silhouette (Vorder- und Rückansicht sehen im MVP gleich aus,
// die Ansicht wird trotzdem separat gespeichert, damit z.B. "Rücken" vs. "Brust"
// später unterschieden werden kann).
const BODY_SILHOUETTE = `
  <path d="M100 20 a18 18 0 1 0 0.01 0 Z
           M78 46 q22 -10 44 0 l8 55 q-4 10 -14 10 l-4 40 q10 4 10 14 l0 55 q0 8 -8 8 q-6 0 -7 -8 l-6 -60 h-2 l-6 60 q-1 8 -7 8 q-8 0 -8 -8 l0 -55 q0 -10 10 -14 l-4 -40 q-10 0 -14 -10 Z"
        fill="var(--body-fill)" stroke="var(--body-stroke)" stroke-width="2"/>
  <path d="M78 55 l-22 40 q-4 8 4 12 q7 3 11 -5 l20 -38 Z" fill="var(--body-fill)" stroke="var(--body-stroke)" stroke-width="2"/>
  <path d="M122 55 l22 40 q4 8 -4 12 q-7 3 -11 -5 l-20 -38 Z" fill="var(--body-fill)" stroke="var(--body-stroke)" stroke-width="2"/>
`;

function makeSvg(viewLabel) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 300");
  svg.setAttribute("class", "bodymap-svg");
  svg.dataset.view = viewLabel;
  svg.innerHTML = BODY_SILHOUETTE;
  return svg;
}

export function renderBodyMap(container, points, onChange) {
  container.innerHTML = "";
  let activeSymptomKey = SYMPTOMS[0].key;
  let activeView = "front";
  const localPoints = [...points];

  const wrap = document.createElement("div");
  wrap.className = "bodymap";

  // View toggle
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
  viewToggle.append(frontBtn, backBtn);

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
      .forEach((p, idx) => {
        const NS = "http://www.w3.org/2000/svg";
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", p.x * 200);
        c.setAttribute("cy", p.y * 300);
        c.setAttribute("r", "6");
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

  wrap.append(legend, viewToggle, svgHolder, hint);
  container.appendChild(wrap);
  showView(activeView);
}
