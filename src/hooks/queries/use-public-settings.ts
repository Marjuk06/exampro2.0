import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchJson } from "@/lib/query/fetch-json";

export interface PublicSettings {
  betaMode: boolean;
  constructionBanner: boolean;
  constructionMessage: string;
}

const DEFAULT_SETTINGS: PublicSettings = {
  betaMode: false,
  constructionBanner: false,
  constructionMessage:
    "🚧 MCQ Pro 2.0 is currently in Beta — some features are under active development.",
};

/**
 * Fetches public app settings (betaMode, constructionBanner, constructionMessage).
 * - No auth required
 * - Stale time: 30s (matches server cache)
 * - Returns safe defaults while loading so UI never flashes unexpectedly
 */
export function usePublicSettings() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.publicSettings,
    queryFn: () => fetchJson<PublicSettings>("/api/settings/public"),
    staleTime: 30_000,
    retry: 1,
    // Don't refetch on window focus — settings rarely change
    refetchOnWindowFocus: false,
  });

  return {
    settings: data ?? DEFAULT_SETTINGS,
    isLoading,
  };
}
