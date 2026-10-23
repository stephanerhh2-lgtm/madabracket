import { db } from "@/db";
import {
  matches,
  participants,
  siteBranding,
  tournaments,
  type Match,
  type Participant,
  type SiteBranding,
  type Tournament,
} from "@/db/schema";
import { asc, count, eq } from "drizzle-orm";
import {
  generateBracketForTournament,
  updateMatchResult,
} from "./bracket-engine";

export interface EnrichedTournament extends Tournament {
  participants: Participant[];
  matches: Match[];
}

export interface ArenaStatePayload {
  branding: SiteBranding;
  tournaments: EnrichedTournament[];
}

let seedPromise: Promise<void> | null = null;

async function runSeedOnce() {
  // 1. Ensure site_branding exists
  const existingBranding = await db.select().from(siteBranding).limit(1);
  if (existingBranding.length === 0) {
    await db.insert(siteBranding).values({
      siteName: "MadaBracket",
      tagline:
        "Plateforme officielle d'organisation de tournois, d'inscriptions et de tableaux de compétition",
      organizerName: "Mada Esports & Arena",
      logoUrl: "/images/default-logo.png",
      bannerUrl: "/images/default-banner.jpg",
      accentColor: "#FF3B30",
      bannerOverlayOpacity: 52,
      logoShape: "rounded",
      location: "Antananarivo • LAN & En ligne",
      streamUrl: "https://twitch.tv/madabracket",
      discordUrl: "https://discord.gg/madabracket",
    });
  }

  // 2. Ensure sample tournaments exist if table is empty
  const [{ value: tournamentCount }] = await db
    .select({ value: count() })
    .from(tournaments);

  if (tournamentCount > 0) {
    return;
  }

  // --- TOURNOI 1: EN COURS (Tekken 8 - 8 joueurs) ---
  const [t1] = await db
    .insert(tournaments)
    .values({
      slug: "mada-champions-cup-tekken-8",
      title: "Mada Champions Cup — Tekken 8",
      gameOrSport: "Tekken 8",
      category: "Combat",
      format: "Élimination directe",
      maxParticipants: 8,
      bestOf: 5,
      status: "en_cours",
      prizePool: "1 500 000 Ar",
      startDate: "Samedi 18 Mai • 14h00",
      location: "Palais des Sports Mahamasina & Stream",
      description:
        "Le rendez-vous majeur de la scène Versus Fighting malgache. Huit des meilleurs combattants s'affrontent en arbre à élimination directe pour décrocher le titre national MadaBracket.",
      rules:
        "Format FT3 (Best of 5) dès les quarts de finale, Grande Finale en FT3. Sélection libre du personnage au premier match ; le perdant uniquement peut changer de personnage. Temps par round : 60 secondes.",
      bannerUrl: "/images/default-banner.jpg",
    })
    .returning();

  const t1Players = [
    {
      name: "RavoKing",
      tag: "TANA",
      seed: 1,
      contact: "ravoking#1024",
      cityOrClub: "Antananarivo",
      avatarColor: "#FF3B30",
    },
    {
      name: "MaheryX",
      tag: "BAOB",
      seed: 2,
      contact: "maheryx#8810",
      cityOrClub: "Toamasina",
      avatarColor: "#10B981",
    },
    {
      name: "FanjaBlade",
      tag: "ZOMA",
      seed: 3,
      contact: "fanjablade#4402",
      cityOrClub: "Antsirabe",
      avatarColor: "#F59E0B",
    },
    {
      name: "TokyFist",
      tag: "NOSY",
      seed: 4,
      contact: "tokyfist#3319",
      cityOrClub: "Nosy Be",
      avatarColor: "#3B82F6",
    },
    {
      name: "AndryJin",
      tag: "DAGO",
      seed: 5,
      contact: "andryjin#7712",
      cityOrClub: "Antananarivo",
      avatarColor: "#8B5CF6",
    },
    {
      name: "LovaKaz",
      tag: "MAJA",
      seed: 6,
      contact: "lovakaz#5120",
      cityOrClub: "Mahajanga",
      avatarColor: "#EC4899",
    },
    {
      name: "TsiryDevil",
      tag: "FIAN",
      seed: 7,
      contact: "tsiry#9091",
      cityOrClub: "Fianarantsoa",
      avatarColor: "#14B8A6",
    },
    {
      name: "MikaMishima",
      tag: "TAMA",
      seed: 8,
      contact: "mika#2048",
      cityOrClub: "Toamasina",
      avatarColor: "#F97316",
    },
  ];

  for (const p of t1Players) {
    await db.insert(participants).values({
      tournamentId: t1.id,
      ...p,
      checkedIn: true,
    });
  }

  await generateBracketForTournament(t1.id);
  const t1Matches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, t1.id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));

  const t1R1 = t1Matches.filter((m) => m.round === 1);
  // Seed pairings: [1v8], [4v5], [2v7], [3v6]
  await updateMatchResult({
    matchId: t1R1[0].id,
    score1: 3,
    score2: 0,
    status: "termine",
    scheduledLabel: "Quart #1 • Terminé",
    note: "Perfection au round décisif",
  });
  await updateMatchResult({
    matchId: t1R1[1].id,
    score1: 2,
    score2: 3,
    status: "termine",
    scheduledLabel: "Quart #2 • Terminé",
    note: "Remontada spectaculaire d'AndryJin",
  });
  await updateMatchResult({
    matchId: t1R1[2].id,
    score1: 3,
    score2: 1,
    status: "termine",
    scheduledLabel: "Quart #3 • Terminé",
  });
  await updateMatchResult({
    matchId: t1R1[3].id,
    score1: 3,
    score2: 2,
    status: "termine",
    scheduledLabel: "Quart #4 • Terminé",
  });

  const t1AfterR1 = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, t1.id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));
  const t1R2 = t1AfterR1.filter((m) => m.round === 2);

  // Demi-finale #1 terminée -> RavoKing en Grande Finale
  await updateMatchResult({
    matchId: t1R2[0].id,
    score1: 3,
    score2: 1,
    status: "termine",
    scheduledLabel: "Demi-finale #1 • Scène A",
    note: "RavoKing premier qualifié en Grande Finale",
  });

  // Demi-finale #2 EN DIRECT (2 - 2) !
  await updateMatchResult({
    matchId: t1R2[1].id,
    score1: 2,
    score2: 2,
    status: "en_direct",
    scheduledLabel: "EN DIRECT • Scène Principale",
    note: "Manche décisive en cours sur le stream !",
  });

  // --- TOURNOI 2: INSCRIPTIONS OUVERTES (EA Sports FC 26 - 6/8 inscrits) ---
  const [t2] = await db
    .insert(tournaments)
    .values({
      slug: "coupe-tana-fc26-zoma",
      title: "Coupe Tana FC 26 — Édition Zoma",
      gameOrSport: "EA Sports FC 26",
      category: "Sport",
      format: "Élimination directe",
      maxParticipants: 8,
      bestOf: 3,
      status: "inscriptions",
      prizePool: "800 000 Ar",
      startDate: "Vendredi 24 Mai • 18h30",
      location: "Cyber Arena Analakely & En ligne",
      description:
        "Tournoi ouvert à tous les passionnés de simulation footballistique ! Inscrivez votre pseudo dès maintenant pour réserver l'une des dernières places du tableau à 8 joueurs.",
      rules:
        "Matchs en aller-retour (ou Best of 3 de 6 minutes par mi-temps). Équipes Clubs 95 OVR équilibrés ou sélections internationales. Tirs au but en cas d'égalité au match décisif.",
      bannerUrl: "/images/preset-cyber-emerald.jpg",
    })
    .returning();

  const t2Players = [
    {
      name: "BareaPro_Hery",
      tag: "BARE",
      seed: 1,
      contact: "hery_fc@mada.mg",
      cityOrClub: "Analakely FC",
      avatarColor: "#10B981",
    },
    {
      name: "TahinaGoal",
      tag: "TAHI",
      seed: 2,
      contact: "tahina#2211",
      cityOrClub: "Ivandry Club",
      avatarColor: "#FF3B30",
    },
    {
      name: "NantenainaXI",
      tag: "NANT",
      seed: 3,
      contact: "nantenaina#0981",
      cityOrClub: "Antsirabe",
      avatarColor: "#3B82F6",
    },
    {
      name: "KotoStriker",
      tag: "KOTO",
      seed: 4,
      contact: "koto@arena.mg",
      cityOrClub: "Mahajanga",
      avatarColor: "#F59E0B",
    },
    {
      name: "MioraTactix",
      tag: "MIOR",
      seed: 5,
      contact: "miora#5540",
      cityOrClub: "Antananarivo",
      avatarColor: "#EC4899",
    },
    {
      name: "Faniryinho",
      tag: "FANI",
      seed: 6,
      contact: "faniry#7788",
      cityOrClub: "Fianarantsoa",
      avatarColor: "#8B5CF6",
    },
  ];

  for (const p of t2Players) {
    await db.insert(participants).values({
      tournamentId: t2.id,
      ...p,
      checkedIn: true,
    });
  }

  // --- TOURNOI 3: TERMINÉ (Valorant 5v5 - 8 équipes avec Champion) ---
  const [t3] = await db
    .insert(tournaments)
    .values({
      slug: "ligue-malagasy-valorant-printemps",
      title: "Ligue Malagasy Valorant 5v5 — Split Printemps",
      gameOrSport: "Valorant 5v5",
      category: "Esport",
      format: "Élimination directe",
      maxParticipants: 8,
      bestOf: 3,
      status: "en_cours",
      prizePool: "3 000 000 Ar",
      startDate: "Dimanche 5 Mai • Finale jouée",
      location: "En ligne • Serveur Océan Indien",
      description:
        "Le championnat tactique par équipes 5v5 réunissant les huit meilleures escouades de l'île. Retrouvez l'intégralité du tableau final et des scores officiels.",
      rules:
        "Quarts et Demi-finales en Bo3, Grande Finale en Bo5 avec veto de cartes standard compétitif. Prolongations Win-by-2 actives sur toutes les cartes.",
      bannerUrl: "/images/preset-arena-gold.jpg",
    })
    .returning();

  const t3Teams = [
    {
      name: "Baobab Esports",
      tag: "BAOB",
      seed: 1,
      contact: "contact@baobab.gg",
      cityOrClub: "Antananarivo",
      avatarColor: "#10B981",
    },
    {
      name: "Red Island Five",
      tag: "RED5",
      seed: 2,
      contact: "admin@redisland.mg",
      cityOrClub: "Toamasina",
      avatarColor: "#FF3B30",
    },
    {
      name: "Zebu Gaming",
      tag: "ZEBU",
      seed: 3,
      contact: "team@zebugaming.mg",
      cityOrClub: "Antsirabe",
      avatarColor: "#F59E0B",
    },
    {
      name: "Lemur Tactical",
      tag: "LEMR",
      seed: 4,
      contact: "lemur@esport.mg",
      cityOrClub: "Nosy Be",
      avatarColor: "#3B82F6",
    },
    {
      name: "Ikopa Squad",
      tag: "IKOP",
      seed: 5,
      contact: "ikopa#1100",
      cityOrClub: "Antananarivo",
      avatarColor: "#8B5CF6",
    },
    {
      name: "Ravinala Pulse",
      tag: "RAVI",
      seed: 6,
      contact: "ravinala#2233",
      cityOrClub: "Mahajanga",
      avatarColor: "#14B8A6",
    },
    {
      name: "Tsingy Apex",
      tag: "TSIN",
      seed: 7,
      contact: "tsingy#9900",
      cityOrClub: "Morondava",
      avatarColor: "#F97316",
    },
    {
      name: "Ankaratra Vipers",
      tag: "ANKA",
      seed: 8,
      contact: "vipers#4545",
      cityOrClub: "Ambatolampy",
      avatarColor: "#EC4899",
    },
  ];

  for (const team of t3Teams) {
    await db.insert(participants).values({
      tournamentId: t3.id,
      ...team,
      checkedIn: true,
    });
  }

  await generateBracketForTournament(t3.id);
  const t3M = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, t3.id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));

  const t3R1 = t3M.filter((m) => m.round === 1);
  await updateMatchResult({
    matchId: t3R1[0].id,
    score1: 2,
    score2: 0,
    status: "termine",
  });
  await updateMatchResult({
    matchId: t3R1[1].id,
    score1: 2,
    score2: 1,
    status: "termine",
  });
  await updateMatchResult({
    matchId: t3R1[2].id,
    score1: 2,
    score2: 0,
    status: "termine",
  });
  await updateMatchResult({
    matchId: t3R1[3].id,
    score1: 1,
    score2: 2,
    status: "termine",
  });

  const t3AfterR1 = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, t3.id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));
  const t3R2 = t3AfterR1.filter((m) => m.round === 2);

  await updateMatchResult({
    matchId: t3R2[0].id,
    score1: 2,
    score2: 0,
    status: "termine",
  });
  await updateMatchResult({
    matchId: t3R2[1].id,
    score1: 2,
    score2: 1,
    status: "termine",
  });

  const t3AfterR2 = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, t3.id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));
  const t3Final = t3AfterR2.find((m) => m.round === 3);

  if (t3Final) {
    await updateMatchResult({
      matchId: t3Final.id,
      score1: 3,
      score2: 1,
      status: "termine",
      scheduledLabel: "Grande Finale • Bo5",
      note: "Baobab Esports remporte le Split Printemps (13-9 Ascent, 11-13 Bind, 13-7 Lotus, 13-10 Haven)",
    });
  }
}

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = runSeedOnce().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

export async function getFullArenaState(): Promise<ArenaStatePayload> {
  await ensureSeeded();

  const [branding] = await db
    .select()
    .from(siteBranding)
    .orderBy(asc(siteBranding.id))
    .limit(1);

  const allTournaments = await db
    .select()
    .from(tournaments)
    .orderBy(asc(tournaments.id));

  const allParticipants = await db
    .select()
    .from(participants)
    .orderBy(asc(participants.seed), asc(participants.id));

  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.round), asc(matches.matchOrder));

  const participantsByTournament = new Map<number, Participant[]>();
  for (const p of allParticipants) {
    const arr = participantsByTournament.get(p.tournamentId) ?? [];
    arr.push(p);
    participantsByTournament.set(p.tournamentId, arr);
  }

  const matchesByTournament = new Map<number, Match[]>();
  for (const m of allMatches) {
    const arr = matchesByTournament.get(m.tournamentId) ?? [];
    arr.push(m);
    matchesByTournament.set(m.tournamentId, arr);
  }

  // Sort tournaments so 'en_cours' appears first, then 'inscriptions', then 'termine', preserving recent creations
  const statusPriority: Record<string, number> = {
    en_cours: 0,
    inscriptions: 1,
    termine: 2,
  };

  const enriched: EnrichedTournament[] = allTournaments
    .map((t) => ({
      ...t,
      participants: participantsByTournament.get(t.id) ?? [],
      matches: matchesByTournament.get(t.id) ?? [],
    }))
    .sort((a, b) => {
      const pa = statusPriority[a.status] ?? 9;
      const pb = statusPriority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.id - a.id;
    });

  return {
    branding,
    tournaments: enriched,
  };
}

export async function getTournamentByIdWithDetails(
  id: number
): Promise<EnrichedTournament | null> {
  const [t] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id));
  if (!t) return null;

  const tParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.tournamentId, id))
    .orderBy(asc(participants.seed), asc(participants.id));

  const tMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, id))
    .orderBy(asc(matches.round), asc(matches.matchOrder));

  return {
    ...t,
    participants: tParticipants,
    matches: tMatches,
  };
}
