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
const FACEBOOK_PAGE_URL = "https://www.facebook.com/profile.php?id=61567163188148";
const FACEBOOK_SDK_SRC = "https://connect.facebook.net/fr_FR/sdk.js#xfbml=1&version=v25.0&appId=227474631852040";
const FACEBOOK_SDK_ID = "facebook-jssdk";
const FACEBOOK_PLUGIN_HEIGHT = 700;
const FACEBOOK_REEL_URL = "https://www.facebook.com/reel/1291499379546221";
const FACEBOOK_REEL_EMBED_URL = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(FACEBOOK_REEL_URL)}&show_text=false&autoplay=true&mute=false`;

type LoadState = "loading" | "ready" | "error";
type SourceType = "live" | "fallback";
type FacebookSdkState = "loading" | "ready" | "error";

declare global {
  interface Window {
    FB?: {
      XFBML?: {
        parse: (element?: Element) => void;
      };
    };
    fbAsyncInit?: () => void;
  }
}

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
  const [facebookSdkState, setFacebookSdkState] = React.useState<FacebookSdkState>("loading");
  const [facebookWidth, setFacebookWidth] = React.useState(500);

  const eventSourceRef = React.useRef<EventSource | null>(null);
  const pollingTimerRef = React.useRef<number | null>(null);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const facebookHostRef = React.useRef<HTMLDivElement | null>(null);
  const facebookPluginRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    const updateWidth = () => {
      const nextWidth = facebookHostRef.current?.clientWidth ?? 500;
      setFacebookWidth(Math.max(280, Math.floor(nextWidth)));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined" || !facebookHostRef.current) {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(facebookHostRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (facebookSdkState !== "ready") return;
    if (!window.FB?.XFBML || !facebookPluginRef.current) return;
    window.FB.XFBML.parse(facebookPluginRef.current);
  }, [facebookSdkState, facebookWidth]);

  React.useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled && !window.FB?.XFBML) {
        setFacebookSdkState("error");
      }
    }, 10_000);

    const markReady = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      setFacebookSdkState("ready");
      if (window.FB?.XFBML && facebookPluginRef.current) {
        window.FB.XFBML.parse(facebookPluginRef.current);
      }
    };

    const markError = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      setFacebookSdkState("error");
    };

    if (window.FB?.XFBML) {
      markReady();
      return () => {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };
    }

    const previousAsyncInit = window.fbAsyncInit;
    window.fbAsyncInit = () => {
      previousAsyncInit?.();
      markReady();
    };

    const existingScript = document.getElementById(FACEBOOK_SDK_ID) as HTMLScriptElement | null;
    const targetScript = existingScript ?? document.createElement("script");

    const handleLoad = () => {
      if (window.FB?.XFBML) {
        markReady();
        return;
      }
      window.setTimeout(() => {
        if (window.FB?.XFBML) {
          markReady();
        } else {
          markError();
        }
      }, 300);
    };

    targetScript.addEventListener("load", handleLoad);
    targetScript.addEventListener("error", markError);

    if (!existingScript) {
      targetScript.id = FACEBOOK_SDK_ID;
      targetScript.async = true;
      targetScript.defer = true;
      targetScript.crossOrigin = "anonymous";
      targetScript.src = FACEBOOK_SDK_SRC;
      document.body.appendChild(targetScript);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      targetScript.removeEventListener("load", handleLoad);
      targetScript.removeEventListener("error", markError);
      window.fbAsyncInit = previousAsyncInit;
    };
  }, []);

  return (
    <Page title="Live du tournoi">
      <div className="space-y-6">
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
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Facebook</h2>
            <p className="text-xs text-slate-400">
              Fil officiel du tournoi
            </p>
          </div>
          <a
            href={FACEBOOK_PAGE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sky-300 transition hover:text-sky-200"
          >
            Ouvrir la page
          </a>
        </div>

        <div
          ref={facebookHostRef}
          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70"
        >
          <div id="fb-root" />
          {facebookSdkState === "error" ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <p className="text-sm text-slate-300">
                Le flux Facebook n&apos;a pas pu se charger.
              </p>
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-400 hover:text-sky-200"
              >
                Voir la page Facebook
              </a>
            </div>
          ) : (
            <div
              ref={facebookPluginRef}
              className="flex min-h-[320px] items-start justify-center px-2 py-3 sm:px-4"
            >
              <div
                className="fb-page"
                data-href={FACEBOOK_PAGE_URL}
                data-tabs="timeline"
                data-width={String(facebookWidth)}
                data-height={String(FACEBOOK_PLUGIN_HEIGHT)}
                data-adapt-container-width="true"
                data-hide-cover="false"
                data-show-facepile="false"
                data-small-header="false"
              >
                <blockquote
                  cite={FACEBOOK_PAGE_URL}
                  className="fb-xfbml-parse-ignore"
                >
                  <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
                    Page Facebook officielle du tournoi
                  </a>
                </blockquote>
              </div>
            </div>
          )}
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Reel du tournoi</h2>
            <p className="text-xs text-slate-400">Vidéo officielle</p>
          </div>
          <a
            href={FACEBOOK_REEL_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-sky-300 transition hover:text-sky-200"
            data-testid="reel-link"
          >
            Voir sur Facebook
          </a>
        </div>
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="w-full pb-[56.25%]" />
          <iframe
            title="Reel du tournoi"
            src={FACEBOOK_REEL_EMBED_URL}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            data-testid="reel-iframe"
          />
        </div>
      </Card>
      </div>
    </Page>
  );
}
