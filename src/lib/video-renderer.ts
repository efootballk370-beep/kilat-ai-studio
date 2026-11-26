import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import type { Project, Scene } from "@/lib/types";
import { THEMES } from "@/lib/types";

export interface RenderResult {
  blob: Blob;
  mime: "video/mp4" | "video/webm";
  hasAudio: boolean;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number, label: string) => void;
}

export function projectDuration(project: Pick<Project, "scenes">) {
  return project.scenes.reduce((total, scene) => total + scene.duration, 0);
}

export function sceneAtTime(project: Pick<Project, "scenes">, time: number) {
  let cursor = 0;
  for (let index = 0; index < project.scenes.length; index += 1) {
    const scene = project.scenes[index];
    if (time < cursor + scene.duration || index === project.scenes.length - 1) {
      return { scene, index, localTime: Math.max(0, time - cursor), progress: Math.max(0, Math.min(1, (time - cursor) / scene.duration)), start: cursor };
    }
    cursor += scene.duration;
  }
  throw new Error("Storyboard tidak memiliki adegan.");
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value), 4);
const easeInOut = (value: number) => value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 6) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
    return clipped;
  }
  return lines;
}

function drawTextBlock(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function drawVisual(ctx: CanvasRenderingContext2D, scene: Scene, index: number, time: number, progress: number, theme: typeof THEMES[keyof typeof THEMES], animate: boolean) {
  const t = animate ? time : 0.7;
  const enter = easeOut(progress / 0.22);
  const accent = scene.accent || theme.accent;
  ctx.save();
  ctx.globalAlpha = 0.92 * enter;
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 3;
  const cx = 360;
  const cy = 490;

  if (scene.visual === "burst") {
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.06);
    for (let ray = 0; ray < 24; ray += 1) {
      const angle = (ray / 24) * Math.PI * 2;
      const inner = 142 + Math.sin(t * 1.8 + ray) * 7;
      const outer = 220 + (ray % 3) * 21;
      ctx.globalAlpha = (0.2 + (ray % 4) * 0.12) * enter;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.globalAlpha = enter;
    ctx.beginPath();
    ctx.arc(0, 0, 124 + Math.sin(t * 2) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "700 142px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1).padStart(2, "0"), 0, 6);
  } else if (scene.visual === "orbit") {
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.globalAlpha = (0.25 + ring * 0.18) * enter;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 110 + ring * 62, 68 + ring * 52, t * (ring % 2 ? -0.13 : 0.1) + ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    scene.items.slice(0, 3).forEach((item, itemIndex) => {
      const angle = t * 0.42 + itemIndex * (Math.PI * 2 / 3);
      const x = cx + Math.cos(angle) * 210;
      const y = cy + Math.sin(angle) * 142;
      ctx.globalAlpha = enter;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "600 22px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.toUpperCase().slice(0, 20), x, y + 40);
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();
  } else if (scene.visual === "steps") {
    const items = scene.items.length ? scene.items : ["Amati", "Ubah", "Uji"];
    items.slice(0, 3).forEach((item, itemIndex) => {
      const itemEnter = easeOut((progress - itemIndex * 0.09) / 0.3);
      const y = 350 + itemIndex * 116;
      ctx.globalAlpha = itemEnter;
      roundedRect(ctx, 76, y, 568 * itemEnter, 84, 16);
      ctx.globalAlpha = 0.09 * itemEnter;
      ctx.fill();
      ctx.globalAlpha = itemEnter;
      ctx.stroke();
      ctx.font = "700 24px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`0${itemIndex + 1}`, 104, y + 51);
      ctx.font = "500 27px Arial, sans-serif";
      ctx.fillText(item, 176, y + 51);
    });
  } else if (scene.visual === "compare") {
    const split = 360 + Math.sin(t * 0.7) * 18;
    const labels = scene.items.length >= 2 ? scene.items : ["Sebelum", "Sesudah"];
    [0, 1].forEach((side) => {
      const x = side === 0 ? 62 : split + 12;
      const width = side === 0 ? split - 74 : 658 - split;
      ctx.globalAlpha = (side === 0 ? 0.08 : 0.18) * enter;
      roundedRect(ctx, x, 332, Math.max(80, width - 12), 312, 22);
      ctx.fill();
      ctx.globalAlpha = enter;
      ctx.font = "700 24px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[side].toUpperCase().slice(0, 16), side === 0 ? 175 : 535, 390);
      for (let line = 0; line < 4; line += 1) {
        ctx.globalAlpha = (0.18 + line * 0.1) * enter;
        const lineWidth = (side === 0 ? 130 : 180) - line * 13;
        roundedRect(ctx, (side === 0 ? 175 : 535) - lineWidth / 2, 450 + line * 42, lineWidth, 8, 4);
        ctx.fill();
      }
    });
  } else if (scene.visual === "stat") {
    const value = Math.round(easeOut(progress * 1.8) * 100);
    ctx.textAlign = "center";
    ctx.globalAlpha = enter;
    ctx.font = "700 226px Arial, sans-serif";
    ctx.fillText(String(value), 360, 520);
    ctx.font = "700 26px Arial, sans-serif";
    ctx.fillText("BAGIAN YANG BISA KAMU KENDALIKAN", 360, 584);
    ctx.globalAlpha = 0.24 * enter;
    roundedRect(ctx, 90, 622, 540, 12, 6);
    ctx.fill();
    ctx.globalAlpha = enter;
    roundedRect(ctx, 90, 622, 540 * clamp(progress * 1.6), 12, 6);
    ctx.fill();
  } else {
    for (let line = 0; line < 8; line += 1) {
      ctx.globalAlpha = (0.12 + line * 0.07) * enter;
      ctx.beginPath();
      for (let x = 30; x <= 690; x += 10) {
        const y = 340 + line * 42 + Math.sin(x * 0.014 + t * 1.2 + line * 0.6) * (28 + line * 3);
        if (x === 30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = enter;
    ctx.beginPath();
    ctx.arc(360 + Math.sin(t) * 140, 480 + Math.cos(t * 0.8) * 80, 34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawShortFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  time: number,
  width = 720,
  height = 1280,
  animate = true,
) {
  if (!project.scenes.length) {
    ctx.fillStyle = "#11130f";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const duration = projectDuration(project);
  const safeTime = clamp(time, 0, Math.max(0, duration - 0.001));
  const { scene, index, localTime, progress } = sceneAtTime(project, safeTime);
  const palette = THEMES[project.theme] || THEMES.lime;
  const scaleX = width / 720;
  const scaleY = height / 1280;
  ctx.save();
  ctx.scale(scaleX, scaleY);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, 720, 1280);

  const glow = ctx.createRadialGradient(600, 170, 0, 600, 170, 560);
  glow.addColorStop(0, `${scene.accent}35`);
  glow.addColorStop(1, `${scene.accent}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 720, 1000);
  ctx.strokeStyle = `${palette.foreground}12`;
  ctx.lineWidth = 1;
  for (let x = 60; x < 720; x += 100) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1280); ctx.stroke();
  }
  for (let y = 80; y < 1280; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(720, y); ctx.stroke();
  }

  drawVisual(ctx, scene, index, localTime, progress, palette, animate);

  const enter = easeOut(progress / 0.16);
  const exit = 1 - easeInOut((progress - 0.92) / 0.08);
  ctx.save();
  ctx.globalAlpha = Math.min(enter, exit);
  ctx.translate(0, (1 - enter) * 34);
  ctx.fillStyle = palette.foreground;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 19px Arial, sans-serif";
  ctx.fillText("LAJU / FIELD NOTES", 58, 74);
  ctx.textAlign = "right";
  ctx.fillStyle = scene.accent;
  ctx.fillText(`${String(index + 1).padStart(2, "0")} — ${String(project.scenes.length).padStart(2, "0")}`, 662, 74);
  ctx.textAlign = "left";
  ctx.fillStyle = scene.accent;
  ctx.font = "700 25px Arial, sans-serif";
  drawTextBlock(ctx, scene.heading.toUpperCase(), 58, 770, 604, 32, 2);
  ctx.fillStyle = palette.foreground;
  const captionLength = scene.caption.length;
  ctx.font = `700 ${captionLength > 135 ? 38 : captionLength > 85 ? 44 : 50}px Arial, sans-serif`;
  const captionY = project.captions ? 846 : 850;
  if (project.captions) drawTextBlock(ctx, scene.caption, 58, captionY, 604, captionLength > 135 ? 48 : 58, 4);
  ctx.restore();

  ctx.fillStyle = palette.secondary;
  ctx.font = "500 20px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(project.niche.toUpperCase().slice(0, 32), 58, 1174);
  ctx.textAlign = "right";
  ctx.fillText(`${Math.floor(safeTime)}s / ${Math.round(duration)}s`, 662, 1174);
  ctx.fillStyle = `${palette.foreground}24`;
  roundedRect(ctx, 58, 1206, 604, 5, 3);
  ctx.fill();
  ctx.fillStyle = scene.accent;
  roundedRect(ctx, 58, 1206, 604 * clamp(safeTime / duration), 5, 3);
  ctx.fill();
  ctx.restore();
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Render dibatalkan", "AbortError");
}

function audioSample(time: number, channel: number) {
  const bpm = 104;
  const beatLength = 60 / bpm;
  const beat = time / beatLength;
  const beatPhase = (time % beatLength) / beatLength;
  const halfPhase = (time % (beatLength / 2)) / (beatLength / 2);
  const bar = Math.floor(beat / 4);
  const roots = [55, 65.406, 73.416, 49];
  const root = roots[bar % roots.length];
  const kick = Math.sin(2 * Math.PI * (48 + 42 * Math.exp(-beatPhase * 12)) * time) * Math.exp(-beatPhase * 15) * 0.22;
  const bass = Math.sin(2 * Math.PI * root * time) * (0.065 + 0.035 * Math.exp(-beatPhase * 4));
  const chord = [1, 1.25, 1.5].reduce((sum, ratio, index) => sum + Math.sin(2 * Math.PI * root * 2 * ratio * time + channel * 0.08 + index) * 0.018, 0);
  const noise = ((Math.sin((Math.floor(time * 44100) + 1) * 12.9898) * 43758.5453) % 1) * Math.exp(-halfPhase * 30) * 0.018;
  const fade = clamp(time / 0.35);
  return Math.tanh((kick + bass + chord + noise) * 1.4) * fade;
}

async function renderMp4(project: Project, options: RenderOptions): Promise<RenderResult> {
  const width = options.width || 720;
  const height = options.height || 1280;
  const fps = options.fps || 24;
  const duration = projectDuration(project);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") throw new Error("WEBCODECS_UNAVAILABLE");
  const durationAwareBitrate = Math.max(900_000, Math.min(width >= 1080 ? 5_000_000 : 2_200_000, Math.floor(21 * 8 * 1_000_000 / Math.max(duration, 1))));
  const config: VideoEncoderConfig = { codec: width >= 1080 ? "avc1.640028" : "avc1.42001f", width, height, bitrate: durationAwareBitrate, framerate: fps };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error("WEBCODECS_UNAVAILABLE");
  let includeAudio = false;
  const sampleRate = 44100;
  if (project.music && typeof AudioEncoder !== "undefined") {
    const audioSupport = await AudioEncoder.isConfigSupported({ codec: "mp4a.40.2", numberOfChannels: 2, sampleRate, bitrate: 128_000 });
    includeAudio = Boolean(audioSupport.supported);
  }
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height },
    ...(includeAudio ? { audio: { codec: "aac" as const, numberOfChannels: 2, sampleRate } } : {}),
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => { encoderError = error; },
  });
  encoder.configure(config);
  const frameCount = Math.ceil(duration * fps);
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    throwIfAborted(options.signal);
    if (encoderError) throw encoderError;
    drawShortFrame(ctx, project, frameIndex / fps, width, height, true);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(frameIndex * 1_000_000 / fps), duration: Math.round(1_000_000 / fps) });
    encoder.encode(frame, { keyFrame: frameIndex % (fps * 2) === 0 });
    frame.close();
    while (encoder.encodeQueueSize > 10) {
      throwIfAborted(options.signal);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    if (frameIndex % Math.max(1, Math.round(fps / 3)) === 0) options.onProgress?.((frameIndex / frameCount) * 0.78, `Menyandikan gambar • ${Math.round((frameIndex / frameCount) * 100)}%`);
    if (frameIndex % (fps * 2) === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await encoder.flush();
  encoder.close();
  if (encoderError) throw encoderError;

  if (includeAudio) {
    options.onProgress?.(0.8, "Membuat musik orisinal • AAC");
    const audioEncoder = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (error) => { encoderError = error; } });
    audioEncoder.configure({ codec: "mp4a.40.2", numberOfChannels: 2, sampleRate, bitrate: 128_000 });
    const chunkFrames = 4096;
    const totalFrames = Math.ceil(duration * sampleRate);
    for (let offset = 0; offset < totalFrames; offset += chunkFrames) {
      throwIfAborted(options.signal);
      if (encoderError) throw encoderError;
      const frames = Math.min(chunkFrames, totalFrames - offset);
      const data = new Float32Array(frames * 2);
      for (let channel = 0; channel < 2; channel += 1) {
        for (let frame = 0; frame < frames; frame += 1) {
          const time = (offset + frame) / sampleRate;
          const endFade = clamp((duration - time) / 0.45);
          data[channel * frames + frame] = audioSample(time, channel) * endFade;
        }
      }
      const audioData = new AudioData({ format: "f32-planar", sampleRate, numberOfFrames: frames, numberOfChannels: 2, timestamp: Math.round(offset * 1_000_000 / sampleRate), data });
      audioEncoder.encode(audioData);
      audioData.close();
      while (audioEncoder.encodeQueueSize > 8) await new Promise((resolve) => setTimeout(resolve, 2));
      if (offset % (chunkFrames * 30) === 0) options.onProgress?.(0.8 + (offset / totalFrames) * 0.17, "Menyandikan musik orisinal • AAC");
    }
    await audioEncoder.flush();
    audioEncoder.close();
    if (encoderError) throw encoderError;
  }
  muxer.finalize();
  options.onProgress?.(0.98, "Menutup berkas MP4");
  return { blob: new Blob([target.buffer], { type: "video/mp4" }), mime: "video/mp4", hasAudio: includeAudio, duration, width, height, fps };
}

async function renderWebM(project: Project, options: RenderOptions): Promise<RenderResult> {
  if (typeof MediaRecorder === "undefined") throw new Error("Browser ini tidak mendukung WebCodecs maupun MediaRecorder. Gunakan Chrome atau Edge versi baru.");
  const width = options.width || 720;
  const height = options.height || 1280;
  const fps = options.fps || 24;
  const duration = projectDuration(project);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas tidak tersedia.");
  const stream = canvas.captureStream(fps);
  let audioContext: AudioContext | null = null;
  if (project.music) {
    audioContext = new AudioContext({ sampleRate: 44100 });
    const destination = audioContext.createMediaStreamDestination();
    const master = audioContext.createGain();
    master.gain.value = 0.16;
    master.connect(destination);
    const start = audioContext.currentTime + 0.05;
    const beatLength = 60 / 104;
    for (let beat = 0; beat < duration / beatLength; beat += 1) {
      const when = start + beat * beatLength;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(110, when);
      oscillator.frequency.exponentialRampToValueAtTime(48, when + 0.16);
      gain.gain.setValueAtTime(0.6, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
      oscillator.connect(gain).connect(master);
      oscillator.start(when);
      oscillator.stop(when + 0.24);
    }
    [55, 68.75, 82.5].forEach((frequency, index) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = index === 0 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.12;
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration);
    });
    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }
  const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 128_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  return new Promise<RenderResult>((resolve, reject) => {
    let animationFrame = 0;
    const start = performance.now();
    const cleanup = () => {
      cancelAnimationFrame(animationFrame);
      stream.getTracks().forEach((track) => track.stop());
      audioContext?.close().catch(() => undefined);
    };
    recorder.onerror = () => { cleanup(); reject(new Error("Perekaman WebM gagal.")); };
    recorder.onstop = () => {
      cleanup();
      resolve({ blob: new Blob(chunks, { type: "video/webm" }), mime: "video/webm", hasAudio: project.music, duration, width, height, fps });
    };
    options.signal?.addEventListener("abort", () => {
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
      reject(new DOMException("Render dibatalkan", "AbortError"));
    }, { once: true });
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      drawShortFrame(ctx, project, Math.min(elapsed, duration - 0.001), width, height, true);
      options.onProgress?.(Math.min(0.99, elapsed / duration), `Merekam WebM real-time • ${Math.floor(Math.min(elapsed, duration))}/${Math.ceil(duration)} dtk`);
      if (elapsed >= duration) {
        if (recorder.state !== "inactive") recorder.stop();
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };
    recorder.start(500);
    animationFrame = requestAnimationFrame(tick);
  });
}

export async function renderProjectVideo(project: Project, options: RenderOptions = {}): Promise<RenderResult> {
  if (!project.scenes.length) throw new Error("Tambahkan minimal satu adegan sebelum render.");
  if (projectDuration(project) > 60) throw new Error("Durasi melebihi 60 detik. Ringkas storyboard untuk format Shorts ini.");
  options.onProgress?.(0.01, "Menyiapkan kanvas 9:16");
  try {
    return await renderMp4(project, options);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof Error && !["WEBCODECS_UNAVAILABLE"].includes(error.message)) {
      console.warn("MP4 encoder beralih ke WebM:", error.message);
    }
    options.onProgress?.(0.01, "MP4 tidak didukung • beralih ke WebM real-time");
    return renderWebM(project, options);
  }
}
