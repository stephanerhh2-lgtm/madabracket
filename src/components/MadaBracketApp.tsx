"use client";

import type { Match, Participant, SiteBranding } from "@/db/schema";
import type { ArenaStatePayload, EnrichedTournament } from "@/lib/seed";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Edit3,
  ExternalLink,
  GitBranch,
  ImagePlus,
  Info,
  ListChecks,
  MapPin,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { BracketTree } from "./BracketTree";
import { BrandCustomizerModal } from "./BrandCustomizerModal";
import { CreateTournamentModal } from "./CreateTournamentModal";
import { MatchScoreModal } from "./MatchScoreModal";

interface MadaBracketAppProps {
  initialState: ArenaStatePayload;
}

type ActiveTab = "bracket" | "inscriptions" | "resultats" | "infos";
type TournamentFilter = "tous" | "en_cours" | "inscriptions" | "termine";
type MatchFilter = "tous" | "en_direct" | "termine" | "en_attente";

const TEAM_COLORS = [
  "#FF3B30",
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export function MadaBracketApp({ initialState }: MadaBracketAppProps) {
  const [branding, setBranding] = useState<SiteBranding>(initialState.branding);
  const [tournaments, setTournaments] = useState<EnrichedTournament[]>(
    initialState.tournaments
  );
  const [selectedTournamentId, setSelectedTournamentId] = useState<number>(
    initialState.tournaments[0]?.id ?? 0
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("bracket");
  const [tournamentFilter, setTournamentFilter] =
    useState<TournamentFilter>("tous");
  const [searchQuery, setSearchQuery] = useState("");

  // Mode Organisateur activé par défaut pour permettre à l'utilisateur de tester immédiatement bannière, logo, tournois et scores
  const [isOrganizerMode, setIsOrganizerMode] = useState(true);

  // Modals
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<{
    match: Match;
    tournamentId: number;
  } | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  // Registration form state
  const [regName, setRegName] = useState("");
  const [regTag, setRegTag] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regColor, setRegColor] = useState("#FF3B30");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const regInputRef = useRef<HTMLInputElement | null>(null);

  // Results tab filters
  const [resultsScope, setResultsScope] = useState<"selected" | "global">(
    "selected"
  );
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("tous");

  // Action loading state
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Rules inline edit state
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDesc, setInfoDesc] = useState("");
  const [infoRules, setInfoRules] = useState("");
  const [infoDate, setInfoDate] = useState("");
  const [infoLocation, setInfoLocation] = useState("");
  const [infoPrize, setInfoPrize] = useState("");

  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }

  function replaceTournamentInState(updated: EnrichedTournament) {
    setTournaments((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (tournamentFilter !== "tous" && t.status !== tournamentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.gameOrSport.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tournaments, tournamentFilter, searchQuery]);

  const selectedTournament = useMemo(() => {
    return (
      tournaments.find((t) => t.id === selectedTournamentId) ??
      filteredTournaments[0] ??
      tournaments[0] ??
      null
    );
  }, [tournaments, selectedTournamentId, filteredTournaments]);

  // Global stats for Hero Showcase
  const globalStats = useMemo(() => {
    let totalPlayers = 0;
    let liveMatches = 0;
    let completedMatches = 0;

    for (const t of tournaments) {
      totalPlayers += t.participants.length;
      for (const m of t.matches) {
        if (m.status === "en_direct") liveMatches++;
        if (
          m.status === "termine" &&
          m.player1Id !== null &&
          m.player2Id !== null
        ) {
          completedMatches++;
        }
      }
    }

    return {
      tournamentCount: tournaments.length,
      totalPlayers,
      liveMatches,
      completedMatches,
    };
  }, [tournaments]);

  // Selected tournament participant lookup
  const selectedParticipantMap = useMemo(() => {
    const map = new Map<number, Participant>();
    if (!selectedTournament) return map;
    for (const p of selectedTournament.participants) {
      map.set(p.id, p);
    }
    return map;
  }, [selectedTournament]);

  const championParticipant = useMemo(() => {
    if (!selectedTournament?.championParticipantId) return undefined;
    return selectedParticipantMap.get(selectedTournament.championParticipantId);
  }, [selectedTournament, selectedParticipantMap]);

  const liveMatchesInSelected = useMemo(() => {
    if (!selectedTournament) return [];
    return selectedTournament.matches.filter((m) => m.status === "en_direct");
  }, [selectedTournament]);

  // Results list computation
  const displayedResults = useMemo(() => {
    const sourceTournaments =
      resultsScope === "global"
        ? tournaments
        : selectedTournament
        ? [selectedTournament]
        : [];

    const items: Array<{
      match: Match;
      tournament: EnrichedTournament;
      p1: Participant | undefined;
      p2: Participant | undefined;
    }> = [];

    for (const t of sourceTournaments) {
      const pMap = new Map(t.participants.map((p) => [p.id, p]));
      for (const m of t.matches) {
        // Hide empty BYE slots in results feed unless at least one player is assigned
        if (!m.player1Id && !m.player2Id) continue;
        if (matchFilter !== "tous" && m.status !== matchFilter) continue;

        items.push({
          match: m,
          tournament: t,
          p1: m.player1Id ? pMap.get(m.player1Id) : undefined,
          p2: m.player2Id ? pMap.get(m.player2Id) : undefined,
        });
      }
    }

    const orderPriority: Record<string, number> = {
      en_direct: 0,
      termine: 1,
      en_attente: 2,
    };

    return items.sort((a, b) => {
      const pa = orderPriority[a.match.status] ?? 9;
      const pb = orderPriority[b.match.status] ?? 9;
      if (pa !== pb) return pa - pb;
      if (a.match.round !== b.match.round) return b.match.round - a.match.round;
      return a.match.matchOrder - b.match.matchOrder;
    });
  }, [resultsScope, tournaments, selectedTournament, matchFilter]);

  async function handleRegisterParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTournament) return;

    setRegSubmitting(true);
    try {
      const res = await fetch(
        `/api/tournaments/${selectedTournament.id}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regName,
            tag: regTag,
            cityOrClub: regCity,
            contact: regContact,
            avatarColor: regColor,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Inscription refusée.");
      }

      replaceTournamentInState(data.tournament);
      setRegName("");
      setRegTag("");
      setRegCity("");
      setRegContact("");
      setRegColor(
        TEAM_COLORS[data.tournament.participants.length % TEAM_COLORS.length]
      );
      notify("Inscription validée et ajoutée à la liste officielle !");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Erreur lors de l'inscription.",
        "error"
      );
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleRemoveParticipant(participantId: number) {
    if (!selectedTournament) return;
    setBusyAction(`del-${participantId}`);
    try {
      const res = await fetch(
        `/api/tournaments/${selectedTournament.id}/register?participantId=${participantId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Impossible de retirer ce participant.");
      }
      replaceTournamentInState(data.tournament);
      notify("Participant retiré et têtes de série recalculées.");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Erreur lors de la suppression.",
        "error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleCheckIn(participant: Participant) {
    if (!selectedTournament) return;
    try {
      const res = await fetch(
        `/api/tournaments/${selectedTournament.id}/register`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: participant.id,
            checkedIn: !participant.checkedIn,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.tournament) {
        replaceTournamentInState(data.tournament);
      }
    } catch {
      // ignore
    }
  }

  async function handleBracketAction(
    action:
      | "generate"
      | "shuffle_seeds"
      | "fill_remaining"
      | "reopen_registrations"
  ) {
    if (!selectedTournament) return;
    setBusyAction(action);
    try {
      const res = await fetch(
        `/api/tournaments/${selectedTournament.id}/bracket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action impossible.");
      }
      replaceTournamentInState(data.tournament);

      if (action === "generate") {
        setActiveTab("bracket");
        notify("Tableau de compétition généré et tournoi lancé !");
      } else if (action === "shuffle_seeds") {
        notify("Tirage au sort des têtes de série effectué !");
      } else if (action === "fill_remaining") {
        notify("Places libres complétées avec succès !");
      } else if (action === "reopen_registrations") {
        setActiveTab("inscriptions");
        notify("Inscriptions rouvertes pour ce tournoi.");
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Une erreur est survenue.",
        "error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveTournamentInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTournament) return;
    setBusyAction("save-info");
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: infoDesc,
          rules: infoRules,
          startDate: infoDate,
          location: infoLocation,
          prizePool: infoPrize,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de mise à jour.");
      }
      replaceTournamentInState(data.tournament);
      setEditingInfo(false);
      notify("Informations et règlement mis à jour !");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Erreur de sauvegarde.",
        "error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteTournament() {
    if (!selectedTournament) return;
    if (tournaments.length <= 1) {
      notify(
        "Conservez au moins un tournoi actif sur la plateforme.",
        "error"
      );
      return;
    }
    const confirmed = window.confirm(
      `Supprimer définitivement le tournoi « ${selectedTournament.title} » ?`
    );
    if (!confirmed) return;

    setBusyAction("delete-tournament");
    try {
      const res = await fetch(`/api/tournaments/${selectedTournament.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Suppression impossible.");
      }
      const remaining = tournaments.filter(
        (t) => t.id !== selectedTournament.id
      );
      setTournaments(remaining);
      setSelectedTournamentId(remaining[0]?.id ?? 0);
      notify("Tournoi supprimé.");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Erreur lors de la suppression.",
        "error"
      );
    } finally {
      setBusyAction(null);
    }
  }

  const accentColor = branding.accentColor || "#FF3B30";
  const logoShapeClass =
    branding.logoShape === "circle"
      ? "rounded-full"
      : branding.logoShape === "shield"
      ? "rounded-t-2xl rounded-b-[34px]"
      : "rounded-2xl";

  // Helper to resolve player objects for MatchScoreModal across any tournament
  const modalTournament = editingMatch
    ? tournaments.find((t) => t.id === editingMatch.tournamentId)
    : undefined;
  const modalP1 =
    modalTournament && editingMatch?.match.player1Id
      ? modalTournament.participants.find(
          (p) => p.id === editingMatch.match.player1Id
        )
      : undefined;
  const modalP2 =
    modalTournament && editingMatch?.match.player2Id
      ? modalTournament.participants.find(
          (p) => p.id === editingMatch.match.player2Id
        )
      : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F8FAFC]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl border ${
              toast.tone === "error"
                ? "bg-[#2A1215] border-red-500/40 text-red-200"
                : "bg-[#10261E] border-emerald-500/40 text-emerald-100"
            }`}
          >
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${
                toast.tone === "error" ? "text-red-400" : "text-emerald-400"
              }`}
            />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sticky Top Broadcast Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[#0A0D14]/90 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
          {/* Brand Logo + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowBrandModal(true)}
              title="Modifier mon logo et ma bannière"
              className="group relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#121722] border p-1 transition hover:scale-105"
              style={{ borderColor: accentColor }}
            >
              <img
                src={branding.logoUrl || "/images/default-logo.png"}
                alt={branding.siteName}
                className="h-full w-full object-contain rounded-lg"
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white truncate">
                  {branding.siteName}
                </span>
                {globalStats.liveMatches > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/35 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-live" />
                    {globalStats.liveMatches} LIVE
                  </span>
                )}
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 truncate">
                {branding.organizerName}
              </p>
            </div>
          </div>

          {/* Center Navigation Shortcuts */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-[#121722] border border-white/10 p-1">
            {[
              { id: "bracket", label: "Tableaux de compétition", icon: GitBranch },
              { id: "inscriptions", label: "Inscriptions", icon: Users },
              { id: "resultats", label: "Résultats des matchs", icon: ListChecks },
              { id: "infos", label: "Règlement", icon: Info },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as ActiveTab);
                    document
                      .getElementById("workspace-tournoi")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-white/12 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Espace Bannière & Logo + Mode Organisateur + Nouveau Tournoi */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setShowBrandModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#161D2B] hover:bg-[#1E2738] border border-white/15 px-3 py-2 text-xs font-semibold text-slate-100 transition"
            >
              <ImagePlus
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: accentColor }}
              />
              <span className="hidden sm:inline">Bannière & Logo</span>
              <span className="sm:hidden">Logo</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOrganizerMode((v) => !v)}
              className={`hidden md:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                isOrganizerMode
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-[#121722] border-white/10 text-slate-400 hover:text-white"
              }`}
              title="Basculer entre la vue Organisateur (édition des scores, bannières et tournois) et la vue Publique"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {isOrganizerMode ? "Mode Organisateur" : "Vue Spectateur"}
            </button>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau Tournoi</span>
              <span className="sm:hidden">Créer</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* DEDICATED HERO BRAND SHOWCASE — ESPACE BANNIÈRE & LOGO               */}
      {/* ===================================================================== */}
      <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-5">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 shadow-2xl min-h-[265px] sm:min-h-[310px] flex flex-col justify-between p-5 sm:p-8">
          {/* Custom or Default Panoramic Banner Image */}
          <img
            src={branding.bannerUrl || "/images/default-banner.jpg"}
            alt={`Bannière ${branding.siteName}`}
            className="absolute inset-0 h-full w-full object-cover object-center transition-all duration-500"
          />

          {/* Customizable Contrast Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, #0A0D14 4%, rgba(10,13,20,${
                branding.bannerOverlayOpacity / 100
              }) 56%, rgba(10,13,20,${Math.max(
                0.2,
                branding.bannerOverlayOpacity / 145
              )}) 100%)`,
            }}
          />

          {/* Top Bar inside Hero Banner: Customizable Banner & Logo Callout */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0A0D14]/75 backdrop-blur-md border border-white/15 px-3.5 py-1 text-xs font-medium text-slate-200">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span>{branding.organizerName}</span>
              {branding.location && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {branding.location}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowBrandModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A0D14]/80 hover:bg-[#0A0D14] backdrop-blur-md border border-white/25 px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition group"
            >
              <ImagePlus
                className="h-4 w-4 transition group-hover:scale-110"
                style={{ color: accentColor }}
              />
              <span>Personnaliser ma Bannière & mon Logo</span>
            </button>
          </div>

          {/* Bottom Content inside Hero Banner: Framed Logo Medallion + Title + KPIs */}
          <div className="relative z-10 mt-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            {/* Left: Framed Logo + Site Name + Tagline */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 max-w-3xl">
              <button
                type="button"
                onClick={() => setShowBrandModal(true)}
                title="Cliquez pour importer votre propre logo"
                className={`group relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden bg-[#0A0D14]/90 border-2 p-2 shadow-2xl flex items-center justify-center transition hover:scale-[1.03] ${logoShapeClass}`}
                style={{ borderColor: accentColor }}
              >
                <img
                  src={branding.logoUrl || "/images/default-logo.png"}
                  alt={`Logo ${branding.siteName}`}
                  className={`h-full w-full object-contain ${logoShapeClass}`}
                />
                <span className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] font-semibold text-white gap-1">
                  <ImagePlus className="h-4 w-4" />
                  Changer Logo
                </span>
              </button>

              <div className="space-y-1.5">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                  {branding.siteName}
                </h1>
                <p className="text-sm sm:text-base text-slate-200/95 max-w-2xl leading-relaxed">
                  {branding.tagline}
                </p>

                {/* External Stream / Community Badges */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {branding.streamUrl && (
                    <a
                      href={branding.streamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-medium text-white transition"
                    >
                      <Radio className="h-3.5 w-3.5 text-orange-400" />
                      Stream Officiel
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                  {branding.discordUrl && (
                    <a
                      href={branding.discordUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-medium text-white transition"
                    >
                      Communauté & Check-in
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Live Arena Metrics Strip */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="rounded-2xl bg-[#0A0D14]/80 backdrop-blur-md border border-white/12 px-4 py-3 text-center">
                <p className="font-mono text-xl sm:text-2xl font-bold text-white">
                  {globalStats.tournamentCount}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tournois
                </p>
              </div>
              <div className="rounded-2xl bg-[#0A0D14]/80 backdrop-blur-md border border-white/12 px-4 py-3 text-center">
                <p className="font-mono text-xl sm:text-2xl font-bold text-emerald-400">
                  {globalStats.totalPlayers}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Inscrits
                </p>
              </div>
              <div className="rounded-2xl bg-[#0A0D14]/80 backdrop-blur-md border border-white/12 px-4 py-3 text-center">
                <p className="font-mono text-xl sm:text-2xl font-bold text-amber-400">
                  {globalStats.completedMatches + globalStats.liveMatches}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Matchs actifs
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* TOURNAMENTS DIRECTORY & SELECTOR STRIP                                */}
      {/* ===================================================================== */}
      <section className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 pt-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "tous", label: "Tous les tournois" },
                { id: "en_cours", label: "En cours" },
                { id: "inscriptions", label: "Inscriptions ouvertes" },
                { id: "termine", label: "Terminés" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTournamentFilter(f.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition ${
                  tournamentFilter === f.id
                    ? "bg-white text-[#0A0D14] border-white"
                    : "bg-[#121722] text-slate-300 border-white/10 hover:border-white/25"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un tournoi, jeu..."
              className="w-full rounded-xl bg-[#121722] border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Tournament Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredTournaments.map((t) => {
            const isSelected = selectedTournament?.id === t.id;
            const fillRatio = Math.min(
              100,
              Math.round((t.participants.length / t.maxParticipants) * 100)
            );
            const liveCount = t.matches.filter(
              (m) => m.status === "en_direct"
            ).length;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTournamentId(t.id);
                  setEditingInfo(false);
                }}
                className={`group text-left rounded-2xl p-4 border transition-all duration-150 ${
                  isSelected
                    ? "bg-[#192132] border-white/40 ring-1 ring-white/20 shadow-xl"
                    : "bg-[#121722] border-white/10 hover:bg-[#161D2B] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                    {t.gameOrSport}
                  </span>

                  {t.status === "en_cours" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 px-2.5 py-0.5 font-mono text-[10px] font-bold text-orange-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse-live" />
                      {liveCount > 0 ? "EN DIRECT" : "EN COURS"}
                    </span>
                  ) : t.status === "inscriptions" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                      INSCRIPTIONS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      <Trophy className="h-3 w-3" />
                      TERMINÉ
                    </span>
                  )}
                </div>

                <h3 className="font-display text-base font-bold text-white line-clamp-1 group-hover:text-white">
                  {t.title}
                </h3>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{t.startDate}</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {t.prizePool}
                  </span>
                </div>

                {/* Slot Capacity Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/8">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Participants inscrits</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {t.participants.length} / {t.maxParticipants}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0A0D14]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${fillRatio}%`,
                        backgroundColor:
                          t.status === "inscriptions" ? "#10B981" : accentColor,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* ACTIVE TOURNAMENT WORKSPACE (BRACKET, REGISTRATIONS, RESULTS, RULES)  */}
      {/* ===================================================================== */}
      {selectedTournament && (
        <main
          id="workspace-tournoi"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 py-7 space-y-6"
        >
          {/* Tournament Command Header */}
          <div className="rounded-2xl bg-[#121722] border border-white/12 p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-lg px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {selectedTournament.gameOrSport}
                  </span>
                  <span className="rounded-lg bg-white/8 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                    {selectedTournament.format} • Bo{selectedTournament.bestOf}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {selectedTournament.startDate}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedTournament.location}
                  </span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {selectedTournament.title}
                </h2>

                <p className="text-sm text-slate-300 max-w-3xl">
                  {selectedTournament.description}
                </p>
              </div>

              {/* Right Prize & Action Controls */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="rounded-xl bg-[#0A0D14] border border-amber-500/30 px-4 py-2 text-right">
                  <span className="block text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold">
                    Dotation / Cashprize
                  </span>
                  <span className="font-mono text-base font-bold text-amber-300">
                    {selectedTournament.prizePool}
                  </span>
                </div>

                {selectedTournament.status === "inscriptions" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("inscriptions");
                        window.setTimeout(
                          () => regInputRef.current?.focus(),
                          100
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3 text-xs font-bold text-[#04130D] shadow-lg transition"
                    >
                      <UserPlus className="h-4 w-4" />
                      S&apos;inscrire ({selectedTournament.participants.length}/
                      {selectedTournament.maxParticipants})
                    </button>

                    {isOrganizerMode &&
                      selectedTournament.participants.length >= 2 && (
                        <button
                          type="button"
                          disabled={busyAction !== null}
                          onClick={() => handleBracketAction("generate")}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Play className="h-4 w-4 fill-current" />
                          {busyAction === "generate"
                            ? "Génération..."
                            : "Générer le Tableau & Lancer"}
                        </button>
                      )}
                  </>
                )}

                {isOrganizerMode &&
                  selectedTournament.status !== "inscriptions" && (
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() =>
                        handleBracketAction("reopen_registrations")
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2130] hover:bg-[#232C40] border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Rouvrir inscriptions
                    </button>
                  )}
              </div>
            </div>

            {/* Champion Banner if Tournament Completed */}
            {selectedTournament.status === "termine" && championParticipant && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400/40 px-5 py-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-[#1A1200] shadow-lg">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Champion Officiel du Tournoi
                    </span>
                    <p className="font-display text-lg font-bold text-white">
                      {championParticipant.name}{" "}
                      <span className="font-mono text-sm text-amber-300">
                        [{championParticipant.tag}]
                      </span>
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs text-amber-200">
                  Tête de série #{championParticipant.seed} •{" "}
                  {championParticipant.cityOrClub}
                </span>
              </div>
            )}

            {/* Sub-Navigation Tabs */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("bracket")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                    activeTab === "bracket"
                      ? "text-white shadow-md"
                      : "bg-[#0A0D14] text-slate-400 hover:text-white border border-white/10"
                  }`}
                  style={
                    activeTab === "bracket"
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  <GitBranch className="h-4 w-4" />
                  Tableau de compétition
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("inscriptions")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                    activeTab === "inscriptions"
                      ? "text-white shadow-md"
                      : "bg-[#0A0D14] text-slate-400 hover:text-white border border-white/10"
                  }`}
                  style={
                    activeTab === "inscriptions"
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  <Users className="h-4 w-4" />
                  Inscriptions
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/30">
                    {selectedTournament.participants.length}/
                    {selectedTournament.maxParticipants}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("resultats")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                    activeTab === "resultats"
                      ? "text-white shadow-md"
                      : "bg-[#0A0D14] text-slate-400 hover:text-white border border-white/10"
                  }`}
                  style={
                    activeTab === "resultats"
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  <ListChecks className="h-4 w-4" />
                  Résultats des matchs
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("infos")}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
                    activeTab === "infos"
                      ? "text-white shadow-md"
                      : "bg-[#0A0D14] text-slate-400 hover:text-white border border-white/10"
                  }`}
                  style={
                    activeTab === "infos"
                      ? { backgroundColor: accentColor }
                      : undefined
                  }
                >
                  <Info className="h-4 w-4" />
                  Règlement & Infos
                </button>
              </div>

              {/* Mobile Organizer Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsOrganizerMode((v) => !v)}
                className={`md:hidden inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold border transition ${
                  isOrganizerMode
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : "bg-[#0A0D14] border-white/10 text-slate-400"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isOrganizerMode ? "Mode Organisateur actif" : "Vue Spectateur"}
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* TAB 1: TABLEAU DE COMPÉTITION (BRACKET)                         */}
          {/* =============================================================== */}
          {activeTab === "bracket" && (
            <div className="space-y-4">
              {/* Live Match Spotlight Bar */}
              {liveMatchesInSelected.map((lm) => {
                const p1 = lm.player1Id
                  ? selectedParticipantMap.get(lm.player1Id)
                  : undefined;
                const p2 = lm.player2Id
                  ? selectedParticipantMap.get(lm.player2Id)
                  : undefined;

                return (
                  <div
                    key={lm.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-[#161C2A] to-[#121722] border border-orange-500/40 px-5 py-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 font-mono text-xs font-bold text-white shadow">
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                        MATCH EN DIRECT
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-orange-200">
                        {lm.roundName}
                      </span>
                      <div className="flex items-center gap-2.5 font-display text-base sm:text-lg font-bold text-white">
                        <span>{p1?.name || "TBD"}</span>
                        <span className="rounded-lg bg-[#0A0D14] border border-orange-500/40 px-2.5 py-0.5 font-mono text-orange-300">
                          {lm.score1} - {lm.score2}
                        </span>
                        <span>{p2?.name || "TBD"}</span>
                      </div>
                      {lm.note && (
                        <span className="text-xs text-slate-300 hidden xl:inline">
                          • {lm.note}
                        </span>
                      )}
                    </div>

                    {isOrganizerMode && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingMatch({
                            match: lm,
                            tournamentId: selectedTournament.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 px-3.5 py-2 text-xs font-bold text-white transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Actualiser le score
                      </button>
                    )}
                  </div>
                );
              })}

              <BracketTree
                matches={selectedTournament.matches}
                participants={selectedTournament.participants}
                tournamentStatus={selectedTournament.status}
                accentColor={accentColor}
                isOrganizerMode={isOrganizerMode}
                onSelectMatch={(match) =>
                  setEditingMatch({
                    match,
                    tournamentId: selectedTournament.id,
                  })
                }
                onGenerateBracket={
                  isOrganizerMode
                    ? () => handleBracketAction("generate")
                    : undefined
                }
              />
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: INSCRIPTIONS & LISTE DES PARTICIPANTS                    */}
          {/* =============================================================== */}
          {activeTab === "inscriptions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Registration Form */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-[#121722] border border-white/12 p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-xl font-bold text-white">
                        Formulaire d&apos;Inscription
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Inscrivez un joueur individuel ou une équipe dans le tournoi
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {Math.max(
                        0,
                        selectedTournament.maxParticipants -
                          selectedTournament.participants.length
                      )}{" "}
                      place
                      {selectedTournament.maxParticipants -
                        selectedTournament.participants.length >
                      1
                        ? "s"
                        : ""}{" "}
                      libre
                      {selectedTournament.maxParticipants -
                        selectedTournament.participants.length >
                      1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  {selectedTournament.status !== "inscriptions" ? (
                    <div className="rounded-xl bg-[#1A2130] border border-white/10 p-4 text-sm text-slate-300 space-y-3">
                      <p>
                        Les inscriptions de ce tournoi sont verrouillées car le tableau de compétition est déjà{" "}
                        <strong className="text-white">
                          {selectedTournament.status === "termine"
                            ? "terminé"
                            : "en cours"}
                        </strong>
                        .
                      </p>
                      {isOrganizerMode && (
                        <button
                          type="button"
                          onClick={() =>
                            handleBracketAction("reopen_registrations")
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Rouvrir les inscriptions (Mode Organisateur)
                        </button>
                      )}
                    </div>
                  ) : selectedTournament.participants.length >=
                    selectedTournament.maxParticipants ? (
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200 space-y-3">
                      <p className="font-semibold">
                        Complet ! Les {selectedTournament.maxParticipants} places de ce tournoi sont toutes occupées.
                      </p>
                      {isOrganizerMode && (
                        <button
                          type="button"
                          onClick={() => handleBracketAction("generate")}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow transition"
                          style={{ backgroundColor: accentColor }}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Générer le Tableau & Lancer maintenant
                        </button>
                      )}
                    </div>
                  ) : (
                    <form
                      onSubmit={handleRegisterParticipant}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Pseudo du joueur ou Nom de l&apos;équipe *
                        </label>
                        <input
                          ref={regInputRef}
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Ex: Tanà Phoenix ou RavoKing"
                          className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Tag court (2 à 5 car.)
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            value={regTag}
                            onChange={(e) =>
                              setRegTag(e.target.value.toUpperCase())
                            }
                            placeholder="Ex: TANA"
                            className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 font-mono text-sm uppercase text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Ville / Club
                          </label>
                          <input
                            type="text"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            placeholder="Ex: Antananarivo"
                            className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Contact (Discord, E-mail ou Téléphone)
                        </label>
                        <input
                          type="text"
                          value={regContact}
                          onChange={(e) => setRegContact(e.target.value)}
                          placeholder="Ex: pseudo#1234 ou joueur@mail.mg"
                          className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/40"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Couleur du badge d&apos;équipe
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {TEAM_COLORS.map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => setRegColor(hex)}
                              className={`h-7 w-7 rounded-lg transition ${
                                regColor === hex
                                  ? "ring-2 ring-white scale-110"
                                  : "opacity-75 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: hex }}
                              aria-label={`Couleur ${hex}`}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regSubmitting}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: accentColor }}
                      >
                        <UserPlus className="h-4 w-4" />
                        {regSubmitting
                          ? "Validation en cours..."
                          : "Confirmer l'inscription"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Column: Registered Participants & Organizer Seeding Tools */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl bg-[#121722] border border-white/12 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold text-white">
                        Participants & Têtes de série ({selectedTournament.participants.length}/
                        {selectedTournament.maxParticipants})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Ordre officiel des seeds utilisé pour construire le tableau à élimination directe
                      </p>
                    </div>

                    {isOrganizerMode &&
                      selectedTournament.status === "inscriptions" && (
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedTournament.participants.length <
                            selectedTournament.maxParticipants && (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() =>
                                handleBracketAction("fill_remaining")
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2130] hover:bg-[#232D42] border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                              Compléter places libres
                            </button>
                          )}

                          {selectedTournament.participants.length >= 2 && (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() =>
                                handleBracketAction("shuffle_seeds")
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2130] hover:bg-[#232D42] border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition"
                            >
                              <Shuffle className="h-3.5 w-3.5" />
                              Tirage au sort
                            </button>
                          )}
                        </div>
                      )}
                  </div>

                  {selectedTournament.participants.length === 0 ? (
                    <div className="rounded-xl bg-[#0A0D14]/70 border border-white/8 p-10 text-center text-sm text-slate-400">
                      Aucun inscrit pour le moment. Soyez le premier à rejoindre ce tournoi !
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedTournament.participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-[#0A0D14]/85 border border-white/10 px-3.5 py-3 hover:border-white/25 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-bold w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-slate-300 shrink-0">
                              #{p.seed}
                            </span>
                            <div
                              className="h-9 w-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold text-white shrink-0 shadow"
                              style={{ backgroundColor: p.avatarColor }}
                            >
                              {p.tag}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-white truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {p.cityOrClub || "Madagascar"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                isOrganizerMode && handleToggleCheckIn(p)
                              }
                              className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold border transition ${
                                p.checkedIn
                                  ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                                  : "bg-slate-800 border-white/10 text-slate-400"
                              } ${
                                isOrganizerMode
                                  ? "cursor-pointer hover:brightness-110"
                                  : "cursor-default"
                              }`}
                              title={
                                isOrganizerMode
                                  ? "Cliquer pour basculer le check-in"
                                  : "Statut de check-in"
                              }
                            >
                              {p.checkedIn ? "PRÊT ✓" : "ATTENTE"}
                            </button>

                            {isOrganizerMode &&
                              selectedTournament.status === "inscriptions" && (
                                <button
                                  type="button"
                                  disabled={busyAction === `del-${p.id}`}
                                  onClick={() => handleRemoveParticipant(p.id)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition"
                                  title="Retirer ce participant"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: RÉSULTATS DES MATCHS                                     */}
          {/* =============================================================== */}
          {activeTab === "resultats" && (
            <div className="rounded-2xl bg-[#121722] border border-white/12 p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Centre Officiel des Résultats & Scores
                  </h3>
                  <p className="text-xs text-slate-400">
                    Suivez les scores en direct et l&apos;historique complet des confrontations
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Scope Switcher */}
                  <div className="inline-flex rounded-xl bg-[#0A0D14] border border-white/10 p-1">
                    <button
                      type="button"
                      onClick={() => setResultsScope("selected")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        resultsScope === "selected"
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Ce tournoi
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsScope("global")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        resultsScope === "global"
                          ? "bg-white/15 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Tous les tournois
                    </button>
                  </div>

                  {/* Status Filter */}
                  {(
                    [
                      { id: "tous", label: "Tous" },
                      { id: "en_direct", label: "En direct" },
                      { id: "termine", label: "Terminés" },
                      { id: "en_attente", label: "À venir" },
                    ] as const
                  ).map((mf) => (
                    <button
                      key={mf.id}
                      type="button"
                      onClick={() => setMatchFilter(mf.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                        matchFilter === mf.id
                          ? "bg-white text-[#0A0D14] border-white"
                          : "bg-[#0A0D14] border-white/10 text-slate-300 hover:border-white/25"
                      }`}
                    >
                      {mf.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayedResults.length === 0 ? (
                <div className="rounded-xl bg-[#0A0D14]/70 border border-white/10 p-10 text-center text-sm text-slate-400">
                  Aucun match ne correspond à ce filtre pour le moment.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedResults.map(({ match: m, tournament: t, p1, p2 }) => {
                    const isLive = m.status === "en_direct";
                    const isDone = m.status === "termine";
                    const p1Won = isDone && m.winnerId === m.player1Id && !!p1;
                    const p2Won = isDone && m.winnerId === m.player2Id && !!p2;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl p-4 border transition ${
                          isLive
                            ? "bg-orange-500/8 border-orange-500/40"
                            : "bg-[#0A0D14]/85 border-white/10 hover:border-white/25"
                        }`}
                      >
                        {/* Left Meta */}
                        <div className="min-w-[190px]">
                          <div className="flex items-center gap-2">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-300">
                                <Radio className="h-3 w-3 animate-pulse" />
                                DIRECT
                              </span>
                            ) : isDone ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                                TERMINÉ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-400">
                                <Clock className="h-3 w-3" />
                                À VENIR
                              </span>
                            )}
                            <span className="font-display text-xs font-bold text-slate-200">
                              {m.roundName}
                            </span>
                          </div>
                          {resultsScope === "global" && (
                            <p className="text-xs text-slate-400 mt-1 truncate">
                              {t.title}
                            </p>
                          )}
                          {m.note && (
                            <p className="text-[11px] text-slate-400 mt-0.5 italic">
                              {m.note}
                            </p>
                          )}
                        </div>

                        {/* Center Matchup Scoreboard */}
                        <div className="flex-1 grid grid-cols-7 items-center gap-2 max-w-xl">
                          {/* Team 1 */}
                          <div className="col-span-3 flex items-center justify-end gap-2 min-w-0 text-right">
                            <span
                              className={`text-sm truncate ${
                                p1Won
                                  ? "font-bold text-white"
                                  : "font-medium text-slate-300"
                              }`}
                            >
                              {p1?.name || "À déterminer"}
                            </span>
                            {p1 && (
                              <span
                                className="hidden sm:inline-flex h-7 w-9 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: p1.avatarColor }}
                              >
                                {p1.tag}
                              </span>
                            )}
                          </div>

                          {/* Score Pill */}
                          <div className="col-span-1 flex items-center justify-center">
                            <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#161D2B] border border-white/15 px-3 py-1.5 font-mono text-sm font-bold text-white">
                              <span
                                className={
                                  p1Won ? "text-emerald-400" : "text-white"
                                }
                              >
                                {p1 ? m.score1 : "-"}
                              </span>
                              <span className="text-slate-500">:</span>
                              <span
                                className={
                                  p2Won ? "text-emerald-400" : "text-white"
                                }
                              >
                                {p2 ? m.score2 : "-"}
                              </span>
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div className="col-span-3 flex items-center justify-start gap-2 min-w-0 text-left">
                            {p2 && (
                              <span
                                className="hidden sm:inline-flex h-7 w-9 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: p2.avatarColor }}
                              >
                                {p2.tag}
                              </span>
                            )}
                            <span
                              className={`text-sm truncate ${
                                p2Won
                                  ? "font-bold text-white"
                                  : "font-medium text-slate-300"
                              }`}
                            >
                              {p2?.name || "À déterminer"}
                            </span>
                          </div>
                        </div>

                        {/* Right Action */}
                        <div className="flex items-center justify-end shrink-0">
                          {isOrganizerMode && (p1 || p2) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setEditingMatch({
                                  match: m,
                                  tournamentId: t.id,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2130] hover:bg-[#242E42] border border-white/15 px-3 py-2 text-xs font-semibold text-white transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Saisir score
                            </button>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">
                              Bo{m.bestOf}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: RÈGLEMENT & INFOS DU TOURNOI                             */}
          {/* =============================================================== */}
          {activeTab === "infos" && (
            <div className="rounded-2xl bg-[#121722] border border-white/12 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">
                    Informations Officielles & Règlement
                  </h3>
                  <p className="text-xs text-slate-400">
                    Conditions de participation, format des rencontres et dotation
                  </p>
                </div>

                {isOrganizerMode && !editingInfo && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInfoDesc(selectedTournament.description);
                        setInfoRules(selectedTournament.rules);
                        setInfoDate(selectedTournament.startDate);
                        setInfoLocation(selectedTournament.location);
                        setInfoPrize(selectedTournament.prizePool);
                        setEditingInfo(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A2130] hover:bg-[#242E42] border border-white/15 px-3.5 py-2 text-xs font-semibold text-white transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Modifier les infos
                    </button>
                    {tournaments.length > 1 && (
                      <button
                        type="button"
                        onClick={handleDeleteTournament}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 px-3.5 py-2 text-xs font-semibold text-red-300 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer le tournoi
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editingInfo ? (
                <form
                  onSubmit={handleSaveTournamentInfo}
                  className="space-y-4 bg-[#0A0D14]/70 border border-white/10 rounded-xl p-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Date & Horaire
                      </label>
                      <input
                        type="text"
                        value={infoDate}
                        onChange={(e) => setInfoDate(e.target.value)}
                        className="w-full rounded-xl bg-[#121722] border border-white/15 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Lieu / Serveur
                      </label>
                      <input
                        type="text"
                        value={infoLocation}
                        onChange={(e) => setInfoLocation(e.target.value)}
                        className="w-full rounded-xl bg-[#121722] border border-white/15 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Dotation / Cashprize
                      </label>
                      <input
                        type="text"
                        value={infoPrize}
                        onChange={(e) => setInfoPrize(e.target.value)}
                        className="w-full rounded-xl bg-[#121722] border border-white/15 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Présentation générale
                    </label>
                    <textarea
                      rows={3}
                      value={infoDesc}
                      onChange={(e) => setInfoDesc(e.target.value)}
                      className="w-full rounded-xl bg-[#121722] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Règlement complet
                    </label>
                    <textarea
                      rows={4}
                      value={infoRules}
                      onChange={(e) => setInfoRules(e.target.value)}
                      className="w-full rounded-xl bg-[#121722] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingInfo(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={busyAction === "save-info"}
                      className="rounded-xl px-5 py-2 text-xs font-bold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-5">
                    <div className="rounded-xl bg-[#0A0D14]/80 border border-white/10 p-5">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                        À propos de l&apos;événement
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {selectedTournament.description}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#0A0D14]/80 border border-white/10 p-5">
                      <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300 mb-2">
                        Règlement sportif & Arbitrage
                      </h4>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {selectedTournament.rules}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#0A0D14]/80 border border-white/10 p-5 space-y-4">
                    <h4 className="font-display text-sm font-bold uppercase tracking-wider text-slate-300">
                      Fiche Technique
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-white/8">
                        <span className="text-slate-400">Discipline</span>
                        <span className="font-semibold text-white">
                          {selectedTournament.gameOrSport}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/8">
                        <span className="text-slate-400">Catégorie</span>
                        <span className="font-semibold text-white">
                          {selectedTournament.category}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/8">
                        <span className="text-slate-400">Format</span>
                        <span className="font-semibold text-white">
                          {selectedTournament.format}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/8">
                        <span className="text-slate-400">Capacité max.</span>
                        <span className="font-mono font-semibold text-white">
                          {selectedTournament.maxParticipants} places
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-400">Dotation</span>
                        <span className="font-mono font-bold text-amber-300">
                          {selectedTournament.prizePool}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#080B11] py-6">
        <div className="mx-auto flex max-w-[1440px] flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Award className="h-4 w-4" style={{ color: accentColor }} />
            <span className="font-display font-bold text-white">
              {branding.siteName}
            </span>
            <span>— {branding.organizerName}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowBrandModal(true)}
              className="hover:text-white transition"
            >
              Personnaliser Bannière & Logo
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="hover:text-white transition"
            >
              Organiser un tournoi
            </button>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}
      {showBrandModal && (
        <BrandCustomizerModal
          branding={branding}
          onClose={() => setShowBrandModal(false)}
          onSaved={(updated) => {
            setBranding(updated);
            notify("Votre bannière et votre logo ont été enregistrés !");
          }}
        />
      )}

      {showCreateModal && (
        <CreateTournamentModal
          accentColor={accentColor}
          onClose={() => setShowCreateModal(false)}
          onCreated={(created) => {
            setTournaments((prev) => [created, ...prev]);
            setSelectedTournamentId(created.id);
            setTournamentFilter("tous");
            setActiveTab(
              created.status === "en_cours" ? "bracket" : "inscriptions"
            );
            notify(`Tournoi « ${created.title} » créé avec succès !`);
          }}
        />
      )}

      {editingMatch && (
        <MatchScoreModal
          match={editingMatch.match}
          player1={modalP1}
          player2={modalP2}
          accentColor={accentColor}
          onClose={() => setEditingMatch(null)}
          onUpdated={(_updatedMatch, updatedTournament) => {
            if (updatedTournament) {
              replaceTournamentInState(updatedTournament as EnrichedTournament);
            }
            notify("Score du match enregistré et tableau mis à jour !");
          }}
        />
      )}
    </div>
  );
}
