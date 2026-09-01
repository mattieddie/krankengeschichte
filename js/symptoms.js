// Zentrale Liste der Symptome inkl. Farbcode für die Körperkarte und Übersicht.
export const SYMPTOMS = [
  { key: "anschwellung", label: "Anschwellung", color: "#f59e0b" },
  { key: "angiooedem", label: "Angioödem", color: "#ef4444" },
  { key: "urtikaria", label: "Urtikaria", color: "#ec4899" },
  { key: "schwindel", label: "Schwindel", color: "#8b5cf6" },
  { key: "jucken", label: "Jucken", color: "#eab308" },
  { key: "uebelkeit", label: "Übelkeit", color: "#22c55e" },
  { key: "erbrechen", label: "Erbrechen", color: "#14b8a6" },
  { key: "sprachfindungsstoerung", label: "Sprachfindungsstörung", color: "#3b82f6" },
  { key: "tremor", label: "Tremor", color: "#92400e" },
];

export const OTHER_COLOR = "#6b7280";

export function symptomColor(key) {
  const s = SYMPTOMS.find((s) => s.key === key);
  return s ? s.color : OTHER_COLOR;
}

export function symptomLabel(key) {
  const s = SYMPTOMS.find((s) => s.key === key);
  return s ? s.label : key;
}
