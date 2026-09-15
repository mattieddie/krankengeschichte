// Zentrale Liste der Symptome inkl. Farbcode für die Körperkarte und Übersicht.
// onBody: true → auf der Körperkarte platzierbar (nur Symptome mit klarer Körperstelle).
export const SYMPTOMS = [
  { key: "anschwellung", label: "Anschwellung", color: "#f59e0b", onBody: true },
  { key: "angiooedem", label: "Angioödem", color: "#ef4444", onBody: true },
  { key: "urtikaria", label: "Urtikaria", color: "#ec4899", onBody: true },
  { key: "jucken", label: "Jucken", color: "#eab308", onBody: true },
  { key: "taubheitsgefuehl", label: "Taubheitsgefühl", color: "#06b6d4", onBody: true },
  { key: "kribbeln", label: "Kribbeln", color: "#a855f7", onBody: true },
  { key: "schwindel", label: "Schwindel", color: "#6366f1", onBody: false },
  { key: "uebelkeit", label: "Übelkeit", color: "#22c55e", onBody: false },
  { key: "erbrechen", label: "Erbrechen", color: "#14b8a6", onBody: false },
  { key: "sprachfindungsstoerung", label: "Sprachfindungsstörung", color: "#3b82f6", onBody: false },
  { key: "tremor", label: "Tremor", color: "#92400e", onBody: false },
];

export const BODY_MAP_SYMPTOMS = SYMPTOMS.filter((s) => s.onBody);

export const OTHER_COLOR = "#6b7280";

export function symptomColor(key) {
  const s = SYMPTOMS.find((s) => s.key === key);
  return s ? s.color : OTHER_COLOR;
}

export function symptomLabel(key) {
  const s = SYMPTOMS.find((s) => s.key === key);
  return s ? s.label : key;
}
