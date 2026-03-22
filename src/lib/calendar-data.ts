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
  // ── March 2026 ──────────────────────────────────────────────────────────────
  makePost("p1",  "Morning Routine Reel",          "5am wake up, journaling, movement…",        "instagram", "reel",     "published", "2026-03-01", "08:00", 200),
  makePost("p2",  "Weekly Vlog #12",               "A full week behind the scenes…",             "youtube",   "video",    "published", "2026-03-01", "16:00", 0),
  makePost("p3",  "Productivity Tips Thread",      "5 things I stopped doing to get more done…","twitter",   "tweet",    "published", "2026-03-03", "10:00", 210),
  makePost("p4",  "Behind The Shoot – Carousel",   "Swipe to see setup → final shot…",          "instagram", "carousel", "published", "2026-03-05", "11:00", 260),
  makePost("p5",  "LinkedIn Thought Leadership",   "Why content strategy beats hustle…",        "linkedin",  "article",  "published", "2026-03-05", "09:00", 220),
  makePost("p6",  "TikTok POV Trend",              "POV: you finally have a content system",    "tiktok",    "short",    "published", "2026-03-07", "18:00", 170),
  makePost("p7",  "Tools I Use Daily",             "3 tools every creator needs in 2026…",      "instagram", "reel",     "published", "2026-03-10", "09:00", 30),
  makePost("p8",  "Deep-Dive: Branding Guide",     "Everything I know about personal brand…",   "youtube",   "video",    "published", "2026-03-10", "14:00", 350),
  makePost("p9",  "Story Poll: Reels vs Feed",     "Which do you prefer?",                      "instagram", "story",    "published", "2026-03-12", "12:00", 340),
  makePost("p10", "Facebook Community Update",     "Here's what's coming this month…",          "facebook",  "post",     "published", "2026-03-12", "10:00", 240),
  makePost("p11", "Workspace Flatlay",             "Spring reset ✨",                            "instagram", "post",     "published", "2026-03-14", "11:00", 90),
  makePost("p12", "Creator Economy Thread",        "The creator economy is changing — here's why","twitter", "tweet",    "published", "2026-03-15", "09:30", 195),
  makePost("p13", "Content Repurposing System",    "How I turn 1 video into 10 posts…",         "linkedin",  "article",  "published", "2026-03-17", "09:00", 130),
  makePost("p14", "TikTok Day-in-the-Life",        "Studio + shoot day vlog",                   "tiktok",    "short",    "published", "2026-03-17", "19:00", 165),
  makePost("p15", "YouTube Q&A – March",           "Answering your top questions…",             "youtube",   "video",    "published", "2026-03-19", "15:00", 5),
  makePost("p16", "Instagram Aesthetic Grid",      "New grid theme dropping soon 🎨",            "instagram", "post",     "published", "2026-03-20", "11:00", 55),
  makePost("p17", "Podcast Clip – Ep 8",           "The one mindset shift that changed everything","instagram","reel",   "published", "2026-03-21", "10:00", 280),

  // ── Today area (Mar 22) ──────────────────────────────────────────────────────
  makePost("p18", "Spring Content Ideas",          "Fresh ideas for Q2 planning…",              "instagram", "carousel", "scheduled", "2026-03-22", "10:00", 90),
  makePost("p19", "Weekly LinkedIn Roundup",       "Top 3 insights from this week…",            "linkedin",  "article",  "scheduled", "2026-03-22", "09:00", 210),

  // ── Upcoming ─────────────────────────────────────────────────────────────────
  makePost("p20", "BTS of Q2 Strategy",            "Planning session walkthrough",               "youtube",   "video",    "scheduled", "2026-03-24", "15:00", 350),
  makePost("p21", "Engagement Hack Reel",          "This doubled my reach in 2 weeks…",         "instagram", "reel",     "scheduled", "2026-03-24", "08:00", 320),
  makePost("p22", "TikTok Trending Audio",         "Jumping on this sound 🔥",                   "tiktok",    "short",    "scheduled", "2026-03-25", "17:00", 185),
  makePost("p23", "Twitter AMA Announcement",      "Dropping into your replies this Thursday…", "twitter",   "tweet",    "scheduled", "2026-03-25", "10:00", 200),
  makePost("p24", "Workspace Tour – Spring Edition","Full desk setup refresh reveal",            "instagram", "reel",     "scheduled", "2026-03-26", "11:00", 40),
  makePost("p25", "Facebook Group Live",           "Monthly live Q&A session",                  "facebook",  "post",     "scheduled", "2026-03-26", "18:00", 245),
  makePost("p26", "LinkedIn Newsletter #4",        "What I learned from 100 days of posting",   "linkedin",  "article",  "scheduled", "2026-03-28", "08:00", 215),
  makePost("p27", "Instagram Story Series Pt.1",   "Behind the brand — Part 1",                 "instagram", "story",    "scheduled", "2026-03-28", "12:00", 270),
  makePost("p28", "YouTube Shorts – Tips",         "30 second content tip",                     "youtube",   "short",    "scheduled", "2026-03-29", "10:00", 10),
  makePost("p29", "Month Wrap-Up Thread",          "March recap — wins, lessons, numbers",      "twitter",   "tweet",    "scheduled", "2026-03-31", "09:00", 195),
  makePost("p30", "TikTok Month Review",           "March content stats breakdown",             "tiktok",    "short",    "scheduled", "2026-03-31", "20:00", 170),

  // ── Drafts scattered across April ───────────────────────────────────────────
  makePost("p31", "April Launch Teaser",           "Something big is coming…",                  "instagram", "reel",     "draft",     "2026-04-02", "10:00", 300),
  makePost("p32", "Q2 Goals Video",                "My content goals for April–June",           "youtube",   "video",    "draft",     "2026-04-05", "15:00", 20),
  makePost("p33", "LinkedIn Growth Breakdown",     "How I grew 2k followers in 30 days",       "linkedin",  "article",  "scheduled", "2026-04-07", "09:00", 215),
  makePost("p34", "TikTok Collab Post",            "Collab with @creator coming soon",          "tiktok",    "short",    "draft",     "2026-04-10", "18:00", 175),
];
