import { CalendarPost, Platform, ContentType, ContentStatus } from "@/types/calendar";

function makePost(
  id: string,
  title: string,
  caption: string,
  platform: Platform,
  type: ContentType,
  status: ContentStatus,
  date: string,
  time: string,
  coverHue: number
): CalendarPost {
  return { id, title, caption, platform, type, status, date, time, coverHue };
}

export const SEED_POSTS: CalendarPost[] = [
  // ── March 2026 — Published ────────────────────────────────────────────────
  makePost("p1",  "F&B Case Study Reel",          "How a KL F&B owner saved 3 hrs/day with WhatsApp AI 🍜",       "instagram", "reel",     "published", "2026-03-01", "09:00", 140),
  makePost("p2",  "5 Signs You Need AI Agent",     "5 signs your business NEEDS a WhatsApp AI Agent right now 🚨", "instagram", "carousel", "published", "2026-03-03", "10:00", 100),
  makePost("p3",  "Chatbot vs AI Agent",           "The difference between a chatbot and an AI Agent — why it matters for your business.", "instagram", "reel", "published", "2026-03-05", "08:00", 60),
  makePost("p4",  "WhatsApp AI Scripts",           "3 WhatsApp AI reply scripts every Malaysian SME should use 📋", "instagram", "carousel", "published", "2026-03-07", "10:00", 200),
  makePost("p5",  "Real Estate AI Demo",           "How property agents in KL never miss a lead after 9pm — live demo 🏘️", "instagram", "reel", "published", "2026-03-10", "08:00", 30),
  makePost("p6",  "Flogen AI LinkedIn Drop",       "We reduced customer support workload by 70% for a Malaysian e-commerce brand in 30 days.", "linkedin", "article", "published", "2026-03-10", "09:00", 220),
  makePost("p7",  "Clinic AI Workflow",            "How a KL aesthetic clinic handles 200+ patient enquiries with 0 staff 🏥", "instagram", "carousel", "published", "2026-03-12", "10:00", 340),
  makePost("p8",  "Pain Point: Slow Replies",      "Every hour you delay a WhatsApp reply = a lost sale. Here's the fix.", "instagram", "reel", "published", "2026-03-14", "09:00", 90),
  makePost("p9",  "Salon AI Success Story",        "From drowning in DMs to fully automated: A Malaysian hair salon's story 💇", "instagram", "carousel", "published", "2026-03-17", "10:00", 130),
  makePost("p10", "Xiaohongshu: AI Intro",         "介绍 Flogen AI — 马来西亚中小企业的 WhatsApp AI 助理 🤖",         "xiaohongshu", "post",  "published", "2026-03-17", "11:00", 165),
  makePost("p11", "Behind Flogen AI Story",        "Why we started Flogen AI — founder story 🇲🇾",                  "instagram", "reel",     "published", "2026-03-19", "09:00", 280),
  makePost("p12", "AI Response Time Stats",        "Businesses using AI agents respond 10x faster. The numbers don't lie 📊", "instagram", "post", "published", "2026-03-20", "10:00", 55),
  makePost("p13", "Flogen LinkedIn Thought Lead",  "Why Malaysian SMEs are finally ready for AI automation — and what to do next.", "linkedin", "article", "published", "2026-03-21", "09:00", 215),

  // ── Today area (Mar 23) ──────────────────────────────────────────────────────
  makePost("p14", "E-Commerce AI Lead Gen",        "How a Malaysian e-commerce store captured 300 leads while the owner slept 🛍️", "instagram", "carousel", "scheduled", "2026-03-23", "10:00", 100),
  makePost("p15", "XHS: SME Pain Points",          "中小企业最大痛点：回复太慢、失去客户。Flogen AI 帮你解决 💬",    "xiaohongshu", "post",  "scheduled", "2026-03-23", "11:00", 60),

  // ── Upcoming ─────────────────────────────────────────────────────────────────
  makePost("p16", "WhatsApp AI ROI Breakdown",     "The ROI of a WhatsApp AI Agent for Malaysian SMEs — real numbers 💰", "instagram", "carousel", "scheduled", "2026-03-25", "10:00", 200),
  makePost("p17", "Hotel Industry Spotlight",      "How boutique hotels in KL handle booking enquiries 24/7 with AI 🏨",  "instagram", "reel",     "scheduled", "2026-03-25", "08:00", 320),
  makePost("p18", "Flogen AI Product Demo",        "Full walkthrough: how Flogen AI works for your WhatsApp business 📱", "instagram", "reel",     "scheduled", "2026-03-27", "09:00", 140),
  makePost("p19", "LinkedIn: AI Adoption MY",      "AI adoption in Malaysia is accelerating. Here's what SMEs need to know.", "linkedin", "article", "scheduled", "2026-03-27", "09:00", 220),
  makePost("p20", "XHS: Flogen Demo Video",        "Flogen AI 真实演示 — 看看 WhatsApp AI 如何帮助马来西亚中小企业 🎬", "xiaohongshu", "post", "scheduled", "2026-03-28", "11:00", 165),
  makePost("p21", "Beauty Industry Spotlight",     "A Malaysian beauty brand 3x their consultation bookings using WhatsApp AI 💄", "instagram", "carousel", "scheduled", "2026-03-29", "10:00", 300),
  makePost("p22", "March Wrap — Stats",            "March content recap: what worked, what didn't, the numbers 📈",        "instagram", "post",     "scheduled", "2026-03-31", "09:00", 195),

  // ── Drafts — April ───────────────────────────────────────────────────────────
  makePost("p23", "April AI Trends Thread",        "5 AI trends Malaysian businesses must watch in Q2 2026 🔥",           "instagram", "carousel", "draft",     "2026-04-02", "10:00", 60),
  makePost("p24", "Retail AI Spotlight",           "How a KL fashion retail store used AI to recover abandoned carts 🛒",  "instagram", "reel",     "draft",     "2026-04-05", "09:00", 30),
  makePost("p25", "LinkedIn: Flogen Case Studies", "3 case studies: how Malaysian SMEs transformed with WhatsApp AI.",    "linkedin",  "article",  "scheduled", "2026-04-07", "09:00", 215),
  makePost("p26", "XHS: April Campaign",           "四月特辑：Flogen AI 如何帮助不同行业的马来西亚企业 🏆",              "xiaohongshu","post",   "draft",     "2026-04-10", "11:00", 175),
];
