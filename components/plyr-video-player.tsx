"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { SkipBack, SkipForward, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// YouTube quality tutorial video ID (how to change quality)
const QUALITY_TUTORIAL_VIDEO_ID = "hZulbl4ht4k";

// Translation keys / inline copy (Arabic)
const t = {
  play: "تشغيل",
  forward10s: "تقديم 10 ثواني",
  back10s: "رجوع 10 ثواني",
  changeQuality: "تغيير الجودة",
  qualityTutorialTitle: "كيفية تغيير جودة الفيديو",
  step1: "انقر على أيقونة الترس في مشغل الفيديو",
  step2: "اختر الجودة",
  step3: "اختر 1080p أو 720p أو الجودة المفضلة",
  step4: "انقر «العودة للفيديو» عند الانتهاء",
  backToVideo: "العودة للفيديو",
  noVideo: "لا يوجد فيديو",
} as const;

const STORAGE_KEY_PREFIX = "video-progress";

function getStorageKey(videoType: "YOUTUBE" | "UPLOAD", id: string): string {
  return videoType === "YOUTUBE"
    ? `${STORAGE_KEY_PREFIX}-yt-${id}`
    : `${STORAGE_KEY_PREFIX}-url-${id}`;
}

function loadSavedTime(storageKey: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(storageKey);
    if (val == null) return null;
    const n = parseFloat(val);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function saveTime(storageKey: string, time: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, String(time));
  } catch {
    return;
  }
}

interface PlyrVideoPlayerProps {
  videoUrl?: string;
  youtubeVideoId?: string;
  videoType?: "UPLOAD" | "YOUTUBE";
  storageKey?: string;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export const PlyrVideoPlayer = ({
  videoUrl,
  youtubeVideoId,
  videoType = "UPLOAD",
  storageKey: propStorageKey,
  className,
  onEnded,
  onTimeUpdate,
}: PlyrVideoPlayerProps) => {
  const html5VideoRef = useRef<HTMLVideoElement>(null);
  const youtubeEmbedRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
  const [plyrReady, setPlyrReady] = useState(false);
  const lastSaveRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const storageKey =
    propStorageKey ??
    getStorageKey(
      videoType,
      videoType === "YOUTUBE" ? youtubeVideoId || "" : videoUrl || ""
    );

  const isYouTube = videoType === "YOUTUBE" && !!youtubeVideoId;

  const seek = useCallback(
    (delta: number) => {
      const player = playerRef.current;
      if (!player || typeof player.currentTime !== "number") return;
      const duration = player.duration ?? Infinity;
      const next = Math.max(0, Math.min(duration, player.currentTime + delta));
      player.currentTime = next;
    },
    []
  );

  const handleForward = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      seek(10);
    },
    [seek]
  );

  const handleBack = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      seek(-10);
    },
    [seek]
  );

  const handleQualityClick = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      setQualityDialogOpen(true);
    },
    []
  );

  const handleQualityDialogClose = useCallback(() => {
    setQualityDialogOpen(false);
    window.location.reload();
  }, []);

  const saveProgress = useCallback(
    (time: number) => {
      if (!Number.isFinite(time) || time < 0) return;
      lastTimeRef.current = time;
      const now = Date.now();
      if (now - lastSaveRef.current >= 1000) {
        lastSaveRef.current = now;
        saveTime(storageKey, time);
      }
    },
    [storageKey]
  );

  const saveProgressImmediate = useCallback(
    (time: number) => {
      if (!Number.isFinite(time) || time < 0) return;
      lastTimeRef.current = time;
      lastSaveRef.current = Date.now();
      saveTime(storageKey, time);
    },
    [storageKey]
  );

  const renderControlBar = (isFullscreenBar: boolean) => (
    <div
      data-video-controls
      className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1.5"
      role="group"
      aria-label="Custom video controls"
    >
      {isFullscreenBar ? (
        <>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            onClick={() => seek(-10)}
            onPointerDown={handleBack}
            title={t.back10s}
            aria-label={t.back10s}
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            onClick={() => seek(10)}
            onPointerDown={handleForward}
            title={t.forward10s}
            aria-label={t.forward10s}
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            onClick={() => seek(10)}
            onPointerDown={handleForward}
            title={t.forward10s}
            aria-label={t.forward10s}
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
            onClick={() => seek(-10)}
            onPointerDown={handleBack}
            title={t.back10s}
            aria-label={t.back10s}
          >
            <SkipBack className="h-4 w-4" />
          </button>
        </>
      )}
      {isYouTube && (
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/20 transition-colors"
          onClick={handleQualityClick}
          onPointerDown={handleQualityClick}
          title={t.changeQuality}
          aria-label={t.changeQuality}
        >
          <Settings className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      const full = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(full);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const player = playerRef.current;
      if (player && typeof player.currentTime === "number") {
        saveProgressImmediate(player.currentTime);
      }
    };

    const handlePageHide = () => {
      const player = playerRef.current;
      if (player && typeof player.currentTime === "number") {
        saveProgressImmediate(player.currentTime);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveProgressImmediate]);

  useEffect(() => {
    let isCancelled = false;
    let plyrCssLoaded = false;

    async function loadPlyrCss() {
      if (plyrCssLoaded) return;
      await import("plyr/dist/plyr.css");
      plyrCssLoaded = true;
    }

    async function setupPlayer() {
      const targetEl =
        videoType === "YOUTUBE" ? youtubeEmbedRef.current : html5VideoRef.current;
      if (!targetEl) return;

      await loadPlyrCss();
      if (isCancelled) return;

      const plyrModule: any = await import("plyr");
      const Plyr: any = plyrModule.default ?? plyrModule;

      if (isCancelled) return;

      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const savedSeconds = loadSavedTime(storageKey);
      const youtubeConfig: Record<string, unknown> = {
        rel: 0,
        modestbranding: 1,
      };
      if (isYouTube && savedSeconds != null && savedSeconds > 0) {
        youtubeConfig.start = Math.floor(savedSeconds);
      }

      const player = new Plyr(targetEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
        settings: ["speed", "quality", "loop"],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        youtube: youtubeConfig,
        ratio: "16:9",
      });

      playerRef.current = player;

      if (onEnded) player.on("ended", onEnded);
      if (onTimeUpdate) {
        player.on("timeupdate", () => onTimeUpdate(player.currentTime || 0));
      }

      player.on("ready", () => {
        if (isCancelled) return;
        setPlyrReady(true);

        const saved = loadSavedTime(storageKey);
        if (videoType === "UPLOAD" && saved != null && saved > 0) {
          player.currentTime = saved;
        }

        const iframe = player.elements?.container?.querySelector?.(
          "iframe"
        ) as HTMLIFrameElement | null;
        if (iframe) {
          iframe.style.pointerEvents = "none";
          iframe.setAttribute("tabindex", "-1");
        }
      });

      let throttleTimer: ReturnType<typeof setTimeout> | null = null;
      player.on("timeupdate", () => {
        const t = player.currentTime;
        if (typeof t !== "number") return;
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          saveProgress(t);
        }, 1000);
      });

      player.on("pause", () => {
        const t = player.currentTime;
        if (typeof t === "number") saveProgressImmediate(t);
      });
    }

    setupPlayer();

    return () => {
      isCancelled = true;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
      playerRef.current = null;
      setPlyrReady(false);
    };
  }, [
    videoUrl,
    youtubeVideoId,
    videoType,
    storageKey,
    onEnded,
    onTimeUpdate,
    saveProgress,
    saveProgressImmediate,
  ]);

  const hasVideo = (videoType === "YOUTUBE" && !!youtubeVideoId) || !!videoUrl;

  if (!hasVideo) {
    return (
      <div
        className={`aspect-video bg-muted rounded-lg flex items-center justify-center ${className || ""}`}
      >
        <div className="text-muted-foreground">{t.noVideo}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`aspect-video relative ${className || ""}`}>
      {videoType === "YOUTUBE" && youtubeVideoId ? (
        <div
          ref={youtubeEmbedRef}
          data-plyr-provider="youtube"
          data-plyr-embed-id={youtubeVideoId}
          className="w-full h-full"
        />
      ) : (
        <video
          ref={html5VideoRef}
          className="w-full h-full"
          playsInline
          crossOrigin="anonymous"
        >
          {videoUrl ? <source src={videoUrl} type="video/mp4" /> : null}
        </video>
      )}

      {plyrReady && !qualityDialogOpen && (
        <>
          <div className="absolute bottom-12 end-2 z-[30]">
            {renderControlBar(false)}
          </div>

          {isFullscreen &&
            typeof document !== "undefined" &&
            document.fullscreenElement &&
            createPortal(
              <div className="absolute bottom-12 end-2 z-[30]">
                {renderControlBar(true)}
              </div>,
              document.fullscreenElement
            )}
        </>
      )}

      <Dialog
        open={qualityDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleQualityDialogClose();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.qualityTutorialTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${QUALITY_TUTORIAL_VIDEO_ID}?rel=0&modestbranding=1`}
                title={t.qualityTutorialTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
              <li>{t.step4}</li>
            </ol>
          </div>
          <DialogFooter>
            <Button onClick={handleQualityDialogClose} className="bg-brand hover:bg-brand/90">
              {t.backToVideo}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
