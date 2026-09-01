import { symptomLabel } from "./symptoms.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("de-CH");
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
    "Auslöser",
    "Symptome",
    "Weitere Symptome",
    "Medikamente",
    "Schmerzort",
    "Besonderes",
  ];
  const rows = entries.map((e) => [
    fmtDate(e.entry_date),
    e.triggers || "",
    (e.symptoms || []).map(symptomLabel).join(", "),
    e.symptoms_other || "",
    e.medications || "",
    e.pain_location || "",
    e.notes || "",
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

export function openPrintView(entries) {
  const win = window.open("", "_blank");
  const rows = entries
    .map(
      (e) => `
      <section class="print-entry">
        <h3>${fmtDate(e.entry_date)}</h3>
        <table>
          <tr><th>Auslöser</th><td>${e.triggers || "–"}</td></tr>
          <tr><th>Symptome</th><td>${(e.symptoms || []).map(symptomLabel).join(", ") || "–"}</td></tr>
          <tr><th>Weitere Symptome</th><td>${e.symptoms_other || "–"}</td></tr>
          <tr><th>Medikamente</th><td>${e.medications || "–"}</td></tr>
          <tr><th>Schmerzort</th><td>${e.pain_location || "–"}</td></tr>
          <tr><th>Besonderes</th><td>${e.notes || "–"}</td></tr>
        </table>
      </section>`
    )
    .join("\n");

  win.document.write(`
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
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 0.25rem 0.5rem; vertical-align: top; font-size: 0.9rem; }
        th { width: 9rem; color: #555; font-weight: 600; }
        @media print { body { margin: 1cm; } }
      </style>
    </head>
    <body>
      <h1>Krankengeschichte – Übersicht (${entries.length} Einträge)</h1>
      <p>Erstellt am ${new Date().toLocaleDateString("de-CH")}</p>
      ${rows}
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}
