import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { getTournamentByIdWithDetails } from "@/lib/seed";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "ID invalide." }, { status: 400 });
    }

    const body = await request.json();
    const [existing] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));

    if (!existing) {
      return NextResponse.json(
        { error: "Tournoi introuvable." },
        { status: 404 }
      );
    }

    await db
      .update(tournaments)
      .set({
        title:
          typeof body.title === "string" && body.title.trim()
            ? body.title.trim()
            : existing.title,
        prizePool:
          typeof body.prizePool === "string" && body.prizePool.trim()
            ? body.prizePool.trim()
            : existing.prizePool,
        startDate:
          typeof body.startDate === "string" && body.startDate.trim()
            ? body.startDate.trim()
            : existing.startDate,
        location:
          typeof body.location === "string" && body.location.trim()
            ? body.location.trim()
            : existing.location,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : existing.description,
        rules:
          typeof body.rules === "string" && body.rules.trim()
            ? body.rules.trim()
            : existing.rules,
        bannerUrl:
          body.bannerUrl !== undefined ? body.bannerUrl : existing.bannerUrl,
      })
      .where(eq(tournaments.id, tournamentId));

    const updated = await getTournamentByIdWithDetails(tournamentId);
    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("PATCH /api/tournaments/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du tournoi." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "ID invalide." }, { status: 400 });
    }

    await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tournaments/[id] error:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer ce tournoi." },
      { status: 500 }
    );
  }
}
