"use client";

import type { EnrichedTournament } from "@/lib/seed";
import { Plus, Sparkles, Trophy, X } from "lucide-react";
import React, { useState } from "react";

interface CreateTournamentModalProps {
  accentColor: string;
  onClose: () => void;
  onCreated: (tournament: EnrichedTournament) => void;
}

const POPULAR_DISCIPLINES = [
  { label: "Tekken 8", category: "Combat" },
  { label: "EA Sports FC 26", category: "Sport" },
  { label: "Valorant 5v5", category: "Esport" },
  { label: "Mobile Legends", category: "Esport" },
  { label: "Street Fighter 6", category: "Combat" },
  { label: "Basketball 3x3", category: "Sport" },
  { label: "Échecs Blitz", category: "Stratégie" },
];

export function CreateTournamentModal({
  accentColor,
  onClose,
  onCreated,
}: CreateTournamentModalProps) {
  const [title, setTitle] = useState("");
  const [gameOrSport, setGameOrSport] = useState("Tekken 8");
  const [category, setCategory] = useState("Combat");
  const [maxParticipants, setMaxParticipants] = useState<number>(8);
  const [bestOf, setBestOf] = useState<number>(3);
  const [prizePool, setPrizePool] = useState("1 000 000 Ar");
  const [startDate, setStartDate] = useState("Samedi prochain • 14h00");
  const [location, setLocation] = useState("Antananarivo & En ligne");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState(
    "Arbre à élimination directe. Check-in obligatoire 15 minutes avant le début du tournoi. Fair-play et ponctualité exigés."
  );
  const [quickPlayersText, setQuickPlayersText] = useState("");
  const [autoStartBracket, setAutoStartBracket] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const initialParticipants = quickPlayersText
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          gameOrSport,
          category,
          maxParticipants,
          bestOf,
          prizePool,
          startDate,
          location,
          description,
          rules,
          initialParticipants,
          autoStartBracket,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de créer le tournoi.");
      }

      onCreated(data.tournament);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du tournoi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#121722] border border-white/15 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#121722]/95 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Organiser un Nouveau Tournoi
              </h2>
              <p className="text-xs text-slate-400">
                Configurez les inscriptions, la taille du bracket et le règlement officiel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/35 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nom officiel du tournoi *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Open National Mada — Saison 2"
              className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Quick discipline selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Jeu ou Discipline sportive *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {POPULAR_DISCIPLINES.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    setGameOrSport(d.label);
                    setCategory(d.category);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                    gameOrSport === d.label
                      ? "bg-white/15 border-white/40 text-white"
                      : "bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={gameOrSport}
                  onChange={(e) => setGameOrSport(e.target.value)}
                  placeholder="Nom du jeu ou du sport"
                  className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2 text-sm text-white"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2 text-sm text-white"
              >
                <option value="Esport">Esport</option>
                <option value="Combat">Versus / Combat</option>
                <option value="Sport">Sport & Simulation</option>
                <option value="Stratégie">Stratégie / Cartes</option>
              </select>
            </div>
          </div>

          {/* Bracket Size & Best Of */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Capacité du Tableau (Places)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[4, 8, 16].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setMaxParticipants(size)}
                    className={`rounded-xl py-2.5 font-mono text-sm font-bold border transition ${
                      maxParticipants === size
                        ? "border-white bg-white/15 text-white"
                        : "border-white/10 bg-[#0A0D14] text-slate-400 hover:text-white"
                    }`}
                  >
                    {size} joueurs
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Format des Matchs
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 1, l: "Bo1" },
                  { v: 3, l: "Bo3" },
                  { v: 5, l: "Bo5" },
                ].map((item) => (
                  <button
                    key={item.v}
                    type="button"
                    onClick={() => setBestOf(item.v)}
                    className={`rounded-xl py-2.5 font-mono text-sm font-bold border transition ${
                      bestOf === item.v
                        ? "border-white bg-white/15 text-white"
                        : "border-white/10 bg-[#0A0D14] text-slate-400 hover:text-white"
                    }`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prize, Date, Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Cashprize / Dotation
              </label>
              <input
                type="text"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="Ex: 1 000 000 Ar"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Date & Coup d&apos;envoi
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Dimanche 2 Juin • 15h"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Lieu / Serveur
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Antananarivo / En ligne"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* Description & Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Présentation du tournoi
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Présentation courte pour les joueurs et spectateurs..."
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">
                Règlement principal
              </label>
              <textarea
                rows={3}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Optional pre-seed roster */}
          <div className="rounded-xl bg-[#1A2130]/60 border border-white/10 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Pré-inscrire des joueurs/équipes dès maintenant (optionnel)
              </label>
              <span className="text-[11px] text-slate-400">
                1 nom par ligne ou séparé par virgule
              </span>
            </div>
            <textarea
              rows={2}
              value={quickPlayersText}
              onChange={(e) => setQuickPlayersText(e.target.value)}
              placeholder="Ex: Team Tana, Baobab Five, Zoma Gaming, Nosy Legends..."
              className="w-full rounded-lg bg-[#0A0D14] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />
            {quickPlayersText.trim().length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStartBracket}
                  onChange={(e) => setAutoStartBracket(e.target.checked)}
                  className="rounded accent-[#FF3B30]"
                />
                Générer et lancer immédiatement l&apos;arbre de compétition à la création
              </label>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Création..." : "Créer le Tournoi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
