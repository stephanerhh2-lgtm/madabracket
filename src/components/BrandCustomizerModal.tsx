"use client";

import type { SiteBranding } from "@/db/schema";
import { processUploadedImage } from "@/lib/image-upload";
import {
  Check,
  ImagePlus,
  Link2,
  Palette,
  RotateCcw,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";

interface BrandCustomizerModalProps {
  branding: SiteBranding;
  onClose: () => void;
  onSaved: (updated: SiteBranding) => void;
}

const BANNER_PRESETS = [
  {
    label: "Arène Mada (Défaut)",
    url: "/images/default-banner.jpg",
  },
  {
    label: "Scène Finale Or",
    url: "/images/preset-arena-gold.jpg",
  },
  {
    label: "Cyber Émeraude",
    url: "/images/preset-cyber-emerald.jpg",
  },
];

const ACCENT_PRESETS = [
  { label: "Vermillon Mada", hex: "#FF3B30" },
  { label: "Émeraude", hex: "#10B981" },
  { label: "Or Trophée", hex: "#F59E0B" },
  { label: "Bleu Broadcast", hex: "#3B82F6" },
  { label: "Violet Cyber", hex: "#8B5CF6" },
];

export function BrandCustomizerModal({
  branding,
  onClose,
  onSaved,
}: BrandCustomizerModalProps) {
  const [siteName, setSiteName] = useState(branding.siteName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [organizerName, setOrganizerName] = useState(branding.organizerName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(branding.bannerUrl);
  const [accentColor, setAccentColor] = useState(branding.accentColor);
  const [bannerOverlayOpacity, setBannerOverlayOpacity] = useState(
    branding.bannerOverlayOpacity
  );
  const [logoShape, setLogoShape] = useState(branding.logoShape);
  const [location, setLocation] = useState(branding.location);
  const [streamUrl, setStreamUrl] = useState(branding.streamUrl);
  const [discordUrl, setDiscordUrl] = useState(branding.discordUrl);

  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<"banner" | "logo" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelect(
    file: File | undefined,
    kind: "banner" | "logo"
  ) {
    if (!file) return;
    setError(null);
    setUploadingKind(kind);
    try {
      const optimized = await processUploadedImage(file, kind);
      if (kind === "banner") {
        setBannerUrl(optimized);
      } else {
        setLogoUrl(optimized);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de traiter cette image."
      );
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          tagline,
          organizerName,
          logoUrl,
          bannerUrl,
          accentColor,
          bannerOverlayOpacity,
          logoShape,
          location,
          streamUrl,
          discordUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la sauvegarde.");
      }

      onSaved(data.branding);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la sauvegarde."
      );
    } finally {
      setSaving(false);
    }
  }

  const logoShapeClass =
    logoShape === "circle"
      ? "rounded-full"
      : logoShape === "shield"
      ? "rounded-t-xl rounded-b-[28px]"
      : "rounded-2xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#121722] border border-white/15 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#121722]/95 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">
                Espace Bannière & Logo — Identité Visuelle
              </h2>
              <p className="text-xs text-slate-400">
                Importez votre propre bannière panoramique et votre logo officiel avec aperçu immédiat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Live Interactive Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Aperçu en direct de votre en-tête MadaBracket
              </span>
              <span className="text-xs font-mono text-slate-500">
                Format recommandé : Bannière 1600×520px • Logo 256×256px
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/15 min-h-[200px] flex items-end p-5 sm:p-6">
              {/* Background Banner */}
              <img
                src={bannerUrl || "/images/default-banner.jpg"}
                alt="Aperçu bannière"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              {/* Adjustable Dark Gradient Vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, rgba(10,13,20,0.96) 6%, rgba(10,13,20,${
                    bannerOverlayOpacity / 100
                  }) 58%, rgba(10,13,20,${Math.max(
                    0.15,
                    bannerOverlayOpacity / 150
                  )}) 100%)`,
                }}
              />

              {/* Logo + Brand Text Overlay */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4 w-full">
                <div
                  className={`h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden bg-[#0A0D14]/90 border-2 p-1.5 shadow-2xl flex items-center justify-center ${logoShapeClass}`}
                  style={{ borderColor: accentColor }}
                >
                  <img
                    src={logoUrl || "/images/default-logo.png"}
                    alt="Aperçu logo"
                    className={`h-full w-full object-contain ${logoShapeClass}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-0.5 text-xs font-medium text-slate-200 mb-1.5 border border-white/10">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    {organizerName || "Organisation Officielle"}
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                    {siteName || "MadaBracket"}
                  </h3>
                  <p className="text-sm text-slate-300 line-clamp-1 mt-0.5">
                    {tagline}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Dual Upload Grid: Banner & Logo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Banner Upload Box */}
            <div className="rounded-xl bg-[#1A2130]/75 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-display text-sm font-bold text-white uppercase tracking-wide">
                  1. Votre Bannière Principale
                </label>
                <button
                  type="button"
                  onClick={() => setBannerUrl("/images/default-banner.jpg")}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Par défaut
                </button>
              </div>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleFileSelect(e.target.files?.[0], "banner")
                }
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files?.[0], "banner");
                }}
                onClick={() => bannerInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-white/15 hover:border-white/35 bg-[#0A0D14]/60 p-4 text-center transition group"
              >
                <Upload className="h-6 w-6 mx-auto text-slate-400 group-hover:text-white mb-1.5 transition" />
                <p className="text-sm font-medium text-slate-200">
                  {uploadingKind === "banner"
                    ? "Optimisation de la bannière..."
                    : "Cliquez ou déposez votre bannière ici"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  JPG, PNG, WebP ou SVG • Panoramique
                </p>
              </div>

              {/* Preset Gallery */}
              <div>
                <span className="block text-xs text-slate-400 mb-1.5">
                  Ou choisir une ambiance d&apos;arène prédéfinie :
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {BANNER_PRESETS.map((preset) => {
                    const active = bannerUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setBannerUrl(preset.url)}
                        className={`relative overflow-hidden rounded-lg h-12 border text-left transition ${
                          active
                            ? "border-emerald-400 ring-2 ring-emerald-400/30"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/45 flex items-end p-1.5">
                          <span className="text-[10px] font-medium text-white leading-tight line-clamp-1">
                            {preset.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct URL */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Link2 className="h-3 w-3" />
                  Ou coller l&apos;URL d&apos;une bannière externe :
                </label>
                <input
                  type="text"
                  value={bannerUrl.startsWith("data:") ? "" : bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder={
                    bannerUrl.startsWith("data:")
                      ? "Image locale chargée avec succès ✓"
                      : "https://exemple.com/ma-banniere.jpg"
                  }
                  className="w-full rounded-lg bg-[#0A0D14] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/35"
                />
              </div>
            </div>

            {/* Logo Upload Box */}
            <div className="rounded-xl bg-[#1A2130]/75 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-display text-sm font-bold text-white uppercase tracking-wide">
                  2. Votre Logo Officiel
                </label>
                <button
                  type="button"
                  onClick={() => setLogoUrl("/images/default-logo.png")}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="h-3 w-3" />
                  Par défaut
                </button>
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0], "logo")}
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files?.[0], "logo");
                }}
                onClick={() => logoInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-white/15 hover:border-white/35 bg-[#0A0D14]/60 p-4 text-center transition group"
              >
                <Shield className="h-6 w-6 mx-auto text-slate-400 group-hover:text-white mb-1.5 transition" />
                <p className="text-sm font-medium text-slate-200">
                  {uploadingKind === "logo"
                    ? "Optimisation du logo..."
                    : "Cliquez ou déposez votre logo ici"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  PNG transparent, SVG, WebP ou JPG carré
                </p>
              </div>

              {/* Logo Frame Shape */}
              <div>
                <span className="block text-xs text-slate-400 mb-1.5">
                  Style d&apos;encadrement du logo :
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "rounded", label: "Carré arrondi" },
                    { id: "circle", label: "Médaillon" },
                    { id: "shield", label: "Écusson" },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setLogoShape(shape.id)}
                      className={`rounded-lg py-2 px-2 text-xs font-medium border transition ${
                        logoShape === shape.id
                          ? "bg-white/15 border-white/40 text-white"
                          : "bg-[#0A0D14]/60 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Logo URL */}
              <div>
                <label className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                  <Link2 className="h-3 w-3" />
                  Ou coller l&apos;URL d&apos;un logo externe :
                </label>
                <input
                  type="text"
                  value={logoUrl.startsWith("data:") ? "" : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder={
                    logoUrl.startsWith("data:")
                      ? "Logo local chargé avec succès ✓"
                      : "https://exemple.com/mon-logo.png"
                  }
                  className="w-full rounded-lg bg-[#0A0D14] border border-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/35"
                />
              </div>
            </div>
          </div>

          {/* Visual Controls: Accent Color & Contrast Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-xl bg-[#1A2130]/50 border border-white/10 p-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2.5">
                <Palette className="h-3.5 w-3.5" />
                Couleur d&apos;accentuation de votre marque
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {ACCENT_PRESETS.map((c) => {
                  const selected =
                    accentColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setAccentColor(c.hex)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                        selected
                          ? "border-white bg-white/15 text-white"
                          : "border-white/10 bg-[#0A0D14] text-slate-300 hover:border-white/25"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Assombrissement de la bannière (lisibilité)
                </label>
                <span className="font-mono text-xs text-slate-300">
                  {bannerOverlayOpacity}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={85}
                value={bannerOverlayOpacity}
                onChange={(e) =>
                  setBannerOverlayOpacity(Number(e.target.value))
                }
                className="w-full accent-[#FF3B30] cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ajustez le voile sombre pour faire ressortir votre logo et vos textes sur une bannière claire.
              </p>
            </div>
          </div>

          {/* Text & Identity Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom du site / de la plateforme
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nom du club / de l&apos;organisateur
              </label>
              <input
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Slogan / Description sous le titre
              </label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Localisation / Région
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Antananarivo • LAN & En ligne"
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Lien Stream Live (Twitch / YouTube / Facebook)
              </label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://twitch.tv/..."
                className="w-full rounded-xl bg-[#0A0D14] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Actions */}
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
              disabled={saving || uploadingKind !== null}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="h-4 w-4" />
              {saving
                ? "Enregistrement..."
                : "Enregistrer ma Bannière & mon Logo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
