import { symptomLabel, SYMPTOMS } from "./symptoms.js";
import { silhouetteMarkup } from "./bodymap.js";
import { getAttachmentSignedUrl } from "./entries.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("de-CH");
}

function fmtDateTime(e) {
  const datePart = fmtDate(e.entry_date);
  return e.entry_time ? `${datePart}, ${e.entry_time.slice(0, 5)} Uhr` : datePart;
}

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function exportCsv(entries) {
  const header = [
    "Datum",
    "Uhrzeit",
    "Auslöser",
    "Aktivitäten",
    "Symptome",
    "Weitere Symptome",
    "Medikamente",
    "Schmerzort",
    "Besonderes",
    "Fotos",
  ];
  const rows = entries.map((e) => [
    fmtDate(e.entry_date),
    e.entry_time ? e.entry_time.slice(0, 5) : "",
    e.triggers || "",
    e.activities || "",
    (e.symptoms || []).map(symptomLabel).join(", "),
    e.symptoms_other || "",
    e.medications || "",
    e.pain_location || "",
    e.notes || "",
    (e.attachments || []).length,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `krankengeschichte-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bodyMapPrintHtml(entry) {
  const points = entry.body_points || [];
  if (points.length === 0) return "";
  const hasFront = points.some((p) => p.view === "front");
  const hasBack = points.some((p) => p.view === "back");
  const svgs = [];
  if (hasFront) svgs.push(`<figure><figcaption>Vorderseite</figcaption>${silhouetteMarkup(points, "front")}</figure>`);
  if (hasBack) svgs.push(`<figure><figcaption>Rückseite</figcaption>${silhouetteMarkup(points, "back")}</figure>`);
  return `<div class="print-bodymap">${svgs.join("")}</div>`;
}

function legendHtml() {
  return `<div class="print-legend">${SYMPTOMS.map(
    (s) => `<span class="legend-item"><span class="legend-swatch" style="background:${s.color}"></span>${s.label}</span>`
  ).join("")}</div>`;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadEntryPhotos(entry) {
  const attachments = entry.attachments || [];
  const results = await Promise.all(
    attachments.map(async (a) => {
      try {
        const url = await getAttachmentSignedUrl(a.path, 300);
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await blobToDataUrl(blob);
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

function photosPrintHtml(dataUrls) {
  if (!dataUrls.length) return "";
  return `<div class="print-photos">${dataUrls.map((src) => `<img src="${src}" alt="Foto" />`).join("")}</div>`;
}

export async function openPrintView(entries) {
  const win = window.open("", "_blank");
  win.document.write(`
    <!doctype html>
    <html lang="de">
    <head><meta charset="utf-8" /><title>Krankengeschichte – Export</title></head>
    <body><p style="font-family: system-ui, sans-serif;">Export wird vorbereitet…</p></body>
    </html>
  `);
  win.document.close();

  const anyBodyPoints = entries.some((e) => (e.body_points || []).length > 0);
  const entryPhotos = await Promise.all(entries.map(loadEntryPhotos));

  const rows = entries
    .map(
      (e, i) => `
      <section class="print-entry">
        <h3>${fmtDateTime(e)}</h3>
        <div class="print-entry-body">
          <table>
            <tr><th>Auslöser</th><td>${e.triggers || "–"}</td></tr>
            <tr><th>Aktivitäten</th><td>${e.activities || "–"}</td></tr>
            <tr><th>Symptome</th><td>${(e.symptoms || []).map(symptomLabel).join(", ") || "–"}</td></tr>
            <tr><th>Weitere Symptome</th><td>${e.symptoms_other || "–"}</td></tr>
            <tr><th>Medikamente</th><td>${e.medications || "–"}</td></tr>
            <tr><th>Schmerzort</th><td>${e.pain_location || "–"}</td></tr>
            <tr><th>Besonderes</th><td>${e.notes || "–"}</td></tr>
          </table>
          ${bodyMapPrintHtml(e)}
        </div>
        ${photosPrintHtml(entryPhotos[i])}
      </section>`
    )
    .join("\n");

  const html = `
    <!doctype html>
    <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Krankengeschichte – Export</title>
      <style>
        body { font-family: system-ui, sans-serif; color: #111; margin: 2rem; }
        h1 { font-size: 1.4rem; }
        .print-entry { break-inside: avoid; margin-bottom: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 1rem; }
        h3 { margin-bottom: 0.4rem; }
        .print-entry-body { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
        table { border-collapse: collapse; flex: 1; min-width: 260px; }
        th, td { text-align: left; padding: 0.25rem 0.5rem; vertical-align: top; font-size: 0.9rem; }
        th { width: 9rem; color: #555; font-weight: 600; }
        .print-bodymap { display: flex; gap: 0.5rem; }
        .print-bodymap figure { margin: 0; text-align: center; }
        .print-bodymap figcaption { font-size: 0.7rem; color: #555; margin-bottom: 0.15rem; }
        .print-photos { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
        .print-photos img { width: 110px; height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid #ccc; }
        .print-legend { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 0.5rem 0 1.25rem; font-size: 0.78rem; color: #444; }
        .legend-item { display: inline-flex; align-items: center; gap: 0.3rem; }
        .legend-swatch { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        @media print { body { margin: 1cm; } }
      </style>
    </head>
    <body>
      <h1>Krankengeschichte – Übersicht (${entries.length} Einträge)</h1>
      <p>Erstellt am ${new Date().toLocaleDateString("de-CH")}</p>
      ${anyBodyPoints ? legendHtml() : ""}
      ${rows}
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
