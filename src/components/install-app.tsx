"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Download, FileDown, FolderOpen, MonitorDown, MoreVertical, Plus, Share, ShieldAlert, ShieldCheck, Smartphone, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface ApkMetadata {
  available: boolean;
  version: string;
  packageId: string;
  host: string;
  file: string;
  size: number;
  sha256: string;
  requiresInternet: boolean;
}

export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [apk, setApk] = useState<ApkMetadata | null>(null);
  const [hostMismatch, setHostMismatch] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    setOnline(navigator.onLine);
    fetch("/downloads/android.json", { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<ApkMetadata> : null).then((metadata) => {
      if (metadata?.available && metadata.file.endsWith(".apk") && metadata.size > 0) {
        setApk(metadata);
        setHostMismatch(Boolean(metadata.host) && metadata.host !== window.location.host);
      }
    }).catch(() => undefined);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const markInstalled = () => { setInstalled(true); setPromptEvent(null); setHelpOpen(false); };
    const updateOnline = () => setOnline(true);
    const updateOffline = () => setOnline(false);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOffline);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => console.warn("Service worker belum dapat didaftarkan", error));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOffline);
    };
  }, []);

  useEffect(() => {
    if (!helpOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setHelpOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [helpOpen]);

  async function installPwa() {
    if (!promptEvent) {
      setHelpOpen(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  return <>
    {apk ? <a className="install-app-button apk-ready" href={apk.file} download="Laju-Android.apk" onClick={() => setHelpOpen(true)}><Download size={14} /><span>Unduh APK</span></a> : <button className="install-app-button" onClick={installed ? () => setHelpOpen(true) : installPwa} aria-label={installed ? "Laju sudah terpasang" : "Install aplikasi Laju"}>
      {installed ? <Check size={14} /> : <Download size={14} />}<span>{installed ? "Aplikasi terpasang" : "Install aplikasi"}</span>
    </button>}
    {!online && <div className="offline-notice" role="status"><WifiOff size={14} /><span>Offline · render lokal mungkin tersedia; simpan cloud dan upload butuh internet.</span></div>}
    <AnimatePresence>{helpOpen && <motion.div className="install-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelpOpen(false)}>
      <motion.section className="install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title" initial={{ opacity: 0, y: 35, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }} onClick={(event) => event.stopPropagation()}>
        <button className="install-modal-close" onClick={() => setHelpOpen(false)} aria-label="Tutup panduan"><X size={19} /></button>
        <span className="install-modal-icon"><img src="/pwa-icon/512" alt="Ikon Laju" /></span>
        <span className="eyebrow">LAJU UNTUK ANDROID</span>
        <h2 id="install-title">{apk ? "APK siap dipasang." : installed ? "Laju sudah terpasang." : "Pasang seperti aplikasi."}</h2>
        {apk ? <>
          <p>Ini adalah <strong>berkas APK Android sungguhan</strong>, package <code>{apk.packageId}</code> versi {apk.version}. Setelah diunduh, berkas akan terlihat di <strong>File Manager → Downloads</strong>. APK membuka studio dari server sehingga memerlukan internet.</p>
          <div className="apk-host"><span>HOST TERTANAM DI APK</span><code>{apk.host}</code></div>
          {hostMismatch && <div className="apk-host-mismatch"><ShieldAlert size={17} /><span>APK ini dibangun untuk host di atas, sedangkan halaman ini dibuka dari <code>{window.location.host}</code>. Sandbox pratinjau tidak dapat diakses dari luar, jadi APK baru bisa membuka studio setelah aplikasi dideploy pada URL HTTPS yang stabil. Jalankan ulang satu perintah build dengan domain Anda sendiri untuk menghasilkan APK yang benar.</span></div>}
          <a className="button accent full apk-download-button" href={apk.file} download="Laju-Android.apk"><FileDown size={18} /> Unduh Laju-Android.apk · {(apk.size / 1024 / 1024).toFixed(1)} MB</a>
          <div className="apk-copy-row"><span>Unduhan dari jendela pratinjau sering diblokir browser. Salin link ini, tempel di Chrome, lalu buka sebagai tab biasa.</span><button className="button ink full" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${apk.file}`).then(() => setNotice("Link APK sudah disalin. Buka Chrome, tempel di kolom alamat, lalu tekan enter untuk mengunduh.")).catch(() => setNotice(`Salin manual: ${window.location.origin}${apk.file}`)); }}><Share size={16} /> Salin link APK</button></div>
          <div className="install-instructions apk-instructions"><div><span>CARA MEMASANG FILE APK</span><ol>
            <li><Download size={16} /><p>Tekan <strong>Unduh APK</strong>, lalu tunggu unduhan selesai.</p></li>
            <li><FolderOpen size={16} /><p>Buka <strong>File Manager → Downloads → Laju-Android.apk</strong>.</p></li>
            <li><Smartphone size={16} /><p>Jika diminta, izinkan <strong>Install unknown apps</strong> untuk File Manager/Chrome, lalu tekan <strong>Install</strong>.</p></li>
          </ol></div><div><span>KEAMANAN & KOMPATIBILITAS</span><ol>
            <li><ShieldCheck size={16} /><p>Android 7.0 atau lebih baru. Tidak perlu mematikan Play Protect. APK ini ditandatangani untuk distribusi langsung, bukan unduhan Play Store.</p></li>
            <li><WifiOff size={16} /><p>Koneksi internet wajib untuk memuat studio, database, AI, dan upload YouTube. Jangan hapus server preview saat memakai APK.</p></li>
          </ol></div></div>
          <details className="apk-checksum"><summary>Verifikasi integritas APK</summary><span>SHA-256</span><code>{apk.sha256}</code><a href="/downloads/Laju-Android.sha256" download>Unduh checksum</a></details>
        </> : <>
          <p>Versi PWA tersedia sebagai alternatif. PWA tidak menghasilkan berkas di File Manager, tetapi memiliki ikon sendiri dan berjalan dalam tampilan standalone.</p>
          {installed ? <div className="installed-message"><Check size={18} /><span>Anda sedang membuka Laju dalam mode aplikasi. Semua fitur online memakai server dan akun yang sama.</span></div> : <div className="install-instructions">
            <div><span>ANDROID / CHROME</span><ol><li><Download size={16} /><p>Tekan <strong>Install aplikasi</strong> di bagian atas, lalu konfirmasi <strong>Install</strong>.</p></li><li><MoreVertical size={16} /><p>Jika prompt tidak muncul, buka menu browser lalu pilih <strong>Tambahkan ke layar utama</strong> atau <strong>Install app</strong>.</p></li></ol></div>
            <div><span>IPHONE / SAFARI</span><ol><li><Share size={16} /><p>Tekan tombol <strong>Bagikan</strong> pada Safari.</p></li><li><Plus size={16} /><p>Pilih <strong>Add to Home Screen / Tambah ke Layar Utama</strong>.</p></li></ol></div>
          </div>}
          {!installed && promptEvent && <button className="button accent full" onClick={installPwa}><MonitorDown size={17} /> Pasang versi PWA</button>}
        </>}
        <div className="install-requirements"><Smartphone size={16} /><span>Gunakan URL HTTPS ini di perangkat yang ingin dipasangi. Untuk APK, unduh hanya dari halaman resmi ini dan cocokkan checksum bila perlu.</span></div>
        {notice && <div className="install-notice" role="status">{notice}</div>}
      </motion.section>
    </motion.div>}</AnimatePresence>
  </>;
}
