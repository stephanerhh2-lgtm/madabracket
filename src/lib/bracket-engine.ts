import { db } from "@/db";
import { matches, participants, tournaments, type Match } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";

export function getSeedPairings(bracketSize: number): Array<[number, number]> {
  if (bracketSize <= 4) {
    return [
      [1, 4],
      [2, 3],
    ];
  }
  if (bracketSize <= 8) {
    return [
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ];
  }
  return [
    [1, 16],
    [8, 9],
    [4, 13],
    [5, 12],
    [2, 15],
    [7, 10],
    [3, 14],
    [6, 11],
  ];
}

export function getRoundName(round: number, totalRounds: number): string {
  const diff = totalRounds - round;
  if (diff === 0) return "Grande Finale";
  if (diff === 1) return "Demi-finales";
  if (diff === 2) return "Quarts de finale";
  if (diff === 3) return "Huitièmes de finale";
  return `Tour ${round}`;
}

export function normalizeBracketSize(maxParticipants: number, count: number): number {
  const target = Math.max(maxParticipants, count);
  if (target <= 4) return 4;
  if (target <= 8) return 8;
  return 16;
}

export async function generateBracketForTournament(tournamentId: number) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId));

  if (!tournament) {
    throw new Error("Tournoi introuvable.");
  }

  const roster = await db
    .select()
    .from(participants)
    .where(eq(participants.tournamentId, tournamentId))
    .orderBy(asc(participants.seed), asc(participants.id));

  if (roster.length < 2) {
    throw new Error(
      "Il faut au moins 2 participants inscrits pour générer le tableau de compétition."
    );
  }

  // Re-normalize seeds sequentially 1..N
  for (let i = 0; i < roster.length; i++) {
    const expectedSeed = i + 1;
    if (roster[i].seed !== expectedSeed) {
      await db
        .update(participants)
        .set({ seed: expectedSeed })
        .where(eq(participants.id, roster[i].id));
      roster[i].seed = expectedSeed;
    }
  }

  const bracketSize = normalizeBracketSize(
    tournament.maxParticipants,
    roster.length
  );
  const totalRounds = Math.log2(bracketSize);
  const pairings = getSeedPairings(bracketSize);
  const bySeed = new Map(roster.map((p) => [p.seed, p]));

  // Remove any existing matches before regenerating
  await db.delete(matches).where(eq(matches.tournamentId, tournamentId));

  const createdByRound = new Map<number, Match[]>();

  for (let round = 1; round <= totalRounds; round++) {
    const matchCount = bracketSize / Math.pow(2, round);
    const roundName = getRoundName(round, totalRounds);
    const roundMatches: Match[] = [];

    for (let order = 0; order < matchCount; order++) {
      let player1Id: number | null = null;
      let player2Id: number | null = null;

      if (round === 1) {
        const [seedA, seedB] = pairings[order];
        player1Id = bySeed.get(seedA)?.id ?? null;
        player2Id = bySeed.get(seedB)?.id ?? null;
      }

      const [inserted] = await db
        .insert(matches)
        .values({
          tournamentId,
          round,
          matchOrder: order,
          roundName,
          player1Id,
          player2Id,
          score1: 0,
          score2: 0,
          winnerId: null,
          status: "en_attente",
          bestOf: round === totalRounds ? Math.max(tournament.bestOf, 5) : tournament.bestOf,
          scheduledLabel:
            round === 1
              ? `Match #${order + 1}`
              : round === totalRounds
              ? "Scène Principale"
              : `${roundName} #${order + 1}`,
          note: "",
        })
        .returning();

      roundMatches.push(inserted);
    }

    createdByRound.set(round, roundMatches);
  }

  // Handle BYEs in Round 1 automatically
  const round1 = createdByRound.get(1) ?? [];
  const round2 = createdByRound.get(2) ?? [];

  for (let order = 0; order < round1.length; order++) {
    const m = round1[order];
    const hasP1 = m.player1Id !== null;
    const hasP2 = m.player2Id !== null;

    if (hasP1 && !hasP2) {
      const [updated] = await db
        .update(matches)
        .set({
          score1: 1,
          score2: 0,
          winnerId: m.player1Id,
          status: "termine",
          note: "Qualification d'office (BYE)",
          completedAt: new Date(),
        })
        .where(eq(matches.id, m.id))
        .returning();
      round1[order] = updated;

      if (round2.length > 0) {
        const nextMatch = round2[Math.floor(order / 2)];
        const isTop = order % 2 === 0;
        const [updatedNext] = await db
          .update(matches)
          .set(isTop ? { player1Id: m.player1Id } : { player2Id: m.player1Id })
          .where(eq(matches.id, nextMatch.id))
          .returning();
        round2[Math.floor(order / 2)] = updatedNext;
      }
    } else if (!hasP1 && hasP2) {
      const [updated] = await db
        .update(matches)
        .set({
          score1: 0,
          score2: 1,
          winnerId: m.player2Id,
          status: "termine",
          note: "Qualification d'office (BYE)",
          completedAt: new Date(),
        })
        .where(eq(matches.id, m.id))
        .returning();
      round1[order] = updated;

      if (round2.length > 0) {
        const nextMatch = round2[Math.floor(order / 2)];
        const isTop = order % 2 === 0;
        const [updatedNext] = await db
          .update(matches)
          .set(isTop ? { player1Id: m.player2Id } : { player2Id: m.player2Id })
          .where(eq(matches.id, nextMatch.id))
          .returning();
        round2[Math.floor(order / 2)] = updatedNext;
      }
    } else if (!hasP1 && !hasP2) {
      await db
        .update(matches)
        .set({
          status: "termine",
          note: "Créneau vacant",
          completedAt: new Date(),
        })
        .where(eq(matches.id, m.id));
    }
  }

  await db
    .update(tournaments)
    .set({
      status: "en_cours",
      maxParticipants: bracketSize,
      championParticipantId: null,
    })
    .where(eq(tournaments.id, tournamentId));

  return { bracketSize, totalRounds };
}

async function cascadeClearDownstream(
  tournamentId: number,
  fromRound: number,
  matchOrder: number,
  slotToSet: "player1Id" | "player2Id",
  newPlayerId: number | null
) {
  const [targetMatch] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.round, fromRound),
        eq(matches.matchOrder, matchOrder)
      )
    );

  if (!targetMatch) return;

  const currentSlotValue =
    slotToSet === "player1Id" ? targetMatch.player1Id : targetMatch.player2Id;

  if (currentSlotValue === newPlayerId) {
    return;
  }

  const hadPreviousProgress =
    targetMatch.winnerId !== null ||
    targetMatch.score1 !== 0 ||
    targetMatch.score2 !== 0 ||
    targetMatch.status !== "en_attente";

  await db
    .update(matches)
    .set({
      [slotToSet]: newPlayerId,
      ...(hadPreviousProgress
        ? {
            score1: 0,
            score2: 0,
            winnerId: null,
            status: "en_attente",
            completedAt: null,
          }
        : {}),
    })
    .where(eq(matches.id, targetMatch.id));

  if (hadPreviousProgress) {
    const nextOrder = Math.floor(matchOrder / 2);
    const nextSlot = matchOrder % 2 === 0 ? "player1Id" : "player2Id";
    await cascadeClearDownstream(
      tournamentId,
      fromRound + 1,
      nextOrder,
      nextSlot,
      null
    );
  }
}

export async function updateMatchResult(params: {
  matchId: number;
  score1: number;
  score2: number;
  status: "en_attente" | "en_direct" | "termine";
  scheduledLabel?: string;
  note?: string;
}) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, params.matchId));

  if (!match) {
    throw new Error("Match introuvable.");
  }

  const s1 = Math.max(0, Math.floor(Number(params.score1) || 0));
  const s2 = Math.max(0, Math.floor(Number(params.score2) || 0));

  let winnerId: number | null = null;

  if (params.status === "termine") {
    if (!match.player1Id && !match.player2Id) {
      throw new Error(
        "Impossible de clôturer un match sans participants assignés."
      );
    }
    if (match.player1Id && match.player2Id && s1 === s2) {
      throw new Error(
        "En élimination directe, les scores ne peuvent pas être à égalité pour valider un vainqueur."
      );
    }
    if (match.player1Id && !match.player2Id) {
      winnerId = match.player1Id;
    } else if (!match.player1Id && match.player2Id) {
      winnerId = match.player2Id;
    } else {
      winnerId = s1 > s2 ? match.player1Id : match.player2Id;
    }
  }

  const [updatedMatch] = await db
    .update(matches)
    .set({
      score1: s1,
      score2: s2,
      status: params.status,
      winnerId,
      scheduledLabel:
        params.scheduledLabel !== undefined
          ? params.scheduledLabel
          : match.scheduledLabel,
      note: params.note !== undefined ? params.note : match.note,
      completedAt: params.status === "termine" ? new Date() : null,
    })
    .where(eq(matches.id, match.id))
    .returning();

  // Propagate winner to next round
  const nextRound = match.round + 1;
  const nextOrder = Math.floor(match.matchOrder / 2);
  const nextSlot = match.matchOrder % 2 === 0 ? "player1Id" : "player2Id";

  await cascadeClearDownstream(
    match.tournamentId,
    nextRound,
    nextOrder,
    nextSlot,
    winnerId
  );

  // Check if this tournament has a Grand Final completed
  const allTournamentMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, match.tournamentId));

  const maxRound = allTournamentMatches.reduce(
    (acc, item) => Math.max(acc, item.round),
    1
  );
  const finalMatch = allTournamentMatches.find((m) => m.round === maxRound);

  if (finalMatch && finalMatch.status === "termine" && finalMatch.winnerId) {
    await db
      .update(tournaments)
      .set({
        status: "termine",
        championParticipantId: finalMatch.winnerId,
      })
      .where(eq(tournaments.id, match.tournamentId));
  } else {
    await db
      .update(tournaments)
      .set({
        status: "en_cours",
        championParticipantId: null,
      })
      .where(eq(tournaments.id, match.tournamentId));
  }

  return updatedMatch;
}
