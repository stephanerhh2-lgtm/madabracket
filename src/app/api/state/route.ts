import { getFullArenaState } from "@/lib/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getFullArenaState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("GET /api/state error:", error);
    return NextResponse.json(
      { error: "Impossible de charger les données de MadaBracket." },
      { status: 500 }
    );
  }
}
