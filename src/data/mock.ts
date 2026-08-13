export interface ProxyNode {
  name: string;
  type: string;
  delay: number | null;
}

export interface ProxyGroup {
  name: string;
  type: "Selector" | "URLTest" | "Fallback" | "LoadBalance";
  now: string;
  nodes: ProxyNode[];
}

export interface ProfileItem {
  uid: string;
  name: string;
  desc: string;
  url: string;
  updated: string;
  flowUp: string;
  flowDown: string;
  total: string;
  expire: string;
  selected: boolean;
}

export interface ConnectionItem {
  id: string;
  host: string;
  network: "TCP" | "UDP";
  type: string;
  chains: string;
  rule: string;
  process: string;
  dl: string;
  ul: string;
  dlSpeed: string;
  ulSpeed: string;
  source: string;
  destination: string;
  time: string;
}

export interface RuleItem {
  type: string;
  payload: string;
  proxy: string;
}

export interface LogItem {
  time: string;
  type: "info" | "warning" | "error" | "debug";
  payload: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning";
}

export interface TickerItem {
  label: string;
  value: string;
  up: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

/* 导航项主数据：id -> {label, path, icon}；供侧边栏与自定义导航配置使用 */
export const NAV_META: Record<string, NavItem> = {
  overview: { label: "总览", path: "/overview", icon: "Dashboard" },
  proxies: { label: "网络", path: "/proxies", icon: "SwapHoriz" },
  logs: { label: "日志", path: "/logs", icon: "Subject" },
  settings: { label: "设置", path: "/settings", icon: "Settings" },
};

export const NAV_ORDER_DEFAULT = [
  "overview",
  "proxies",
  "logs",

  "connections",
];

/* 兼容旧引用 */
export const navItems: NavItem[] = NAV_ORDER_DEFAULT.map((id) => NAV_META[id]);
export const allNavItems: NavItem[] = [
  ...navItems,
  NAV_META.settings,
];

export const notifications: NotificationItem[] = [
  {
    id: "1",
    title: "欢迎使用",
    body: "已切换至 超级内核 1.18.0，享受稳定体验。",
    time: "今天 23:59",
    read: true,
    type: "info",
  },
];

export const tickerItems: TickerItem[] = [
  { label: "🇭🇰 香港01", value: "86ms", up: true },
  { label: "🇯🇵 日本01", value: "98ms", up: false },
  { label: "🇹🇼 台湾01", value: "156ms", up: true },
  { label: "🇸🇬 新加坡01", value: "175ms", up: false },
  { label: "🇺🇸 美国01", value: "320ms", up: true },
  { label: "↑ 上行", value: "128 KB/s", up: true },
  { label: "↓ 下行", value: "2.10 MB/s", up: false },
  { label: "活跃连接", value: "6", up: true },
  { label: "CPU", value: "3.2%", up: false },
  { label: "内存", value: "86 MB", up: true },
  { label: "运行时长", value: "02:15:30", up: true },
];

export const proxyGroups: ProxyGroup[] = [
  {
    name: "GLOBAL",
    type: "Selector",
    now: "🚀 节点选择",
    nodes: [
      { name: "🚀 节点选择", type: "Selector", delay: null },
      { name: "♻️ 自动选择", type: "URLTest", delay: null },
      { name: "🔮 负载均衡", type: "LoadBalance", delay: null },
      { name: "🐟 漏网之鱼", type: "Selector", delay: null },
    ],
  },
  {
    name: "🚀 节点选择",
    type: "Selector",
    now: "🇭🇰 香港 01",
    nodes: [
      { name: "🇭🇰 香港 01", type: "Vmess", delay: 86 },
      { name: "🇭🇰 香港 02", type: "Vmess", delay: 124 },
      { name: "🇹🇼 台湾 01", type: "Trojan", delay: 156 },
      { name: "🇯🇵 日本 01", type: "Vmess", delay: 98 },
      { name: "🇯🇵 日本 02", type: "Shadowsocks", delay: 210 },
      { name: "🇸🇬 新加坡 01", type: "Vmess", delay: 175 },
      { name: "🇺🇸 美国 01", type: "Trojan", delay: 320 },
      { name: "🇺🇸 美国 02", type: "Shadowsocks", delay: null },
    ],
  },
  {
    name: "♻️ 自动选择",
    type: "URLTest",
    now: "🇭🇰 香港 01",
    nodes: [
      { name: "🇭🇰 香港 01", type: "Vmess", delay: 86 },
      { name: "🇭🇰 香港 02", type: "Vmess", delay: 124 },
      { name: "🇯🇵 日本 01", type: "Vmess", delay: 98 },
      { name: "🇸🇬 新加坡 01", type: "Vmess", delay: 175 },
    ],
  },
  {
    name: "🎥 Netflix",
    type: "Selector",
    now: "🚀 节点选择",
    nodes: [
      { name: "🚀 节点选择", type: "Selector", delay: null },
      { name: "🇭🇰 香港 01", type: "Vmess", delay: 86 },
      { name: "🇯🇵 日本 01", type: "Vmess", delay: 98 },
      { name: "🇺🇸 美国 01", type: "Trojan", delay: 320 },
    ],
  },
  {
    name: "🐟 漏网之鱼",
    type: "Selector",
    now: "DIRECT",
    nodes: [
      { name: "DIRECT", type: "Direct", delay: 0 },
      { name: "REJECT", type: "Reject", delay: null },
      { name: "🚀 节点选择", type: "Selector", delay: null },
    ],
  },
];

export const profiles: ProfileItem[] = [
  {
    uid: "p1",
    name: "机场订阅 A",
    desc: "高质量节点 · 8 个地区",
    url: "https://example.com/sub/a",
    updated: "2026-08-13 09:12",
    flowUp: "2.4 GB",
    flowDown: "38.6 GB",
    total: "100 GB",
    expire: "2026-12-31",
    selected: true,
  },
  {
    uid: "p2",
    name: "机场订阅 B",
    desc: "大流量套餐 · 全球节点",
    url: "https://example.com/sub/b",
    updated: "2026-08-12 18:40",
    flowUp: "0.8 GB",
    flowDown: "12.1 GB",
    total: "200 GB",
    expire: "2027-03-15",
    selected: false,
  },
  {
    uid: "p3",
    name: "本地配置",
    desc: "自定义规则脚本",
    url: "local://config.yaml",
    updated: "2026-08-10 21:05",
    flowUp: "-",
    flowDown: "-",
    total: "-",
    expire: "永久",
    selected: false,
  },
];

export const connections: ConnectionItem[] = [
  {
    id: "c1",
    host: "www.google.com",
    network: "TCP",
    type: "HTTPS",
    chains: "🚀 节点选择 -> 🇭🇰 香港 01",
    rule: "Match",
    process: "Chrome Helper",
    dl: "1.2 MB",
    ul: "186 KB",
    dlSpeed: "256.4 KB/s",
    ulSpeed: "12.8 KB/s",
    source: "192.168.1.5:54821",
    destination: "142.250.80.46:443",
    time: "00:12",
  },
  {
    id: "c2",
    host: "api.github.com",
    network: "TCP",
    type: "HTTPS",
    chains: "🚀 节点选择 -> 🇯🇵 日本 01",
    rule: "RuleSet",
    process: "Code",
    dl: "860 KB",
    ul: "42 KB",
    dlSpeed: "98.2 KB/s",
    ulSpeed: "4.1 KB/s",
    source: "192.168.1.5:54830",
    destination: "140.82.121.6:443",
    time: "00:34",
  },
  {
    id: "c3",
    host: "googleads.g.doubleclick.net",
    network: "TCP",
    type: "HTTPS",
    chains: "REJECT",
    rule: "RuleSet",
    process: "Chrome Helper",
    dl: "0 B",
    ul: "0 B",
    dlSpeed: "0 B/s",
    ulSpeed: "0 B/s",
    source: "192.168.1.5:54855",
    destination: "142.250.80.46:443",
    time: "00:02",
  },
  {
    id: "c4",
    host: "dns.alidns.com",
    network: "UDP",
    type: "DNS",
    chains: "DIRECT",
    rule: "DIRECT",
    process: "clash-verge",
    dl: "12 KB",
    ul: "2 KB",
    dlSpeed: "1.2 KB/s",
    ulSpeed: "0.2 KB/s",
    source: "192.168.1.5:53",
    destination: "223.5.5.5:53",
    time: "01:08",
  },
  {
    id: "c5",
    host: "www.youtube.com",
    network: "TCP",
    type: "HTTPS",
    chains: "🎥 Netflix -> 🇯🇵 日本 01",
    rule: "RuleSet",
    process: "Chrome Helper",
    dl: "24.8 MB",
    ul: "320 KB",
    dlSpeed: "2.1 MB/s",
    ulSpeed: "18.6 KB/s",
    source: "192.168.1.5:54870",
    destination: "142.250.80.46:443",
    time: "02:15",
  },
  {
    id: "c6",
    host: "cdn.openai.com",
    network: "TCP",
    type: "HTTPS",
    chains: "🚀 节点选择 -> 🇺🇸 美国 01",
    rule: "RuleSet",
    process: "Chrome Helper",
    dl: "4.6 MB",
    ul: "88 KB",
    dlSpeed: "540 KB/s",
    ulSpeed: "6.4 KB/s",
    source: "192.168.1.5:54890",
    destination: "104.18.6.192:443",
    time: "00:48",
  },
];

export const rules: RuleItem[] = [
  { type: "DOMAIN-SUFFIX", payload: "google.com", proxy: "🚀 节点选择" },
  { type: "DOMAIN-SUFFIX", payload: "github.com", proxy: "🚀 节点选择" },
  { type: "DOMAIN-SUFFIX", payload: "youtube.com", proxy: "🎥 Netflix" },
  { type: "DOMAIN-SUFFIX", payload: "netflix.com", proxy: "🎥 Netflix" },
  { type: "DOMAIN-SUFFIX", payload: "openai.com", proxy: "🚀 节点选择" },
  { type: "DOMAIN-KEYWORD", payload: "google", proxy: "🚀 节点选择" },
  { type: "DOMAIN-KEYWORD", payload: "facebook", proxy: "🚀 节点选择" },
  { type: "GEOSITE", payload: "cn", proxy: "DIRECT" },
  { type: "GEOSITE", payload: "google", proxy: "🚀 节点选择" },
  { type: "GEOIP", payload: "CN", proxy: "DIRECT" },
  { type: "RULE-SET", payload: "ruleset/reject", proxy: "REJECT" },
  { type: "RULE-SET", payload: "ruleset/proxy", proxy: "🚀 节点选择" },
  { type: "MATCH", payload: "", proxy: "🐟 漏网之鱼" },
];

export const logs: LogItem[] = [
  { time: "09:12:01", type: "info", payload: "Start initial compatible provider test" },
  { time: "09:12:02", type: "info", payload: "Match ruleset/reject -> REJECT" },
  { time: "09:12:03", type: "info", payload: "[TCP] dns.alidns.com -> DIRECT" },
  { time: "09:12:04", type: "debug", payload: "dns resolve www.google.com to 142.250.80.46" },
  { time: "09:12:05", type: "info", payload: "[TCP] www.google.com:443 match RuleSet(Google) -> 🚀 节点选择" },
  { time: "09:12:06", type: "info", payload: "[TCP] www.youtube.com:443 match RuleSet(YouTube) -> 🎥 Netflix" },
  { time: "09:12:07", type: "warning", payload: "🇺🇸 美国 02 timeout, fallback to next node" },
  { time: "09:12:08", type: "info", payload: "[UDP] dns.alidns.com:53 -> DIRECT" },
  { time: "09:12:09", type: "info", payload: "Match ruleset/proxy -> 🚀 节点选择" },
  { time: "09:12:10", type: "error", payload: "connection reset by peer: 104.18.6.192:443" },
  { time: "09:12:11", type: "info", payload: "[TCP] api.github.com:443 match RuleSet(GitHub) -> 🚀 节点选择" },
  { time: "09:12:12", type: "info", payload: "rule Match -> 🐟 漏网之鱼" },
  { time: "09:12:13", type: "info", payload: "[TCP] cdn.openai.com:443 match RuleSet(OpenAI) -> 🚀 节点选择" },
  { time: "09:12:14", type: "debug", payload: "healthcheck ok: 🇭🇰 香港 01 86ms" },
  { time: "09:12:15", type: "info", payload: "[TCP] googleads.g.doubleclick.net:443 -> REJECT" },
];
