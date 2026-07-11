import { promises as fs } from "fs";
import path from "path";

// Mirrors the n8n pipeline's folder naming: refnr with unsafe chars replaced
export function refnrSafe(refnr: string): string | null {
  const safe = refnr.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!safe || safe === "." || safe === "..") return null;
  return safe;
}

export function bewerbungenDir(): string | null {
  return process.env.BEWERBUNGEN_DIR ?? null;
}

// Resolves ~/Bewerbungen/*/<refnr_safe>/ — exactly one folder per refnr
export async function findeOrdner(refnr: string): Promise<string | null> {
  const basis = bewerbungenDir();
  const safe = refnrSafe(refnr);
  if (!basis || !safe) return null;

  let eintraege;
  try {
    eintraege = await fs.readdir(basis, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const eintrag of eintraege) {
    if (!eintrag.isDirectory()) continue;
    const kandidat = path.join(basis, eintrag.name, safe);
    try {
      if ((await fs.stat(kandidat)).isDirectory()) return kandidat;
    } catch {
      // Firmenordner ohne diesen refnr-Unterordner
    }
  }
  return null;
}

export async function listePdfs(ordner: string): Promise<string[]> {
  const eintraege = await fs.readdir(ordner, { withFileTypes: true });
  return eintraege
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => e.name)
    .sort();
}

// Same sanitizing rule as safe_folder/refnr_safe in the n8n pipeline's
// render.py: [^A-Za-z0-9._-] → "_"
export function safeName(wert: string): string {
  return wert.replace(/[^A-Za-z0-9._-]/g, "_");
}

// Builds download names like "<Firma>_Anschreiben.pdf" and
// "<Firma>_Lebenslauf_<A|B>.pdf" so that files from different
// applications stay distinguishable in the download folder
export function downloadDateiname(
  datei: string,
  firma: string | null,
  variante: "A" | "B"
): string {
  const stamm = datei.replace(/\.pdf$/i, "");
  const praefix = firma ? `${safeName(firma).slice(0, 60)}_` : "";
  if (/^lebenslauf$/i.test(stamm)) return `${praefix}Lebenslauf_${variante}.pdf`;
  if (/^anschreiben$/i.test(stamm)) return `${praefix}Anschreiben.pdf`;
  return `${praefix}${safeName(stamm)}.pdf`;
}

// A filename is only valid if it is a plain name (no path parts) and
// literally appears in the resolved folder's PDF listing.
export async function gueltigePdfDatei(
  ordner: string,
  datei: string
): Promise<boolean> {
  if (
    datei.includes("/") ||
    datei.includes("\\") ||
    datei.includes("..") ||
    !datei.toLowerCase().endsWith(".pdf")
  ) {
    return false;
  }
  const pdfs = await listePdfs(ordner);
  return pdfs.includes(datei);
}

// Sammelt in EINEM Durchlauf alle refnr-Ordnernamen, die unter
// ~/Bewerbungen/<Firma>/<refnr_safe>/ existieren. Damit lässt sich pro Stelle
// günstig prüfen, ob ein Ordner auflösbar ist (Button aktiv/inaktiv).
export async function vorhandeneRefnrOrdner(): Promise<Set<string>> {
  const basis = bewerbungenDir();
  const treffer = new Set<string>();
  if (!basis) return treffer;
  let firmen;
  try {
    firmen = await fs.readdir(basis, { withFileTypes: true });
  } catch {
    return treffer;
  }
  for (const firma of firmen) {
    if (!firma.isDirectory()) continue;
    try {
      const unter = await fs.readdir(path.join(basis, firma.name), { withFileTypes: true });
      for (const u of unter) if (u.isDirectory()) treffer.add(u.name);
    } catch {
      // Firmenordner nicht lesbar — überspringen
    }
  }
  return treffer;
}
