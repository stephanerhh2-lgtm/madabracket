import { db } from "@/db";
import { matches, participants, tournaments } from "@/db/schema";
import { generateBracketForTournament } from "@/lib/bracket-engine";
import { getTournamentByIdWithDetails } from "@/lib/seed";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPARRING_POOL = [
  { name: "AinaVortex", tag: "AINA", cityOrClub: "Antananarivo", color: "#FF3B30" },
  { name: "SoaLegend", tag: "SOAL", cityOrClub: "Toamasina", color: "#10B981" },
  { name: "TianaClutch", tag: "TIAN", cityOrClub: "Antsirabe", color: "#3B82F6" },
  { name: "VolaPrime", tag: "VOLA", cityOrClub: "Mahajanga", color: "#F59E0B" },
  { name: "NjakaRush", tag: "NJAK", cityOrClub: "Fianarantsoa", color: "#8B5CF6" },
  { name: "MamyTitan", tag: "MAMY", cityOrClub: "Toliara", color: "#EC4899" },
  { name: "RijaFury", tag: "RIJA", cityOrClub: "Antsiranana", color: "#14B8A6" },
  { name: "ZoShadow", tag: "ZOSH", cityOrClub: "Nosy Be", color: "#F97316" },
  { name: "HasinaAce", tag: "HASI", cityOrClub: "Antananarivo", color: "#06B6D4" },
  { name: "LantoNova", tag: "LANT", cityOrClub: "Ambatondrazaka", color: "#EAB308" },
  { name: "FetraStorm", tag: "FETR", cityOrClub: "Morondava", color: "#EF4444" },
  { name: "SitrakaZero", tag: "SITR", cityOrClub: "Sainte-Marie", color: "#22C55E" },
  { name: "OnjaSpark", tag: "ONJA", cityOrClub: "Antsirabe", color: "#A855F7" },
  { name: "HajaBlaze", tag: "HAJA", cityOrClub: "Toamasina", color: "#FB923C" },
  { name: "NirinaCore", tag: "NIRI", cityOrClub: "Antananarivo", color: "#38BDF8" },
  { name: "BemaStrike", tag: "BEMA", cityOrClub: "Mahajanga", color: "#F43F5E" },
];

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const tournamentId = Number(id);
    if (!Number.isFinite(tournamentId)) {
      return NextResponse.json({ error: "ID invalide." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "generate";

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

    if (action === "shuffle_seeds") {
      if (tournament.status !== "inscriptions") {
        return NextResponse.json(
          { error: "Le tirage au sort n'est disponible qu'avant le lancement." },
          { status: 400 }
        );
      }

      const roster = await db
        .select()
        .from(participants)
        .where(eq(participants.tournamentId, tournamentId));

      const shuffled = [...roster].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await db
          .update(participants)
          .set({ seed: i + 1 })
          .where(eq(participants.id, shuffled[i].id));
      }

      const updated = await getTournamentByIdWithDetails(tournamentId);
      return NextResponse.json({ tournament: updated });
    }

    if (action === "fill_remaining") {
      if (tournament.status !== "inscriptions") {
        return NextResponse.json(
          { error: "Les inscriptions ne sont plus ouvertes." },
          { status: 400 }
        );
      }

      const roster = await db
        .select()
        .from(participants)
        .where(eq(participants.tournamentId, tournamentId))
        .orderBy(asc(participants.seed));

      const existingNames = new Set(roster.map((p) => p.name.toLowerCase()));
      let nextSeed = roster.length + 1;

      for (const candidate of SPARRING_POOL) {
        if (nextSeed > tournament.maxParticipants) break;
        if (existingNames.has(candidate.name.toLowerCase())) continue;

        await db.insert(participants).values({
          tournamentId,
          name: candidate.name,
          tag: candidate.tag,
          seed: nextSeed,
          contact: `${candidate.tag.toLowerCase()}@madabracket.mg`,
          cityOrClub: candidate.cityOrClub,
          avatarColor: candidate.color,
          checkedIn: true,
        });
        existingNames.add(candidate.name.toLowerCase());
        nextSeed++;
      }

      const updated = await getTournamentByIdWithDetails(tournamentId);
      return NextResponse.json({ tournament: updated });
    }

    if (action === "reopen_registrations") {
      await db.delete(matches).where(eq(matches.tournamentId, tournamentId));
      await db
        .update(tournaments)
        .set({
          status: "inscriptions",
          championParticipantId: null,
        })
        .where(eq(tournaments.id, tournamentId));

      const updated = await getTournamentByIdWithDetails(tournamentId);
      return NextResponse.json({ tournament: updated });
    }

    // Default action: generate bracket
    await generateBracketForTournament(tournamentId);
    const updated = await getTournamentByIdWithDetails(tournamentId);
    return NextResponse.json({ tournament: updated });
  } catch (error) {
    console.error("POST /api/tournaments/[id]/bracket error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de générer l'arbre du tournoi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
