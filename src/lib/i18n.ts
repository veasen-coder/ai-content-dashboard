// ─────────────────────────────────────────────────────────────────────────────
// i18n — lightweight translation system for EN / BM / ZH
// Reads language from flogen_workspace_settings in localStorage
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useEffect, useCallback } from "react";

export type Lang = "en" | "bm" | "zh";

// Flat key → value translations
const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // ── Sidebar ──
    "nav.projects":       "Flogen AI",
    "nav.assistant":      "AI Assistant",
    "nav.studio":         "Content Studio",
    "nav.analytics":      "Analytics",
    "nav.calendar":       "Content Calendar",
    "nav.competitors":    "Competitor Intel",
    "nav.news":           "News & Inspiration",
    "nav.settings":       "Settings",
    "nav.subtitle":       "Content OS",

    // ── Common buttons ──
    "btn.save":           "Save changes",
    "btn.saved":          "Saved!",
    "btn.add":            "Add",
    "btn.cancel":         "Cancel",
    "btn.delete":         "Delete",
    "btn.edit":           "Edit",
    "btn.close":          "Close",
    "btn.confirm":        "Confirm",
    "btn.runNow":         "Run Now",
    "btn.pause":          "Pause",
    "btn.resume":         "Resume",
    "btn.export":         "Export",
    "btn.clear":          "Clear",
    "btn.generate":       "Generate",
    "btn.refresh":        "Refresh",

    // ── Post statuses ──
    "status.draft":       "Draft",
    "status.approved":    "Approved",
    "status.scheduled":   "Scheduled",
    "status.posted":      "Posted",
    "status.active":      "Active",
    "status.paused":      "Paused",
    "status.running":     "Running…",

    // ── Operations tabs ──
    "ops.kanban":         "Kanban",
    "ops.pipeline":       "Pipeline",
    "ops.calendar":       "Calendar",
    "ops.agents":         "AI Agents",
    "ops.trends":         "Trends",
    "ops.scripts":        "Scripts Library",

    // ── Kanban ──
    "kanban.today":       "Today",
    "kanban.thisWeek":    "This Week",
    "kanban.backlog":     "Backlog",
    "kanban.done":        "Done",
    "kanban.addTask":     "Add task",
    "kanban.weekReview":  "Week in Review",

    // ── Pipeline ──
    "pipeline.title":     "Pipeline",
    "pipeline.addDeal":   "Add deal",
    "pipeline.prospect":  "Prospect",
    "pipeline.demo":      "Demo",
    "pipeline.proposal":  "Proposal",
    "pipeline.negotiation":"Negotiation",
    "pipeline.closed":    "Closed",
    "pipeline.lost":      "Lost",
    "pipeline.mrr":       "Current MRR",
    "pipeline.mrrGoal":   "MRR Goal",

    // ── Calendar ──
    "cal.title":          "Content Calendar",
    "cal.addPost":        "Add post",
    "cal.pillar":         "Pillar",
    "cal.type":           "Type",
    "cal.platform":       "Platform",
    "cal.weeklyTargets":  "Weekly Pillar Targets",

    // ── Agents ──
    "agents.title":       "Automations",
    "agents.subtitle":    "Intelligent agents that run your content & pipeline on autopilot",
    "agents.active":      "Agents active",
    "agents.totalRuns":   "Total runs",
    "agents.itemsCreated":"Items created",

    // ── Analytics ──
    "analytics.title":    "Analytics",
    "analytics.impressions":"Impressions",
    "analytics.engagement":"Engagement Rate",
    "analytics.followers": "Followers",
    "analytics.reach":    "Reach",
    "analytics.xhs":      "Xiaohongshu Analytics",
    "analytics.exportCsv": "Export CSV",

    // ── Competitors ──
    "comp.title":         "Competitor Intel",
    "comp.addCompetitor": "Add competitor",
    "comp.followers":     "Followers",
    "comp.engRate":       "Engagement Rate",
    "comp.postsWeek":     "Posts/Week",
    "comp.growth":        "Growth",
    "comp.lastPost":      "Last Post",
    "comp.gapAnalysis":   "Content Gap Analysis",

    // ── Settings sections ──
    "settings.title":     "Settings",
    "settings.subtitle":  "Workspace configuration · AI behaviour · Integrations",
    "settings.profile":   "Workspace Profile",
    "settings.ai":        "AI Behaviour",
    "settings.integrations":"Integrations",
    "settings.notifications":"Notifications",
    "settings.data":      "Data & Privacy",

    // ── Settings fields ──
    "settings.businessName":"Business name",
    "settings.tagline":    "Tagline",
    "settings.logo":       "Logo",
    "settings.industry":   "Industry",
    "settings.language":   "Primary language",
    "settings.whatsapp":   "WhatsApp number",
    "settings.igHandle":   "Instagram handle",
    "settings.xhsHandle":  "XHS handle",
    "settings.brandVoice":  "Brand voice",
    "settings.defaultCta":  "Default CTA text",
    "settings.postingRules":"Posting rules",
    "settings.claudeModel": "Claude model",
    "settings.apiKey":      "Anthropic API key",
    "settings.morningBriefing":"Morning briefing time",
    "settings.stalledAlert": "Stalled deal alert (days)",
    "settings.weeklyReport": "Weekly report email",
    "settings.exportJson":   "Export as JSON",
    "settings.exportCsv":    "Export as CSV",
    "settings.resetDashboard":"Reset dashboard",
    "settings.deleteAccount": "Delete account",
    "settings.lsKeys":       "localStorage keys",
    "settings.autoSaved":    "Auto-saved",

    // ── News ──
    "news.title":          "News & Inspiration",

    // ── Misc ──
    "misc.search":         "Search",
    "misc.noResults":      "No results",
    "misc.loading":        "Loading…",
    "misc.lastRefreshed":  "Last refreshed",
  },

  bm: {
    // ── Sidebar ──
    "nav.projects":       "Flogen AI",
    "nav.assistant":      "Pembantu AI",
    "nav.studio":         "Studio Kandungan",
    "nav.analytics":      "Analitik",
    "nav.calendar":       "Kalendar Kandungan",
    "nav.competitors":    "Risikan Pesaing",
    "nav.news":           "Berita & Inspirasi",
    "nav.settings":       "Tetapan",
    "nav.subtitle":       "OS Kandungan",

    // ── Common buttons ──
    "btn.save":           "Simpan perubahan",
    "btn.saved":          "Disimpan!",
    "btn.add":            "Tambah",
    "btn.cancel":         "Batal",
    "btn.delete":         "Padam",
    "btn.edit":           "Sunting",
    "btn.close":          "Tutup",
    "btn.confirm":        "Sahkan",
    "btn.runNow":         "Jalankan",
    "btn.pause":          "Jeda",
    "btn.resume":         "Sambung",
    "btn.export":         "Eksport",
    "btn.clear":          "Kosongkan",
    "btn.generate":       "Jana",
    "btn.refresh":        "Muat semula",

    // ── Post statuses ──
    "status.draft":       "Draf",
    "status.approved":    "Diluluskan",
    "status.scheduled":   "Dijadualkan",
    "status.posted":      "Diterbitkan",
    "status.active":      "Aktif",
    "status.paused":      "Dijeda",
    "status.running":     "Berjalan…",

    // ── Operations tabs ──
    "ops.kanban":         "Kanban",
    "ops.pipeline":       "Saluran Jualan",
    "ops.calendar":       "Kalendar",
    "ops.agents":         "Agen AI",
    "ops.trends":         "Tren",
    "ops.scripts":        "Pustaka Skrip",

    // ── Kanban ──
    "kanban.today":       "Hari Ini",
    "kanban.thisWeek":    "Minggu Ini",
    "kanban.backlog":     "Senarai Tunggu",
    "kanban.done":        "Siap",
    "kanban.addTask":     "Tambah tugas",
    "kanban.weekReview":  "Ulasan Minggu",

    // ── Pipeline ──
    "pipeline.title":     "Saluran Jualan",
    "pipeline.addDeal":   "Tambah urus niaga",
    "pipeline.prospect":  "Prospek",
    "pipeline.demo":      "Demo",
    "pipeline.proposal":  "Cadangan",
    "pipeline.negotiation":"Rundingan",
    "pipeline.closed":    "Ditutup",
    "pipeline.lost":      "Hilang",
    "pipeline.mrr":       "MRR Semasa",
    "pipeline.mrrGoal":   "Sasaran MRR",

    // ── Calendar ──
    "cal.title":          "Kalendar Kandungan",
    "cal.addPost":        "Tambah hantaran",
    "cal.pillar":         "Tiang",
    "cal.type":           "Jenis",
    "cal.platform":       "Platform",
    "cal.weeklyTargets":  "Sasaran Tiang Mingguan",

    // ── Agents ──
    "agents.title":       "Automasi",
    "agents.subtitle":    "Agen pintar yang menjalankan kandungan & saluran anda secara autopilot",
    "agents.active":      "Agen aktif",
    "agents.totalRuns":   "Jumlah larian",
    "agents.itemsCreated":"Item dicipta",

    // ── Analytics ──
    "analytics.title":    "Analitik",
    "analytics.impressions":"Paparan",
    "analytics.engagement":"Kadar Penglibatan",
    "analytics.followers": "Pengikut",
    "analytics.reach":    "Capaian",
    "analytics.xhs":      "Analitik Xiaohongshu",
    "analytics.exportCsv": "Eksport CSV",

    // ── Competitors ──
    "comp.title":         "Risikan Pesaing",
    "comp.addCompetitor": "Tambah pesaing",
    "comp.followers":     "Pengikut",
    "comp.engRate":       "Kadar Penglibatan",
    "comp.postsWeek":     "Hantaran/Minggu",
    "comp.growth":        "Pertumbuhan",
    "comp.lastPost":      "Hantaran Terakhir",
    "comp.gapAnalysis":   "Analisis Jurang Kandungan",

    // ── Settings sections ──
    "settings.title":     "Tetapan",
    "settings.subtitle":  "Konfigurasi ruang kerja · Kelakuan AI · Integrasi",
    "settings.profile":   "Profil Ruang Kerja",
    "settings.ai":        "Kelakuan AI",
    "settings.integrations":"Integrasi",
    "settings.notifications":"Pemberitahuan",
    "settings.data":      "Data & Privasi",

    // ── Settings fields ──
    "settings.businessName":"Nama perniagaan",
    "settings.tagline":    "Slogan",
    "settings.logo":       "Logo",
    "settings.industry":   "Industri",
    "settings.language":   "Bahasa utama",
    "settings.whatsapp":   "Nombor WhatsApp",
    "settings.igHandle":   "Nama pengguna Instagram",
    "settings.xhsHandle":  "Nama pengguna XHS",
    "settings.brandVoice":  "Suara jenama",
    "settings.defaultCta":  "Teks CTA lalai",
    "settings.postingRules":"Peraturan hantaran",
    "settings.claudeModel": "Model Claude",
    "settings.apiKey":      "Kunci API Anthropic",
    "settings.morningBriefing":"Masa taklimat pagi",
    "settings.stalledAlert": "Amaran tawaran terbiar (hari)",
    "settings.weeklyReport": "E-mel laporan mingguan",
    "settings.exportJson":   "Eksport sebagai JSON",
    "settings.exportCsv":    "Eksport sebagai CSV",
    "settings.resetDashboard":"Set semula papan pemuka",
    "settings.deleteAccount": "Padam akaun",
    "settings.lsKeys":       "Kunci localStorage",
    "settings.autoSaved":    "Auto-disimpan",

    // ── News ──
    "news.title":          "Berita & Inspirasi",

    // ── Misc ──
    "misc.search":         "Cari",
    "misc.noResults":      "Tiada hasil",
    "misc.loading":        "Memuatkan…",
    "misc.lastRefreshed":  "Kemas kini terakhir",
  },

  zh: {
    // ── Sidebar ──
    "nav.projects":       "Flogen AI",
    "nav.assistant":      "AI 助手",
    "nav.studio":         "内容工作室",
    "nav.analytics":      "数据分析",
    "nav.calendar":       "内容日历",
    "nav.competitors":    "竞争情报",
    "nav.news":           "新闻与灵感",
    "nav.settings":       "设置",
    "nav.subtitle":       "内容操作系统",

    // ── Common buttons ──
    "btn.save":           "保存更改",
    "btn.saved":          "已保存！",
    "btn.add":            "添加",
    "btn.cancel":         "取消",
    "btn.delete":         "删除",
    "btn.edit":           "编辑",
    "btn.close":          "关闭",
    "btn.confirm":        "确认",
    "btn.runNow":         "立即运行",
    "btn.pause":          "暂停",
    "btn.resume":         "恢复",
    "btn.export":         "导出",
    "btn.clear":          "清除",
    "btn.generate":       "生成",
    "btn.refresh":        "刷新",

    // ── Post statuses ──
    "status.draft":       "草稿",
    "status.approved":    "已批准",
    "status.scheduled":   "已排期",
    "status.posted":      "已发布",
    "status.active":      "运行中",
    "status.paused":      "已暂停",
    "status.running":     "运行中…",

    // ── Operations tabs ──
    "ops.kanban":         "看板",
    "ops.pipeline":       "销售管道",
    "ops.calendar":       "日历",
    "ops.agents":         "AI 代理",
    "ops.trends":         "趋势",
    "ops.scripts":        "脚本库",

    // ── Kanban ──
    "kanban.today":       "今天",
    "kanban.thisWeek":    "本周",
    "kanban.backlog":     "待办",
    "kanban.done":        "完成",
    "kanban.addTask":     "添加任务",
    "kanban.weekReview":  "本周回顾",

    // ── Pipeline ──
    "pipeline.title":     "销售管道",
    "pipeline.addDeal":   "添加交易",
    "pipeline.prospect":  "潜在客户",
    "pipeline.demo":      "演示",
    "pipeline.proposal":  "方案",
    "pipeline.negotiation":"谈判中",
    "pipeline.closed":    "已成交",
    "pipeline.lost":      "已失去",
    "pipeline.mrr":       "当前 MRR",
    "pipeline.mrrGoal":   "MRR 目标",

    // ── Calendar ──
    "cal.title":          "内容日历",
    "cal.addPost":        "添加帖子",
    "cal.pillar":         "内容支柱",
    "cal.type":           "类型",
    "cal.platform":       "平台",
    "cal.weeklyTargets":  "每周支柱目标",

    // ── Agents ──
    "agents.title":       "自动化",
    "agents.subtitle":    "智能代理自动运行您的内容和销售管道",
    "agents.active":      "活跃代理",
    "agents.totalRuns":   "总运行次数",
    "agents.itemsCreated":"已创建项目",

    // ── Analytics ──
    "analytics.title":    "数据分析",
    "analytics.impressions":"曝光量",
    "analytics.engagement":"互动率",
    "analytics.followers": "粉丝数",
    "analytics.reach":    "触达量",
    "analytics.xhs":      "小红书分析",
    "analytics.exportCsv": "导出 CSV",

    // ── Competitors ──
    "comp.title":         "竞争情报",
    "comp.addCompetitor": "添加竞争对手",
    "comp.followers":     "粉丝数",
    "comp.engRate":       "互动率",
    "comp.postsWeek":     "帖子/周",
    "comp.growth":        "增长",
    "comp.lastPost":      "最近发布",
    "comp.gapAnalysis":   "内容差距分析",

    // ── Settings sections ──
    "settings.title":     "设置",
    "settings.subtitle":  "工作区配置 · AI 行为 · 集成",
    "settings.profile":   "工作区档案",
    "settings.ai":        "AI 行为",
    "settings.integrations":"集成",
    "settings.notifications":"通知",
    "settings.data":      "数据与隐私",

    // ── Settings fields ──
    "settings.businessName":"企业名称",
    "settings.tagline":    "标语",
    "settings.logo":       "标志",
    "settings.industry":   "行业",
    "settings.language":   "主要语言",
    "settings.whatsapp":   "WhatsApp 号码",
    "settings.igHandle":   "Instagram 账号",
    "settings.xhsHandle":  "小红书账号",
    "settings.brandVoice":  "品牌声音",
    "settings.defaultCta":  "默认 CTA 文案",
    "settings.postingRules":"发布规则",
    "settings.claudeModel": "Claude 模型",
    "settings.apiKey":      "Anthropic API 密钥",
    "settings.morningBriefing":"晨间简报时间",
    "settings.stalledAlert": "停滞交易提醒（天）",
    "settings.weeklyReport": "每周报告邮件",
    "settings.exportJson":   "导出为 JSON",
    "settings.exportCsv":    "导出为 CSV",
    "settings.resetDashboard":"重置仪表板",
    "settings.deleteAccount": "删除账户",
    "settings.lsKeys":       "localStorage 键",
    "settings.autoSaved":    "自动保存",

    // ── News ──
    "news.title":          "新闻与灵感",

    // ── Misc ──
    "misc.search":         "搜索",
    "misc.noResults":      "无结果",
    "misc.loading":        "加载中…",
    "misc.lastRefreshed":  "最后刷新",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useLang
// Returns current language + translation function
// Reads from flogen_workspace_settings in localStorage
// ─────────────────────────────────────────────────────────────────────────────
export function useLang(): { lang: Lang; t: (key: string) => string } {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("flogen_workspace_settings");
      if (raw) {
        const ws = JSON.parse(raw);
        if (ws.language && (ws.language === "en" || ws.language === "bm" || ws.language === "zh")) {
          setLang(ws.language);
        }
      }
    } catch { /* ignore */ }

    // Listen for storage changes (cross-tab or same-tab updates)
    function onStorage(e: StorageEvent) {
      if (e.key === "flogen_workspace_settings" && e.newValue) {
        try {
          const ws = JSON.parse(e.newValue);
          if (ws.language) setLang(ws.language as Lang);
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const t = useCallback(
    (key: string): string => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key,
    [lang],
  );

  return { lang, t };
}

// Helper to get lang synchronously (for non-hook contexts)
export function getLang(): Lang {
  try {
    const raw = localStorage.getItem("flogen_workspace_settings");
    if (raw) {
      const ws = JSON.parse(raw);
      if (ws.language === "bm" || ws.language === "zh") return ws.language;
    }
  } catch { /* ignore */ }
  return "en";
}

export function translate(key: string, lang?: Lang): string {
  const l = lang ?? getLang();
  return TRANSLATIONS[l]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
