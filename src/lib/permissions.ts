import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AppRole = "player" | "organizer" | "admin";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

export type AccessResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: NextResponse };

export async function getCurrentUser(request: Request): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const role = (session.user as { role?: string }).role;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: role === "admin" || role === "organizer" ? role : "player",
  };
}

/**
 * Vérifie côté serveur que l'utilisateur est connecté et a un des rôles autorisés.
 * À appeler au début de chaque route qui modifie des données.
 */
export async function requireRole(
  request: Request,
  allowed: AppRole[]
): Promise<AccessResult> {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Connexion requise. Connecte-toi pour continuer." },
        { status: 401 }
      ),
    };
  }
  if (!allowed.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Tu n'as pas les droits pour cette action." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}
