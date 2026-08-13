import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { rules } from "../data/mock";

const proxyColor = (
  proxy: string
): "primary" | "success" | "error" | "default" => {
  if (proxy === "DIRECT") return "success";
  if (proxy === "REJECT") return "error";
  if (proxy.includes("节点") || proxy.includes("Netflix")) return "primary";
  return "default";
};

export default function RulesPage() {
  const [keyword, setKeyword] = useState("");

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return rules;
    return rules.filter(
      (r) =>
        r.type.toLowerCase().includes(k) ||
        r.payload.toLowerCase().includes(k) ||
        r.proxy.toLowerCase().includes(k)
    );
  }, [keyword]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          规则
        </Typography>
        <Chip label={`${filtered.length} 条`} size="small" />
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="搜索规则…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          sx={{ width: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 160 }}>类型</TableCell>
              <TableCell>匹配内容</TableCell>
              <TableCell sx={{ width: 160 }}>出站</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={i} hover>
                <TableCell>
                  <Chip label={r.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  {r.payload || (
                    <Typography variant="body2" color="text.secondary">
                      (空)
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={r.proxy}
                    size="small"
                    color={proxyColor(r.proxy)}
                    variant={proxyColor(r.proxy) === "default" ? "outlined" : "filled"}
                  />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">未找到匹配规则</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
