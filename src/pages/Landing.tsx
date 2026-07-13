import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Shield,
  Wifi,
  KanbanSquare,
  FileText,
  Cloud,
  Sparkles,
  Feather,
  Compass,
  Layers,
  Zap,
} from "lucide-react";
import logo from "@/assets/logo.png";
import SEO from "@/components/SEO";

/**
 * Novaryn — Landing page.
 * Scoped Midnight Indigo palette (#0a0a1a → #4f46e5) applied via
 * a wrapper style so the rest of the app keeps its executive gold theme.
 */

const palette = {
  bg: "#07071a",
  bgAlt: "#0a0a1f",
  surface: "#141432",
  surfaceMid: "#1a1a3f",
  line: "rgba(255,255,255,0.08)",
  ink: "#f5f6ff",
  inkDim: "rgba(230,232,255,0.72)",
  inkMute: "rgba(200,205,240,0.5)",
  accent: "#7c7bff",
  accentDeep: "#4f46e5",
  glow: "#8b5cf6",
};

/* ---------- Ambient background: orbs, grid, drifting glyphs ---------- */
function AmbientBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Soft radial gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(1200px 800px at 20% 10%, ${palette.accentDeep}22, transparent 60%),
                       radial-gradient(900px 700px at 85% 30%, ${palette.glow}1f, transparent 65%),
                       radial-gradient(700px 500px at 50% 100%, ${palette.accent}22, transparent 70%)`,
        }}
      />
      {/* Fine grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating orbs */}
      {!reduce && (
        <>
          <motion.div
            className="absolute rounded-full blur-3xl"
            style={{ width: 520, height: 520, top: "-8%", left: "-6%", background: `${palette.accentDeep}55` }}
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute rounded-full blur-3xl"
            style={{ width: 460, height: 460, bottom: "-10%", right: "-8%", background: `${palette.glow}44` }}
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Animated geometric emblem for hero ---------- */
function Emblem() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
      <motion.div
        className="absolute inset-0"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 340 340" className="w-full h-full">
          <defs>
            <linearGradient id="ring1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={palette.accent} stopOpacity="0.9" />
              <stop offset="100%" stopColor={palette.accentDeep} stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle cx="170" cy="170" r="160" fill="none" stroke="url(#ring1)" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="170" cy="170" r="130" fill="none" stroke={palette.accent} strokeOpacity="0.25" strokeWidth="1" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute inset-6"
        animate={reduce ? {} : { rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 340 340" className="w-full h-full">
          <polygon
            points="170,30 300,240 40,240"
            fill="none"
            stroke={palette.glow}
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
          <polygon
            points="170,310 40,100 300,100"
            fill="none"
            stroke={palette.accent}
            strokeOpacity="0.25"
            strokeWidth="0.8"
          />
        </svg>
      </motion.div>

      {/* Inner disc */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 190,
          height: 190,
          background: `radial-gradient(circle at 30% 25%, ${palette.surfaceMid}, ${palette.bg})`,
          boxShadow: `0 30px 80px -20px ${palette.accentDeep}88, inset 0 0 40px ${palette.accent}22`,
          border: `1px solid ${palette.line}`,
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={logo} alt="Novaryn" className="w-24 h-24 object-contain drop-shadow-2xl" />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1px solid ${palette.accent}55` }}
          animate={reduce ? {} : { scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}

/* ---------- Small helpers ---------- */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`relative px-6 md:px-10 py-24 md:py-32 ${className}`}>{children}</section>;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs tracking-widest uppercase"
      style={{
        border: `1px solid ${palette.line}`,
        background: `${palette.surface}80`,
        color: palette.inkDim,
      }}
    >
      {children}
    </span>
  );
}

/* ---------- Page ---------- */
export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroFade = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Novaryn — Organize Thoughts. Shape Decisions.";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <>
      <SEO
        path="/"
        title="Organize Thoughts. Shape Decisions."
        description="Novaryn is a private, local-first thinking instrument for executives, researchers, consultants, and entrepreneurs. Capture ideas, structure research, and shape decisions with clarity — offline notes, kanban tasks, and PDF workspace."
        keywords="Novaryn, executive notebook, second brain, decision making, research notes, local-first notes, offline notebook, PWA, private notes, kanban tasks, PDF annotation, knowledge management, consultants, researchers, entrepreneurs"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Novaryn",
          applicationCategory: "ProductivityApplication",
          operatingSystem: "Web, iOS, Android, Windows, macOS, Linux",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "Novaryn is a private, local-first thinking instrument for executives, researchers, consultants, and entrepreneurs.",
          url: "https://notoria.lovable.app/",
          featureList: [
            "Local-first offline notes",
            "Kanban tasks and projects",
            "PDF workspace and annotation",
            "End-to-end encrypted cloud backup",
            "Installable PWA",
          ],
        }}
      />
      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{
          background: palette.bg,
          color: palette.ink,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <AmbientBackdrop />


      {/* NAV */}
      <header className="relative z-20 px-6 md:px-10 pt-6 md:pt-8">
        <nav
          className="max-w-7xl mx-auto flex items-center justify-between rounded-2xl px-4 md:px-6 py-3"
          style={{
            background: `${palette.surface}88`,
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(16px)",
          }}
        >
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: palette.bg, border: `1px solid ${palette.line}` }}
            >
              <img src={logo} alt="" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-semibold tracking-wide text-lg" style={{ fontFamily: "'EB Garamond', serif" }}>
              Novaryn
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: palette.inkDim }}>
            <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
            <a href="#made-for" className="hover:text-white transition-colors">Made for</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
          </div>
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${palette.accentDeep}, ${palette.glow})`,
              color: "#fff",
              boxShadow: `0 10px 30px -10px ${palette.accentDeep}`,
            }}
          >
            Open Notebook
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <div ref={heroRef} className="relative">
        <motion.div style={{ y: heroY, opacity: heroFade }}>
          <Section className="pt-16 md:pt-24">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-16 items-center">
              <div>
                <motion.div {...fadeUp}>
                  <Chip>
                    <Sparkles className="w-3 h-3" /> A thinking instrument
                  </Chip>
                </motion.div>

                <motion.h1
                  className="mt-6 font-normal leading-[0.95] tracking-tight"
                  style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(3rem, 7.5vw, 6.5rem)" }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                >
                  Organize Thoughts.
                  <br />
                  <span
                    style={{
                      background: `linear-gradient(120deg, ${palette.accent}, ${palette.glow} 60%, ${palette.accent})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    Shape Decisions.
                  </span>
                </motion.h1>

                <motion.p
                  className="mt-8 text-lg md:text-xl max-w-xl leading-relaxed"
                  style={{ color: palette.inkDim }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  Professional, timeless, suitable for executives, researchers, consultants,
                  and entrepreneurs. A private space to capture what matters and act on it.
                </motion.p>

                <motion.div
                  className="mt-10 flex flex-wrap items-center gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.3 }}
                >
                  <Link
                    to="/app"
                    className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium"
                    style={{
                      background: `linear-gradient(135deg, ${palette.accentDeep}, ${palette.glow})`,
                      color: "#fff",
                      boxShadow: `0 20px 50px -15px ${palette.accentDeep}`,
                    }}
                  >
                    Enter Novaryn
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#philosophy"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-colors"
                    style={{
                      border: `1px solid ${palette.line}`,
                      color: palette.ink,
                      background: `${palette.surface}55`,
                    }}
                  >
                    Our philosophy
                  </a>
                </motion.div>

                <motion.div
                  className="mt-12 flex flex-wrap gap-6 text-sm"
                  style={{ color: palette.inkMute }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                >
                  <span className="inline-flex items-center gap-2"><Shield className="w-4 h-4" /> Private by design</span>
                  <span className="inline-flex items-center gap-2"><Wifi className="w-4 h-4" /> Works offline</span>
                  <span className="inline-flex items-center gap-2"><Zap className="w-4 h-4" /> Install as an app</span>
                </motion.div>
              </div>

              <motion.div
                className="flex justify-center lg:justify-end"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Emblem />
              </motion.div>
            </div>
          </Section>
        </motion.div>
      </div>

      {/* PHILOSOPHY */}
      <Section id="philosophy">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div {...fadeUp}><Chip><Feather className="w-3 h-3" /> Philosophy</Chip></motion.div>
          <motion.h2
            {...fadeUp}
            className="mt-6 font-normal tracking-tight"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)", lineHeight: 1.1 }}
          >
            A quiet room for serious thinking.
          </motion.h2>
          <motion.p
            {...fadeUp}
            className="mt-8 text-lg md:text-xl leading-relaxed mx-auto max-w-3xl"
            style={{ color: palette.inkDim }}
          >
            Most software treats attention as a resource to extract. Novaryn treats it as
            something to protect. No accounts required. No tracking. No noise. Your ideas
            live on your device, in a space designed to feel less like a tool and more like
            a well-made notebook — one that respects the weight of what you write in it.
          </motion.p>

          <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
            {[
              { icon: Compass, title: "Clarity over clutter", body: "Every surface earns its place. Nothing competes with your thinking." },
              { icon: Shield, title: "Yours, entirely", body: "Local-first storage. Optional end-to-end encrypted backup, on your terms." },
              { icon: Layers, title: "Built to last", body: "Timeless typography. Steady interactions. A tool that ages well." },
            ].map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 rounded-2xl"
                style={{ background: `${palette.surface}66`, border: `1px solid ${palette.line}` }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${palette.accentDeep}33`, color: palette.accent }}
                >
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium mb-2">{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: palette.inkDim }}>{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* MADE FOR */}
      <Section id="made-for" className="border-t" >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div>
              <Chip>Made for</Chip>
              <h2
                className="mt-4 font-normal tracking-tight"
                style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(2rem, 4vw, 3.25rem)", lineHeight: 1.1 }}
              >
                People who think for a living.
              </h2>
            </div>
            <p className="max-w-md" style={{ color: palette.inkDim }}>
              Novaryn is shaped around the way careful, senior work actually happens —
              slow reads, quiet drafts, decisions that need to survive scrutiny.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Executives", detail: "Strategic notes, board prep, decision logs." },
              { label: "Researchers", detail: "Reading trails, PDF annotations, structured recall." },
              { label: "Consultants", detail: "Client workspaces, engagement projects, deliverables." },
              { label: "Entrepreneurs", detail: "Product bets, roadmaps, weekly operating cadence." },
            ].map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="p-6 rounded-2xl relative overflow-hidden group"
                style={{ background: `${palette.surface}77`, border: `1px solid ${palette.line}` }}
              >
                <div
                  className="absolute inset-x-0 -top-24 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: `radial-gradient(closest-side, ${palette.accentDeep}66, transparent)` }}
                />
                <div className="relative">
                  <div className="text-2xl font-medium mb-3" style={{ fontFamily: "'EB Garamond', serif" }}>{r.label}</div>
                  <p className="text-sm" style={{ color: palette.inkDim }}>{r.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Chip>The instrument</Chip>
            <h2
              className="mt-4 font-normal tracking-tight"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(2rem, 4vw, 3.25rem)", lineHeight: 1.1 }}
            >
              Everything you need. Nothing you don't.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BookOpen, title: "Rich notes, reading mode first", body: "Elegant editor with images, code blocks, and PDFs. Read by default, edit with a double-tap. Auto-saves as you think." },
              { icon: KanbanSquare, title: "Tasks and long-term projects", body: "Kanban board, project modules, recurring cycles that leave a trail. Due-date reminders that respect your focus." },
              { icon: FileText, title: "Built-in PDF workspace", body: "Open PDFs inside notes. Extract text into editable pages. Save up to 100 MB offline." },
              { icon: Shield, title: "Private by default", body: "Everything lives on your device. No account required to start. No tracking, ever." },
              { icon: Cloud, title: "Encrypted cloud backup", body: "Opt-in end-to-end encryption with a key only you hold. Restore on any device — just bring your key." },
              { icon: Wifi, title: "Fully offline PWA", body: "Install like a native app. Works in the sky, on the train, in the field — the same, always." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="p-7 rounded-2xl h-full"
                style={{
                  background: `linear-gradient(160deg, ${palette.surface}cc, ${palette.bgAlt}cc)`,
                  border: `1px solid ${palette.line}`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${palette.accentDeep}55, ${palette.glow}33)`,
                    color: "#fff",
                    border: `1px solid ${palette.line}`,
                  }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: palette.inkDim }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* PRODUCT PREVIEW MOCK */}
      <Section>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl p-2 md:p-3"
            style={{
              background: `linear-gradient(135deg, ${palette.accentDeep}66, ${palette.glow}33)`,
              boxShadow: `0 60px 120px -30px ${palette.accentDeep}77`,
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: palette.bgAlt, border: `1px solid ${palette.line}` }}
            >
              {/* Faux window chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: palette.surface, borderBottom: `1px solid ${palette.line}` }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
                <span className="ml-4 text-xs" style={{ color: palette.inkMute }}>novaryn — Q3 Strategy · Draft</span>
              </div>
              <div className="grid md:grid-cols-[220px_1fr] min-h-[380px]">
                <aside className="p-5 hidden md:block" style={{ borderRight: `1px solid ${palette.line}`, background: `${palette.bg}` }}>
                  <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: palette.inkMute }}>Workspaces</div>
                  {["Board & Strategy", "Research", "Consulting · Acme", "Personal"].map((w, i) => (
                    <div
                      key={w}
                      className="px-3 py-2 rounded-lg text-sm mb-1"
                      style={{
                        background: i === 0 ? `${palette.accentDeep}44` : "transparent",
                        color: i === 0 ? "#fff" : palette.inkDim,
                      }}
                    >
                      {w}
                    </div>
                  ))}
                </aside>
                <div className="p-6 md:p-10">
                  <div className="text-xs" style={{ color: palette.inkMute }}>Board & Strategy · 12 Jul</div>
                  <h3 className="mt-2 text-2xl md:text-3xl font-normal" style={{ fontFamily: "'EB Garamond', serif" }}>
                    Q3 Strategy — three bets, one filter
                  </h3>
                  <div className="mt-6 space-y-3 text-sm leading-relaxed" style={{ color: palette.inkDim }}>
                    <p>Working thesis: consolidate around the two segments where we already have unfair distribution.</p>
                    <p><span style={{ color: palette.accent }}>Decision filter →</span> if it doesn't compound with the notebook, we don't ship it this quarter.</p>
                    <p>Follow-ups tagged in <em>Tasks · Strategy</em>. Read: <em>Christensen, Ch. 4</em>.</p>
                  </div>
                  <div className="mt-8 flex gap-2 flex-wrap">
                    {["#strategy", "#board", "#Q3", "★ pinned"].map((t) => (
                      <span
                        key={t}
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{ border: `1px solid ${palette.line}`, color: palette.inkDim }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* PRIVACY */}
      <Section id="privacy">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${palette.surface}, ${palette.bgAlt})`,
            border: `1px solid ${palette.line}`,
          }}
        >
          <motion.div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl"
            style={{ background: `${palette.accentDeep}55` }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative">
            <Chip><Shield className="w-3 h-3" /> Privacy</Chip>
            <h2
              className="mt-5 font-normal tracking-tight"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(2rem, 4vw, 3.25rem)", lineHeight: 1.1 }}
            >
              Your ideas never leave your device — unless you say so.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: palette.inkDim }}>
              Novaryn stores your notes, tasks, and PDFs in your browser's secure local
              storage. Cloud backup is optional and end-to-end encrypted with a secret key
              only you hold. No account. No tracking. No compromises.
            </p>
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section>
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            {...fadeUp}
            className="font-normal tracking-tight"
            style={{ fontFamily: "'EB Garamond', serif", fontSize: "clamp(2.25rem, 5vw, 4rem)", lineHeight: 1.05 }}
          >
            Open the notebook.
          </motion.h2>
          <motion.p {...fadeUp} className="mt-6 text-lg" style={{ color: palette.inkDim }}>
            No sign-up. Nothing to install to start. Your first note is one click away.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10 flex justify-center">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-medium"
              style={{
                background: `linear-gradient(135deg, ${palette.accentDeep}, ${palette.glow})`,
                color: "#fff",
                boxShadow: `0 30px 60px -20px ${palette.accentDeep}`,
              }}
            >
              Enter Novaryn
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer
        className="relative px-6 md:px-10 py-10"
        style={{ borderTop: `1px solid ${palette.line}` }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm" style={{ color: palette.inkMute }}>
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-6 h-6" />
            <span style={{ fontFamily: "'EB Garamond', serif" }} className="text-base text-white/80">Novaryn</span>
            <span>— Organize Thoughts. Shape Decisions.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/app" className="hover:text-white transition-colors">Notebook</Link>
            <Link to="/cloud-backup" className="hover:text-white transition-colors">Cloud Backup</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/coffee" className="hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
