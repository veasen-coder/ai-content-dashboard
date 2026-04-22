// Industry-specific preset data for Demo Mode.
//
// Every demo page reads from these presets so a prospect sees their own
// business reflected — F&B sees "covers / menu questions", a clinic sees
// "appointments / treatments", etc.
//
// Changing the `selectedIndustry` in the demo-mode store instantly swaps
// every piece of content across the demo pages.

export type DemoIndustry = "F&B" | "Clinic" | "Real Estate" | "Salon" | "Retail";

// ─── Shared types ────────────────────────────────────────────
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Demo" | "Closed";

export interface DemoLead {
  name: string;
  phone: string;
  email: string;
  source: string;
  status: LeadStatus;
  value: string;
  notes: string;
  lastContact: string;
  lastContactHours: number;
}

export interface DemoActivity {
  icon: "message" | "calendar" | "file" | "phone" | "check" | "mail";
  text: string;
  detail: string;
  time: string;
  tone: "primary" | "success" | "warning" | "muted";
}

export interface DemoKPI {
  key: string;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: "users" | "check" | "money" | "clock";
}

export interface DemoFunnelStage {
  label: string;
  status: LeadStatus | null;
  count: number;
}

export interface WinStoryNumbers {
  messages_replied: number;
  appointments_booked: number;
  hours_saved: number;
  revenue_made: string;
  revenue_delta_pct: number;
  // Before-AI baselines for the optional "before/after" toggle
  before_messages_replied: number;
  before_appointments_booked: number;
  before_hours_saved: number;
  before_revenue_made: string;
}

export interface WhatsAppConversation {
  id: string;
  customer: string;
  avatar_tone: string; // tailwind bg color class
  messages: {
    from: "customer" | "ai";
    text: string;
    delay_ms: number; // delay before this message shows (simulates typing)
  }[];
}

export interface IndustryPreset {
  industry: DemoIndustry;
  label: string; // UI label ("F&B" → "Restaurant / F&B")
  emoji: string;
  tagline: string;
  business_suffix: string; // added to generated business name if client name is generic
  booking_noun: string; // "booking" / "appointment" / "viewing" / "order"
  booking_noun_plural: string;
  service_noun: string; // "order" / "treatment" / "property" / "service" / "purchase"
  service_types: { label: string; color: string; duration_min: number }[];
  kpis: DemoKPI[];
  leads: DemoLead[];
  activities: DemoActivity[];
  funnel: DemoFunnelStage[];
  win_story: WinStoryNumbers;
  whatsapp_conversations: WhatsAppConversation[];
  scenarios: string[]; // example "AI answers..." bullets
}

// ═════════════════════════════════════════════════════════════
// F&B / RESTAURANT
// ═════════════════════════════════════════════════════════════
const FNB: IndustryPreset = {
  industry: "F&B",
  label: "Restaurant / F&B",
  emoji: "🍜",
  tagline: "AI handles reservations, menu questions & reorders 24/7.",
  business_suffix: "Kitchen",
  booking_noun: "reservation",
  booking_noun_plural: "reservations",
  service_noun: "order",
  service_types: [
    { label: "Dine-in", color: "#F59E0B", duration_min: 90 },
    { label: "Takeaway", color: "#10B981", duration_min: 15 },
    { label: "Delivery", color: "#3B82F6", duration_min: 40 },
    { label: "Large Party", color: "#EC4899", duration_min: 120 },
  ],
  kpis: [
    { key: "messages", label: "Messages Handled", value: "1,284", change: "+38%", trend: "up", icon: "users" },
    { key: "bookings", label: "Reservations Booked", value: "87", change: "+52%", trend: "up", icon: "check" },
    { key: "revenue", label: "Revenue This Week", value: "RM 18,420", change: "+23%", trend: "up", icon: "money" },
    { key: "response", label: "Avg Response Time", value: "8 sec", change: "-96%", trend: "up", icon: "clock" },
  ],
  leads: [
    { name: "Ahmad Rahman", phone: "+60 12-345 6789", email: "ahmad.r@gmail.com", source: "WhatsApp", status: "Qualified", value: "RM 680", notes: "Booking for 12 pax (anniversary dinner). Requested private section.", lastContact: "2 hrs ago", lastContactHours: 2 },
    { name: "Siti Nurhaliza", phone: "+60 19-876 5432", email: "siti.n@outlook.com", source: "Instagram", status: "Contacted", value: "RM 320", notes: "Asked about halal certification + kids menu.", lastContact: "5 hrs ago", lastContactHours: 5 },
    { name: "Raj Kumar", phone: "+60 16-234 5678", email: "raj.kumar@gmail.com", source: "GrabFood", status: "Demo", value: "RM 1,250", notes: "Corporate catering for 40 people Friday. Menu approved.", lastContact: "18 min ago", lastContactHours: 0.3 },
    { name: "Mei Ling Tan", phone: "+60 17-345 9876", email: "meiling@yahoo.com", source: "Google", status: "New", value: "RM 180", notes: "First-time diner via Google search. AI offered welcome promo.", lastContact: "1 day ago", lastContactHours: 24 },
    { name: "Farah Aziz", phone: "+60 11-987 6543", email: "farah.a@gmail.com", source: "Referral", status: "Closed", value: "RM 2,400", notes: "Birthday party of 30 confirmed. Cake pre-ordered.", lastContact: "3 hrs ago", lastContactHours: 3 },
  ],
  activities: [
    { icon: "message", text: "AI replied to Ahmad Rahman on WhatsApp", detail: "AI: \"Table for 12 on Saturday 7pm confirmed! I've reserved the private section. Anniversary cake setup — reply CAKE to add (RM 85).\"", time: "2 min ago", tone: "primary" },
    { icon: "calendar", text: "Reservation booked: Raj Kumar, Fri 12:00pm (40 pax)", detail: "Corporate catering booking confirmed. Menu: set lunch C. Deposit link sent — RM 500.", time: "18 min ago", tone: "success" },
    { icon: "file", text: "Menu PDF auto-sent to Siti Nurhaliza", detail: "Halal cert + kids menu attached. AI followed up with today's chef's special.", time: "1 hr ago", tone: "primary" },
    { icon: "phone", text: "Missed call → AI recovered Mei Ling Tan", detail: "AI-sent WhatsApp: \"Sorry we missed you! Want to book a table or check today's specials?\"", time: "2 hrs ago", tone: "warning" },
    { icon: "check", text: "Birthday party of 30 confirmed — Farah Aziz", detail: "Deposit paid RM 500. Cake ordered. Balloons + custom menu on file.", time: "3 hrs ago", tone: "success" },
    { icon: "mail", text: "Re-engagement sent to 247 past diners", detail: "\"Miss us? Here's RM 15 off your next visit.\" Opened by 89, 23 booked via link.", time: "5 hrs ago", tone: "muted" },
  ],
  funnel: [
    { label: "Enquiries", status: null, count: 512 },
    { label: "Engaged", status: "Contacted", count: 342 },
    { label: "Quoted", status: "Qualified", count: 178 },
    { label: "Booked", status: "Demo", count: 87 },
    { label: "Dined", status: "Closed", count: 62 },
  ],
  win_story: {
    messages_replied: 1284,
    appointments_booked: 87,
    hours_saved: 38,
    revenue_made: "RM 18,420",
    revenue_delta_pct: 23,
    before_messages_replied: 312,
    before_appointments_booked: 44,
    before_hours_saved: 0,
    before_revenue_made: "RM 14,980",
  },
  whatsapp_conversations: [
    {
      id: "fnb-1",
      customer: "Ahmad Rahman",
      avatar_tone: "bg-amber-500/20 text-amber-400",
      messages: [
        { from: "customer", text: "Hi, can I book a table for 12 this Saturday 7pm? It's our anniversary 🎉", delay_ms: 0 },
        { from: "ai", text: "Congrats Ahmad! 🎊 Let me check...", delay_ms: 1200 },
        { from: "ai", text: "Saturday 7pm for 12 pax is available in our private section. Shall I lock it in?", delay_ms: 2400 },
        { from: "customer", text: "Yes! Can we also order a cake?", delay_ms: 4200 },
        { from: "ai", text: "Of course! Chocolate Indulgence (RM 85) or Strawberry Shortcake (RM 95)? I'll add it to the booking.", delay_ms: 5800 },
        { from: "customer", text: "Chocolate please!", delay_ms: 7600 },
        { from: "ai", text: "Done ✅ Table for 12, Saturday 7pm, private section, chocolate cake. Confirmation sent to your email. See you Saturday! 🎂", delay_ms: 9200 },
      ],
    },
    {
      id: "fnb-2",
      customer: "Siti Nurhaliza",
      avatar_tone: "bg-pink-500/20 text-pink-400",
      messages: [
        { from: "customer", text: "Is your restaurant halal? And do you have a kids menu?", delay_ms: 0 },
        { from: "ai", text: "Yes Siti — we're JAKIM halal certified and have a full kids menu (ages 4–12, RM 18 per child, includes drink + dessert).", delay_ms: 1100 },
        { from: "ai", text: "I can send you the menu PDF — want to book a table?", delay_ms: 2600 },
        { from: "customer", text: "Yes please, for 4 adults + 2 kids this Sunday lunch", delay_ms: 4100 },
        { from: "ai", text: "Sunday 12:30pm works. I've noted 2 high-chairs and sent the kids menu PDF to your WhatsApp. Confirmed! 🍽️", delay_ms: 5800 },
      ],
    },
  ],
  scenarios: [
    "Answers menu / halal / allergen questions in seconds",
    "Books reservations + private rooms automatically",
    "Upsells cakes, set menus, add-ons during booking",
    "Recovers missed calls with WhatsApp follow-up",
    "Re-engages past diners with personalized offers",
  ],
};

// ═════════════════════════════════════════════════════════════
// CLINIC / HEALTHCARE
// ═════════════════════════════════════════════════════════════
const CLINIC: IndustryPreset = {
  industry: "Clinic",
  label: "Clinic / Healthcare",
  emoji: "🏥",
  tagline: "AI books appointments, answers treatment questions & reduces no-shows.",
  business_suffix: "Clinic",
  booking_noun: "appointment",
  booking_noun_plural: "appointments",
  service_noun: "treatment",
  service_types: [
    { label: "Consultation", color: "#3B82F6", duration_min: 30 },
    { label: "Treatment", color: "#8B5CF6", duration_min: 60 },
    { label: "Follow-up", color: "#10B981", duration_min: 20 },
    { label: "Procedure", color: "#EF4444", duration_min: 90 },
  ],
  kpis: [
    { key: "messages", label: "Messages Handled", value: "894", change: "+42%", trend: "up", icon: "users" },
    { key: "appointments", label: "Appointments Booked", value: "156", change: "+31%", trend: "up", icon: "check" },
    { key: "revenue", label: "Revenue This Week", value: "RM 42,800", change: "+28%", trend: "up", icon: "money" },
    { key: "response", label: "Avg Response Time", value: "12 sec", change: "-94%", trend: "up", icon: "clock" },
  ],
  leads: [
    { name: "Dr Yusof's referral — Ahmad", phone: "+60 12-345 6789", email: "ahmad.r@gmail.com", source: "GP Referral", status: "Qualified", value: "RM 1,800", notes: "Needs cardiology consult. Insurance: AIA. Referral letter on file.", lastContact: "2 hrs ago", lastContactHours: 2 },
    { name: "Siti Nurhaliza", phone: "+60 19-876 5432", email: "siti.n@outlook.com", source: "WhatsApp", status: "Contacted", value: "RM 480", notes: "Asked about dermatology package + pricing.", lastContact: "5 hrs ago", lastContactHours: 5 },
    { name: "Raj Kumar", phone: "+60 16-234 5678", email: "raj.kumar@gmail.com", source: "Google", status: "Demo", value: "RM 3,200", notes: "Booked LASIK consultation Friday. Pre-screening form sent.", lastContact: "18 min ago", lastContactHours: 0.3 },
    { name: "Mei Ling Tan", phone: "+60 17-345 9876", email: "meiling@yahoo.com", source: "Instagram", status: "New", value: "RM 320", notes: "Enquired about aesthetic treatment via IG DM.", lastContact: "1 day ago", lastContactHours: 24 },
    { name: "Farah Aziz", phone: "+60 11-987 6543", email: "farah.a@gmail.com", source: "Referral", status: "Closed", value: "RM 5,400", notes: "Procedure done. Follow-up scheduled in 2 weeks.", lastContact: "3 hrs ago", lastContactHours: 3 },
  ],
  activities: [
    { icon: "message", text: "AI replied to Ahmad on WhatsApp", detail: "AI: \"Thanks for the referral. I've blocked Dr Lim's next Tuesday 10am slot for your cardiology consult. Please upload your referral letter here.\"", time: "2 min ago", tone: "primary" },
    { icon: "calendar", text: "LASIK consultation booked: Raj Kumar, Fri 3pm", detail: "Pre-screening form sent. 60-min slot with Dr Wong. Consent form auto-attached.", time: "18 min ago", tone: "success" },
    { icon: "file", text: "Dermatology price list sent to Siti Nurhaliza", detail: "Package brochure (PDF) + next available slots attached. Awaiting booking.", time: "1 hr ago", tone: "primary" },
    { icon: "phone", text: "Appointment reminder sent: 14 patients tomorrow", detail: "WhatsApp reminders auto-sent. 2 rescheduled, 12 confirmed. Expected no-show rate: 3%.", time: "2 hrs ago", tone: "warning" },
    { icon: "check", text: "Procedure completed — Farah Aziz", detail: "Post-op instructions sent. Follow-up booked for 2 weeks. Invoice sent to insurer.", time: "3 hrs ago", tone: "success" },
    { icon: "mail", text: "Annual check-up reminder sent to 312 patients", detail: "\"Time for your yearly health screening.\" 47 booked, 18 requested callback.", time: "5 hrs ago", tone: "muted" },
  ],
  funnel: [
    { label: "Enquiries", status: null, count: 428 },
    { label: "Screened", status: "Contacted", count: 286 },
    { label: "Quoted", status: "Qualified", count: 192 },
    { label: "Booked", status: "Demo", count: 156 },
    { label: "Treated", status: "Closed", count: 128 },
  ],
  win_story: {
    messages_replied: 894,
    appointments_booked: 156,
    hours_saved: 41,
    revenue_made: "RM 42,800",
    revenue_delta_pct: 28,
    before_messages_replied: 254,
    before_appointments_booked: 98,
    before_hours_saved: 0,
    before_revenue_made: "RM 33,400",
  },
  whatsapp_conversations: [
    {
      id: "clinic-1",
      customer: "Ahmad Rahman",
      avatar_tone: "bg-blue-500/20 text-blue-400",
      messages: [
        { from: "customer", text: "Hi, my GP Dr Yusof referred me for a cardiology consult. How do I book?", delay_ms: 0 },
        { from: "ai", text: "Hi Ahmad — thanks for reaching out. Let me check Dr Lim's next slots for you.", delay_ms: 1100 },
        { from: "ai", text: "Dr Lim has availability:\n• Tue 10:00am\n• Wed 2:30pm\n• Fri 9:30am\n\nWhich works?", delay_ms: 2800 },
        { from: "customer", text: "Tuesday 10am please. Do I need to bring anything?", delay_ms: 4600 },
        { from: "ai", text: "Locked in ✅ Please bring:\n• NRIC\n• Referral letter from Dr Yusof\n• Any recent test results\n\nInsurance? We accept AIA, Allianz, Prudential.", delay_ms: 6100 },
        { from: "customer", text: "AIA. Panel?", delay_ms: 8000 },
        { from: "ai", text: "Yes we're on AIA panel — you'll pay only the co-pay. I've sent a confirmation + directions to your WhatsApp. See you Tuesday!", delay_ms: 9600 },
      ],
    },
    {
      id: "clinic-2",
      customer: "Siti Nurhaliza",
      avatar_tone: "bg-pink-500/20 text-pink-400",
      messages: [
        { from: "customer", text: "What's the price range for acne treatment packages?", delay_ms: 0 },
        { from: "ai", text: "Our dermatology packages start from:\n• Acne basics — RM 480 (4 sessions)\n• Acne+scar — RM 1,280 (8 sessions)\n• Advanced laser — RM 2,400 (12 sessions)", delay_ms: 1400 },
        { from: "ai", text: "Dr Chen offers a free 15-min consultation to recommend the right one. Shall I book you in?", delay_ms: 3000 },
        { from: "customer", text: "Yes, this Saturday if possible", delay_ms: 4800 },
        { from: "ai", text: "Saturday 11:15am confirmed with Dr Chen ✅ Free consult, no commitment. You'll get a reminder 1hr before.", delay_ms: 6400 },
      ],
    },
  ],
  scenarios: [
    "Books appointments using live doctor schedules",
    "Sends automated appointment reminders (cuts no-shows ~60%)",
    "Answers treatment + pricing questions 24/7",
    "Handles insurance panel checks automatically",
    "Triggers annual check-up reminders to past patients",
  ],
};

// ═════════════════════════════════════════════════════════════
// REAL ESTATE
// ═════════════════════════════════════════════════════════════
const REAL_ESTATE: IndustryPreset = {
  industry: "Real Estate",
  label: "Real Estate / Property",
  emoji: "🏢",
  tagline: "AI qualifies buyers, books viewings & follows up cold leads.",
  business_suffix: "Realty",
  booking_noun: "viewing",
  booking_noun_plural: "viewings",
  service_noun: "property",
  service_types: [
    { label: "Viewing", color: "#3B82F6", duration_min: 45 },
    { label: "Valuation", color: "#8B5CF6", duration_min: 60 },
    { label: "Signing", color: "#10B981", duration_min: 90 },
    { label: "Open House", color: "#F59E0B", duration_min: 180 },
  ],
  kpis: [
    { key: "enquiries", label: "Enquiries Handled", value: "412", change: "+29%", trend: "up", icon: "users" },
    { key: "viewings", label: "Viewings Booked", value: "48", change: "+60%", trend: "up", icon: "check" },
    { key: "pipeline", label: "Pipeline Value", value: "RM 12.8M", change: "+34%", trend: "up", icon: "money" },
    { key: "response", label: "Avg Response Time", value: "22 sec", change: "-92%", trend: "up", icon: "clock" },
  ],
  leads: [
    { name: "Ahmad Rahman", phone: "+60 12-345 6789", email: "ahmad.r@gmail.com", source: "PropertyGuru", status: "Qualified", value: "RM 680,000", notes: "Pre-approved loan. Looking for 3BR condo in Mont Kiara. Budget 650k-750k.", lastContact: "2 hrs ago", lastContactHours: 2 },
    { name: "Siti Nurhaliza", phone: "+60 19-876 5432", email: "siti.n@outlook.com", source: "WhatsApp", status: "Contacted", value: "RM 420,000", notes: "First-time buyer. Needs help with MyHome scheme.", lastContact: "5 hrs ago", lastContactHours: 5 },
    { name: "Raj Kumar", phone: "+60 16-234 5678", email: "raj.kumar@gmail.com", source: "Instagram", status: "Demo", value: "RM 1,250,000", notes: "Viewing booked for The Park 2 penthouse, Friday 4pm.", lastContact: "18 min ago", lastContactHours: 0.3 },
    { name: "Mei Ling Tan", phone: "+60 17-345 9876", email: "meiling@yahoo.com", source: "iProperty", status: "New", value: "RM 520,000", notes: "Enquired about new launch at Damansara Heights.", lastContact: "1 day ago", lastContactHours: 24 },
    { name: "Farah Aziz", phone: "+60 11-987 6543", email: "farah.a@gmail.com", source: "Referral", status: "Closed", value: "RM 880,000", notes: "SPA signed. Keys handover next week. Commission invoiced.", lastContact: "3 hrs ago", lastContactHours: 3 },
  ],
  activities: [
    { icon: "message", text: "AI qualified Ahmad Rahman on WhatsApp", detail: "AI confirmed loan pre-approval, budget, preferred area. Matched 3 listings. Sent brochures.", time: "2 min ago", tone: "primary" },
    { icon: "calendar", text: "Viewing booked: The Park 2 penthouse — Raj Kumar", detail: "Fri 4pm. Agent: Lim. Unit #32-8. Key collected from concierge.", time: "18 min ago", tone: "success" },
    { icon: "file", text: "MyHome scheme docs sent to Siti Nurhaliza", detail: "Eligibility checker completed — she qualifies for 10% rebate. Agent follow-up scheduled.", time: "1 hr ago", tone: "primary" },
    { icon: "phone", text: "Cold lead re-engaged — Mei Ling Tan (90 days)", detail: "AI sent new launch alert matching her saved criteria. She replied requesting brochure.", time: "2 hrs ago", tone: "warning" },
    { icon: "check", text: "SPA signed — Farah Aziz — RM 880,000", detail: "Deal closed. Commission invoice generated. Handover scheduled next Mon.", time: "3 hrs ago", tone: "success" },
    { icon: "mail", text: "New-launch alert sent to 312 saved searches", detail: "Damansara Heights tower launch. 47 enquiries generated. 12 viewings booked.", time: "5 hrs ago", tone: "muted" },
  ],
  funnel: [
    { label: "Enquiries", status: null, count: 412 },
    { label: "Qualified", status: "Contacted", count: 198 },
    { label: "Viewed", status: "Qualified", count: 94 },
    { label: "Negotiating", status: "Demo", count: 28 },
    { label: "SPA Signed", status: "Closed", count: 11 },
  ],
  win_story: {
    messages_replied: 412,
    appointments_booked: 48,
    hours_saved: 62,
    revenue_made: "RM 12.8M",
    revenue_delta_pct: 34,
    before_messages_replied: 118,
    before_appointments_booked: 19,
    before_hours_saved: 0,
    before_revenue_made: "RM 9.5M",
  },
  whatsapp_conversations: [
    {
      id: "re-1",
      customer: "Ahmad Rahman",
      avatar_tone: "bg-blue-500/20 text-blue-400",
      messages: [
        { from: "customer", text: "I saw your Mont Kiara listing. Still available?", delay_ms: 0 },
        { from: "ai", text: "Hi Ahmad! Yes — The Sentral Residences 3BR is still available at RM 680k.", delay_ms: 1100 },
        { from: "ai", text: "Before I book a viewing — quick qualifier:\n1. Loan pre-approved? (helps us know your buying timeline)\n2. Budget range?\n3. When can you view?", delay_ms: 2400 },
        { from: "customer", text: "Yes I'm pre-approved (Maybank). Budget 650-750k. Weekends best.", delay_ms: 4500 },
        { from: "ai", text: "Perfect match! I've pulled 3 more units in your range:\n• Sentral 3BR — RM 680k ✨\n• Mont Kiara View — RM 720k\n• Arcoris Suites — RM 695k", delay_ms: 6400 },
        { from: "ai", text: "Shall I book all 3 for Saturday back-to-back? Agent Lim will show you.", delay_ms: 8200 },
        { from: "customer", text: "Yes perfect!", delay_ms: 10000 },
        { from: "ai", text: "Locked in ✅ Saturday 10am, 11am, 12pm. Brochures sent. Lim will confirm by Friday. 🏢", delay_ms: 11600 },
      ],
    },
    {
      id: "re-2",
      customer: "Siti Nurhaliza",
      avatar_tone: "bg-pink-500/20 text-pink-400",
      messages: [
        { from: "customer", text: "First time buying. How does MyHome scheme work?", delay_ms: 0 },
        { from: "ai", text: "MyHome gives first-time buyers a 10% rebate on homes RM 150k–500k. Let me check if you qualify — a few quick questions:", delay_ms: 1200 },
        { from: "ai", text: "1. Monthly household income?\n2. Any property in your name now?\n3. Malaysian citizen?", delay_ms: 2800 },
        { from: "customer", text: "RM 7k/month, no property, yes citizen", delay_ms: 4400 },
        { from: "ai", text: "Congrats — you qualify 🎉 That's up to RM 50k off. I've saved 5 properties in your budget + sent the MyHome form. Want to view any this weekend?", delay_ms: 6200 },
      ],
    },
  ],
  scenarios: [
    "Qualifies buyers (budget / loan / timeline) before agent involvement",
    "Books viewings 24/7 from PropertyGuru + iProperty enquiries",
    "Checks MyHome / Rumah Selangorku eligibility instantly",
    "Re-engages cold leads when matching new launches drop",
    "Auto-follows-up after viewings to capture offers",
  ],
};

// ═════════════════════════════════════════════════════════════
// SALON / HAIR & BEAUTY
// ═════════════════════════════════════════════════════════════
const SALON: IndustryPreset = {
  industry: "Salon",
  label: "Hair & Beauty Salon",
  emoji: "💇",
  tagline: "AI books appointments, manages stylists & sells packages.",
  business_suffix: "Studio",
  booking_noun: "appointment",
  booking_noun_plural: "appointments",
  service_noun: "service",
  service_types: [
    { label: "Haircut", color: "#F59E0B", duration_min: 60 },
    { label: "Color", color: "#EC4899", duration_min: 120 },
    { label: "Treatment", color: "#8B5CF6", duration_min: 90 },
    { label: "Facial", color: "#10B981", duration_min: 75 },
  ],
  kpis: [
    { key: "messages", label: "Messages Handled", value: "762", change: "+45%", trend: "up", icon: "users" },
    { key: "appointments", label: "Appointments Booked", value: "134", change: "+38%", trend: "up", icon: "check" },
    { key: "revenue", label: "Revenue This Week", value: "RM 14,280", change: "+26%", trend: "up", icon: "money" },
    { key: "response", label: "Avg Response Time", value: "6 sec", change: "-97%", trend: "up", icon: "clock" },
  ],
  leads: [
    { name: "Ahmad Rahman", phone: "+60 12-345 6789", email: "ahmad.r@gmail.com", source: "Instagram", status: "Qualified", value: "RM 480", notes: "Wife's birthday. Wants full beauty package for her.", lastContact: "2 hrs ago", lastContactHours: 2 },
    { name: "Siti Nurhaliza", phone: "+60 19-876 5432", email: "siti.n@outlook.com", source: "WhatsApp", status: "Contacted", value: "RM 320", notes: "Asked about keratin treatment pricing.", lastContact: "5 hrs ago", lastContactHours: 5 },
    { name: "Raj Kumar", phone: "+60 16-234 5678", email: "raj.kumar@gmail.com", source: "Google", status: "Demo", value: "RM 580", notes: "Pre-wedding package: haircut + color + beard. Friday 2pm.", lastContact: "18 min ago", lastContactHours: 0.3 },
    { name: "Mei Ling Tan", phone: "+60 17-345 9876", email: "meiling@yahoo.com", source: "TikTok", status: "New", value: "RM 180", notes: "Saw hair transformation reel. Booked consult.", lastContact: "1 day ago", lastContactHours: 24 },
    { name: "Farah Aziz", phone: "+60 11-987 6543", email: "farah.a@gmail.com", source: "Referral", status: "Closed", value: "RM 1,200", notes: "6-session package paid in full. Bridal trial next week.", lastContact: "3 hrs ago", lastContactHours: 3 },
  ],
  activities: [
    { icon: "message", text: "AI replied to Ahmad Rahman on WhatsApp", detail: "AI: \"For your wife's birthday — our Signature Pamper package (RM 480) is perfect: hair + facial + mani-pedi. Saturday 2pm with Nadia?\"", time: "2 min ago", tone: "primary" },
    { icon: "calendar", text: "Pre-wedding booking: Raj Kumar, Fri 2pm", detail: "Haircut (Wei) + color (Jasmine) + beard trim. 3hrs. Deposit paid RM 180.", time: "18 min ago", tone: "success" },
    { icon: "file", text: "Keratin pricing menu sent to Siti Nurhaliza", detail: "Brazilian / Korean / Japanese variants + stylist photos. Awaiting choice.", time: "1 hr ago", tone: "primary" },
    { icon: "phone", text: "No-show recovery: Mei Ling Tan", detail: "AI auto-rebooked her consultation to next Thursday + sent RM 20 voucher.", time: "2 hrs ago", tone: "warning" },
    { icon: "check", text: "Bridal package paid: Farah Aziz — RM 1,200", detail: "6 sessions booked through to wedding day. Trial scheduled for next Tuesday.", time: "3 hrs ago", tone: "success" },
    { icon: "mail", text: "Birthday promo sent to 89 past clients", detail: "\"Your birthday month — RM 50 off any service.\" 24 booked in 2hrs.", time: "5 hrs ago", tone: "muted" },
  ],
  funnel: [
    { label: "Enquiries", status: null, count: 284 },
    { label: "Engaged", status: "Contacted", count: 198 },
    { label: "Quoted", status: "Qualified", count: 162 },
    { label: "Booked", status: "Demo", count: 134 },
    { label: "Served", status: "Closed", count: 118 },
  ],
  win_story: {
    messages_replied: 762,
    appointments_booked: 134,
    hours_saved: 34,
    revenue_made: "RM 14,280",
    revenue_delta_pct: 26,
    before_messages_replied: 214,
    before_appointments_booked: 78,
    before_hours_saved: 0,
    before_revenue_made: "RM 11,340",
  },
  whatsapp_conversations: [
    {
      id: "salon-1",
      customer: "Ahmad Rahman",
      avatar_tone: "bg-amber-500/20 text-amber-400",
      messages: [
        { from: "customer", text: "Hi, looking to surprise my wife for her birthday. What packages you have?", delay_ms: 0 },
        { from: "ai", text: "Sweet 💛 Three options she'll love:\n• Signature Pamper — RM 480 (hair + facial + mani-pedi, 3hrs)\n• Bride Glow — RM 780 (adds massage + makeup)\n• Half-Day Spa — RM 1,200 (everything + lunch)", delay_ms: 1600 },
        { from: "ai", text: "Which fits your vibe?", delay_ms: 3100 },
        { from: "customer", text: "Signature Pamper! When can I book?", delay_ms: 4600 },
        { from: "ai", text: "Nadia (senior stylist, English/Malay) has Saturday 2pm — she's booked her last 3 birthdays 🎉 Want me to lock it?", delay_ms: 6400 },
        { from: "customer", text: "Yes please!", delay_ms: 8200 },
        { from: "ai", text: "Done ✅ Saturday 2pm with Nadia. I've added a birthday banner + free glass of prosecco on the house. Wife will love it!", delay_ms: 9800 },
      ],
    },
    {
      id: "salon-2",
      customer: "Mei Ling Tan",
      avatar_tone: "bg-pink-500/20 text-pink-400",
      messages: [
        { from: "customer", text: "Saw your hair transformation reel on TikTok! Can I get something similar?", delay_ms: 0 },
        { from: "ai", text: "Yes! That was Jasmine's work ✨ We do free 15-min consults to plan the look. Can you share a photo of your hair now?", delay_ms: 1400 },
        { from: "customer", text: "[photo]", delay_ms: 3200 },
        { from: "ai", text: "Your hair's in great shape — Jasmine can definitely do this. For that look it'd be:\n• Cut: RM 80\n• Balayage: RM 350\n• Treatment: RM 120\nTotal: RM 550 (2.5hrs)", delay_ms: 4800 },
        { from: "customer", text: "Next Thursday 11am?", delay_ms: 6600 },
        { from: "ai", text: "Locked ✅ See you Thursday 11am! I'll send a care guide so your hair is ready.", delay_ms: 8200 },
      ],
    },
  ],
  scenarios: [
    "Books appointments via IG/TikTok DMs with stylist-matching",
    "Upsells packages (cut + color + treatment) automatically",
    "Recovers no-shows with voucher + rebooking link",
    "Sells multi-session bridal/pre-wedding bundles",
    "Auto-sends birthday promos to past clients",
  ],
};

// ═════════════════════════════════════════════════════════════
// RETAIL / E-COMMERCE
// ═════════════════════════════════════════════════════════════
const RETAIL: IndustryPreset = {
  industry: "Retail",
  label: "Retail / E-commerce",
  emoji: "🛍️",
  tagline: "AI answers product questions, tracks orders & recovers abandoned carts.",
  business_suffix: "Store",
  booking_noun: "order",
  booking_noun_plural: "orders",
  service_noun: "order",
  service_types: [
    { label: "Standard Delivery", color: "#3B82F6", duration_min: 1440 },
    { label: "Express", color: "#EF4444", duration_min: 240 },
    { label: "In-store Pickup", color: "#10B981", duration_min: 30 },
    { label: "Bulk Order", color: "#8B5CF6", duration_min: 2880 },
  ],
  kpis: [
    { key: "messages", label: "Messages Handled", value: "2,140", change: "+48%", trend: "up", icon: "users" },
    { key: "orders", label: "Orders Closed", value: "284", change: "+62%", trend: "up", icon: "check" },
    { key: "revenue", label: "Revenue This Week", value: "RM 38,940", change: "+41%", trend: "up", icon: "money" },
    { key: "response", label: "Avg Response Time", value: "4 sec", change: "-98%", trend: "up", icon: "clock" },
  ],
  leads: [
    { name: "Ahmad Rahman", phone: "+60 12-345 6789", email: "ahmad.r@gmail.com", source: "Shopee", status: "Qualified", value: "RM 1,280", notes: "Bulk order: 20 units of SKU-HDR-042. Asked about corporate pricing.", lastContact: "2 hrs ago", lastContactHours: 2 },
    { name: "Siti Nurhaliza", phone: "+60 19-876 5432", email: "siti.n@outlook.com", source: "Instagram", status: "Contacted", value: "RM 180", notes: "Abandoned cart. AI sent 10% recovery code.", lastContact: "5 hrs ago", lastContactHours: 5 },
    { name: "Raj Kumar", phone: "+60 16-234 5678", email: "raj.kumar@gmail.com", source: "Lazada", status: "Demo", value: "RM 680", notes: "Asked for product demo video. AI sent 2-min walkthrough.", lastContact: "18 min ago", lastContactHours: 0.3 },
    { name: "Mei Ling Tan", phone: "+60 17-345 9876", email: "meiling@yahoo.com", source: "TikTok Shop", status: "New", value: "RM 95", notes: "First-time buyer. Used AI-generated welcome code.", lastContact: "1 day ago", lastContactHours: 24 },
    { name: "Farah Aziz", phone: "+60 11-987 6543", email: "farah.a@gmail.com", source: "Referral", status: "Closed", value: "RM 420", notes: "Loyalty member. 4th repeat order this month.", lastContact: "3 hrs ago", lastContactHours: 3 },
  ],
  activities: [
    { icon: "message", text: "AI closed bulk order with Ahmad Rahman", detail: "Corporate tier unlocked at 20+ units: 12% off. Invoice sent. DO ETA: Thursday.", time: "2 min ago", tone: "primary" },
    { icon: "calendar", text: "Express order dispatched: Raj Kumar", detail: "Lalamove booked 4-hr delivery. Tracking shared. ETA: 14:30.", time: "18 min ago", tone: "success" },
    { icon: "file", text: "Abandoned cart recovered: Siti Nurhaliza", detail: "Cart of RM 180 recovered with RM 18 code (SITI10). Conversion tracked.", time: "1 hr ago", tone: "primary" },
    { icon: "phone", text: "Size question answered + order placed — Mei Ling", detail: "AI matched her past purchase size. Order placed RM 95. First-time buyer.", time: "2 hrs ago", tone: "warning" },
    { icon: "check", text: "Repeat order: Farah Aziz — RM 420", detail: "4th order this month. Loyalty tier upgraded to Gold. Free shipping applied.", time: "3 hrs ago", tone: "success" },
    { icon: "mail", text: "Flash sale blast sent to 1,840 subscribers", detail: "\"48-hour flash: 25% off bestsellers.\" Opens: 624 · Clicks: 182 · Orders: 47.", time: "5 hrs ago", tone: "muted" },
  ],
  funnel: [
    { label: "Visitors", status: null, count: 2140 },
    { label: "Browsed", status: "Contacted", count: 1284 },
    { label: "Added to Cart", status: "Qualified", count: 482 },
    { label: "Checkout", status: "Demo", count: 318 },
    { label: "Paid", status: "Closed", count: 284 },
  ],
  win_story: {
    messages_replied: 2140,
    appointments_booked: 284,
    hours_saved: 48,
    revenue_made: "RM 38,940",
    revenue_delta_pct: 41,
    before_messages_replied: 486,
    before_appointments_booked: 124,
    before_hours_saved: 0,
    before_revenue_made: "RM 27,620",
  },
  whatsapp_conversations: [
    {
      id: "retail-1",
      customer: "Ahmad Rahman",
      avatar_tone: "bg-blue-500/20 text-blue-400",
      messages: [
        { from: "customer", text: "Hi, I need 20 units of SKU-HDR-042 for our office. Corporate pricing?", delay_ms: 0 },
        { from: "ai", text: "Hi Ahmad! Bulk of 20+ unlocks our corporate tier:", delay_ms: 1100 },
        { from: "ai", text: "• Retail: RM 85/unit → RM 1,700\n• Bulk (20+): RM 74/unit → RM 1,480 (save RM 220)\n• Bulk (50+): RM 68/unit — biggest saving", delay_ms: 2400 },
        { from: "customer", text: "Let's go with 20. Can you invoice the company?", delay_ms: 4500 },
        { from: "ai", text: "Sure — shoot me the company SSM + delivery address and I'll generate the PO today. ETA: 2 working days (FREE delivery at this tier).", delay_ms: 6000 },
        { from: "customer", text: "Sent. When will it arrive?", delay_ms: 8200 },
        { from: "ai", text: "Received ✅ Invoice #INV-2048 sent to your email. Dispatch: tomorrow. Delivery ETA: Thursday 4pm. Tracking link coming once picked up.", delay_ms: 9800 },
      ],
    },
    {
      id: "retail-2",
      customer: "Siti Nurhaliza",
      avatar_tone: "bg-pink-500/20 text-pink-400",
      messages: [
        { from: "ai", text: "Hi Siti! Noticed you left something in your cart ☺️", delay_ms: 0 },
        { from: "ai", text: "Your items are still there:\n• Silk Scarf — RM 120\n• Pouch Bag — RM 60\nSubtotal: RM 180", delay_ms: 1400 },
        { from: "ai", text: "Here's RM 18 off to sweeten it: code SITI10 (valid 24h). Want me to hold the size M for you?", delay_ms: 3000 },
        { from: "customer", text: "Oh yes! I'll check out now", delay_ms: 4800 },
        { from: "ai", text: "Sent the checkout link straight to your WhatsApp — takes 60 seconds. Shipping free with code ✨", delay_ms: 6200 },
      ],
    },
  ],
  scenarios: [
    "Answers size / stock / availability questions instantly",
    "Recovers abandoned carts with personalized codes",
    "Upsells to bulk / corporate tiers automatically",
    "Tracks orders + handles returns without human input",
    "Re-engages VIPs with birthday + loyalty offers",
  ],
};

// ═════════════════════════════════════════════════════════════
// REGISTRY
// ═════════════════════════════════════════════════════════════
export const DEMO_PRESETS: Record<DemoIndustry, IndustryPreset> = {
  "F&B": FNB,
  Clinic: CLINIC,
  "Real Estate": REAL_ESTATE,
  Salon: SALON,
  Retail: RETAIL,
};

export function getPreset(industry: DemoIndustry): IndustryPreset {
  return DEMO_PRESETS[industry] || FNB;
}
