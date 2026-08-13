import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  check,
  type Update,
  type DownloadEvent,
} from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import {
  useConfig,
  type AppNotification,
  type NotificationType,
} from "../config";

export interface CachedUpdateInfo {
  version: string;
  currentVersion: string;
  date?: string | null;
  body?: string | null;
  /* 上次检测时间（ISO） */
  checkedAt: string;
  /* 是否存在增量包提示 */
  hasDelta?: boolean;
}

export interface UpdaterHookState {
  currentVersion: string;
  status: "idle" | "checking" | "downloading" | "installing" | "error";
  available: Update | null;
  cached: CachedUpdateInfo | null;
  progressPct: number | null;
  usedDelta: boolean;
  errorText: string | null;
  checkForUpdates: () => Promise<Update | null>;
  downloadAndInstall: () => Promise<void>;
}

/* 把 plugin-updater 返回的 Update 实例转成可 JSON 持久化快照 */
function snapshot(u: Update, current: string): CachedUpdateInfo {
  const raw = u.rawJson;
  const platforms = (raw as { platforms?: unknown })?.platforms;
  let hasDelta = false;
  if (platforms && typeof platforms === "object") {
    for (const k of Object.keys(platforms as Record<string, unknown>)) {
      const pf = (platforms as Record<string, unknown>)[k];
      if (pf && typeof pf === "object" && "delta_url" in (pf as Record<string, unknown>)) {
        hasDelta = true;
        break;
      }
    }
  }
  return {
    version: u.version,
    currentVersion: current,
    date: u.date ?? null,
    body: u.body ?? null,
    checkedAt: new Date().toISOString(),
    hasDelta,
  };
}

function pushIfDifferent(
  pushFn: (n: Omit<AppNotification, "id" | "time" | "read"> & Partial<Pick<AppNotification, "id" | "time" | "read">>) => AppNotification,
  items: AppNotification[],
  payload: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
  }
) {
  const exists = items.some((i) => i.id === payload.id);
  if (exists) return;
  pushFn({ ...payload, read: false });
}

export function useAppUpdater(): UpdaterHookState {
  const { config, setConfig, pushNotification } = useConfig();
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [status, setStatus] = useState<UpdaterHookState["status"]>("idle");
  const [available, setAvailable] = useState<Update | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [usedDelta, setUsedDelta] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const didStartup = useRef(false);

  useEffect(() => {
    getVersion().then((v) => setCurrentVersion(v)).catch(() => {});
  }, []);

  const cached = useMemo<CachedUpdateInfo | null>(() => {
    /* 优先读 config.json：用户可以在任何页面看到“最新版本”状态，不依赖内存中的 Update 实例 */
    const raw = (config as unknown as { updateState?: unknown }).updateState;
    if (raw && typeof raw === "object") {
      const o = raw as Partial<CachedUpdateInfo>;
      if (o.version && o.currentVersion && o.checkedAt) {
        return {
          version: o.version,
          currentVersion: o.currentVersion,
          date: o.date ?? null,
          body: o.body ?? null,
          checkedAt: o.checkedAt,
          hasDelta: !!o.hasDelta,
        };
      }
    }
    return null;
  }, [config]);

  const persistUpdateState = useCallback(
    (snap: CachedUpdateInfo | null) => {
      const next = {
        ...(config as unknown as Record<string, unknown>),
        updateState: snap,
      } as unknown as Parameters<typeof setConfig>[0];
      setConfig(next);
    },
    [config, setConfig]
  );

  const checkForUpdates = useCallback(async () => {
    setStatus("checking");
    setErrorText(null);
    setProgressPct(null);
    try {
      const next = await check({ timeout: 15000 });
      if (!next) {
        setAvailable(null);
        persistUpdateState(null);
        pushIfDifferent(pushNotification, config.notifications.items, {
          id: "update-uptodate",
          type: "success",
          title: "软件已为最新版本",
          body: currentVersion
            ? `当前版本 v${currentVersion}，无需更新。`
            : "当前版本已是最新。",
        });
      } else {
        setAvailable(next);
        const snap = snapshot(next, currentVersion);
        persistUpdateState(snap);
        pushIfDifferent(pushNotification, config.notifications.items, {
          id: `update-v${snap.version}`,
          type: "update",
          title: "发现新版本",
          body: `最新版本 ${snap.version}${snap.hasDelta ? "（支持增量更新）" : ""}，可在设置中下载安装。`,
        });
      }
      setStatus("idle");
      return next;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      setErrorText(msg);
      setStatus("error");
      return null;
    }
  }, [config.notifications.items, currentVersion, persistUpdateState, pushNotification]);

  /* 启动后静默做一次 check（不阻塞 UI） */
  useEffect(() => {
    if (didStartup.current) return;
    if (!currentVersion) return;
    didStartup.current = true;
    const timer = window.setTimeout(() => {
      void checkForUpdates();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [checkForUpdates, currentVersion]);

  const makeProgressCb = useCallback(
    () => {
      let total: number | null = null;
      let done = 0;
      return (e: DownloadEvent) => {
        if (e.event === "Started") {
          total = e.data.contentLength ?? null;
          done = 0;
          setProgressPct(total ? 0 : null);
        } else if (e.event === "Progress") {
          done += e.data.chunkLength;
          if (total && total > 0) setProgressPct(Math.round((done / total) * 100));
        } else if (e.event === "Finished") {
          setProgressPct(100);
        }
      };
    },
    []
  );

  const tryInstallFull = useCallback(
    async (u: Update) => {
      setUsedDelta(false);
      try {
        await u.download(makeProgressCb(), {});
        setStatus("installing");
        await u.install();
      } finally {
        try {
          await u.close();
        } catch {}
      }
    },
    [makeProgressCb]
  );

  const downloadAndInstall = useCallback(async () => {
    if (!available) return;
    setStatus("downloading");
    setProgressPct(null);
    setUsedDelta(true);
    try {
      await available.downloadAndInstall(makeProgressCb(), {});
      setStatus("installing");
    } catch (e) {
      const msg = String(e ?? "");
      const likelyDelta =
        msg.includes("delta") ||
        msg.includes("patch") ||
        msg.includes("diff") ||
        msg.includes("bsdiff") ||
        msg.includes("签名") ||
        msg.includes("signature");
      if (usedDelta && likelyDelta) {
        await tryInstallFull(available);
      } else {
        setErrorText(msg);
        setStatus("error");
      }
    }
  }, [available, makeProgressCb, tryInstallFull, usedDelta]);

  return {
    currentVersion,
    status,
    available,
    cached,
    progressPct,
    usedDelta,
    errorText,
    checkForUpdates,
    downloadAndInstall,
  };
}
