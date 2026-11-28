"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, ArrowRight, Bot, CalendarDays, Check, ChevronRight, Circle, Clapperboard, Cloud, ExternalLink, Film, Gauge, LayoutDashboard, Lightbulb, Link2, LoaderCircle, Menu, MousePointer2, PenLine, Play, Rocket, Settings2, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import type { Idea, Project, StudioSettings, StudioState } from "@/lib/types";
import { drawShortFrame, projectDuration } from "@/lib/video-renderer";
import { ProjectEditor } from "@/components/project-editor";
import type { RenderResult } from "@/lib/video-renderer";
import { CalendarPanel, ChannelPanel, IdeaLab, OverviewPanel } from "@/components/studio-panels";
import { InstallAppButton } from "@/components/install-app";

type Tab = "overview" | "ideas" | "studio" | "calendar" | "channel";
type Toast = { id: number; message: string; kind: "success" | "error" };

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "ideas", label: "Ide & brief", icon: Lightbulb },
  { id: "studio", label: "Studio video", icon: Clapperboard },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "channel", label: "Kanal & monetisasi", icon: Settings2 },
];

export function StudioApp({ initialState }: { initialState: StudioState }) {
  const [state, setState] = useState(initialState);
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedId, setSelectedId] = useState(initialState.projects[0]?.id || "");
  const [toast, setToast] = useState<Toast | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedProject = state.projects.find((project) => project.id === selectedId) || state.projects[0];

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, kind });
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 7500 : 4500);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action === "ideas" || action === "studio") {
      setTab(action);
      requestAnimationFrame(() => document.getElementById("workspace")?.scrollIntoView());
    }
    const youtube = params.get("youtube");
    if (youtube === "connected") notify("Kanal YouTube berhasil dihubungkan.");
    if (youtube === "not_configured") notify("Kredensial YouTube belum dikonfigurasi di server.", "error");
    if (youtube === "invalid_state") notify("Validasi OAuth gagal. Coba hubungkan ulang.", "error");
    if (youtube === "error") notify(params.get("detail") || "Koneksi YouTube gagal.", "error");
    if (youtube) {
      window.history.replaceState({}, "", `${window.location.pathname}#integrations`);
      setTab("channel");
      fetch("/api/studio").then((response) => response.json()).then((data: StudioState) => setState(data)).catch(() => undefined);
    }
    fetch("/api/automation/tick", { method: "POST" }).catch(() => undefined);
  }, [notify]);

  function applyPayload(payload: unknown) {
    if (!payload || typeof payload !== "object") return;
    const data = payload as { state?: StudioState } & Partial<StudioState>;
    if (data.state) setState(data.state);
    else if (data.settings && data.projects && data.ideas) setState(data as StudioState);
  }

  async function call(url: string, init?: RequestInit, quiet = false): Promise<Record<string, unknown> | StudioState | null> {
    try {
      const response = await fetch(url, init);
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || `Permintaan gagal (${response.status}).`);
      applyPayload(payload);
      return payload as StudioState;
    } catch (error) {
      if (!quiet) notify(error instanceof Error ? error.message : "Terjadi kesalahan.", "error");
      return null;
    }
  }

  function scrollWorkspace() {
    document.getElementById("workspace")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function go(next: Tab) {
    setTab(next);
    setMobileMenu(false);
    requestAnimationFrame(scrollWorkspace);
  }

  function openProject(id: string) {
    setSelectedId(id);
    go("studio");
  }

  async function generateIdeas(input: { niche: string; audience: string; tone: string }) {
    const result = await call("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) as { mode?: string; count?: number } | null;
    if (result) notify(`${result.count || 0} ide baru ${result.mode === "openai" ? "dibuat dengan OpenAI" : "dikurasi oleh mesin editorial lokal"}.`);
    return Boolean(result);
  }

  async function createProject(input: { ideaId?: string; brief?: string; niche: string; audience: string }) {
    const result = await call("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }) as { projectId?: string } | null;
    if (result?.projectId) {
      setSelectedId(result.projectId);
      setTab("studio");
      notify("Naskah dan storyboard tujuh adegan siap diedit.");
      requestAnimationFrame(scrollWorkspace);
      return true;
    }
    return false;
  }

  async function saveProject(id: string, patch: object) {
    const result = await call(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (result) notify("Perubahan proyek tersimpan.");
    return Boolean(result);
  }

  async function saveAsset(id: string, render: RenderResult) {
    // Preferred path: stream the rendered video straight to YouTube from the
    // device so server body-size limits (Netlify 6 MB) never apply.
    try {
      const session = await fetch(`/api/projects/${id}/upload-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size: render.blob.size, mime: render.mime }),
      });
      const payload = await session.json() as { uploadUrl?: string; error?: string };
      if (!session.ok || !payload.uploadUrl) throw new Error(payload.error || "Sesi unggah gagal.");
      const put = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": render.mime, "Content-Length": String(render.blob.size) },
        body: render.blob,
      });
      if (!put.ok) throw new Error(`Unggahan ke YouTube gagal (${put.status}).`);
      const uploaded = await put.json().catch(() => ({})) as { id?: string };
      if (!uploaded.id) throw new Error("YouTube tidak mengirim ID video.");
      const finalize = await fetch(`/api/projects/${id}/finalize-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: uploaded.id, size: render.blob.size, mime: render.mime }),
      });
      const finalized = await finalize.json() as { error?: string };
      if (!finalize.ok) throw new Error(finalized.error || "Finalisasi unggahan gagal.");
      await refreshState();
      return true;
    } catch {
      // Fallback: keep the asset on the server when it fits the 6 MB limit.
      const form = new FormData();
      form.append("video", render.blob, `laju-short.${render.mime === "video/mp4" ? "mp4" : "webm"}`);
      const result = await call(`/api/projects/${id}/asset`, { method: "POST", body: form });
      return Boolean(result);
    }
  }

  async function refreshState() {
    await call("/api/studio", undefined, true);
  }

  async function publish(id: string) {
    const result = await call(`/api/projects/${id}/publish`, { method: "POST" });
    if (result) notify("YouTube menerima video. Publikasi berhasil.");
    else await call("/api/studio", undefined, true);
    return Boolean(result);
  }

  async function schedule(id: string, date: string, enableAutomation: boolean) {
    const result = await call(`/api/projects/${id}/schedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: date, enableAutomation }) });
    if (result) notify("Jadwal tersimpan dan autopilot diaktifkan.");
    return Boolean(result);
  }

  async function removeProject(id: string) {
    const result = await call(`/api/projects/${id}`, { method: "DELETE" });
    if (result) {
      const next = state.projects.find((project) => project.id !== id);
      setSelectedId(next?.id || "");
      setTab(next ? "studio" : "ideas");
      notify("Proyek dihapus dari studio.");
    }
    return Boolean(result);
  }

  async function saveSettings(settings: Partial<StudioSettings>) {
    const result = await call("/api/studio", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    return Boolean(result);
  }

  return <MotionConfig reducedMotion="user">
    <main>
      <Hero project={state.projects[0]} state={state} onStart={() => go("ideas")} onStudio={() => go("studio")} />
      <AgentSequence projectCount={state.projects.length} ideaCount={state.ideas.length} />

      <section className="workspace" id="workspace">
        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.05 }} transition={{ duration: 0.65 }} className="workspace-heading">
          <div><span className="section-index">02 / RUANG KERJA</span><h2>Bukan sekadar rencana.<br /><em>Meja produksinya nyata.</em></h2></div>
          <div className="workspace-channel"><span className={`connection-dot ${state.channel.connected ? "connected" : ""}`} /><div><strong>{state.channel.connected ? state.channel.channelTitle : state.settings.channelName}</strong><small>{state.channel.connected ? "YouTube terhubung" : "Mode produksi lokal"}</small></div><button onClick={() => go("channel")}><Settings2 size={16} /></button></div>
        </motion.div>
        <div className="workspace-shell">
          <nav className="workspace-nav" aria-label="Navigasi studio">
            <div className="workspace-nav-brand"><span>L/</span><div><strong>LAJU OS</strong><small>CREATOR WORKSPACE</small></div></div>
            <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Buka navigasi">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
            <div className={`workspace-tab-list ${mobileMenu ? "open" : ""}`}>{TABS.map(({ id, label, icon: Icon }, index) => <button key={id} className={tab === id ? "active" : ""} onClick={() => id === "studio" && !selectedProject ? go("ideas") : go(id)}><span>0{index + 1}</span><Icon size={16} />{label}{id === "calendar" && state.projects.some((project) => project.status === "scheduled") && <i />}</button>)}</div>
            <div className="workspace-engine"><span className={state.aiMode}><Bot size={15} />{state.aiMode === "openai" ? "OpenAI" : "Local engine"}</span><small>{state.settings.autoPublish ? "Autopilot aktif" : "Autopilot nonaktif"}</small></div>
          </nav>
          <div className="workspace-content">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }}>
                {tab === "overview" && <OverviewPanel state={state} onOpenProject={openProject} onNewProject={() => go("ideas")} onChangeTab={go} />}
                {tab === "ideas" && <IdeaLab state={state} onGenerate={generateIdeas} onCreate={createProject} onArchive={async (id, status) => Boolean(await call(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }))} onDelete={async (id) => Boolean(await call(`/api/ideas/${id}`, { method: "DELETE" }))} />}
                {tab === "studio" && selectedProject && <ProjectEditor key={selectedProject.id} project={selectedProject} projects={state.projects} channel={state.channel} settings={state.settings} onSelect={setSelectedId} onSave={saveProject} onAsset={saveAsset} onPublish={publish} onSchedule={schedule} onCancelSchedule={async (id) => Boolean(await call(`/api/projects/${id}/schedule`, { method: "DELETE" }))} onDelete={removeProject} onOpenChannel={() => go("channel")} notify={notify} />}
                {tab === "calendar" && <CalendarPanel state={state} onOpenProject={openProject} onNewProject={() => go("ideas")} />}
                {tab === "channel" && <ChannelPanel state={state} onSave={saveSettings} onDisconnect={async () => { const result = await call("/api/youtube/disconnect", { method: "POST" }); if (result) notify("Token YouTube dihapus dari studio."); return Boolean(result); }} onSync={async () => { const result = await call("/api/youtube/sync", { method: "POST" }); if (result) notify("Statistik video dan subscriber diperbarui dari YouTube."); return Boolean(result); }} notify={notify} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="principles-section">
        <div className="principles-heading"><span className="section-index">03 / PRINSIP SISTEM</span><h2>Otomatis pada proses.<br /><em>Manusia pada keputusan.</em></h2></div>
        <div className="principle-grid">
          <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span>01</span><ShieldCheck size={25} /><h3>Hak pakai tetap urusanmu.</h3><p>Visual dan musik di renderer dibuat secara prosedural. Untuk materi tambahan, pastikan kamu memiliki hak. Jangan mengunggah ulang karya orang lain hanya karena alurnya bisa diotomasi.</p></motion.article>
          <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}><span>02</span><MousePointer2 size={25} /><h3>Setiap keluaran bisa dikoreksi.</h3><p>Skor ide adalah penilaian editorial, bukan prediksi viral. Baca fakta, ubah naskah, atur ulang adegan, dan periksa file asli sebelum menekan publikasi.</p></motion.article>
          <motion.article initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.16 }}><span>03</span><Gauge size={25} /><h3>Monetisasi bukan tombol.</h3><p>Laju membantu produksi dan mengukur progres. YouTube tetap menilai orisinalitas, kebijakan, audiens, serta syarat YPP. Tidak ada janji “pasti monet”.</p></motion.article>
        </div>
      </section>

      <footer><div className="footer-brand">LAJU<span>/</span></div><div><strong>Idemu. Sistemmu. Kanalmu.</strong><p>Studio Shorts otonom dengan kendali kreator.</p></div><div className="footer-links"><a href="https://support.google.com/youtube/answer/15424877" target="_blank" rel="noreferrer">Kebijakan YPP <ExternalLink size={12} /></a><a href="https://developers.google.com/youtube/v3" target="_blank" rel="noreferrer">YouTube API <ExternalLink size={12} /></a><button onClick={() => go("overview")}>Kembali ke studio <ArrowRight size={13} /></button></div><small>LAJU STUDIO · SERVER-SCHEDULED · LOCAL-FIRST RENDER</small></footer>
      <AnimatePresence>{toast && <motion.div key={toast.id} className={`toast ${toast.kind}`} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }} role="status"><span>{toast.kind === "success" ? <Check size={17} /> : <X size={17} />}</span><p>{toast.message}</p><button onClick={() => setToast(null)} aria-label="Tutup notifikasi"><X size={15} /></button></motion.div>}</AnimatePresence>
    </main>
  </MotionConfig>;
}

function Hero({ project, state, onStart, onStudio }: { project?: Project; state: StudioState; onStart: () => void; onStudio: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 170]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 260]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 0.68]);
  const visualRotate = useTransform(scrollYProgress, [0, 1], [5, reduced ? 5 : -8]);
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.35]);
  return <section className="hero" ref={ref}>
    <motion.div className="hero-backdrop" style={{ scale: backdropScale }}><div className="hero-glow one" /><div className="hero-glow two" /><div className="hero-grid" /><div className="hero-noise" /></motion.div>
    <nav className="hero-nav"><a className="brand" href="#top" aria-label="Laju Studio"><span>L/</span><strong>LAJU</strong><small>AUTONOMOUS SHORTS STUDIO</small></a><div className="hero-nav-center"><span>IDE</span><i /><span>SCRIPT</span><i /><span>RENDER</span><i /><span>PUBLISH</span></div><InstallAppButton /><button className="nav-channel" onClick={onStudio}><span className={`connection-dot ${state.channel.connected ? "connected" : ""}`} />{state.channel.connected ? "Kanal aktif" : "Buka studio"}<ArrowRight size={15} /></button></nav>
    <motion.div className="hero-content" style={{ y: contentY, opacity: contentOpacity }} id="top">
      <motion.div className="hero-kicker" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}><span><Sparkles size={14} /> AI CREATOR OPERATING SYSTEM</span><i>DIBUAT UNTUK BAHASA INDONESIA</i></motion.div>
      <h1 aria-label="Idenya. Videonya. Tayangnya. Berjalan."><span className="headline-mask"><motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}>IDENYA.</motion.span></span><span className="headline-mask"><motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>VIDEONYA.</motion.span></span><span className="headline-mask"><motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}>TAYANGNYA<span className="headline-dot">.</span> <em>BERJALAN.</em></motion.span></span></h1>
      <motion.div className="hero-bottom-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.55 }}><p>Satu brief menggerakkan empat agen: mencari sudut, menulis naskah, merender video vertikal, dan mengantre publikasi ke YouTube.</p><div className="hero-actions"><button className="button accent hero-cta" onClick={onStart}>Buat Shorts pertama <ArrowRight size={18} /></button><button className="button hero-ghost" onClick={onStudio}><Play size={16} fill="currentColor" /> Masuk ruang kerja</button></div></motion.div>
    </motion.div>
    <motion.div className="hero-visual" style={{ y: visualY, scale: visualScale, rotate: visualRotate }} initial={{ opacity: 0, x: 90, rotate: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}><HeroFilm project={project} /><motion.div className="floating-agent-card script" animate={reduced ? {} : { y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}><span><PenLine size={15} /></span><div><small>AGEN 02 / SELESAI</small><strong>{project?.scenes.length || 0} adegan ditulis</strong></div><Check size={15} /></motion.div><motion.div className="floating-agent-card render" animate={reduced ? {} : { y: [0, 9, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}><span><Film size={15} /></span><div><small>RENDER ENGINE</small><strong>9:16 · 24 FPS</strong></div><i className="equalizer"><b /><b /><b /><b /></i></motion.div><div className="hero-project-label"><span>PROYEK TERBARU</span><strong>{project?.title || "Belum ada proyek"}</strong></div></motion.div>
    <motion.div className="hero-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}><div><strong>04</strong><span>Agen yang bisa<br />kamu kendalikan</span></div><div><strong>9:16</strong><span>Video vertikal<br />siap unggah</span></div><div><strong>60<small>s</small></strong><span>Durasi produksi<br />per Shorts</span></div><div className="hero-scroll"><ArrowDown size={18} /><span>SCROLL UNTUK<br />MELIHAT ALURNYA</span></div></motion.div>
  </section>;
}

function HeroFilm({ project }: { project?: Project }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!project || !canvas.current) return;
    let frame = 0;
    const start = performance.now();
    const duration = projectDuration(project);
    const draw = (now: number) => {
      const ctx = canvas.current?.getContext("2d");
      if (ctx) drawShortFrame(ctx, project, reduced ? 0.5 : ((now - start) / 1000) % duration, 720, 1280, !reduced);
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [project, reduced]);
  return <div className="hero-phone"><div className="hero-phone-bar"><span>LAJU PLAYER</span><i /><i /><i /></div>{project ? <canvas ref={canvas} width={720} height={1280} /> : <div className="hero-empty"><Clapperboard size={40} /><span>Proyek pertamamu<br />akan tampil di sini.</span></div>}<div className="hero-phone-controls"><Play size={13} fill="currentColor" /><div><i /></div><span>00:{String(Math.round(project ? projectDuration(project) : 0)).padStart(2, "0")}</span></div></div>;
}

const AGENTS = [
  { number: "01", title: "Perancang ide", subtitle: "SCOUT", copy: "Mengolah niche dan audiens menjadi sudut, hook, serta tiga poin yang layak dibicarakan.", icon: Lightbulb },
  { number: "02", title: "Penulis naskah", subtitle: "WRITER", copy: "Menyusun ritme tujuh adegan, narasi, subtitle, deskripsi, CTA, dan tag dalam bahasa Indonesia.", icon: PenLine },
  { number: "03", title: "Sutradara visual", subtitle: "DIRECTOR", copy: "Menggambar setiap frame, komposisi, gerak, warna, tipografi, dan musik menjadi video nyata.", icon: Clapperboard },
  { number: "04", title: "Penerbit", subtitle: "PUBLISHER", copy: "Menyimpan aset, membaca jadwal, memakai OAuth resmi, dan mencatat respons YouTube apa adanya.", icon: UploadCloud },
];

function AgentSequence({ projectCount, ideaCount }: { projectCount: number; ideaCount: number }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const firstTitle = useTransform(scrollYProgress, [0, 0.35, 0.55], [1, 1, 0]);
  const secondTitle = useTransform(scrollYProgress, [0.4, 0.65], [0, 1]);
  const lineScale = useTransform(scrollYProgress, [0.25, 0.85], [0, 1]);
  return <section className="agent-sequence" ref={ref}><div className="agent-sticky"><div className="agent-heading"><span className="section-index">01 / SISTEM AGEN</span><div className="agent-title-wrap"><motion.h2 style={{ opacity: firstTitle }}>Empat peran.<br /><em>Satu ruang kerja.</em></motion.h2><motion.h2 style={{ opacity: secondTitle }}>Berkatamu.<br /><em>Menjadi alur.</em></motion.h2></div><p>Bukan empat demo yang terpisah. Ide yang sama mengalir ke naskah, frame, file, dan jadwal—dengan data yang bisa diperiksa di setiap perpindahan.</p></div><div className="agent-stage"><motion.div className="agent-spine" style={{ scaleY: lineScale }} />{AGENTS.map((agent, index) => <AgentCard key={agent.number} agent={agent} index={index} progress={scrollYProgress} reduced={Boolean(reduced)} />)}<div className="agent-output"><span><Cloud size={16} /> OUTPUT TERHUBUNG</span><strong>{ideaCount} ide · {projectCount} proyek</strong><small>PostgreSQL / satu sumber kebenaran</small></div></div></div></section>;
}

function AgentCard({ agent, index, progress, reduced }: { agent: typeof AGENTS[number]; index: number; progress: MotionValue<number>; reduced: boolean }) {
  const starts = [-28, 28, -28, 28];
  const x = useTransform(progress, [0.12 + index * 0.04, 0.7], [0, reduced ? 0 : starts[index]]);
  const y = useTransform(progress, [0.12 + index * 0.04, 0.7], [0, reduced ? 0 : index * 16 - 24]);
  const rotate = useTransform(progress, [0.15, 0.72], [0, reduced ? 0 : index % 2 ? 3 : -3]);
  const scale = useTransform(progress, [0.15, 0.72], [1, reduced ? 1 : 0.9]);
  const Icon = agent.icon;
  return <motion.article className={`agent-card agent-${index + 1}`} style={{ x, y, rotate, scale }}><div className="agent-card-head"><span>{agent.number}</span><small>{agent.subtitle}</small><Icon size={19} /></div><h3>{agent.title}</h3><p>{agent.copy}</p><div className="agent-card-status"><i /><span>SIAP MENERIMA INPUT</span><ChevronRight size={14} /></div></motion.article>;
}
