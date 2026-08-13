import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

export interface SystemInfo {
  os: string;
  osVersion: string;
  hostname: string;
  cpuBrand: string;
  cpuPhysical: number;
  cpuLogical: number;
  cpuFreq: number;
  memory: number;
  diskTotal: number;
  diskUsed: number;
}

export interface NetworkInfo {
  lanIp: string;
  publicIp: string;
  country: string;
  region: string;
  city: string;
  connectionType: string;
  wifiName: string;
  wifiStandard: number | null;
}

/* -------------------- 全局系统/网络数据 Provider（共享单例，避免重复 invoke） -------------------- */

interface SystemDataCtx {
  systemInfo: SystemInfo | null;
  networkInfo: NetworkInfo | null;
  refreshSystem: () => void;
  refreshNetwork: () => void;
}

const SystemDataContext = createContext<SystemDataCtx>({
  systemInfo: null,
  networkInfo: null,
  refreshSystem: () => {},
  refreshNetwork: () => {},
});

const NETWORK_REFRESH_MS = 60000; // 60s，之前 30s 太频繁
const SYSTEM_REFRESH_MS = 5 * 60 * 1000; // 5min

export function SystemDataProvider({ children }: { children: ReactNode }) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  /* 防止并发调用：用 ref 持有 inflight Promise */
  const sysInflight = useRef<Promise<SystemInfo> | null>(null);
  const netInflight = useRef<Promise<NetworkInfo> | null>(null);

  const refreshSystem = useCallback(() => {
    if (sysInflight.current) return sysInflight.current;
    const p = invoke<SystemInfo>("system_info")
      .then((v) => {
        setSystemInfo(v);
        return v;
      })
      .catch(() => systemInfo as SystemInfo)
      .finally(() => {
        sysInflight.current = null;
      });
    sysInflight.current = p;
    return p;
  }, [systemInfo]);

  const refreshNetwork = useCallback(() => {
    if (netInflight.current) return netInflight.current;
    const p = invoke<NetworkInfo>("network_info")
      .then((v) => {
        setNetworkInfo(v);
        return v;
      })
      .catch(() => networkInfo as NetworkInfo)
      .finally(() => {
        netInflight.current = null;
      });
    netInflight.current = p;
    return p;
  }, [networkInfo]);

  /* 首次挂载：先立即刷新一次，再启动低频定时器（避免每次路由切回都重新 invoke） */
  useEffect(() => {
    refreshSystem();
    refreshNetwork();
    const s = setInterval(refreshSystem, SYSTEM_REFRESH_MS);
    const n = setInterval(refreshNetwork, NETWORK_REFRESH_MS);
    return () => {
      clearInterval(s);
      clearInterval(n);
    };
  }, [refreshSystem, refreshNetwork]);

  return (
    <SystemDataContext.Provider
      value={{ systemInfo, networkInfo, refreshSystem, refreshNetwork }}
    >
      {children}
    </SystemDataContext.Provider>
  );
}

/* 替代原先 useSystemInfo：只读共享数据，不会重复 invoke */
export function useSystemInfo() {
  const ctx = useContext(SystemDataContext);
  return { info: ctx.systemInfo, refresh: ctx.refreshSystem };
}

/* 替代原先 useNetworkInfo：只读共享数据，不会重复 invoke */
export function useNetworkInfo() {
  const ctx = useContext(SystemDataContext);
  return { info: ctx.networkInfo, refresh: ctx.refreshNetwork };
}

/* 管理员检测（低频，保持独立） */
export function useIsAdmin() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    invoke<boolean>("is_admin")
      .then(setAdmin)
      .catch(() => setAdmin(true));
  }, []);
  return admin;
}

/* -------------------- 格式化辅助 -------------------- */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatCpuMem(cores: number, memoryBytes: number): string {
  const memGb = Math.round(memoryBytes / 1024 / 1024 / 1024);
  return `${cores}c${memGb}g`;
}

export function formatCpuFreq(mhz: number): string {
  if (mhz >= 1000) return (mhz / 1000).toFixed(1) + " GHz";
  return mhz + " MHz";
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (code.charCodeAt(0) - 65),
    A + (code.charCodeAt(1) - 65)
  );
}
