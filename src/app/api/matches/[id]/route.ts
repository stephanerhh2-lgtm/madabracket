import { updateMatchResult } from "@/lib/bracket-engine";
import { getTournamentByIdWithDetails } from "@/lib/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const matchId = Number(id);
    if (!Number.isFinite(matchId)) {
      return NextResponse.json({ error: "Match invalide." }, { status: 400 });
    }

    const body = await request.json();
    const allowedStatuses = ["en_attente", "en_direct", "termine"] as const;
    const status = allowedStatuses.includes(body.status)
      ? body.status
      : "termine";

    const updatedMatch = await updateMatchResult({
      matchId,
      score1: Number(body.score1) || 0,
      score2: Number(body.score2) || 0,
      status,
      scheduledLabel:
        typeof body.scheduledLabel === "string"
          ? body.scheduledLabel.trim().slice(0, 60)
          : undefined,
      note:
        typeof body.note === "string"
          ? body.note.trim().slice(0, 140)
          : undefined,
    });

    const updatedTournament = await getTournamentByIdWithDetails(
      updatedMatch.tournamentId
    );

    return NextResponse.json({
      match: updatedMatch,
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error("PATCH /api/matches/[id] error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Impossible d'enregistrer le résultat du match.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
