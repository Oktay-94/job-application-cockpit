import { NextResponse } from "next/server";
import { bewerbungenDir, findeOrdner, listePdfs } from "@/lib/dokumente";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  if (!bewerbungenDir()) {
    return NextResponse.json(
      { fehler: "BEWERBUNGEN_DIR ist nicht konfiguriert" },
      { status: 500 }
    );
  }

  const { refnr } = await params;
  const ordner = await findeOrdner(refnr);
  if (!ordner) {
    return NextResponse.json({ dateien: [] }, { status: 404 });
  }

  return NextResponse.json({ dateien: await listePdfs(ordner) });
}
