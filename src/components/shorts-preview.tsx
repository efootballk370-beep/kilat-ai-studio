"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import type { Project } from "@/lib/types";
import { drawShortFrame, projectDuration, sceneAtTime } from "@/lib/video-renderer";

export function ShortsPreview({ project, compact = false }: { project: Project; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const startRef = useRef(0);
  const offsetRef = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [renderedView, setRenderedView] = useState(false);
  const duration = projectDuration(project);
  const active = project.scenes.length ? sceneAtTime(project, Math.min(time, Math.max(0, duration - 0.001))) : null;

  const paint = useCallback((nextTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) drawShortFrame(ctx, project, nextTime, 720, 1280, !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [project]);

  useEffect(() => {
    paint(time);
  }, [paint, time]);

  useEffect(() => {
    setRenderedView(false);
    setTime(0);
    setPlaying(false);
  }, [project.id]);

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    offsetRef.current = time;
    const tick = (now: number) => {
      const next = offsetRef.current + (now - startRef.current) / 1000;
      if (next >= duration) {
        setTime(duration);
        paint(Math.max(0, duration - 0.001));
        setPlaying(false);
        return;
      }
      setTime(next);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, duration, paint]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function togglePlay() {
    if (!project.scenes.length) return;
    if (time >= duration) setTime(0);
    setPlaying((value) => !value);
  }

  function speakScene() {
    if (!active || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(active.scene.narration);
    utterance.lang = "id-ID";
    utterance.rate = 1.04;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function openFullscreen() {
    const element = canvasRef.current?.parentElement;
    if (element?.requestFullscreen) element.requestFullscreen().catch(() => undefined);
  }

  return (
    <div className={compact ? "preview-shell compact" : "preview-shell"}>
      <div className="phone-frame">
        <div className="phone-speaker" />
        {renderedView && project.hasVideo ? (
          <video
            key={`${project.id}-${project.updatedAt}`}
            className="rendered-video"
            src={`/api/projects/${project.id}/video`}
            controls
            playsInline
            preload="metadata"
          />
        ) : <canvas ref={canvasRef} width={720} height={1280} aria-label={`Pratinjau video ${project.title}`} />}
        <div className="phone-safe-label">9:16</div>
      </div>
      <div className="preview-controls">
        <button className="icon-button dark" onClick={togglePlay} aria-label={playing ? "Jeda" : "Putar"} disabled={renderedView}>
          {playing ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
        </button>
        <button className="icon-button dark" onClick={() => { setPlaying(false); setTime(0); }} aria-label="Ulang dari awal" disabled={renderedView}><RotateCcw size={16} /></button>
        <span className="time-code">{time.toFixed(1)} <i>/</i> {duration.toFixed(1)}s</span>
        <input
          aria-label="Posisi video"
          className="scrubber"
          type="range"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.01}
          value={Math.min(time, duration)}
          disabled={renderedView}
          onChange={(event) => { setPlaying(false); setTime(Number(event.target.value)); }}
        />
        <button className={`icon-button dark ${speaking ? "active" : ""}`} onClick={speakScene} aria-label="Dengarkan narasi adegan melalui suara perangkat" title="Narasi perangkat, hanya untuk pratinjau"><Volume2 size={16} /></button>
        <button className="icon-button dark desktop-only" onClick={openFullscreen} aria-label="Layar penuh"><Maximize2 size={15} /></button>
      </div>
      <div className="preview-meta-row">
        <span>{active ? `Adegan ${active.index + 1}: ${active.scene.heading}` : "Belum ada adegan"}</span>
        {project.hasVideo && <button className="text-button" onClick={() => { setPlaying(false); setRenderedView((value) => !value); }}>{renderedView ? "Storyboard" : "File asli"}</button>}
      </div>
      {!compact && <p className="preview-note">Ikon suara memakai text-to-speech perangkat untuk memeriksa naskah. File ekspor memuat visual, subtitle, dan musik generatif; narasi perangkat tidak ikut direkam.</p>}
    </div>
  );
}
