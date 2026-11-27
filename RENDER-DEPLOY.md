# Deploy ke Render (tanpa verifikasi nomor HP)

## Langkah 1 — Buat database
1. Buka https://dashboard.render.com → Sign up / Log in
2. Pilih **Log in with GitHub** (bukan email)
3. Kiri atas: **New +** → pilih **Postgres**
4. Nama: `laju-db` → **Create Database**
5. Tunggu status jadi **Available**
6. Di bawah ada tulisan **Connections** → salin **External Database URL**
   (dimulai `postgresql://...`)

## Langkah 2 — Deploy aplikasi
1. **New +** → pilih **Web Service**
2. **Build and deploy from a Git repository** → Next → pilih repo **kilat-ai-studio**
3. Isi:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Scroll ke **Environment Variables** → **Add Environment Variable**:
   - Key: `DATABASE_URL`
   - Value: tempatkan URL database dari Langkah 1
5. Klik **Create Web Service** → tunggu ±3 menit

## Langkah 3 — Siapkan tabel
1. Masih di Render, buka Web Service → tab **Shell**
2. Jalankan: `npx drizzle-kit push`
3. Selesai. Buka alamat `...onrender.com` di HP → aplikasi jalan

## Langkah 4 — Teruskan alamatnya
Kirim alamat `...onrender.com` ke asisten, APK akan dibangun ulang
agar menunjuk ke alamat itu, lalu APK di HP langsung hidup.
