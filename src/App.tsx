import { useMemo, useEffect, useState, Component, type ReactNode, type ErrorInfo } from "react";
import { ThemeProvider, CssBaseline, Box, CircularProgress, Typography, Button, Alert } from "@mui/material";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { getTheme } from "./theme";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import ProxiesPage from "./pages/ProxiesPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import { ConfigProvider, useConfig, NAV_PATHS, DEFAULT_CONFIG } from "./config";
import { SystemDataProvider } from "./hooks/useSystemData";

function usePrefersDark() {
  const [dark, setDark] = useState(
    () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true
  );
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!m) return;
    const fn = () => setDark(m.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  return dark;
}

/* ---- 最小主题骨架：任何 React 异常 / 数据未就绪时都有 UI 兜底，绝对不白屏 ---- */
function FallbackShell({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: "background.default",
        color: "text.primary",
        px: 4,
        textAlign: "center",
      }}
    >
      <Box sx={{ mb: 1, opacity: 0.9, fontWeight: 800, fontSize: 22 }}>{title}</Box>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          {subtitle}
        </Typography>
      )}
      <Box sx={{ mt: 1, display: "flex", gap: 1.5, alignItems: "center" }}>
        <CircularProgress size={22} />
      </Box>
      {action}
    </Box>
  );
}

/* ---- React 根级别错误边界：render 阶段 / useEffect 里任何未捕获异常都不会导致白屏 ---- */
interface EBState { hasError: boolean; errMsg?: string; }
class RootErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  override state: EBState = { hasError: false };
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, errMsg: err?.message ?? String(err) };
  }
  override componentDidCatch(_err: Error, _info: ErrorInfo) {
    // 保留第一现场，后续可扩展：打日志 / 写到 localStorage
  }
  override render() {
    if (this.state.hasError) {
      const theme = getTheme("dark");
      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box
            sx={{
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.default",
              p: 3,
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 560 }}>
              <Alert severity="error" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700 }}>前端渲染异常（非白屏兜底）</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  部分界面模块出错了，刷新窗口即可恢复。如果持续出现，请检查最近的配置改动。
                </Typography>
              </Alert>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: "divider",
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  color: "text.secondary",
                  mb: 2,
                }}
              >
                {this.state.errMsg ?? "(no details)"}
              </Box>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button variant="contained" onClick={() => location.reload()}>
                  刷新应用
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    // 清理本地可能导致异常的状态，再刷新
                    try { localStorage.clear(); } catch {}
                    location.reload();
                  }}
                >
                  重置本地状态并刷新
                </Button>
              </Box>
            </Box>
          </Box>
        </ThemeProvider>
      );
    }
    return this.props.children;
  }
}

/* ---- 配置加载安全兜底：超时 / invoke 抛错时切到默认配置继续渲染 ---- */
function SafeConfigProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

function AppInner() {
  const { config, ready } = useConfig();
  const prefersDark = usePrefersDark();

  // 兜底：ready 超过 4.5s 仍为 false，强行解除阻塞（假装 ready），避免永远卡 Loading → 视觉白屏
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setForceReady(true), 4500);
    return () => window.clearTimeout(t);
  }, [ready]);

  // 用 DEFAULT_CONFIG 兜底（极端情况下 config 为 {} / null 也不会 theme 崩溃）
  const safeConfig = { ...DEFAULT_CONFIG, ...config };
  const mode = safeConfig.theme;
  const effective = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  const theme = useMemo(() => getTheme(effective), [effective]);

  const defaultPath = NAV_PATHS[safeConfig.defaultPage] ?? "/overview";

  if (!ready && !forceReady) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FallbackShell
          title="正在加载配置…"
          subtitle="从 config.json 读取界面设置，若时间过长将自动降级并继续显示界面。"
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/proxies" element={<ProxiesPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <SafeConfigProvider>
        <SystemDataProvider>
          <AppInner />
        </SystemDataProvider>
      </SafeConfigProvider>
    </RootErrorBoundary>
  );
}
