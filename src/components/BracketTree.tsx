"use client";

import type { Match, Participant } from "@/db/schema";
import { Crown, Edit3, Play, Radio, Trophy } from "lucide-react";
import React, { useMemo, useState } from "react";

interface BracketTreeProps {
  matches: Match[];
  participants: Participant[];
  tournamentStatus: string;
  accentColor: string;
  isOrganizerMode: boolean;
  onSelectMatch: (match: Match) => void;
  onGenerateBracket?: () => void;
}

const BASE_CELL_HEIGHT = 142;

export function BracketTree({
  matches,
  participants,
  tournamentStatus,
  accentColor,
  isOrganizerMode,
  onSelectMatch,
  onGenerateBracket,
}: BracketTreeProps) {
  const [hoveredParticipantId, setHoveredParticipantId] = useState<
    number | null
  >(null);

  const participantMap = useMemo(() => {
    const map = new Map<number, Participant>();
    for (const p of participants) {
      map.set(p.id, p);
    }
    return map;
  }, [participants]);

  const rounds = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    for (const m of matches) {
      const list = grouped.get(m.round) ?? [];
      list.push(m);
      grouped.set(m.round, list);
    }
    const sortedRounds = Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([roundNum, list]) => ({
        round: roundNum,
        roundName: list[0]?.roundName || `Tour ${roundNum}`,
        matches: list.sort((a, b) => a.matchOrder - b.matchOrder),
      }));
    return sortedRounds;
  }, [matches]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl bg-[#121722] border border-white/10 p-8 sm:p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Trophy className="h-8 w-8" style={{ color: accentColor }} />
        </div>
        <h3 className="font-display text-2xl font-bold text-white">
          Tableau en attente de lancement
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
          Ce tournoi est actuellement en phase d&apos;inscriptions (
          <span className="font-mono text-white font-semibold">
            {participants.length} inscrit{participants.length > 1 ? "s" : ""}
          </span>
          ). Dès qu&apos;au moins 2 participants sont inscrits, vous pouvez générer automatiquement l&apos;arbre à élimination directe.
        </p>

        {participants.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {participants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1A2130] border border-white/10 px-3 py-1.5 text-xs text-slate-200"
              >
                <span className="font-mono text-slate-400">#{p.seed}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.avatarColor }}
                />
                <span className="font-semibold">{p.name}</span>
              </span>
            ))}
          </div>
        )}

        {onGenerateBracket && participants.length >= 2 && (
          <div className="mt-7">
            <button
              type="button"
              onClick={onGenerateBracket}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="h-4 w-4 fill-current" />
              Générer le Tableau & Lancer le Tournoi
            </button>
          </div>
        )}
      </div>
    );
  }

  const round1MatchCount = rounds[0].matches.length;
  const totalHeight = Math.max(280, round1MatchCount * BASE_CELL_HEIGHT);
  const finalRound = rounds[rounds.length - 1];
  const grandFinalMatch = finalRound?.matches[0];
  const champion =
    grandFinalMatch?.status === "termine" && grandFinalMatch.winnerId
      ? participantMap.get(grandFinalMatch.winnerId)
      : undefined;

  return (
    <div className="rounded-2xl bg-[#121722] border border-white/10 overflow-hidden">
      {/* Bracket Toolbar Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#161C2A] border-b border-white/10">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse-live" />
            Match en direct
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Qualifié au tour suivant
          </span>
          <span className="text-slate-400 hidden sm:inline">
            • Survolez un joueur pour tracer son parcours complet
          </span>
        </div>

        <span className="text-xs font-mono text-slate-400">
          {isOrganizerMode
            ? "Cliquez sur un match pour saisir le score"
            : tournamentStatus === "termine"
            ? "Tableau officiel homologué"
            : "Mise à jour en temps réel"}
        </span>
      </div>

      {/* Scrollable Horizontal Canvas */}
      <div className="bracket-scroll overflow-x-auto p-6 sm:p-8 arena-grid-bg">
        <div className="inline-flex items-start min-w-max">
          {rounds.map((roundGroup, rIdx) => {
            const cellHeight = BASE_CELL_HEIGHT * Math.pow(2, rIdx);
            const hasNextRound = rIdx < rounds.length - 1;
            const pairCount = Math.floor(roundGroup.matches.length / 2);

            return (
              <React.Fragment key={roundGroup.round}>
                {/* Round Column */}
                <div className="flex flex-col w-[274px] shrink-0">
                  {/* Column Header */}
                  <div className="mb-4 flex items-center justify-between rounded-xl bg-[#1A2130]/90 border border-white/10 px-3.5 py-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
                      {roundGroup.roundName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {roundGroup.matches.length} match
                      {roundGroup.matches.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Matches Stack */}
                  <div
                    className="relative flex flex-col"
                    style={{ height: `${totalHeight}px` }}
                  >
                    {roundGroup.matches.map((m) => {
                      const p1 = m.player1Id
                        ? participantMap.get(m.player1Id)
                        : undefined;
                      const p2 = m.player2Id
                        ? participantMap.get(m.player2Id)
                        : undefined;

                      const isLive = m.status === "en_direct";
                      const isDone = m.status === "termine";
                      const p1Won = isDone && m.winnerId === m.player1Id && !!p1;
                      const p2Won = isDone && m.winnerId === m.player2Id && !!p2;

                      const isHoveredMatch =
                        hoveredParticipantId !== null &&
                        (m.player1Id === hoveredParticipantId ||
                          m.player2Id === hoveredParticipantId);

                      const canOpenScore =
                        isOrganizerMode && (Boolean(p1) || Boolean(p2));

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-center"
                          style={{ height: `${cellHeight}px` }}
                        >
                          <div
                            onClick={() => {
                              if (canOpenScore) onSelectMatch(m);
                            }}
                            className={`group relative w-full rounded-xl bg-[#141A27] border transition-all duration-150 overflow-hidden shadow-lg ${
                              canOpenScore ? "cursor-pointer" : ""
                            } ${
                              isLive
                                ? "border-orange-500/70 ring-1 ring-orange-500/30"
                                : isHoveredMatch
                                ? "border-white/45 ring-1 ring-white/20 -translate-y-0.5"
                                : "border-white/12 hover:border-white/30"
                            }`}
                          >
                            {/* Top Meta Strip */}
                            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0E131D] border-b border-white/8 text-[10px]">
                              <span className="font-mono text-slate-400 truncate max-w-[165px]">
                                {m.scheduledLabel || `Bo${m.bestOf}`}
                              </span>

                              {isLive ? (
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-orange-400">
                                  <Radio className="h-3 w-3 animate-pulse" />
                                  DIRECT
                                </span>
                              ) : isDone ? (
                                <span className="font-mono text-emerald-400 font-semibold">
                                  FINAL
                                </span>
                              ) : canOpenScore ? (
                                <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-white transition">
                                  <Edit3 className="h-2.5 w-2.5" />
                                  Score
                                </span>
                              ) : (
                                <span className="font-mono text-slate-500">
                                  Bo{m.bestOf}
                                </span>
                              )}
                            </div>

                            {/* Player 1 Row */}
                            <div
                              onMouseEnter={() =>
                                p1 && setHoveredParticipantId(p1.id)
                              }
                              onMouseLeave={() => setHoveredParticipantId(null)}
                              className={`flex items-center justify-between px-3 py-2 border-b border-white/6 transition ${
                                p1Won
                                  ? "bg-emerald-500/12"
                                  : isDone && p2Won
                                  ? "opacity-55"
                                  : ""
                              } ${
                                p1 && hoveredParticipantId === p1.id
                                  ? "bg-white/10"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] w-5 text-center rounded bg-white/8 py-0.5 text-slate-400 shrink-0">
                                  {p1 ? p1.seed : "-"}
                                </span>
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      p1?.avatarColor || "#334155",
                                  }}
                                />
                                <span
                                  className={`text-xs truncate ${
                                    p1
                                      ? p1Won
                                        ? "font-bold text-white"
                                        : "font-medium text-slate-200"
                                      : "italic text-slate-500"
                                  }`}
                                >
                                  {p1 ? p1.name : m.round === 1 && isDone ? "Exempt (BYE)" : "À déterminer"}
                                </span>
                              </div>
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ml-2 shrink-0 ${
                                  p1Won
                                    ? "bg-emerald-500 text-[#04130D]"
                                    : isLive
                                    ? "bg-orange-500/20 text-orange-300"
                                    : "bg-white/6 text-slate-300"
                                }`}
                              >
                                {p1 ? m.score1 : "-"}
                              </span>
                            </div>

                            {/* Player 2 Row */}
                            <div
                              onMouseEnter={() =>
                                p2 && setHoveredParticipantId(p2.id)
                              }
                              onMouseLeave={() => setHoveredParticipantId(null)}
                              className={`flex items-center justify-between px-3 py-2 transition ${
                                p2Won
                                  ? "bg-emerald-500/12"
                                  : isDone && p1Won
                                  ? "opacity-55"
                                  : ""
                              } ${
                                p2 && hoveredParticipantId === p2.id
                                  ? "bg-white/10"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] w-5 text-center rounded bg-white/8 py-0.5 text-slate-400 shrink-0">
                                  {p2 ? p2.seed : "-"}
                                </span>
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      p2?.avatarColor || "#334155",
                                  }}
                                />
                                <span
                                  className={`text-xs truncate ${
                                    p2
                                      ? p2Won
                                        ? "font-bold text-white"
                                        : "font-medium text-slate-200"
                                      : "italic text-slate-500"
                                  }`}
                                >
                                  {p2 ? p2.name : m.round === 1 && isDone ? "Exempt (BYE)" : "À déterminer"}
                                </span>
                              </div>
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ml-2 shrink-0 ${
                                  p2Won
                                    ? "bg-emerald-500 text-[#04130D]"
                                    : isLive
                                    ? "bg-orange-500/20 text-orange-300"
                                    : "bg-white/6 text-slate-300"
                                }`}
                              >
                                {p2 ? m.score2 : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SVG Orthogonal Connectors to Next Round */}
                {hasNextRound && (
                  <div className="flex flex-col shrink-0 w-[52px]">
                    {/* Spacer matching column header height (mb-4 + py-2 header = 50px) */}
                    <div className="h-[50px]" />
                    <svg
                      width={52}
                      height={totalHeight}
                      viewBox={`0 0 52 ${totalHeight}`}
                      className="overflow-visible"
                    >
                      {Array.from({ length: pairCount }).map((_, pairIdx) => {
                        const topMatch = roundGroup.matches[pairIdx * 2];
                        const bottomMatch = roundGroup.matches[pairIdx * 2 + 1];

                        const yTop = (pairIdx * 2 + 0.5) * cellHeight;
                        const yBottom = (pairIdx * 2 + 1.5) * cellHeight;
                        const yMid = (pairIdx * 2 + 1) * cellHeight;

                        const topDone = Boolean(topMatch?.winnerId);
                        const bottomDone = Boolean(bottomMatch?.winnerId);

                        const topHovered =
                          hoveredParticipantId !== null &&
                          topMatch?.winnerId === hoveredParticipantId;
                        const bottomHovered =
                          hoveredParticipantId !== null &&
                          bottomMatch?.winnerId === hoveredParticipantId;

                        const topStroke = topHovered
                          ? accentColor
                          : topDone
                          ? "#10B981"
                          : "#28344B";

                        const bottomStroke = bottomHovered
                          ? accentColor
                          : bottomDone
                          ? "#10B981"
                          : "#28344B";

                        const midStroke =
                          topHovered || bottomHovered
                            ? accentColor
                            : topDone || bottomDone
                            ? "#10B981"
                            : "#28344B";

                        return (
                          <g key={pairIdx} fill="none">
                            <path
                              d={`M 0 ${yTop} L 26 ${yTop} L 26 ${yMid}`}
                              stroke={topStroke}
                              strokeWidth={topHovered ? 2.8 : 2}
                            />
                            <path
                              d={`M 0 ${yBottom} L 26 ${yBottom} L 26 ${yMid}`}
                              stroke={bottomStroke}
                              strokeWidth={bottomHovered ? 2.8 : 2}
                            />
                            <path
                              d={`M 26 ${yMid} L 52 ${yMid}`}
                              stroke={midStroke}
                              strokeWidth={
                                topHovered || bottomHovered ? 2.8 : 2
                              }
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Final Connector & Champion Podium Card */}
          <div className="flex flex-col shrink-0 w-[40px]">
            <div className="h-[50px]" />
            <svg
              width={40}
              height={totalHeight}
              viewBox={`0 0 40 ${totalHeight}`}
            >
              <line
                x1={0}
                y1={totalHeight / 2}
                x2={40}
                y2={totalHeight / 2}
                stroke={champion ? "#F59E0B" : "#28344B"}
                strokeWidth={2.5}
              />
            </svg>
          </div>

          <div className="flex flex-col w-[230px] shrink-0">
            <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                Champion
              </span>
              <span className="font-mono text-[11px] text-amber-200/80">
                1er
              </span>
            </div>

            <div
              className="flex items-center justify-center"
              style={{ height: `${totalHeight}px` }}
            >
              <div
                className={`w-full rounded-2xl p-5 text-center border transition shadow-xl ${
                  champion
                    ? "bg-gradient-to-b from-amber-500/20 via-[#161C2A] to-[#121722] border-amber-400/50"
                    : "bg-[#141A27]/80 border-white/10"
                }`}
              >
                <div
                  className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                    champion
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20"
                      : "bg-white/5 border-white/10 text-slate-500"
                  }`}
                >
                  <Trophy className="h-7 w-7" />
                </div>
                {champion ? (
                  <>
                    <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 mb-1.5">
                      [{champion.tag}] • Seed #{champion.seed}
                    </span>
                    <h4 className="font-display text-lg font-bold text-white truncate">
                      {champion.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {champion.cityOrClub || "Vainqueur Officiel"}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-display text-sm font-bold text-slate-300">
                      Trophée en jeu
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Couronné à l&apos;issue de la Grande Finale
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
