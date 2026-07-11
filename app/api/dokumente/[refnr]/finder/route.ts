import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { findeOrdner } from "@/lib/dokumente";

const execFileAsync = promisify(execFile);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ refnr: string }> }
) {
  const { refnr } = await params;

  // Path comes exclusively from the server-side glob resolution,
  // never from request data.
  const ordner = await findeOrdner(refnr);
  if (!ordner) {
    return NextResponse.json({ fehler: "Kein Ordner gefunden" }, { status: 404 });
  }

  try {
    await execFileAsync("open", [ordner]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Finder-Open fehlgeschlagen:", err);
    return NextResponse.json(
      { fehler: "Finder konnte nicht geöffnet werden" },
      { status: 500 }
    );
  }
}
