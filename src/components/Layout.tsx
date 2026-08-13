import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import HeaderBar from "./HeaderBar";
import MarqueeTicker from "./MarqueeTicker";
import { useConfig, matchShortcut } from "../config";

export default function Layout() {
  const { config } = useConfig();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sc = config.shortcuts;
      if (matchShortcut(e, sc.settings)) {
        e.preventDefault();
        navigate("/settings");
      } else if (matchShortcut(e, sc.toggleSidebar)) {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (matchShortcut(e, sc.search)) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [config.shortcuts, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: sidebarOpen ? 76 : 0,
          transition: "width .2s ease",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <Sidebar sidebarOpen={sidebarOpen} />
      </Box>

      {/* 侧边栏收起时显示的小按钮（避开红绿灯，top 从 100px 开始） */}
      {!sidebarOpen && (
        <Tooltip title="展开侧边栏" placement="right">
          <IconButton
            size="small"
            onClick={() => setSidebarOpen(true)}
            sx={{
              position: "absolute",
              left: 0,
              top: 120,
              zIndex: 1200,
              width: 20,
              height: 48,
              borderRadius: "0 8px 8px 0",
              border: 1,
              borderLeft: 0,
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <HeaderBar searchRef={searchRef} sidebarOpen={sidebarOpen} />
        <Box component="main" sx={{ flex: 1, overflow: "auto", p: 2.5 }}>
          <Outlet />
        </Box>
        <MarqueeTicker />
      </Box>
    </Box>
  );
}
