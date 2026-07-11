import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import {
  downloadDateiname,
  findeOrdner,
  gueltigePdfDatei,
  listePdfs,
} from "@/lib/dokumente";
import { cvVariante, getDownloadInfo } from "@/lib/stellen";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string; datei: string }> }
) {
  const { refnr, datei } = await params;

  const ordner = await findeOrdner(refnr);
  if (!ordner) {
    return NextResponse.json({ fehler: "Nicht gefunden" }, { status: 404 });
  }

  // Originalname → inline anzeigen
  if (await gueltigePdfDatei(ordner, datei)) {
    return pdfAntwort(
      path.join(ordner, datei),
      `inline; filename="${datei}"; filename*=UTF-8''${encodeURIComponent(datei)}`
    );
  }

  // Sprechender Download-Name im Pfad (mobile Browser leiten den Dateinamen
  // aus der URL ab, nicht aus Content-Disposition). Sicher, weil nur gegen
  // serverseitig berechnete Namen verglichen wird — kein Pfad aus Request-Daten.
  const info = await getDownloadInfo(refnr);
  for (const pdf of await listePdfs(ordner)) {
    const zielname = downloadDateiname(
      pdf,
      info?.arbeitgeber ?? null,
      cvVariante(info?.score_richtung ?? null)
    );
    if (zielname === datei) {
      // zielname ist durch safeName() bereits reines ASCII → taugt als Fallback
      return pdfAntwort(
        path.join(ordner, pdf),
        `attachment; filename="${zielname}"; filename*=UTF-8''${encodeURIComponent(zielname)}`
      );
    }
  }

  return NextResponse.json({ fehler: "Nicht gefunden" }, { status: 404 });
}

async function pdfAntwort(pfad: string, disposition: string) {
  const inhalt = await fs.readFile(pfad);
  return new NextResponse(new Uint8Array(inhalt), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
