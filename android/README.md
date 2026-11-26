# Membangun APK Android Laju

APK ini adalah **Trusted Web Activity (TWA)** yang dihasilkan dengan [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) resmi dari Google. APK memuat host server secara tertanam, jadi **setiap domain baru wajib di-build ulang**.

## Syarat

1. Node.js 18+.
2. Aplikasi terdeploy di **URL HTTPS yang stabil dan dapat diakses dari internet publik**.
   - Sandbox pratinjau tidak dapat diakses dari luar (dibatasi untuk arena.ai), sehingga APK yang menunjuk ke host pratinjau tidak akan berfungsi di HP.
3. Aplikasi harus menyajikan ikon PNG di `/pwa-icon/512` yang dapat diambil oleh proses build.

## Menyiapkan toolchain (sekali saja)

```bash
npx bubblewrap doctor
```

Jawab `y` untuk pemasangan JDK 17 dan Android SDK. Pada saat diminta lisensi SDK, jawab `y`.

## Membuat proyek dan menandatangani

```bash
LAJU_ANDROID_URL="https://domain-anda.com" \
LAJU_ICON_BASE_URL="http://127.0.0.1:3000" \
node scripts/android-package.mjs
```

`LAJU_ICON_BASE_URL` diarahkan ke server lokal yang sedang berjalan agar ikon dapat diambil tanpa proteksi host. Host aplikasi di dalam APK tetap menggunakan `LAJU_ANDROID_URL`.

Langkah ini menghasilkan:

- `android-twa/` — proyek Android Gradle lengkap.
- `.android-signing/laju.keystore` — kunci penandatanganan (rahasia, tidak dipublikasikan).
- `public/.well-known/assetlinks.json` — Digital Asset Links untuk verifikasi domain.

## Menjalankan server lokal untuk pengambilan ikon

```bash
npm run build
npm run start &
```

## Mengompilasi dan menandatangani APK

```bash
cd android-twa
export BUBBLEWRAP_KEYSTORE_PASSWORD="$(cat ../.android-signing/password)"
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
npx bubblewrap build --skipPwaValidation
```

Hasil: `app-release-signed.apk` dan `app-release-bundle.aab`.

## Mempublikasikan artefak ke aplikasi

```bash
cd ..
node scripts/android-package.mjs --finalize
```

Langkah ini menyalin APK ke `public/downloads/Laju-Android.apk`, membuat `android.json` berisi ukuran, SHA-256, package ID, dan host tertanam, serta menulis `Laju-Android.sha256`.

Tombol **Unduh APK** di halaman akan aktif otomatis setelah `android.json` tersedia, dan akan menampilkan peringatan bila host yang tertanam berbeda dari host yang sedang Anda buka.

## Menayangkan APK di domain baru

1. Commit `public/downloads/Laju-Android.apk` dan `public/.well-known/assetlinks.json`.
2. Deploy aplikasi.
3. Verifikasi `https://domain-anda.com/.well-known/assetlinks.json` dapat diakses publik.
4. Unggah APK ke pengguna, atau gunakan `app-release-bundle.aab` untuk Google Play.
