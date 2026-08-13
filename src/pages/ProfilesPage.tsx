import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { profiles, type ProfileItem } from "../data/mock";

function ProfileCard({
  profile,
  selected,
  onSelect,
}: {
  profile: ProfileItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const usedText =
    profile.total === "-"
      ? "-"
      : `${profile.flowDown} / ${profile.total}`;
  const percent =
    profile.total === "-"
      ? 0
      : Math.min(
          100,
          (parseFloat(profile.flowDown) / parseFloat(profile.total)) * 100
        );

  return (
    <Card
      variant="outlined"
      onClick={onSelect}
      sx={{
        cursor: "pointer",
        height: "100%",
        transition: "all 0.2s",
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 1px var(--mui-palette-primary-main)" : "none",
        "&:hover": { borderColor: "primary.light" },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            mb: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: 15 }}
              noWrap
            >
              {profile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {profile.desc}
            </Typography>
          </Box>
          {selected && (
            <Chip label="使用中" size="small" color="primary" />
          )}
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mb: 1,
          }}
        >
          {profile.url}
        </Typography>

        <Box sx={{ mb: 0.5, display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            流量用量
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {usedText}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
        />

        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              上行 / 下行
            </Typography>
            <Typography variant="caption">
              {profile.flowUp} / {profile.flowDown}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              到期时间
            </Typography>
            <Typography variant="caption">{profile.expire}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              更新时间
            </Typography>
            <Typography variant="caption">{profile.updated}</Typography>
          </Box>
        </Stack>

        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            sx={{ flex: 1 }}
          >
            更新
          </Button>
          <IconButton size="small" color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="primary">
            <CloudDownloadIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ProfilesPage() {
  const [selectedUid, setSelectedUid] = useState(
    profiles.find((p) => p.selected)?.uid ?? profiles[0].uid
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          订阅
        </Typography>
        <Chip label={`${profiles.length} 个配置`} size="small" />
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" size="small" startIcon={<AddIcon />}>
          导入订阅
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
        }}
      >
        {profiles.map((p) => (
          <ProfileCard
            key={p.uid}
            profile={p}
            selected={p.uid === selectedUid}
            onSelect={() => setSelectedUid(p.uid)}
          />
        ))}
      </Box>
    </Box>
  );
}
