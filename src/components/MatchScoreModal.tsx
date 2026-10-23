"use client";

import type { Match, Participant } from "@/db/schema";
import {
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  Radio,
  Trophy,
  X,
} from "lucide-react";
import React, { useState } from "react";

interface MatchScoreModalProps {
  match: Match;
  player1: Participant | undefined;
  player2: Participant | undefined;
  accentColor: string;
  onClose: () => void;
  onUpdated: (match: Match, updatedTournament: unknown) => void;
}

export function MatchScoreModal({
  match,
  player1,
  player2,
  accentColor,
  onClose,
  onUpdated,
}: MatchScoreModalProps) {
  const [score1, setScore1] = useState(match.score1);
  const [score2, setScore2] = useState(match.score2);
  const [status, setStatus] = useState<"en_attente" | "en_direct" | "termine">(
    (match.status as "en_attente" | "en_direct" | "termine") || "en_direct"
  );
  const [scheduledLabel, setScheduledLabel] = useState(
    match.scheduledLabel || ""
  );
  const [note, setNote] = useState(match.note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitWithStatus(
    nextStatus: "en_attente" | "en_direct" | "termine"
  ) {
    setError(null);

    if (nextStatus === "termine" && player1 && player2 && score1 === score2) {
      setError(
        "Égalité impossible en élimination directe : départagez le score avant de clôturer le match."
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score1,
          score2,
          status: nextStatus,
          scheduledLabel,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde du score.");
      }

      onUpdated(data.match, data.tournament);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer ce résultat."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#121722] border border-white/15 shadow-2xl overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161C2A]">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {match.roundName} • Bo{match.bestOf}
            </span>
            <h3 className="font-display text-lg font-bold text-white">
              Feuille de Match & Score Officiel
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/35 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Status selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus("en_attente")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold border transition ${
                status === "en_attente"
                  ? "bg-slate-700/60 border-slate-400 text-white"
                  : "bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              À venir
            </button>
            <button
              type="button"
              onClick={() => setStatus("en_direct")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold border transition ${
                status === "en_direct"
                  ? "bg-orange-500/20 border-orange-400 text-orange-200"
                  : "bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-orange-400" />
              En direct
            </button>
            <button
              type="button"
              onClick={() => setStatus("termine")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-semibold border transition ${
                status === "termine"
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-200"
                  : "bg-[#0A0D14] border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Terminé
            </button>
          </div>

          {/* Scoreboard Players */}
          <div className="space-y-3">
            {/* Player 1 */}
            <div
              className={`flex items-center justify-between gap-3 rounded-xl p-3.5 border transition ${
                score1 > score2
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : "bg-[#0A0D14] border-white/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs px-2 py-1 rounded-md bg-white/10 text-slate-300">
                  #{player1?.seed ?? "-"}
                </span>
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                  style={{
                    backgroundColor: player1?.avatarColor || "#334155",
                  }}
                >
                  {player1?.tag?.slice(0, 4) || "TBD"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white truncate">
                    {player1?.name || "En attente de qualifié"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {player1?.cityOrClub || "Slot Haut"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setScore1((s) => Math.max(0, s - 1))}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={score1}
                  onChange={(e) =>
                    setScore1(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-14 text-center font-mono text-xl font-bold rounded-lg bg-[#121722] border border-white/15 py-1 text-white"
                />
                <button
                  type="button"
                  onClick={() => setScore1((s) => s + 1)}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Player 2 */}
            <div
              className={`flex items-center justify-between gap-3 rounded-xl p-3.5 border transition ${
                score2 > score1
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : "bg-[#0A0D14] border-white/10"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-xs px-2 py-1 rounded-md bg-white/10 text-slate-300">
                  #{player2?.seed ?? "-"}
                </span>
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shrink-0"
                  style={{
                    backgroundColor: player2?.avatarColor || "#334155",
                  }}
                >
                  {player2?.tag?.slice(0, 4) || "TBD"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white truncate">
                    {player2?.name || "En attente de qualifié"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {player2?.cityOrClub || "Slot Bas"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setScore2((s) => Math.max(0, s - 1))}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={score2}
                  onChange={(e) =>
                    setScore2(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-14 text-center font-mono text-xl font-bold rounded-lg bg-[#121722] border border-white/15 py-1 text-white"
                />
                <button
                  type="button"
                  onClick={() => setScore2((s) => s + 1)}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Match metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Horaire / Terrain / Scène
              </label>
              <input
                type="text"
                value={scheduledLabel}
                onChange={(e) => setScheduledLabel(e.target.value)}
                placeholder="Ex: 16h00 • Scène Principale"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Note / Résumé du match
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Point décisif au dernier round"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* Footer CTA buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={saving}
              onClick={() => submitWithStatus("en_direct")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 px-3.5 py-2.5 text-xs font-semibold text-orange-200 transition disabled:opacity-50"
            >
              <Radio className="h-3.5 w-3.5" />
              Mettre à jour EN DIRECT
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => submitWithStatus(status)}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg transition disabled:opacity-50"
                style={{
                  backgroundColor:
                    status === "termine" ? "#10B981" : accentColor,
                }}
              >
                <Trophy className="h-3.5 w-3.5" />
                {saving
                  ? "Validation..."
                  : status === "termine"
                  ? "Valider le Vainqueur"
                  : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
