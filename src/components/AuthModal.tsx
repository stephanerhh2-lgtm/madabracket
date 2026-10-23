"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password });

    setBusy(false);

    if (result.error) {
      setError(
        result.error.message ??
          "Impossible de se connecter. Vérifie tes informations."
      );
      return;
    }
    onClose();
  }

  const isRegister = mode === "register";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0F1420] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {isRegister ? "Créer un compte" : "Connexion"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isRegister && (
            <label className="block text-xs font-semibold text-slate-300">
              Pseudo ou nom
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </label>
          )}

          <label className="block text-xs font-semibold text-slate-300">
            Adresse e-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Mot de passe {isRegister && "(8 caractères minimum)"}
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0A0D14] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#FF3B30] hover:brightness-110 px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
          >
            {busy
              ? "Patiente..."
              : isRegister
                ? "Créer mon compte"
                : "Se connecter"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(isRegister ? "login" : "register");
          }}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-white"
        >
          {isRegister
            ? "Tu as déjà un compte ? Connecte-toi"
            : "Pas encore de compte ? Inscris-toi"}
        </button>
      </div>
    </div>
  );
}
