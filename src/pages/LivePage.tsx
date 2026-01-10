import React from "react";
import Page from "../components/layout/Page";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import Button from "../components/ds/Button";
import Spinner from "../components/ds/Spinner";
import { fetchLiveStatus } from "../api/live";
import type { LiveStatus } from "../api/live";

const DEFAULT_FALLBACK_EMBED_URL = "https://www.youtube.com/embed/at3v7WepbDg";

type LoadState = "loading" | "ready" | "error";
type SourceType = "live" | "fallback";

function withAutoplayParams(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}autoplay=1&mute=1&playsinline=1`;
}

function getYoutubeEmbedId(url: string) {
  const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function withLoopParams(url: string) {
  const videoId = getYoutubeEmbedId(url);
  if (!videoId) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}loop=1&playlist=${videoId}`;
}

export default function LivePage() {
  const [state, setState] = React.useState<LoadState>("loading");
  const [liveStatus, setLiveStatus] = React.useState<LiveStatus | null>(null);
  const [source, setSource] = React.useState<SourceType | null>(null);

  const loadStatus = React.useCallback(async () => {
    setState("loading");
    setLiveStatus(null);
    setSource(null);
    try {
      const data = await fetchLiveStatus();
      setLiveStatus(data);
      setSource(data.isLive ? "live" : "fallback");
      setState("ready");
    } catch {
      setLiveStatus({ isLive: false, fallbackEmbedUrl: DEFAULT_FALLBACK_EMBED_URL });
      setSource("fallback");
      setState("ready");
    }
  }, []);

  React.useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const fallbackUrl = React.useMemo(() => {
    if (!liveStatus) return undefined;
    if (liveStatus.fallbackEmbedUrl) return liveStatus.fallbackEmbedUrl;
    if (!liveStatus.isLive) return DEFAULT_FALLBACK_EMBED_URL;
    return undefined;
  }, [liveStatus]);

  const liveUrl = liveStatus?.liveEmbedUrl;
  const rawEmbedUrl = source === "live" ? liveUrl : source === "fallback" ? fallbackUrl : undefined;
  const embedUrl = rawEmbedUrl
    ? withAutoplayParams(source === "fallback" ? withLoopParams(rawEmbedUrl) : rawEmbedUrl)
    : undefined;

  React.useEffect(() => {
    if (state !== "ready" || !liveStatus || !source) return;
    if (source === "live" && !liveUrl) {
      if (fallbackUrl) {
        setSource("fallback");
      } else {
        setState("error");
      }
    }
    if (source === "fallback" && !fallbackUrl) {
      setState("error");
    }
  }, [state, liveStatus, source, liveUrl, fallbackUrl]);

  const handlePlayerError = React.useCallback(() => {
    if (source === "live" && fallbackUrl) {
      setSource("fallback");
      return;
    }
    setState("error");
  }, [source, fallbackUrl]);

  return (
    <Page title="Live du tournoi">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Diffusion</h2>
          {source === "live" && state === "ready" ? (
            <span data-testid="live-badge">
              <Badge color="danger" className="tracking-widest">
                LIVE
              </Badge>
            </span>
          ) : null}
        </div>

        {state === "loading" && (
          <div className="flex items-center gap-2 text-sm text-slate-300" data-testid="live-loading">
            <Spinner />
            <span>Chargement du live.</span>
          </div>
        )}

        {state === "error" && (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 space-y-3"
            data-testid="live-error"
          >
            <p>Video indisponible, reessayez plus tard.</p>
            <Button variant="ghost" onClick={loadStatus} data-testid="live-retry">
              Reessayer
            </Button>
          </div>
        )}

        {state === "ready" && embedUrl && (
          <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            <div className="w-full pb-[56.25%]" />
            <iframe
              title="Live du tournoi"
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onError={handlePlayerError}
              data-testid="live-iframe"
            />
          </div>
        )}
      </Card>
    </Page>
  );
}
