import { db } from "@/db";
import { participants, tournaments } from "@/db/schema";
import { generateBracketForTournament } from "@/lib/bracket-engine";
import {
  ensureSeeded,
  getFullArenaState,
  getTournamentByIdWithDetails,
} from "@/lib/seed";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

const AVATAR_PALETTE = [
  "#FF3B30",
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export async function GET() {
  try {
    const state = await getFullArenaState();
    return NextResponse.json({ tournaments: state.tournaments });
  } catch (error) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les tournois." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const gameOrSport =
      typeof body.gameOrSport === "string" ? body.gameOrSport.trim() : "";

    if (!title || !gameOrSport) {
      return NextResponse.json(
        { error: "Le nom du tournoi et la discipline sont obligatoires." },
        { status: 400 }
      );
    }

    const rawSlots = Number(body.maxParticipants) || 8;
    const maxParticipants = rawSlots <= 4 ? 4 : rawSlots <= 8 ? 8 : 16;
    const bestOf = [1, 3, 5, 7].includes(Number(body.bestOf))
      ? Number(body.bestOf)
      : 3;

    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim()
        : "Esport";

    const prizePool =
      typeof body.prizePool === "string" && body.prizePool.trim()
        ? body.prizePool.trim()
        : "Trophée Officiel";

    const startDate =
      typeof body.startDate === "string" && body.startDate.trim()
        ? body.startDate.trim()
        : "Prochainement";

    const location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : "En ligne";

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : `Compétition officielle ${gameOrSport} organisée sur MadaBracket.`;

    const rules =
      typeof body.rules === "string" && body.rules.trim()
        ? body.rules.trim()
        : "Format à élimination directe. Présence requise 15 minutes avant le coup d'envoi pour le check-in officiel.";

    const bannerUrl =
      typeof body.bannerUrl === "string" && body.bannerUrl.trim()
        ? body.bannerUrl.trim()
        : null;

    const [created] = await db
      .insert(tournaments)
      .values({
        slug: slugify(title),
        title,
        gameOrSport,
        category,
        format: "Élimination directe",
        maxParticipants,
        bestOf,
        status: "inscriptions",
        prizePool,
        startDate,
        location,
        description,
        rules,
        bannerUrl,
      })
      .returning();

    // Optional quick roster lines (newline or comma separated)
    if (Array.isArray(body.initialParticipants)) {
      const cleanNames = body.initialParticipants
        .map((n: unknown) => (typeof n === "string" ? n.trim() : ""))
        .filter(Boolean)
        .slice(0, maxParticipants);

      for (let i = 0; i < cleanNames.length; i++) {
        const name = cleanNames[i];
        const tag = name
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase()
          .slice(0, 4)
          .padEnd(3, "X");

        await db.insert(participants).values({
          tournamentId: created.id,
          name,
          tag,
          seed: i + 1,
          contact: "",
          cityOrClub: "Inscrit d'office",
          avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
          checkedIn: true,
        });
      }

      if (body.autoStartBracket === true && cleanNames.length >= 2) {
        await generateBracketForTournament(created.id);
      }
    }

    const enriched = await getTournamentByIdWithDetails(created.id);
    return NextResponse.json({ tournament: enriched }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tournaments error:", error);
    return NextResponse.json(
      { error: "Impossible de créer ce tournoi." },
      { status: 500 }
    );
  }
}
