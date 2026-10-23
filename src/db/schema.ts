import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const siteBranding = pgTable("site_branding", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("MadaBracket"),
  tagline: text("tagline")
    .notNull()
    .default(
      "Arène officielle d'organisation de tournois, d'inscriptions et de brackets compétitifs"
    ),
  organizerName: text("organizer_name")
    .notNull()
    .default("Collectif Mada Compétition"),
  logoUrl: text("logo_url").notNull().default("/images/default-logo.png"),
  bannerUrl: text("banner_url").notNull().default("/images/default-banner.jpg"),
  accentColor: text("accent_color").notNull().default("#FF3B30"),
  bannerOverlayOpacity: integer("banner_overlay_opacity").notNull().default(52),
  logoShape: text("logo_shape").notNull().default("rounded"),
  location: text("location").notNull().default("Antananarivo • LAN & En ligne"),
  streamUrl: text("stream_url")
    .notNull()
    .default("https://twitch.tv/madabracket"),
  discordUrl: text("discord_url")
    .notNull()
    .default("https://discord.gg/madabracket"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  gameOrSport: text("game_or_sport").notNull(),
  category: text("category").notNull().default("Esport"),
  format: text("format").notNull().default("Élimination directe"),
  maxParticipants: integer("max_participants").notNull().default(8),
  bestOf: integer("best_of").notNull().default(3),
  status: text("status").notNull().default("inscriptions"), // 'inscriptions' | 'en_cours' | 'termine'
  prizePool: text("prize_pool").notNull().default("500 000 Ar"),
  startDate: text("start_date").notNull(),
  location: text("location").notNull().default("En ligne"),
  description: text("description").notNull(),
  rules: text("rules").notNull(),
  bannerUrl: text("banner_url"),
  championParticipantId: integer("champion_participant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tag: text("tag").notNull(),
  seed: integer("seed").notNull(),
  contact: text("contact").notNull().default(""),
  cityOrClub: text("city_or_club").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default("#FF3B30"),
  checkedIn: boolean("checked_in").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  matchOrder: integer("match_order").notNull(),
  roundName: text("round_name").notNull(),
  player1Id: integer("player1_id").references(() => participants.id, {
    onDelete: "set null",
  }),
  player2Id: integer("player2_id").references(() => participants.id, {
    onDelete: "set null",
  }),
  score1: integer("score1").notNull().default(0),
  score2: integer("score2").notNull().default(0),
  winnerId: integer("winner_id").references(() => participants.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("en_attente"), // 'en_attente' | 'en_direct' | 'termine'
  bestOf: integer("best_of").notNull().default(3),
  scheduledLabel: text("scheduled_label").notNull().default(""),
  note: text("note").notNull().default(""),
  completedAt: timestamp("completed_at"),
});

export type SiteBranding = typeof siteBranding.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Match = typeof matches.$inferSelect;
