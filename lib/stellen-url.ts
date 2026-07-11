// Immer eine klickbare Quell-URL — quelle-bewusst, nie null. Ersetzt die alte
// quelle-blinde jobUrl, die für manuell-* einen toten BA-Link gebaut hätte.
export function stellenUrl(s: {
  refnr: string;
  externe_url: string | null;
  formular_url: string | null;
  quelle: string | null;
  titel: string | null;
  arbeitgeber: string | null;
}): string {
  if (s.externe_url) return s.externe_url; // echte URL zuerst ("" ist falsy → fällt durch)
  if (s.formular_url) return s.formular_url;
  // BA: refnr ist hier IMMER eine gültige BA-Referenz (nie manuell-*) → jobdetail.
  if (s.quelle === "bundesagentur")
    return `https://www.arbeitsagentur.de/jobsuche/jobdetail/${encodeURIComponent(s.refnr)}`;
  // manuell / ungeklärt / (theoretisch Adzuna ohne URL): generische Suche.
  const suche = [s.titel, s.arbeitgeber].filter(Boolean).join(" ") || s.refnr;
  return `https://www.google.com/search?q=${encodeURIComponent(suche)}`;
}
