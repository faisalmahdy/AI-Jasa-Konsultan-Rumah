import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createProject } from "@/lib/pipeline";

// Node runtime: better-sqlite3 (native) cannot run on the edge.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bundle = createProject(body); // validates (Zod) + computes + persists
    return NextResponse.json({ id: bundle.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Input tidak valid", issues: err.issues },
        { status: 400 },
      );
    }
    console.error("createProject failed:", err);
    return NextResponse.json({ error: "Gagal membuat proyek" }, { status: 500 });
  }
}
