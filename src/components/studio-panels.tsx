"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Archive, ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, Cloud, ExternalLink, Eye, FilePlus2, Film, FlaskConical, Heart, Lightbulb, Link2, LoaderCircle, MessageSquare, RefreshCw, Rocket, Search, Settings2, ShieldCheck, Sparkles, Trash2, Unplug, Users, WandSparkles, X } from "lucide-react";
import { NICHE_OPTIONS } from "@/lib/content-options";
import type { Activity, ChannelState, Idea, Project, StudioSettings, StudioState } from "@/lib/types";

const STATUS_LABELS: Record<Project["status"], string> = { draft: "Draf", ready: "Siap", scheduled: "Terjadwal", publishing: "Mengunggah", published: "Tayang", failed: "Gagal" };
const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function OverviewPanel({ state, onOpenProject, onNewProject, onChangeTab }: { state: StudioState; onOpenProject: (id: string) => void; onNewProject: () => void; onChangeTab: (tab: "ideas" | "calendar" | "channel") => void }) {
  const published = state.projects.filter((project) => project.status === "published");
  const scheduled = state.projects.filter((project) => project.status === "scheduled");
  const ready = state.projects.filter((project) => project.status === "ready");
  const views = state.projects.reduce((sum, project) => sum + project.views, 0);
  return <div className="overview-panel enter-panel">
    <div className="metric-grid">
      <button className="metric-card dark" onClick={onNewProject}><span>PRODUKSI</span><strong>{state.projects.length.toString().padStart(2, "0")}</strong><p>proyek dalam satu ruang kerja</p><ArrowRight size={20} /></button>
      <button className="metric-card" onClick={() => onChangeTab("calendar")}><span>ANTREAN</span><strong>{scheduled.length.toString().padStart(2, "0")}</strong><p>{ready.length} video siap · {scheduled.length} terjadwal</p><CalendarDays size={20} /></button>
      <button className="metric-card" onClick={() => onChangeTab("channel")}><span>TAYANG</span><strong>{published.length.toString().padStart(2, "0")}</strong><p>diunggah melalui studio ini</p><Rocket size={20} /></button>
      <button className="metric-card accent-card" onClick={() => onChangeTab("channel")}><span>JANGKAUAN TERVERIFIKASI</span><strong>{new Intl.NumberFormat("id-ID", { notation: views > 9999 ? "compact" : "standard" }).format(views)}</strong><p>tayangan dari sinkronisasi YouTube</p><BarChart3 size={20} /></button>
    </div>
    <div className="overview-columns">
      <section className="library-card">
        <div className="section-mini-head"><div><span className="eyebrow">PAPAN PRODUKSI</span><h3>Semua pekerjaan, tanpa kotak hitam.</h3></div><button className="button ghost small" onClick={onNewProject}><FilePlus2 size={15} /> Proyek baru</button></div>
        <div className="project-table">
          <div className="project-table-head"><span>Proyek</span><span>Status</span><span>Statistik</span><span /></div>
          {state.projects.slice(0, 7).map((project, index) => <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} key={project.id} className="project-row" onClick={() => onOpenProject(project.id)}>
            <span className={`project-mini-art ${project.theme}`}><Film size={18} /><i>{project.scenes.length}</i></span>
            <span className="project-row-title"><strong>{project.title}</strong><small>{project.niche} · {project.scenes.reduce((sum, scene) => sum + scene.duration, 0).toFixed(0)} dtk · diperbarui {dateFormat.format(new Date(project.updatedAt))}</small></span>
            <span className={`status-pill status-${project.status}`}><i />{STATUS_LABELS[project.status]}</span>
            <span className="project-row-stats">{project.status === "published" ? <><span><Eye size={13} />{project.views}</span><span><Heart size={13} />{project.likes}</span></> : <small>{project.hasVideo ? `${(project.renderSize / 1048576).toFixed(1)} MB` : "Belum dirender"}</small>}</span>
            <ArrowRight size={16} />
          </motion.button>)}
        </div>
      </section>
      <ActivityFeed activities={state.activities} />
    </div>
  </div>;
}

export function ActivityFeed({ activities, expanded = false }: { activities: Activity[]; expanded?: boolean }) {
  return <section className={`activity-card ${expanded ? "expanded" : ""}`}>
    <div className="section-mini-head"><div><span className="eyebrow">LOG AKTIVITAS</span><h3>Jejak agen</h3></div><span className="live-dot"><i /> LIVE DATA</span></div>
    <div className="activity-list">{activities.length ? activities.slice(0, expanded ? 30 : 8).map((activity) => <div className="activity-item" key={activity.id}><span className={`activity-icon ${activity.kind}`}>{activity.kind === "publish" ? <Rocket size={14} /> : activity.kind === "idea" ? <Lightbulb size={14} /> : activity.kind === "render" ? <Film size={14} /> : activity.kind === "error" ? <X size={14} /> : <Check size={14} />}</span><div><p>{activity.message}</p><small>{dateFormat.format(new Date(activity.createdAt))}</small></div></div>) : <p className="empty-copy">Aktivitas akan muncul setelah agen bekerja.</p>}</div>
  </section>;
}

export function IdeaLab({ state, onGenerate, onCreate, onArchive, onDelete }: {
  state: StudioState;
  onGenerate: (input: { niche: string; audience: string; tone: string }) => Promise<boolean>;
  onCreate: (input: { ideaId?: string; brief?: string; niche: string; audience: string }) => Promise<boolean>;
  onArchive: (id: string, status: Idea["status"]) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [niche, setNiche] = useState(state.settings.niche);
  const [audience, setAudience] = useState(state.settings.audience);
  const [tone, setTone] = useState(state.settings.tone);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"fresh" | "used" | "archived" | "all">("fresh");
  const [expanded, setExpanded] = useState<string | null>(null);
  const visible = state.ideas.filter((idea) => filter === "all" || idea.status === filter);
  async function generate() { setBusy(true); await onGenerate({ niche, audience, tone }); setBusy(false); }
  async function create(input: { ideaId?: string; brief?: string }) { setBusy(true); const ok = await onCreate({ ...input, niche, audience }); setBusy(false); if (ok && input.brief) setBrief(""); }
  return <div className="idea-lab enter-panel">
    <section className="idea-console">
      <div className="console-heading"><div><span className="eyebrow">AGEN 01 / PERANCANG IDE</span><h3>Beri arah. Agen mengisi sisanya.</h3></div><span className={`engine-badge ${state.aiMode}`}><Sparkles size={14} />{state.aiMode === "openai" ? "OpenAI aktif" : "Mesin editorial lokal"}</span></div>
      <div className="field-row three"><label className="field"><span>Niche</span><select value={niche} onChange={(event) => setNiche(event.target.value)}>{NICHE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label className="field"><span>Audiens</span><input value={audience} onChange={(event) => setAudience(event.target.value)} /></label><label className="field"><span>Nada bicara</span><input value={tone} onChange={(event) => setTone(event.target.value)} /></label></div>
      <div className="console-bottom"><p>{state.aiMode === "local" ? "Mode lokal mengkurasi bank editorial orisinal, bukan mengambil data tren live. Hubungkan OPENAI_API_KEY untuk ide generatif baru." : "Model membuat ide baru berdasarkan niche, audiens, nada, dan benih variasi."}</p><button className="button accent" disabled={busy} onClick={generate}>{busy ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />} Cari 5 ide baru</button></div>
    </section>
    <section className="brief-console"><div><span className="eyebrow">ATAU MULAI DARI BRIEF SENDIRI</span><h3>Sudah punya topik?</h3></div><textarea rows={3} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Judul/topik; poin pertama yang spesifik; poin kedua; poin ketiga" /><div><small>Pisahkan tiga poin dengan titik koma agar mesin lokal menghasilkan naskah yang lebih tajam.</small><button className="button ink" disabled={busy || brief.trim().length < 8} onClick={() => create({ brief })}>Buat storyboard <ArrowRight size={16} /></button></div></section>
    <div className="idea-list-heading"><div><span className="eyebrow">IDE BANK / {state.ideas.length} ENTRI</span><h3>Pilih sudut yang layak diproduksi.</h3></div><div className="filter-pills">{(["fresh", "used", "archived", "all"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "fresh" ? "Segar" : item === "used" ? "Diproses" : item === "archived" ? "Arsip" : "Semua"}</button>)}</div></div>
    <motion.div layout className="idea-grid"><AnimatePresence mode="popLayout">{visible.map((idea) => <motion.article layout initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ type: "spring", stiffness: 320, damping: 28 }} className="idea-card" key={idea.id}>
      <div className="idea-card-top"><span className="idea-niche">{idea.niche}</span><span className="idea-score"><strong>{idea.score}</strong>/100 <i>potensi editorial</i></span></div>
      <h3>{idea.title}</h3><p className="idea-hook">“{idea.hook}”</p><div className="keyword-row">{idea.keywords.slice(0, 3).map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
      <button className="idea-detail-toggle" onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}>Lihat alasan & 3 poin <ChevronDown size={15} className={expanded === idea.id ? "rotated" : ""} /></button>
      <AnimatePresence>{expanded === idea.id && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="idea-details"><p>{idea.rationale}</p><ol>{idea.points.map((point) => <li key={point}>{point}</li>)}</ol><small>Sumber: {idea.source}</small></motion.div>}</AnimatePresence>
      <div className="idea-card-actions"><button className="button ink full" disabled={busy} onClick={() => create({ ideaId: idea.id })}>Tulis naskah <ArrowRight size={15} /></button><button className="icon-button" title={idea.status === "archived" ? "Keluarkan dari arsip" : "Arsipkan"} onClick={() => onArchive(idea.id, idea.status === "archived" ? "fresh" : "archived")}>{idea.status === "archived" ? <RefreshCw size={15} /> : <Archive size={15} />}</button><button className="icon-button subtle-danger" title="Hapus ide" onClick={() => onDelete(idea.id)}><Trash2 size={15} /></button></div>
    </motion.article>)}</AnimatePresence></motion.div>
    {!visible.length && <div className="empty-state"><Search size={28} /><h3>Tidak ada ide di filter ini.</h3><p>Cari ide baru atau pindah ke kategori lain.</p></div>}
  </div>;
}

export function CalendarPanel({ state, onOpenProject, onNewProject }: { state: StudioState; onOpenProject: (id: string) => void; onNewProject: () => void }) {
  const [view, setView] = useState<"queue" | "activity">("queue");
  const scheduled = state.projects.filter((project) => project.scheduledAt).sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const published = state.projects.filter((project) => project.status === "published");
  return <div className="calendar-panel enter-panel">
    <div className="calendar-summary"><div><span className="eyebrow">PUBLISHING CONTROL</span><h3>Ritme yang bisa kamu periksa.</h3><p>Autopilot hanya memproses proyek berstatus terjadwal yang memiliki file video. Unggahan gagal tetap tercatat dan tidak disamarkan.</p></div><div className={`autopilot-orb ${state.settings.autoPublish && state.channel.connected ? "on" : ""}`}><i /><strong>{state.settings.autoPublish ? "AUTOPILOT ON" : "AUTOPILOT OFF"}</strong><span>{state.channel.connected ? state.channel.channelTitle : "Kanal belum terhubung"}</span></div></div>
    <div className="editor-tabs inner-tabs"><button className={view === "queue" ? "active" : ""} onClick={() => setView("queue")}><CalendarDays size={16} /> Antrean & riwayat</button><button className={view === "activity" ? "active" : ""} onClick={() => setView("activity")}><Clock3 size={16} /> Log sistem</button></div>
    {view === "activity" ? <ActivityFeed activities={state.activities} expanded /> : <>
      <section className="schedule-section"><div className="section-mini-head"><div><span className="eyebrow">BERIKUTNYA</span><h3>{scheduled.length} publikasi terjadwal</h3></div><Clock3 size={20} /></div>
        {scheduled.length ? <div className="schedule-timeline">{scheduled.map((project) => <button key={project.id} onClick={() => onOpenProject(project.id)} className="schedule-item"><div className="schedule-date"><strong>{new Intl.DateTimeFormat("id-ID", { day: "2-digit" }).format(new Date(project.scheduledAt!))}</strong><span>{new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(project.scheduledAt!))}</span></div><i /><div><strong>{project.title}</strong><span>{dateFormat.format(new Date(project.scheduledAt!))} · {project.privacy}</span></div><span className="status-pill status-scheduled"><i />{project.hasVideo ? "File siap" : "File hilang"}</span><ArrowRight size={16} /></button>)}</div> : <div className="empty-state horizontal"><CalendarDays size={25} /><div><h3>Belum ada antrean.</h3><p>Render proyek, lalu pilih waktu pada tab Publikasi.</p></div><button className="button ghost small" onClick={onNewProject}>Buka proyek</button></div>}
      </section>
      <section className="schedule-section"><div className="section-mini-head"><div><span className="eyebrow">RIWAYAT TAYANG</span><h3>{published.length} video diunggah</h3></div></div>{published.length ? <div className="published-grid">{published.map((project) => <button key={project.id} onClick={() => onOpenProject(project.id)}><span className={`project-mini-art ${project.theme}`}><Film size={18} /></span><strong>{project.title}</strong><small>{project.publishedAt ? dateFormat.format(new Date(project.publishedAt)) : "Sudah tayang"}</small><div><span><Eye size={13} />{project.views}</span><span><Heart size={13} />{project.likes}</span><span><MessageSquare size={13} />{project.comments}</span></div></button>)}</div> : <p className="empty-copy padded">Belum ada video yang diunggah melalui studio. Angka performa tidak diisi dengan data contoh.</p>}</section>
    </>}
  </div>;
}

export function ChannelPanel({ state, onSave, onDisconnect, onSync, notify }: { state: StudioState; onSave: (settings: Partial<StudioSettings>) => Promise<boolean>; onDisconnect: () => Promise<boolean>; onSync: () => Promise<boolean>; notify: (message: string, kind?: "success" | "error") => void }) {
  const [settings, setSettings] = useState(state.settings);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");
  useEffect(() => { setSettings(state.settings); }, [state.settings]);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  async function save() { setSaving(true); const ok = await onSave(settings); setSaving(false); if (ok) notify("Pengaturan kanal dan monetisasi tersimpan."); }
  async function sync() { setSyncing(true); await onSync(); setSyncing(false); }
  const m = settings.monetization;
  const shortsPath = Math.min(m.subscribers / 1000, 1) * 0.5 + Math.min(m.shortsViews90d / 10_000_000, 1) * 0.5;
  const watchPath = Math.min(m.subscribers / 1000, 1) * 0.5 + Math.min(m.watchHours365d / 4000, 1) * 0.5;
  const monetizationPercent = Math.round(Math.max(shortsPath, watchPath) * 100);
  function metric(key: keyof typeof m, value: number | boolean) { setSettings((current) => ({ ...current, monetization: { ...current.monetization, [key]: value } })); }
  return <div className="channel-panel enter-panel">
    <section className="channel-settings-card"><div className="section-mini-head"><div><span className="eyebrow">KANAL & DEFAULT PRODUKSI</span><h3>Identitas yang dipakai setiap agen.</h3></div><Settings2 size={21} /></div>
      <div className="field-row two"><label className="field"><span>Nama kanal</span><input value={settings.channelName} onChange={(event) => setSettings({ ...settings, channelName: event.target.value })} /></label><label className="field"><span>Niche utama</span><select value={settings.niche} onChange={(event) => setSettings({ ...settings, niche: event.target.value })}>{NICHE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label></div>
      <label className="field"><span>Audiens default</span><input value={settings.audience} onChange={(event) => setSettings({ ...settings, audience: event.target.value })} /></label>
      <label className="field"><span>Nada editorial</span><input value={settings.tone} onChange={(event) => setSettings({ ...settings, tone: event.target.value })} /></label>
      <div className="field-row three"><label className="field"><span>Jam tayang default</span><input type="time" value={settings.postingTime} onChange={(event) => setSettings({ ...settings, postingTime: event.target.value })} /></label><label className="field"><span>Zona waktu</span><select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}><option>Asia/Jakarta</option><option>Asia/Makassar</option><option>Asia/Jayapura</option><option>UTC</option></select></label><label className="toggle-field"><span><strong>Autopilot</strong><small>Proses jadwal jatuh tempo</small></span><input type="checkbox" checked={settings.autoPublish} onChange={(event) => setSettings({ ...settings, autoPublish: event.target.checked })} /><i /></label></div>
      <button className="button ink" disabled={saving} onClick={save}>{saving ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />} Simpan semua pengaturan</button>
    </section>

    <section className="integration-card" id="integrations"><div className="section-mini-head"><div><span className="eyebrow">INTEGRASI RESMI</span><h3>YouTube Data API v3</h3></div><span className={`connection-badge ${state.channel.connected ? "connected" : ""}`}><i />{state.channel.connected ? "Terhubung" : "Belum terhubung"}</span></div>
      {state.channel.connected ? <div className="connected-channel"><span className="channel-avatar"><Users size={24} /></span><div><strong>{state.channel.channelTitle || "Kanal YouTube"}</strong><small>{state.channel.channelId || "ID kanal tidak tersedia"}</small></div><CheckCircle2 size={23} /></div> : <div className="connection-explainer"><Link2 size={25} /><div><strong>Satu kali hubungkan. Selanjutnya agen bisa mengunggah.</strong><p>OAuth meminta izin <code>youtube.upload</code> dan <code>youtube.readonly</code>. Laju tidak menerima password Googlemu.</p></div></div>}
      <div className="integration-actions">{state.channel.connected ? <><button className="button ghost" disabled={syncing} onClick={sync}><RefreshCw size={16} className={syncing ? "spin" : ""} /> Sinkronkan statistik</button><button className="button danger-ghost" onClick={onDisconnect}><Unplug size={16} /> Putuskan</button></> : state.channel.configured ? <a className="button accent" href="/api/youtube/connect"><Link2 size={16} /> Hubungkan dengan Google</a> : <span className="config-missing"><Circle size={10} fill="currentColor" /> Kredensial server belum tersedia</span>}</div>
      {!state.channel.configured && <details className="setup-details"><summary>Lihat 4 langkah aktivasi <ChevronDown size={16} /></summary><ol><li>Buat proyek di <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console <ExternalLink size={12} /></a>, lalu aktifkan <strong>YouTube Data API v3</strong>.</li><li>Siapkan OAuth consent screen dan buat OAuth Client tipe <strong>Web application</strong>.</li><li>Tambahkan Authorized redirect URI: <code>{origin}/api/youtube/callback</code><button title="Salin redirect URI" onClick={() => { navigator.clipboard.writeText(`${origin}/api/youtube/callback`); notify("Redirect URI disalin."); }}><CopyIcon /></button></li><li>Di environment server, isi <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code>, dan <code>NEXT_PUBLIC_APP_URL={origin}</code>. Jangan taruh secret di browser.</li></ol><p>Tanpa kredensial, render, penyimpanan, jadwal lokal, dan unduhan tetap berfungsi; unggahan YouTube sengaja tidak dipalsukan.</p></details>}
      <div className="quota-note"><ShieldCheck size={17} /><p>Unggahan memakai kuota proyek Google Cloud. Aplikasi pihak ketiga bukan jaminan video langsung berstatus Shorts atau lolos monetisasi; YouTube yang menilai format, kebijakan, dan kelayakan kanal.</p></div>
    </section>

    <section className="monetization-card"><div className="monetization-head"><div><span className="eyebrow">PETA JALAN / BUKAN JAMINAN</span><h3>Menuju YouTube Partner Program.</h3><p>Masukkan angka dari YouTube Studio secara berkala. Progress dihitung dari data ini, bukan estimasi palsu.</p></div><div className="monetization-score"><strong>{monetizationPercent}%</strong><span>jarak terdekat ke syarat utama</span></div></div>
      <div className="monetization-paths"><div><span>JALUR SHORTS</span><strong>1.000 subscriber + 10 juta tayangan Shorts publik valid / 90 hari</strong><Progress value={m.subscribers} max={1000} label={`${m.subscribers.toLocaleString("id-ID")} / 1.000 subscriber`} /><Progress value={m.shortsViews90d} max={10_000_000} label={`${m.shortsViews90d.toLocaleString("id-ID")} / 10 juta tayangan`} /></div><div><span>JALUR VIDEO PANJANG</span><strong>1.000 subscriber + 4.000 jam tonton publik valid / 12 bulan</strong><Progress value={m.subscribers} max={1000} label={`${m.subscribers.toLocaleString("id-ID")} / 1.000 subscriber`} /><Progress value={m.watchHours365d} max={4000} label={`${m.watchHours365d.toLocaleString("id-ID")} / 4.000 jam`} /></div></div>
      <div className="metric-input-grid"><label><span>Subscriber</span><input type="number" min={0} value={m.subscribers} onChange={(event) => metric("subscribers", Number(event.target.value))} /></label><label><span>Tayangan Shorts · 90 hari</span><input type="number" min={0} value={m.shortsViews90d} onChange={(event) => metric("shortsViews90d", Number(event.target.value))} /></label><label><span>Jam tonton · 365 hari</span><input type="number" min={0} value={m.watchHours365d} onChange={(event) => metric("watchHours365d", Number(event.target.value))} /></label><label><span>Unggahan publik · 90 hari</span><input type="number" min={0} value={m.publicUploads90d} onChange={(event) => metric("publicUploads90d", Number(event.target.value))} /></label></div>
      <div className="readiness-grid">{([["twoStepVerification", "Verifikasi 2 langkah aktif"], ["advancedFeatures", "Fitur lanjutan kanal aktif"], ["adsenseReady", "AdSense siap ditautkan"], ["originalContent", "Konten orisinal & punya hak pakai"]] as const).map(([key, label]) => <label key={key} className={m[key] ? "checked" : ""}><input type="checkbox" checked={m[key]} onChange={(event) => metric(key, event.target.checked)} />{m[key] ? <CheckCircle2 size={18} /> : <Circle size={18} />}<span>{label}</span></label>)}</div>
      <div className="monetization-footer"><p>Pada wilayah yang mendukung, tingkat YPP lebih awal dapat menawarkan fitur pendanaan penggemar dengan syarat berbeda (umumnya 500 subscriber, 3 unggahan publik/90 hari, dan ambang tayangan/jam tonton tertentu). Iklan penuh tetap mengikuti ambang utama di atas. <a href="https://support.google.com/youtube/answer/72851" target="_blank" rel="noreferrer">Periksa syarat resmi terbaru <ExternalLink size={12} /></a>.</p><button className="button ink" onClick={save}>Simpan progres</button></div>
    </section>
  </div>;
}

function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="eligibility-progress"><div><span>{label}</span><strong>{Math.min(100, Math.round(value / max * 100))}%</strong></div><div><i style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div></div>;
}

function CopyIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>; }
