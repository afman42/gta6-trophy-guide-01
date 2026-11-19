// Progress store for Leonida Ledger: one set of earned trophy names,
// kept in localStorage and exportable/importable as a JSON file.
// Nothing here touches the network; the file never leaves the browser
// except when the reader presses Export.
export const STORE_KEY = "leonida-ledger-progress-v1";

// Read the saved set. A damaged or foreign value is treated as empty
// rather than crashing the page.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((name) => typeof name === "string"));
  } catch {
    return new Set();
  }
}

// Persist the set. localStorage can throw when the browser blocks it
// (private mode, quota); the checklist keeps working in memory then.
export function saveProgress(earned) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
    return true;
  } catch {
    return false;
  }
}

// Keep only names that exist in this guide's list, so an imported file
// from another guide cannot pollute the tracker.
export function cleanImported(names, knownNames) {
  if (!Array.isArray(names)) return new Set();
  const known = new Set(knownNames);
  return new Set(names.filter((name) => typeof name === "string" && known.has(name)));
}

// Download the earned set as a JSON file the reader can keep or share.
export function exportProgress(earned) {
  const blob = new Blob([JSON.stringify([...earned], null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leonida-ledger-progress.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Read an exported progress file back into a set of names.
export async function importProgressFile(file, knownNames) {
  const text = await file.text();
  return cleanImported(JSON.parse(text), knownNames);
}
