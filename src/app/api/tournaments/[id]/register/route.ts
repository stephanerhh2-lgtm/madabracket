import { db } from "@/db";
import { participants, tournaments } from "@/db/schema";
import { getTournamentByIdWithDetails } from "@/lib/seed";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_COLORS = [
  "#FF3B30",
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "Tournoi invalide." }, { status: 400 });
    }

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));

    if (!tournament) {
      return NextResponse.json(
        { error: "Tournoi introuvable." },
        { status: 404 }
      );
    }

    if (tournament.status !== "inscriptions") {
      return NextResponse.json(
        {
          error:
            "Les inscriptions sont closes car l'arbre de ce tournoi a déjà démarré.",
        },
        { status: 400 }
      );
    }

    const currentRoster = await db
      .select()
      .from(participants)
      .where(eq(participants.tournamentId, tournamentId))
      .orderBy(asc(participants.seed), asc(participants.id));

    if (currentRoster.length >= tournament.maxParticipants) {
      return NextResponse.json(
        { error: "Ce tournoi est complet ! Toutes les places sont prises." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Veuillez saisir un pseudo ou nom d'équipe valide (min. 2 caractères)." },
        { status: 400 }
      );
    }

    const duplicate = currentRoster.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Ce joueur ou cette équipe est déjà inscrit(e) dans ce tournoi." },
        { status: 400 }
      );
    }

    const rawTag =
      typeof body.tag === "string" && body.tag.trim()
        ? body.tag.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)
        : name
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase()
            .slice(0, 4);

    const tag = rawTag || "MADA";
    const contact =
      typeof body.contact === "string" ? body.contact.trim().slice(0, 80) : "";
    const cityOrClub =
      typeof body.cityOrClub === "string" && body.cityOrClub.trim()
        ? body.cityOrClub.trim().slice(0, 60)
        : "Madagascar";
    const avatarColor =
      typeof body.avatarColor === "string" &&
      /^#[0-9A-Fa-f]{6}$/.test(body.avatarColor.trim())
        ? body.avatarColor.trim()
        : DEFAULT_COLORS[currentRoster.length % DEFAULT_COLORS.length];

    const nextSeed = currentRoster.length + 1;

    await db.insert(participants).values({
      tournamentId,
      name: name.slice(0, 48),
      tag,
      seed: nextSeed,
      contact,
      cityOrClub,
      avatarColor,
      checkedIn: true,
    });

    const updated = await getTournamentByIdWithDetails(tournamentId);
    return NextResponse.json({ tournament: updated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tournaments/[id]/register error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'validation de l'inscription." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    const body = await request.json();
    const participantId = Number(body.participantId);

    if (!Number.isFinite(tournamentId) || !Number.isFinite(participantId)) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const [p] = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.tournamentId, tournamentId)
        )
      );

    if (!p) {
      return NextResponse.json(
        { error: "Participant introuvable." },
        { status: 404 }
      );
    }

    await db
      .update(participants)
      .set({
        checkedIn:
          typeof body.checkedIn === "boolean" ? body.checkedIn : !p.checkedIn,
      })
      .where(eq(participants.id, participantId));

    const updated = await getTournamentByIdWithDetails(tournamentId);
    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("PATCH /api/tournaments/[id]/register error:", error);
    return NextResponse.json(
      { error: "Impossible de modifier le check-in." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    const url = new URL(request.url);
    const participantId = Number(url.searchParams.get("participantId"));

    if (!Number.isFinite(tournamentId) || !Number.isFinite(participantId)) {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 }
      );
    }

    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId));

    if (!tournament || tournament.status !== "inscriptions") {
      return NextResponse.json(
        {
          error:
            "Impossible de retirer un joueur une fois le tableau de compétition lancé.",
        },
        { status: 400 }
      );
    }

    await db
      .delete(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.tournamentId, tournamentId)
        )
      );

    // Re-number seeds 1..N
    const remaining = await db
      .select()
      .from(participants)
      .where(eq(participants.tournamentId, tournamentId))
      .orderBy(asc(participants.seed), asc(participants.id));

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].seed !== i + 1) {
        await db
          .update(participants)
          .set({ seed: i + 1 })
          .where(eq(participants.id, remaining[i].id));
      }
    }

    const updated = await getTournamentByIdWithDetails(tournamentId);
    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("DELETE /api/tournaments/[id]/register error:", error);
    return NextResponse.json(
      { error: "Impossible de retirer ce participant." },
      { status: 500 }
    );
  }
}
