import { db } from "@/db";
import { siteBranding } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const [branding] = await db
      .select()
      .from(siteBranding)
      .orderBy(asc(siteBranding.id))
      .limit(1);

    return NextResponse.json({ branding });
  } catch (error) {
    console.error("GET /api/branding error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de la bannière et du logo." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();

    const [current] = await db
      .select()
      .from(siteBranding)
      .orderBy(asc(siteBranding.id))
      .limit(1);

    if (!current) {
      return NextResponse.json(
        { error: "Configuration introuvable." },
        { status: 404 }
      );
    }

    const siteName =
      typeof body.siteName === "string" && body.siteName.trim().length > 0
        ? body.siteName.trim().slice(0, 60)
        : current.siteName;

    const tagline =
      typeof body.tagline === "string" && body.tagline.trim().length > 0
        ? body.tagline.trim().slice(0, 180)
        : current.tagline;

    const organizerName =
      typeof body.organizerName === "string"
        ? body.organizerName.trim().slice(0, 80)
        : current.organizerName;

    const logoUrl =
      typeof body.logoUrl === "string" && body.logoUrl.trim().length > 0
        ? body.logoUrl.trim()
        : "/images/default-logo.png";

    const bannerUrl =
      typeof body.bannerUrl === "string" && body.bannerUrl.trim().length > 0
        ? body.bannerUrl.trim()
        : "/images/default-banner.jpg";

    const accentColor =
      typeof body.accentColor === "string" &&
      /^#[0-9A-Fa-f]{6}$/.test(body.accentColor.trim())
        ? body.accentColor.trim()
        : current.accentColor;

    const bannerOverlayOpacity =
      typeof body.bannerOverlayOpacity === "number"
        ? Math.min(85, Math.max(15, Math.round(body.bannerOverlayOpacity)))
        : current.bannerOverlayOpacity;

    const allowedShapes = ["rounded", "circle", "shield"];
    const logoShape =
      typeof body.logoShape === "string" && allowedShapes.includes(body.logoShape)
        ? body.logoShape
        : current.logoShape;

    const location =
      typeof body.location === "string"
        ? body.location.trim().slice(0, 80)
        : current.location;

    const streamUrl =
      typeof body.streamUrl === "string"
        ? body.streamUrl.trim().slice(0, 200)
        : current.streamUrl;

    const discordUrl =
      typeof body.discordUrl === "string"
        ? body.discordUrl.trim().slice(0, 200)
        : current.discordUrl;

    const [updated] = await db
      .update(siteBranding)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(siteBranding.id, current.id))
      .returning();

    return NextResponse.json({ branding: updated });
  } catch (error) {
    console.error("PUT /api/branding error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la bannière et du logo." },
      { status: 500 }
    );
  }
}
