import React from "react";
import Page from "../components/layout/Page";
import Card from "../components/ds/Card";
import Badge from "../components/ds/Badge";
import Button from "../components/ds/Button";
import Spinner from "../components/ds/Spinner";
import { API_BASE_URL, fetchLiveStatus } from "../api/live";
import type { LiveStatus, LiveStreamEnvelope } from "../api/live";

const DEFAULT_FALLBACK_EMBED_URL = "https://www.youtube.com/embed/at3v7WepbDg";
const FALLBACK_POLLING_MS = 30_000;
const STREAM_RECONNECT_MS = 5_000;

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

function normalizeStatus(raw: LiveStatus): LiveStatus {
  return {
    ...raw,
    fallbackEmbedUrl: raw.fallbackEmbedUrl || DEFAULT_FALLBACK_EMBED_URL,
  };
}

function parseLiveStatusEvent(payload: string): LiveStatus | null {
  try {
    const parsed = JSON.parse(payload) as LiveStreamEnvelope | LiveStatus;
    if (parsed && typeof parsed === "object" && "status" in parsed) {
      const envelope = parsed as LiveStreamEnvelope;
      if (envelope.status && typeof envelope.status === "object") {
        return normalizeStatus(envelope.status);
      }
      return null;
    }
    if (parsed && typeof parsed === "object" && "isLive" in parsed) {
      return normalizeStatus(parsed as LiveStatus);
    }
    return null;
  } catch {
    return null;
  }
}

export default function LivePage() {
  const [state, setState] = React.useState<LoadState>("loading");
  const [liveStatus, setLiveStatus] = React.useState<LiveStatus | null>(null);
  const [source, setSource] = React.useState<SourceType | null>(null);
  const [streamNonce, setStreamNonce] = React.useState(0);

  const eventSourceRef = React.useRef<EventSource | null>(null);
  const pollingTimerRef = React.useRef<number | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);

  const clearPolling = React.useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const clearReconnect = React.useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const closeStream = React.useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const applyStatus = React.useCallback((incoming: LiveStatus) => {
    const normalized = normalizeStatus(incoming);
    setLiveStatus(normalized);

    if (normalized.isLive && normalized.liveEmbedUrl) {
      setSource("live");
      setState("ready");
      return;
    }

    if (normalized.fallbackEmbedUrl) {
      setSource("fallback");
      setState("ready");
      return;
    }

    setState("error");
  }, []);

  const loadStatus = React.useCallback(
    async (withLoading = false) => {
      if (withLoading) {
        setState("loading");
      }
      try {
        const data = await fetchLiveStatus();
        applyStatus(data);
      } catch {
        applyStatus({
          isLive: false,
          mode: "fallback",
          fallbackEmbedUrl: DEFAULT_FALLBACK_EMBED_URL,
          sourceState: "detection_error",
        });
      }
    },
    [applyStatus],
  );

  const startFallbackPolling = React.useCallback(() => {
    if (pollingTimerRef.current !== null) return;
    pollingTimerRef.current = window.setInterval(() => {
      void loadStatus(false);
    }, FALLBACK_POLLING_MS);
  }, [loadStatus]);

  React.useEffect(() => {
    void loadStatus(true);
  }, [loadStatus]);

  React.useEffect(() => {
    closeStream();
    clearReconnect();

    const streamUrl = `${API_BASE_URL}/live/stream`;
    const sourceStream = new EventSource(streamUrl);
    eventSourceRef.current = sourceStream;

    const onLiveStatus = (event: MessageEvent<string>) => {
      const parsed = parseLiveStatusEvent(event.data);
      if (!parsed) return;
      clearPolling();
      applyStatus(parsed);
    };

    sourceStream.addEventListener("live_status", onLiveStatus as EventListener);
    sourceStream.onmessage = onLiveStatus;
    sourceStream.onopen = () => {
      clearPolling();
      clearReconnect();
    };
    sourceStream.onerror = () => {
      closeStream();
      startFallbackPolling();
      if (reconnectTimerRef.current === null) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          setStreamNonce((v) => v + 1);
        }, STREAM_RECONNECT_MS);
      }
    };

    return () => {
      sourceStream.removeEventListener("live_status", onLiveStatus as EventListener);
      closeStream();
    };
  }, [
    applyStatus,
    clearPolling,
    clearReconnect,
    closeStream,
    startFallbackPolling,
    streamNonce,
  ]);

  React.useEffect(() => {
    return () => {
      closeStream();
      clearPolling();
      clearReconnect();
    };
  }, [clearPolling, clearReconnect, closeStream]);

  const fallbackUrl = React.useMemo(() => {
    if (!liveStatus) return undefined;
    if (liveStatus.fallbackEmbedUrl) return liveStatus.fallbackEmbedUrl;
    if (!liveStatus.isLive) return DEFAULT_FALLBACK_EMBED_URL;
    return undefined;
  }, [liveStatus]);

  const liveUrl = liveStatus?.liveEmbedUrl ?? undefined;
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

  const handleRetry = React.useCallback(() => {
    setStreamNonce((v) => v + 1);
    void loadStatus(true);
  }, [loadStatus]);

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
            <Button variant="ghost" onClick={handleRetry} data-testid="live-retry">
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

