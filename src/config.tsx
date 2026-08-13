import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

export type ThemeMode = "light" | "dark" | "system";

export type NotificationType = "info" | "success" | "warning" | "error" | "update";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: NotificationType;
}

export interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}

export interface AppConfig {
  configVersion: number;
  theme: ThemeMode;
  language: "zh" | "en";
  defaultPage: string;
  tray: { enabled: boolean };
  shortcuts: {
    settings: string;
    toggleSidebar: string;
    search: string;
  };
  nav: NavItemConfig[];
  overview: {
    kpiOrder: string[];
    bottomOrder: string[];
  };
  marquee: {
    enabled: boolean;
    showWifi: boolean;
    showDate: boolean;
    showTime: boolean;
  };
  notifications: {
    items: AppNotification[];
    welcomeShown: boolean;
  };
}

export const DEFAULT_NAV: NavItemConfig[] = [
  { id: "overview", label: "总览", icon: "Dashboard", visible: true },
  { id: "proxies", label: "网络", icon: "SwapHoriz", visible: true },
  { id: "logs", label: "日志", icon: "Subject", visible: true },
];

export const WELCOME_NOTIFICATION: AppNotification = {
  id: "welcome-1",
  title: "欢迎使用",
  body: "已切换至 超级内核 1.18.0，享受稳定体验。",
  time: (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })(),
  read: false,
  type: "info",
};

export const DEFAULT_CONFIG: AppConfig = {
  configVersion: 2,
  theme: "dark",
  language: "zh",
  defaultPage: "overview",
  tray: { enabled: true },
  shortcuts: {
    settings: "meta+,",
    toggleSidebar: "meta+shift+l",
    search: "meta+k",
  },
  nav: DEFAULT_NAV,
  overview: {
    kpiOrder: ["download", "upload", "connections", "nodes"],
    bottomOrder: ["currentNode", "latency", "quickSwitch", "systemInfo", "networkInfo"],
  },
  marquee: { enabled: true, showWifi: true, showDate: true, showTime: true },
  notifications: {
    items: [],
    welcomeShown: false,
  },
};

/* 导航项路径映射（路由不可配置）— 同时作为合法 nav id 白名单 */
export const NAV_PATHS: Record<string, string> = {
  overview: "/overview",
  proxies: "/proxies",
  logs: "/logs",
  settings: "/settings",
};

function mergeNav(raw: unknown): NavItemConfig[] {
  if (!Array.isArray(raw)) return DEFAULT_NAV;
  // 白名单过滤：config.json 中残留的 profiles/rules/connections 等已废弃项直接丢弃
  const result: NavItemConfig[] = [];
  const seen = new Set<string>();
  for (const item of raw as Array<unknown>) {
    const id = typeof item === "string" ? item : (item as Partial<NavItemConfig>)?.id;
    if (!id || !Object.prototype.hasOwnProperty.call(NAV_PATHS, id) || seen.has(id)) continue;
    seen.add(id);
    if (typeof item === "string") {
      const def = DEFAULT_NAV.find((d) => d.id === item);
      result.push(def ?? { id: item, label: item, icon: "Apps", visible: true });
    } else {
      const o = item as Partial<NavItemConfig>;
      const def = DEFAULT_NAV.find((d) => d.id === o.id);
      result.push({
        id,
        label: o.label ?? def?.label ?? "",
        icon: o.icon ?? def?.icon ?? "Apps",
        visible: o.visible ?? true,
      });
    }
  }
  // 补全 DEFAULT_NAV 里缺失的项（用户可能误删了某项）
  for (const def of DEFAULT_NAV) {
    if (!seen.has(def.id)) result.push(def);
  }
  return result;
}

function mergeNotifications(raw: unknown): AppConfig["notifications"] {
  const def = DEFAULT_CONFIG.notifications;
  if (!raw || typeof raw !== "object") return { ...def };
  const o = raw as Partial<AppConfig["notifications"]>;
  const items = Array.isArray(o.items)
    ? (o.items as unknown[])
        .map((it) => {
          if (!it || typeof it !== "object") return null;
          const n = it as Partial<AppNotification>;
          if (!n.id || !n.title) return null;
          return {
            id: String(n.id),
            title: String(n.title),
            body: typeof n.body === "string" ? n.body : "",
            time: typeof n.time === "string" ? n.time : "",
            read: !!n.read,
            type: (["info", "success", "warning", "error", "update"].includes(n.type as string)
              ? (n.type as NotificationType)
              : "info") as NotificationType,
          };
        })
        .filter((v): v is AppNotification => v !== null)
    : [];
  return {
    items,
    welcomeShown: !!o.welcomeShown,
  };
}

function merge(c: unknown): AppConfig {
  const o = (c ?? {}) as Partial<AppConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...o,
    tray: { ...DEFAULT_CONFIG.tray, ...(o.tray ?? {}) },
    shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...(o.shortcuts ?? {}) },
    marquee: { ...DEFAULT_CONFIG.marquee, ...(o.marquee ?? {}) },
    notifications: mergeNotifications(o.notifications),
    nav: mergeNav(o.nav),
    overview: {
      kpiOrder: Array.isArray(o.overview?.kpiOrder) ? o.overview!.kpiOrder : DEFAULT_CONFIG.overview.kpiOrder,
      bottomOrder: Array.isArray(o.overview?.bottomOrder) ? o.overview!.bottomOrder : DEFAULT_CONFIG.overview.bottomOrder,
    },
  };
}

interface Ctx {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  patchConfig: (patch: Partial<AppConfig>) => void;
  pushNotification: (n: Omit<AppNotification, "id" | "time" | "read"> & { id?: string; time?: string; read?: boolean }) => AppNotification;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  ready: boolean;
  openFile: () => Promise<void>;
}

const ConfigContext = createContext<Ctx>({
  config: DEFAULT_CONFIG,
  setConfig: () => {},
  patchConfig: () => {},
  pushNotification: () => DEFAULT_CONFIG.notifications.items[0] ?? WELCOME_NOTIFICATION,
  markNotificationRead: () => {},
  markAllNotificationsRead: () => {},
  removeNotification: () => {},
  ready: false,
  openFile: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, set] = useState<AppConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const markReady = () => {
      if (done) return;
      done = true;
      setReady(true);
    };

    // 给 invoke 加一个显式超时：管理员模式下若前端/后端 IPC 异常（罕见），2s 内走默认配置不卡加载态
    const timer = window.setTimeout(() => {
      markReady();
    }, 2000);

    invoke<unknown>("load_config")
      .then((c) => {
        const merged = merge(c);
        set(merged);
      })
      .catch(() => set(DEFAULT_CONFIG))
      .finally(() => {
        window.clearTimeout(timer);
        markReady();
      });

    return () => window.clearTimeout(timer);
  }, []);

  /* 第一次启动：插入欢迎通知并持久化 */
  useEffect(() => {
    if (!ready) return;
    if (config.notifications.welcomeShown) return;
    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const timeStr = `今天 ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const welcome: AppNotification = {
      id: "welcome-1",
      title: "欢迎使用",
      body: "已切换至 超级内核 1.18.0，享受稳定体验。",
      time: timeStr,
      read: false,
      type: "info",
    };
    set((prev) => {
      if (prev.notifications.welcomeShown) return prev;
      const exists = prev.notifications.items.some((i) => i.id === welcome.id);
      return {
        ...prev,
        notifications: {
          welcomeShown: true,
          items: exists
            ? prev.notifications.items
            : [welcome, ...prev.notifications.items],
        },
      };
    });
  }, [ready, config.notifications.welcomeShown]);

  const setConfig = useCallback((c: AppConfig) => {
    set(c);
    invoke("save_config", { config: c }).catch(() => {});
  }, []);

  const patchConfig = useCallback(
    (patch: Partial<AppConfig>) => {
      set((prev) => {
        const next = merge({ ...prev, ...patch } as unknown);
        invoke("save_config", { config: next }).catch(() => {});
        return next;
      });
    },
    []
  );

  const pushNotification = useCallback<Ctx["pushNotification"]>((n) => {
    const pad = (x: number) => String(x).padStart(2, "0");
    const d = new Date();
    const defaultTime = `今天 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const newItem: AppNotification = {
      id: n.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: n.title,
      body: n.body,
      time: n.time ?? defaultTime,
      read: n.read ?? false,
      type: n.type ?? "info",
    };
    set((prev) => {
      const deduped = prev.notifications.items.filter((i) => i.id !== newItem.id);
      const next: AppConfig = {
        ...prev,
        notifications: {
          ...prev.notifications,
          items: [newItem, ...deduped],
        },
      };
      invoke("save_config", { config: next }).catch(() => {});
      return next;
    });
    return newItem;
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    set((prev) => {
      const items = prev.notifications.items.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const next = { ...prev, notifications: { ...prev.notifications, items } };
      invoke("save_config", { config: next }).catch(() => {});
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    set((prev) => {
      const items = prev.notifications.items.map((n) => ({ ...n, read: true }));
      const next = { ...prev, notifications: { ...prev.notifications, items } };
      invoke("save_config", { config: next }).catch(() => {});
      return next;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    set((prev) => {
      const items = prev.notifications.items.filter((n) => n.id !== id);
      const next = { ...prev, notifications: { ...prev.notifications, items } };
      invoke("save_config", { config: next }).catch(() => {});
      return next;
    });
  }, []);

  const openFile = useCallback(() => invoke<void>("open_config_file"), []);

  const value = useMemo<Ctx>(
    () => ({
      config,
      setConfig,
      patchConfig,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      removeNotification,
      ready,
      openFile,
    }),
    [
      config,
      setConfig,
      patchConfig,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      removeNotification,
      ready,
      openFile,
    ]
  );

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);

/* 快捷键匹配：combo 形如 "meta+shift+l" */
export function matchShortcut(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const mods = parts.slice(0, -1);
  if (e.metaKey !== mods.includes("meta")) return false;
  if (e.ctrlKey !== mods.includes("ctrl")) return false;
  if (e.shiftKey !== mods.includes("shift")) return false;
  if (e.altKey !== mods.includes("alt")) return false;
  return e.key.toLowerCase() === key;
}

export function formatShortcut(combo: string): string {
  const map: Record<string, string> = {
    meta: "⌘",
    shift: "⇧",
    ctrl: "⌃",
    alt: "⌥",
  };
  return combo
    .toLowerCase()
    .split("+")
    .map((p) => map[p] ?? p.toUpperCase())
    .join(" + ");
}
