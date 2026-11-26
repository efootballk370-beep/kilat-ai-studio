"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarClock, Check, ChevronDown, Clipboard, Copy, Download, ExternalLink, FileText, Film, LoaderCircle, Music2, Plus, Save, Send, Square, Trash2, Type, WandSparkles, X } from "lucide-react";
import type { ChannelState, Project, Scene, StudioSettings, VisualKind } from "@/lib/types";
import { projectDuration, renderProjectVideo, type RenderResult } from "@/lib/video-renderer";
import { ShortsPreview } from "@/components/shorts-preview";

const VISUAL_LABELS: Record<VisualKind, string> = { burst: "Ledakan radial", orbit: "Orbit kata", steps: "Langkah berurutan", compare: "Perbandingan", stat: "Angka bergerak", waves: "Gelombang data" };
const STATUS_LABELS: Record<Project["status"], string> = { draft: "Draf", ready: "Siap tayang", scheduled: "Terjadwal", publishing: "Mengunggah", published: "Sudah tayang", failed: "Perlu tindakan" };

type Patch = Partial<Pick<Project, "title" | "description" | "scenes" | "tags" | "theme" | "music" | "captions" | "privacy">>;

interface Props {
  project: Project;
  projects: Project[];
  channel: ChannelState;
  settings: StudioSettings;
  onSelect: (id: string) => void;
  onSave: (id: string, patch: Patch) => Promise<boolean>;
  onAsset: (id: string, result: RenderResult) => Promise<boolean>;
  onPublish: (id: string) => Promise<boolean>;
  onSchedule: (id: string, date: string, enableAutomation: boolean) => Promise<boolean>;
  onCancelSchedule: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onOpenChannel: () => void;
  notify: (message: string, kind?: "success" | "error") => void;
}

export function ProjectEditor(props: Props) {
  const { project, channel, settings } = props;
  const [draft, setDraft] = useState(project);
  const [tab, setTab] = useState<"script" | "design" | "publish">("script");
  const [selectedId, setSelectedId] = useState(project.scenes[0]?.id || "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [quality, setQuality] = useState<"720" | "1080">("720");
  const [lastRender, setLastRender] = useState<RenderResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const selectedIndex = Math.max(0, draft.scenes.findIndex((scene) => scene.id === selectedId));
  const selected = draft.scenes[selectedIndex];
  const duration = projectDuration(draft);

  useEffect(() => {
    setDraft(project);
    setDirty(false);
    setSelectedId((current) => project.scenes.some((scene) => scene.id === current) ? current : project.scenes[0]?.id || "");
  }, [project]);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const [hour, minute] = settings.postingTime.split(":").map(Number);
    date.setHours(hour || 19, minute || 30, 0, 0);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    setScheduleDate(local);
  }, [settings.postingTime]);

  function mutate(patch: Partial<Project>) {
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
    setDirty(true);
  }

  function updateScene(patch: Partial<Scene>) {
    if (!selected) return;
    mutate({ scenes: draft.scenes.map((scene) => scene.id === selected.id ? { ...scene, ...patch } : scene) });
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    const ok = await props.onSave(project.id, {
      title: draft.title,
      description: draft.description,
      scenes: draft.scenes,
      tags: draft.tags,
      theme: draft.theme,
      music: draft.music,
      captions: draft.captions,
      privacy: draft.privacy,
    });
    setSaving(false);
    if (ok) setDirty(false);
    return ok;
  }

  function addScene() {
    const scene: Scene = { id: crypto.randomUUID(), heading: "Adegan baru", narration: "Tulis narasi yang spesifik untuk adegan ini.", caption: "Pesan utama di adegan ini.", duration: 4, visual: "waves", accent: "#d9ff63", items: ["Poin satu", "Poin dua"] };
    const scenes = [...draft.scenes];
    scenes.splice(selectedIndex + 1, 0, scene);
    mutate({ scenes });
    setSelectedId(scene.id);
  }

  function duplicateScene() {
    if (!selected) return;
    const copy = { ...selected, id: crypto.randomUUID(), heading: `${selected.heading} (salinan)` };
    const scenes = [...draft.scenes];
    scenes.splice(selectedIndex + 1, 0, copy);
    mutate({ scenes });
    setSelectedId(copy.id);
  }

  function deleteScene() {
    if (!selected || draft.scenes.length === 1) return;
    const scenes = draft.scenes.filter((scene) => scene.id !== selected.id);
    mutate({ scenes });
    setSelectedId(scenes[Math.max(0, selectedIndex - 1)].id);
  }

  function moveScene(direction: -1 | 1) {
    const target = selectedIndex + direction;
    if (target < 0 || target >= draft.scenes.length) return;
    const scenes = [...draft.scenes];
    [scenes[selectedIndex], scenes[target]] = [scenes[target], scenes[selectedIndex]];
    mutate({ scenes });
  }

  async function startRender() {
    if (dirty) {
      const saved = await save();
      if (!saved) return;
    }
    setRendering(true);
    setProgress(0);
    setLastRender(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const size = quality === "1080" ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
      const result = await renderProjectVideo(draft, { ...size, fps: 24, signal: controller.signal, onProgress: (value, label) => { setProgress(value); setProgressLabel(label); } });
      setLastRender(result);
      setProgressLabel("Menyimpan video ke studio…");
      setProgress(0.99);
      const stored = await props.onAsset(project.id, result);
      if (!stored) throw new Error("Video berhasil dibuat tetapi gagal disimpan. Unduh file lokal agar tidak hilang.");
      props.notify(`${result.mime === "video/mp4" ? "MP4" : "WebM"} berhasil dirender dan disimpan${result.hasAudio ? " dengan musik" : " tanpa audio"}.`);
      setTab("publish");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") props.notify("Render dibatalkan. Storyboard tetap tersimpan.");
      else props.notify(error instanceof Error ? error.message : "Render gagal.", "error");
    } finally {
      setRendering(false);
      abortRef.current = null;
    }
  }

  function downloadLocal() {
    if (!lastRender) return;
    const extension = lastRender.mime === "video/mp4" ? "mp4" : "webm";
    const url = URL.createObjectURL(lastRender.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draft.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${extension}`;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    props.notify("Jika unduhan tidak muncul, jendela baru berisi video telah dibuka. Tahan video lalu pilih Simpan.");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function exportScript() {
    const content = `${draft.title}\n${"=".repeat(draft.title.length)}\n\nDURASI: ${duration.toFixed(1)} detik\nFORMAT: 9:16 YouTube Shorts\n\n${draft.scenes.map((scene, index) => `ADEGAN ${index + 1} — ${scene.heading} (${scene.duration}s)\nVisual: ${VISUAL_LABELS[scene.visual]}\nNarasi: ${scene.narration}\nSubtitle: ${scene.caption}`).join("\n\n")}\n\nDESKRIPSI\n${draft.description}\n\nTAG\n${draft.tags.join(", ")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `naskah-${draft.id}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function publishNow() {
    setPublishing(true);
    await props.onPublish(project.id);
    setPublishing(false);
  }

  const nextScheduleLabel = useMemo(() => scheduleDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date(scheduleDate)) : "Pilih tanggal", [scheduleDate]);

  return (
    <section className="editor-workspace" id="editor">
      <div className="editor-topbar">
        <div className="project-picker-wrap">
          <span className="eyebrow">PROYEK AKTIF</span>
          <div className="select-with-icon">
            <select value={project.id} onChange={(event) => props.onSelect(event.target.value)} aria-label="Pilih proyek">
              {props.projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>
        <div className="editor-top-actions">
          <span className={`status-pill status-${project.status}`}><i />{STATUS_LABELS[project.status]}</span>
          <button className="button ghost small" onClick={exportScript}><FileText size={15} /> Naskah .txt</button>
          <button className="button ink small" disabled={!dirty || saving} onClick={save}>{saving ? <LoaderCircle className="spin" size={15} /> : dirty ? <Save size={15} /> : <Check size={15} />}{saving ? "Menyimpan" : dirty ? "Simpan" : "Tersimpan"}</button>
        </div>
      </div>

      <div className="editor-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "script"} className={tab === "script" ? "active" : ""} onClick={() => setTab("script")}><Type size={16} /><span>01</span> Naskah & adegan</button>
        <button role="tab" aria-selected={tab === "design"} className={tab === "design" ? "active" : ""} onClick={() => setTab("design")}><Film size={16} /><span>02</span> Visual & render</button>
        <button role="tab" aria-selected={tab === "publish"} className={tab === "publish" ? "active" : ""} onClick={() => setTab("publish")}><Send size={16} /><span>03</span> Publikasi</button>
      </div>

      <div className="editor-grid">
        <div className="editor-panel">
          {tab === "script" && <div className="tab-scene enter-panel">
            <div className="scene-rail-header"><div><span className="eyebrow">TIMELINE</span><strong>{draft.scenes.length} adegan · {duration.toFixed(1)} detik</strong></div><button className="icon-button" onClick={addScene} title="Tambah adegan"><Plus size={18} /></button></div>
            <div className="scene-rail">
              {draft.scenes.map((scene, index) => <button key={scene.id} className={`scene-chip ${selected?.id === scene.id ? "active" : ""}`} onClick={() => setSelectedId(scene.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{scene.heading}</strong><small>{scene.duration}s · {VISUAL_LABELS[scene.visual]}</small></div><i style={{ background: scene.accent }} />
              </button>)}
            </div>
            {selected && <div className="scene-form">
              <div className="scene-form-heading"><div><span className="eyebrow">ADEGAN {String(selectedIndex + 1).padStart(2, "0")}</span><h3>{selected.heading}</h3></div><div className="scene-tools"><button onClick={() => moveScene(-1)} disabled={selectedIndex === 0} title="Geser ke atas"><ArrowUp size={15} /></button><button onClick={() => moveScene(1)} disabled={selectedIndex === draft.scenes.length - 1} title="Geser ke bawah"><ArrowDown size={15} /></button><button onClick={duplicateScene} title="Duplikasi"><Copy size={15} /></button><button onClick={deleteScene} disabled={draft.scenes.length === 1} title="Hapus"><Trash2 size={15} /></button></div></div>
              <label className="field"><span>Judul adegan</span><input value={selected.heading} maxLength={120} onChange={(event) => updateScene({ heading: event.target.value })} /></label>
              <label className="field"><span>Narasi <small>{selected.narration.length}/700</small></span><textarea rows={4} value={selected.narration} onChange={(event) => updateScene({ narration: event.target.value })} /></label>
              <label className="field"><span>Teks di layar / subtitle <small>{selected.caption.length}/280</small></span><textarea rows={3} value={selected.caption} onChange={(event) => updateScene({ caption: event.target.value })} /></label>
              <div className="field-row three">
                <label className="field"><span>Durasi · {selected.duration.toFixed(1)}s</span><input type="range" min={1.5} max={12} step={0.5} value={selected.duration} onChange={(event) => updateScene({ duration: Number(event.target.value) })} /></label>
                <label className="field"><span>Komposisi</span><select value={selected.visual} onChange={(event) => updateScene({ visual: event.target.value as VisualKind })}>{Object.entries(VISUAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="field color-field"><span>Aksen</span><div><input type="color" value={selected.accent} onChange={(event) => updateScene({ accent: event.target.value })} /><code>{selected.accent}</code></div></label>
              </div>
              <label className="field"><span>Label visual <small>pisahkan dengan koma</small></span><input value={selected.items.join(", ")} onChange={(event) => updateScene({ items: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4) })} /></label>
              <div className="scene-nav-bottom"><button className="text-button" disabled={selectedIndex === 0} onClick={() => setSelectedId(draft.scenes[selectedIndex - 1].id)}><ArrowLeft size={14} /> Sebelumnya</button><button className="text-button" disabled={selectedIndex === draft.scenes.length - 1} onClick={() => setSelectedId(draft.scenes[selectedIndex + 1].id)}>Berikutnya <ArrowRight size={14} /></button></div>
            </div>}
          </div>}

          {tab === "design" && <div className="design-panel enter-panel">
            <div className="panel-heading"><span className="eyebrow">ART DIRECTION</span><h3>Satu sistem visual. Tanpa template kaku.</h3><p>Setiap adegan menghitung posisi, fase gerak, dan tipografinya sendiri dari data storyboard.</p></div>
            <div className="field"><span>Palet utama</span><div className="theme-grid">{(["lime", "coral", "violet", "blue"] as const).map((theme) => <button key={theme} className={`theme-card ${draft.theme === theme ? "active" : ""}`} onClick={() => mutate({ theme })}><i className={`theme-swatch ${theme}`}><b /><b /><b /></i><span>{theme === "lime" ? "Acid lime" : theme === "coral" ? "Warm coral" : theme === "violet" ? "Soft violet" : "Signal blue"}</span>{draft.theme === theme && <Check size={15} />}</button>)}</div></div>
            <div className="toggle-list">
              <label><div><Music2 size={18} /><span><strong>Musik generatif</strong><small>Komposisi elektronik orisinal, disandikan ke file.</small></span></div><input type="checkbox" checked={draft.music} onChange={(event) => mutate({ music: event.target.checked })} /><i /></label>
              <label><div><Type size={18} /><span><strong>Subtitle terbakar</strong><small>Teks menjadi bagian dari gambar dan aman tanpa suara.</small></span></div><input type="checkbox" checked={draft.captions} onChange={(event) => mutate({ captions: event.target.checked })} /><i /></label>
            </div>
            <div className="render-card">
              <div className="render-card-top"><div><span className="eyebrow">EXPORT ENGINE</span><h3>{quality === "720" ? "720 × 1280" : "1080 × 1920"} <span>/ 24 fps</span></h3></div><div className="quality-switch"><button className={quality === "720" ? "active" : ""} onClick={() => setQuality("720")}>HD</button><button className={quality === "1080" ? "active" : ""} onClick={() => setQuality("1080")}>Full HD</button></div></div>
              <div className="render-specs"><span>H.264 + AAC</span><span>{duration.toFixed(1)} detik</span><span>Maks. 25 MB</span><span>Fallback WebM</span></div>
              {rendering && <div className="render-progress"><div><span>{progressLabel}</span><strong>{Math.round(progress * 100)}%</strong></div><div className="progress-track"><i style={{ width: `${progress * 100}%` }} /></div><small>Jangan tutup tab. MP4 diproses secepat perangkat; fallback WebM berjalan sesuai durasi video.</small></div>}
              <div className="render-actions">{rendering ? <button className="button danger" onClick={() => abortRef.current?.abort()}><Square size={15} /> Batalkan render</button> : <button className="button accent" onClick={startRender} disabled={duration > 60 || !draft.scenes.length}><WandSparkles size={17} /> {project.hasVideo ? "Render ulang video" : "Render video nyata"}</button>}{lastRender && <button className="button ghost" onClick={downloadLocal}><Download size={16} /> Unduh hasil lokal</button>}</div>
              {duration > 60 && <p className="inline-error">Durasi {duration.toFixed(1)} detik melebihi batas 60 detik pada studio ini. Ringkas adegan terlebih dahulu.</p>}
            </div>
          </div>}

          {tab === "publish" && <div className="publish-panel enter-panel">
            <div className="panel-heading"><span className="eyebrow">YOUTUBE METADATA</span><h3>Kemas sebelum meluncur.</h3><p>Judul, deskripsi, tag, privasi, dan jadwal ini dikirim apa adanya ke YouTube Data API.</p></div>
            <label className="field"><span>Judul <small>{draft.title.length}/100</small></span><input value={draft.title} maxLength={100} onChange={(event) => mutate({ title: event.target.value })} /></label>
            <label className="field"><span>Deskripsi <small>{draft.description.length}/4900</small></span><textarea rows={6} value={draft.description} onChange={(event) => mutate({ description: event.target.value })} /></label>
            <label className="field"><span>Tag <small>pisahkan dengan koma</small></span><input value={draft.tags.join(", ")} onChange={(event) => mutate({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 15) })} /></label>
            <div className="field-row two"><label className="field"><span>Privasi</span><select value={draft.privacy} onChange={(event) => mutate({ privacy: event.target.value as Project["privacy"] })}><option value="public">Publik</option><option value="unlisted">Tidak publik / unlisted</option><option value="private">Privat</option></select></label><div className="field"><span>Asset</span><div className={`asset-state ${project.hasVideo ? "ready" : ""}`}><Film size={17} /><span>{project.hasVideo ? `${project.renderMime === "video/mp4" ? "MP4" : "WebM"} · ${(project.renderSize / 1024 / 1024).toFixed(1)} MB` : "Belum dirender"}</span>{project.hasVideo && <Check size={15} />}</div></div></div>
            {dirty && <div className="save-reminder"><Clipboard size={17} /><span>Metadata berubah. Simpan sebelum publikasi.</span><button onClick={save}>Simpan sekarang</button></div>}
            {project.error && <div className="inline-error"><strong>Perlu tindakan:</strong> {project.error}</div>}
            {project.youtubeUrl && <a className="published-link" href={project.youtubeUrl} target="_blank" rel="noreferrer"><Check size={17} /> Video tersedia di YouTube <ArrowRight size={16} /></a>}
            <div className="publish-actions">
              <button className="button accent" disabled={!project.hasVideo || dirty || publishing || project.status === "publishing"} onClick={publishNow}>{publishing || project.status === "publishing" ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}{publishing ? "Mengunggah…" : "Unggah sekarang"}</button>
              {project.hasVideo && <a className="button ghost" href={`/api/projects/${project.id}/video?download=1`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Unduh video</a>}
            </div>
            {!channel.connected && <button className="connection-warning" onClick={props.onOpenChannel}><span><strong>YouTube belum terhubung</strong><small>Video tetap bisa dirender dan diunduh. Hubungkan kanal untuk unggah.</small></span><ArrowRight size={18} /></button>}
            <div className="schedule-card">
              <div className="schedule-card-heading"><CalendarClock size={20} /><div><strong>Jadwalkan autopilot</strong><small>Server memeriksa jadwal tiap 60 detik saat aktif.</small></div></div>
              <label className="field"><span>Waktu perangkatmu</span><input type="datetime-local" value={scheduleDate} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setScheduleDate(event.target.value)} /></label>
              <p>{nextScheduleLabel}. Zona waktu pengaturan kanal: {settings.timezone}.</p>
              {project.status === "scheduled" ? <div className="scheduled-state"><Check size={17} /><span>Masuk antrean {project.scheduledAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(project.scheduledAt)) : ""}</span><button onClick={() => props.onCancelSchedule(project.id)}><X size={14} /> Batalkan</button></div> : <button className="button ink full" disabled={!project.hasVideo || dirty || !scheduleDate} onClick={() => props.onSchedule(project.id, new Date(scheduleDate).toISOString(), true)}><CalendarClock size={16} /> Simpan jadwal & aktifkan autopilot</button>}
            </div>
            <button className="delete-project" onClick={() => { if (window.confirm("Hapus proyek dan video tersimpan? Video yang sudah tayang di YouTube tidak ikut dihapus.")) props.onDelete(project.id); }}><Trash2 size={14} /> Hapus proyek dari studio</button>
          </div>}
        </div>
        <aside className="preview-column"><ShortsPreview project={draft} /><div className="preview-spec"><span>SAFE AREA</span><strong>58 px</strong><i /><span>ASPEK</span><strong>9:16</strong></div></aside>
      </div>
    </section>
  );
}
