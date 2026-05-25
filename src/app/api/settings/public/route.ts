import { NextResponse } from "next/server";
import { withApiHandler } from "@/server/api/handler";
import { settingsRepository } from "@/server/repositories/settings.repository";

/**
 * GET /api/settings/public
 *
 * Returns only the client-safe subset of app settings — no auth required.
 * Used by BetaBanner, construction banner, and beta tag on every page.
 *
 * Cache: 30s at CDN level so toggles propagate quickly without hammering Firestore.
 */
export const GET = withApiHandler(async () => {
  const settings = await settingsRepository.get();

  return NextResponse.json(
    {
      betaMode: settings.betaMode ?? false,
      constructionBanner: settings.constructionBanner ?? false,
      constructionMessage:
        settings.constructionMessage ??
        "🚧 Exam Center is currently in Beta — some features are under active development.",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
});
