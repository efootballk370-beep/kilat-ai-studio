import { createHash, randomUUID } from "node:crypto";
import type { Idea, Scene, VisualKind } from "@/lib/types";

export { NICHE_OPTIONS } from "@/lib/content-options";

type Blueprint = Omit<Idea, "id" | "score" | "niche" | "source" | "status" | "createdAt">;

const LIBRARY: Record<string, Blueprint[]> = {
  Produktivitas: [
    {
      title: "Aturan 2 menit yang tidak menipu otak",
      hook: "Kalau selalu gagal memakai aturan 2 menit, mungkin kamu melewatkan satu detail.",
      angle: "Bedakan memulai tugas dan menyelesaikan tugas; gunakan versi kecil yang punya titik berhenti jelas.",
      rationale: "Masalah umum, solusi bisa dipraktikkan seketika, dan punya momen koreksi mitos yang kuat untuk retensi.",
      keywords: ["aturan 2 menit", "mengatasi malas", "kebiasaan kecil"],
      points: ["Tulis tindakan fisik pertama, bukan nama proyek yang besar.", "Pasang batas berhenti agar otak tidak takut terjebak.", "Lanjutkan hanya jika energi memang tersedia, bukan karena rasa bersalah."],
      cta: "Simpan ini untuk tugas yang kamu tunda hari ini.",
    },
    {
      title: "Kenapa to-do list makin panjang justru bikin lambat?",
      hook: "Daftar tugasmu bisa jadi bukan alat kerja—melainkan tempat menyimpan kecemasan.",
      angle: "Pisahkan daftar penampung dari tiga komitmen harian dengan definisi selesai yang terlihat.",
      rationale: "Relatable untuk pekerja pengetahuan dan memberi perubahan sebelum–sesudah yang mudah divisualkan.",
      keywords: ["to do list", "fokus kerja", "prioritas harian"],
      points: ["Pindahkan semua keinginan ke daftar penampung tanpa tenggat palsu.", "Pilih satu hasil utama dan dua tugas pendukung untuk hari ini.", "Tulis bukti selesai: terkirim, terbayar, atau terunggah—bukan sekadar dikerjakan."],
      cta: "Komentar satu hasil utama yang ingin kamu selesaikan besok.",
    },
    {
      title: "Rapat 25 menit, bukan 30: eksperimen kecil yang masuk akal",
      hook: "Lima menit yang hilang dari rapat bisa mengubah kualitas rapat berikutnya.",
      angle: "Gunakan sisa waktu sebagai buffer nyata untuk mencatat keputusan dan berpindah konteks.",
      rationale: "Angka konkret menciptakan rasa ingin tahu dan tips dapat diuji tanpa aplikasi tambahan.",
      keywords: ["rapat efektif", "manajemen waktu", "kerja fokus"],
      points: ["Tutup agenda pada menit ke-20, bukan saat waktu habis.", "Gunakan tiga menit untuk menulis keputusan dan pemilik tindak lanjut.", "Sisakan dua menit untuk berpindah konteks tanpa membawa rapat ke pekerjaan berikutnya."],
      cta: "Coba satu rapat 25 menit minggu ini, lalu bandingkan hasilnya.",
    },
    {
      title: "Jangan bersihkan notifikasi. Matikan sumbernya.",
      hook: "Badge merah bukan akar masalahnya. Ia hanya struk dari keputusan yang belum kamu buat.",
      angle: "Audit notifikasi berdasarkan tindakan yang benar-benar membutuhkan respons segera.",
      rationale: "Judul kontra-intuitif, visual sederhana, dan hasilnya langsung terasa pada hari yang sama.",
      keywords: ["notifikasi hp", "distraksi digital", "fokus"],
      points: ["Biarkan hanya pesan manusia dan keamanan yang boleh menginterupsi.", "Ubah email serta media sosial menjadi pemeriksaan terjadwal.", "Tinjau ulang setelah tiga hari, bukan mengikuti rasa takut ketinggalan."],
      cta: "Bagikan ke teman yang ponselnya tidak pernah benar-benar diam.",
    },
    {
      title: "Time blocking gagal? Mungkin kalendermu terlalu optimistis",
      hook: "Kalender yang penuh warna belum tentu menggambarkan hari yang bisa kamu jalani.",
      angle: "Tambahkan waktu transisi, pekerjaan tak terduga, dan energi ke dalam rencana.",
      rationale: "Memberi solusi untuk audiens yang sudah mencoba produktivitas namun belum berhasil.",
      keywords: ["time blocking", "kalender kerja", "perencanaan realistis"],
      points: ["Sisakan 15 menit setelah pekerjaan yang membutuhkan perpindahan tempat atau aplikasi.", "Kosongkan satu blok 30 menit untuk hal tak terduga.", "Jadwalkan pekerjaan berat saat energi tinggi, bukan hanya saat kalender kosong."],
      cta: "Simpan sebagai pengingat sebelum menyusun jadwal besok.",
    },
  ],
  "Keuangan Pribadi": [
    {
      title: "Dana darurat bukan lomba mengumpulkan 12 kali gaji",
      hook: "Target besar bisa membuatmu tidak pernah mulai. Pakai tiga lantai, bukan satu angka menakutkan.",
      angle: "Bangun dana darurat bertahap dari buffer kecil hingga pengeluaran beberapa bulan.",
      rationale: "Mengurangi hambatan pemula dengan angka bertahap dan tanpa janji keuntungan investasi.",
      keywords: ["dana darurat", "keuangan pemula", "menabung"],
      points: ["Lantai pertama: satu kali pengeluaran tak terduga yang paling mungkin terjadi.", "Lantai kedua: satu bulan biaya wajib, bukan satu bulan gaji.", "Lantai ketiga disesuaikan dengan kestabilan penghasilan dan tanggungan."],
      cta: "Hitung biaya wajibmu malam ini; angka itu lebih berguna daripada gaji kotor.",
    },
    {
      title: "Langganan Rp49 ribu yang diam-diam menjadi Rp588 ribu",
      hook: "Yang membuat bocor bukan harga per bulan—melainkan jumlah bulan yang tidak kamu sadari.",
      angle: "Audit langganan berdasarkan nilai yang dipakai, lalu ubah biaya tahunan agar terasa nyata.",
      rationale: "Perhitungan konkret mendorong penonton mengecek tagihan tanpa memberi nasihat finansial berisiko.",
      keywords: ["langganan digital", "pengeluaran bocor", "anggaran bulanan"],
      points: ["Ekspor mutasi 90 hari dan kelompokkan pembayaran berulang.", "Kalikan setiap biaya bulanan dengan 12 agar skalanya terlihat.", "Pertahankan yang dipakai; jeda yang hanya membuatmu merasa ingin memakai."],
      cta: "Cek satu langganan sekarang sebelum kamu lupa.",
    },
    {
      title: "Paylater: lihat tanggalnya sebelum melihat cicilannya",
      hook: "Cicilan kecil bisa terlihat ringan sampai beberapa tanggal jatuh tempo bertemu di minggu yang sama.",
      angle: "Jelaskan arus kas dan total kewajiban tanpa menghakimi pengguna paylater.",
      rationale: "Topik relevan dengan pendekatan edukatif, berbasis keputusan sadar, bukan ketakutan.",
      keywords: ["paylater", "arus kas", "cicilan"],
      points: ["Catat total sisa kewajiban, bukan hanya cicilan bulan ini.", "Tumpuk semua tanggal jatuh tempo dalam satu kalender.", "Bandingkan dengan uang yang benar-benar tersisa setelah biaya wajib."],
      cta: "Simpan checklist ini sebelum transaksi berikutnya; bukan sebagai pengganti nasihat profesional.",
    },
    {
      title: "Gaji naik, tabungan diam? Cek lifestyle inflation versi kecil",
      hook: "Kenaikan gaji bisa habis lewat keputusan yang masing-masing tampak terlalu kecil untuk dihitung.",
      angle: "Otomatiskan sebagian kenaikan sebelum standar pengeluaran ikut naik.",
      rationale: "Sangat relevan untuk first jobber dan pekerja yang baru promosi, dengan langkah praktis.",
      keywords: ["gaji naik", "lifestyle inflation", "auto debit tabungan"],
      points: ["Bandingkan pengeluaran tetap sebelum dan sesudah kenaikan.", "Tentukan persentase kenaikan yang langsung dialihkan saat gajian.", "Sisakan sebagian untuk dinikmati agar rencana bisa bertahan."],
      cta: "Pilih satu persentase yang realistis, bukan yang paling terlihat disiplin.",
    },
    {
      title: "Anggaran 50/30/20 tidak wajib pas di semua kota",
      hook: "Kalau persentase populer membuatmu merasa gagal, masalahnya mungkin pada rumusnya—bukan pada dirimu.",
      angle: "Gunakan kategori sebagai pertanyaan, lalu sesuaikan rasio dengan biaya hidup dan tanggungan.",
      rationale: "Mengoreksi nasihat generik dengan framing inklusif dan dapat ditindaklanjuti.",
      keywords: ["anggaran 50 30 20", "budgeting", "biaya hidup"],
      points: ["Mulai dari angka biaya wajib nyata, bukan memaksanya menjadi 50 persen.", "Pisahkan keinginan yang benar-benar bernilai dari pengeluaran otomatis.", "Naikkan porsi tabungan bertahap ketika ruang anggaran memang tersedia."],
      cta: "Jadikan rumus ini titik awal percakapan dengan kondisi keuanganmu sendiri.",
    },
  ],
  "Teknologi & AI": [
    {
      title: "Prompt bukan mantra: beri AI bahan untuk berpikir",
      hook: "Prompt panjang belum tentu bagus. Yang sering hilang justru konteks dan contoh hasil.",
      angle: "Ajarkan struktur tugas, konteks, batasan, dan contoh tanpa menjual prompt rahasia.",
      rationale: "Evergreen, mudah didemokan dalam empat layar, dan berguna lintas model AI.",
      keywords: ["cara prompt AI", "belajar AI", "prompt efektif"],
      points: ["Nyatakan hasil akhir dan siapa yang akan memakainya.", "Berikan sumber serta batasan agar model tidak mengisi kekosongan sembarangan.", "Tambahkan satu contoh bagus dan minta pemeriksaan sebelum jawaban final."],
      cta: "Coba susun ulang satu prompt lamamu dengan empat bagian ini.",
    },
    {
      title: "Tiga tanda jawaban AI perlu kamu periksa ulang",
      hook: "Jawaban yang terdengar paling yakin kadang justru paling perlu dipertanyakan.",
      angle: "Bangun kebiasaan verifikasi lewat sinyal klaim spesifik, sumber, dan konsistensi.",
      rationale: "Literasi AI yang tidak bergantung merek dan membantu mengurangi penggunaan informasi keliru.",
      keywords: ["halusinasi AI", "verifikasi informasi", "literasi digital"],
      points: ["Waspadai angka, tanggal, dan kutipan yang tidak disertai sumber dapat dibuka.", "Minta jawaban kedua dengan pertanyaan berbeda lalu cari kontradiksi.", "Untuk keputusan penting, verifikasi ke sumber primer atau ahli."],
      cta: "Bagikan ini sebelum meneruskan jawaban AI ke grup kerja.",
    },
    {
      title: "Jangan unggah semua dokumen kantor ke AI",
      hook: "Fitur AI boleh gratis, tetapi data internal tetap punya biaya jika bocor.",
      angle: "Klasifikasikan data sederhana sebelum memakai alat AI di pekerjaan.",
      rationale: "Praktis untuk pekerja dan UMKM, berfokus pada keamanan tanpa menakut-nakuti.",
      keywords: ["keamanan data AI", "privasi kerja", "AI kantor"],
      points: ["Pisahkan data publik, internal, dan rahasia sebelum memilih alat.", "Hapus nama, nomor identitas, serta rahasia klien saat membuat contoh.", "Ikuti kebijakan perusahaan dan gunakan layanan yang memang disetujui."],
      cta: "Jadikan tiga pertanyaan ini kebiasaan sebelum menekan unggah.",
    },
    {
      title: "AI untuk merangkum rapat: bagian yang tetap harus manusia",
      hook: "Transkrip rapi bukan jaminan keputusan rapat ikut benar.",
      angle: "Gunakan AI untuk draf, tetapi pertahankan verifikasi manusia pada keputusan dan komitmen.",
      rationale: "Use case nyata dengan batas yang jelas, cocok untuk demonstrasi alur kerja.",
      keywords: ["AI notulen rapat", "ringkas rapat", "produktivitas AI"],
      points: ["Minta AI memisahkan keputusan, usulan, dan pertanyaan terbuka.", "Periksa nama pemilik tugas serta tanggal dari rekaman asli.", "Minta persetujuan peserta sebelum notulen dianggap final."],
      cta: "Simpan format notulen ini untuk rapat berikutnya.",
    },
    {
      title: "Satu foto, banyak versi AI: kenapa hasilnya tidak konsisten?",
      hook: "Masalahnya bukan selalu prompt. Bisa jadi identitas visualnya belum pernah didefinisikan.",
      angle: "Kenalkan referensi, batasan tetap, dan evaluasi sederhana untuk konsistensi visual.",
      rationale: "Menjawab frustrasi kreator visual dengan proses yang dapat diulang.",
      keywords: ["AI gambar", "konsistensi visual", "desain AI"],
      points: ["Tetapkan warna, pencahayaan, lensa, dan hal yang tidak boleh berubah.", "Gunakan referensi yang kamu miliki hak pakainya.", "Bandingkan beberapa hasil dengan checklist yang sama, bukan memilih berdasarkan rasa sesaat."],
      cta: "Coba satu variabel per percobaan agar penyebab perubahan terlihat.",
    },
  ],
  "Food & Kuliner": [
    {
      title: "Nasi goreng tidak harus menunggu nasi semalam",
      hook: "Nasi baru bisa dipakai. Yang perlu diatur bukan tanggalnya, melainkan kadar airnya.",
      angle: "Demonstrasikan cara menyebar dan mendinginkan nasi agar butirnya tidak saling menempel.",
      rationale: "Membantah mitos dapur yang populer dengan demonstrasi visual yang jelas.",
      keywords: ["nasi goreng", "tips memasak", "nasi baru"],
      points: ["Sebarkan nasi hangat dalam lapisan tipis agar uapnya cepat keluar.", "Bumbui di wajan, bukan merendam nasi dengan saus berlebihan.", "Masak dalam porsi kecil supaya suhu wajan tetap tinggi."],
      cta: "Coba tekniknya dan sesuaikan dengan alat masak di dapurmu.",
    },
    {
      title: "Tahu krispi: jangan hanya menyalahkan tepung",
      hook: "Lapisan bisa tebal tetapi tetap lembek kalau air di dalam tahu tidak dikelola.",
      angle: "Fokus pada tahap menekan, melapisi, dan suhu minyak secara berurutan.",
      rationale: "Resep umum menjadi menarik lewat diagnosis kegagalan yang spesifik.",
      keywords: ["tahu krispi", "gorengan renyah", "tips dapur"],
      points: ["Tekan tahu dengan lembut sampai air berlebih keluar.", "Gunakan lapisan tipis dan rata; tebal tidak otomatis lebih renyah.", "Jangan memadati wajan karena suhu minyak akan turun."],
      cta: "Simpan urutan ini sebelum menggoreng batch berikutnya.",
    },
    {
      title: "Kopi terasa asam? Cek tiga hal sebelum ganti biji",
      hook: "Belum tentu kopinya jelek. Air, ukuran giling, dan waktu bisa mengubah rasa yang sama.",
      angle: "Panduan diagnosis sederhana untuk seduhan manual tanpa memaksa membeli alat.",
      rationale: "Memberi eksperimen terkontrol dan membuka interaksi pengalaman penonton.",
      keywords: ["kopi asam", "manual brew", "seduh kopi"],
      points: ["Ubah hanya satu variabel agar penyebabnya mudah dilacak.", "Coba giling sedikit lebih halus atau tambah waktu kontak secara bertahap.", "Catat rasio kopi dan air supaya hasil yang enak bisa diulang."],
      cta: "Tulis resep seduhmu di komentar sebagai bahan banding.",
    },
    {
      title: "Meal prep bukan berarti makan menu yang sama lima hari",
      hook: "Yang disiapkan bisa berupa komponen, bukan lima kotak makanan identik.",
      angle: "Siapkan protein, karbohidrat, sayur, dan saus yang dapat dirakit berbeda.",
      rationale: "Solusi praktis untuk pekerja sibuk dengan visual kombinasi yang variatif.",
      keywords: ["meal prep", "bekal kerja", "makanan rumahan"],
      points: ["Pilih dua komponen yang bisa dipakai untuk beberapa hidangan.", "Simpan saus terpisah agar tekstur dan pilihan rasa tetap fleksibel.", "Ikuti panduan keamanan penyimpanan dan dinginkan makanan dengan benar."],
      cta: "Mulai dari dua komponen minggu ini, bukan langsung menyiapkan semuanya.",
    },
    {
      title: "Sisa sayur layu bukan otomatis harus dibuang",
      hook: "Layu dan busuk itu berbeda. Kenali tandanya sebelum memutuskan.",
      angle: "Edukasi pemilahan aman dan ide olahan tanpa mendorong konsumsi makanan rusak.",
      rationale: "Menggabungkan penghematan dan keamanan pangan dengan bahasa yang bertanggung jawab.",
      keywords: ["sisa sayur", "food waste", "keamanan pangan"],
      points: ["Buang jika berlendir, berjamur, atau berbau tidak normal.", "Sayur yang hanya kehilangan air bisa direndam sebentar lalu diperiksa.", "Rencanakan sup atau tumisan hanya untuk bahan yang masih aman."],
      cta: "Kalau ragu soal keamanan, pilih buang—jangan pertaruhkan kesehatan.",
    },
  ],
  Kesehatan: [
    {
      title: "Duduk lama? Jeda kecil lebih realistis daripada ambisi besar",
      hook: "Kamu tidak harus menunggu waktu olahraga sempurna untuk mengurangi duduk tanpa jeda.",
      angle: "Kenalkan pengingat bergerak singkat tanpa mengklaim menghapus semua risiko kesehatan.",
      rationale: "Kebiasaan ringan untuk pekerja meja dengan bahasa nonmedis dan aman.",
      keywords: ["duduk lama", "jeda bergerak", "pekerja kantoran"],
      points: ["Pasang jeda yang cocok dengan ritme kerja, bukan alarm yang terus diabaikan.", "Pilih gerakan nyaman seperti berjalan atau mengubah posisi.", "Jika ada nyeri atau kondisi medis, konsultasikan gerakan yang sesuai."],
      cta: "Berdiri sebentar setelah video ini—tanpa menjadikannya pengganti anjuran dokter.",
    },
    {
      title: "Mengantuk setelah makan siang bukan selalu karena nasi",
      hook: "Sebelum menyalahkan satu menu, lihat porsi, tidur, dan waktu makan sebagai satu paket.",
      angle: "Ajak penonton mengamati pola tanpa diagnosis atau klaim medis berlebihan.",
      rationale: "Pengalaman umum yang mengundang eksperimen sadar dan tidak sensasional.",
      keywords: ["mengantuk setelah makan", "tidur cukup", "makan siang"],
      points: ["Catat jam tidur sebelum menyimpulkan makanan sebagai penyebab.", "Amati porsi dan kecepatan makan selama beberapa hari.", "Jika kantuk berat menetap atau mengganggu, cari pemeriksaan profesional."],
      cta: "Simpan catatan tiga hari; pola lebih berguna daripada satu tebakan.",
    },
    {
      title: "Minum air tidak perlu berlomba mengejar angka viral",
      hook: "Botol dua liter belum tentu menjadi takaran yang tepat untuk semua orang.",
      angle: "Jelaskan bahwa kebutuhan cairan dipengaruhi aktivitas, cuaca, dan kondisi individu.",
      rationale: "Meluruskan tren kesehatan populer tanpa memberi dosis medis universal.",
      keywords: ["minum air", "hidrasi", "mitos kesehatan"],
      points: ["Perhatikan rasa haus, aktivitas, dan lingkungan sebagai konteks.", "Sebarkan minum sepanjang hari daripada memaksa banyak sekaligus.", "Kondisi tertentu membutuhkan batas cairan dari tenaga kesehatan."],
      cta: "Ikuti anjuran profesional jika kamu punya kondisi ginjal atau jantung.",
    },
    {
      title: "Stretching leher: berhenti jika tujuannya membuat bunyi",
      hook: "Suara ‘krek’ bukan ukuran bahwa leher sudah lebih sehat.",
      angle: "Alihkan fokus ke gerakan nyaman dan tanda kapan harus berhenti.",
      rationale: "Topik tinggi pencarian dengan pendekatan keselamatan yang eksplisit.",
      keywords: ["leher kaku", "stretching aman", "nyeri leher"],
      points: ["Gunakan gerakan kecil dan tidak memaksa sampai timbul nyeri.", "Hindari tarikan atau putaran keras untuk mengejar bunyi.", "Nyeri menetap, menjalar, atau disertai kelemahan perlu diperiksa."],
      cta: "Jangan jadikan video pengganti diagnosis; dengarkan tanda dari tubuhmu.",
    },
    {
      title: "Tidur siang singkat: atur alarm sebelum rebahan",
      hook: "Niatnya sepuluh menit, bangunnya justru lebih berat? Durasi dan waktu perlu diperhatikan.",
      angle: "Berikan eksperimen tidur siang terukur tanpa menjanjikan hasil sama untuk semua orang.",
      rationale: "Situasi sangat relatable dan langkahnya dapat divisualkan sebagai timeline.",
      keywords: ["power nap", "tidur siang", "energi kerja"],
      points: ["Pilih waktu yang tidak terlalu dekat dengan jam tidur malam.", "Pasang alarm agar durasi tetap sesuai rencana.", "Evaluasi apakah kamu bangun lebih segar atau justru pusing."],
      cta: "Catat respons tubuhmu; kebutuhan tidur setiap orang bisa berbeda.",
    },
  ],
  "Bisnis & Karier": [
    {
      title: "Portofolio bukan album. Tunjukkan keputusanmu.",
      hook: "Sepuluh gambar bagus bisa kalah informatif dari satu studi kasus yang menjelaskan alasan.",
      angle: "Susun studi kasus dari masalah, batasan, pilihan, dan hasil yang dapat diverifikasi.",
      rationale: "Sangat berguna untuk pencari kerja kreatif dan menyediakan format yang bisa ditiru.",
      keywords: ["portofolio kerja", "studi kasus", "melamar kerja"],
      points: ["Mulai dari masalah dan peranmu, bukan hanya hasil akhir.", "Tunjukkan satu pilihan sulit beserta alternatif yang kamu tolak.", "Cantumkan hasil sejujurnya, termasuk hal yang belum berhasil."],
      cta: "Pilih satu proyek lalu tulis ulang dengan empat bagian ini.",
    },
    {
      title: "Follow-up lamaran tanpa terdengar menagih",
      hook: "Pesan follow-up yang baik tidak mengulang seluruh lamaran dan tidak meminta jawaban instan.",
      angle: "Beri struktur singkat: konteks, minat, dan pertanyaan tentang tahapan.",
      rationale: "Template praktis untuk situasi yang sering menimbulkan kecemasan pencari kerja.",
      keywords: ["follow up lamaran", "cari kerja", "email rekruter"],
      points: ["Sebutkan posisi dan tanggal lamaran agar konteks mudah ditemukan.", "Tanyakan tahapan atau rentang waktu, bukan menuntut kepastian.", "Kirim satu pesan sopan lalu lanjutkan proses pada peluang lain."],
      cta: "Simpan strukturnya dan sesuaikan dengan komunikasi perusahaan.",
    },
    {
      title: "Harga freelance: hitung hari yang tidak bisa dijual",
      hook: "Tarif harian bukan cuma waktu di depan laptop saat mengerjakan klien.",
      angle: "Masukkan administrasi, revisi, pajak, alat, dan waktu tanpa proyek ke dasar perhitungan.",
      rationale: "Edukasi bisnis konkret tanpa menetapkan angka universal yang menyesatkan.",
      keywords: ["harga freelance", "tarif jasa", "bisnis kreatif"],
      points: ["Hitung biaya operasional dan kapasitas kerja yang realistis.", "Definisikan jumlah revisi serta ruang lingkup dalam penawaran.", "Sisihkan margin untuk risiko dan periode tanpa pemasukan."],
      cta: "Gunakan perhitungan ini sebagai dasar, lalu sesuaikan pasar dan pengalamanmu.",
    },
    {
      title: "UMKM: jangan catat omzet sebagai uang bebas",
      hook: "Uang masuk hari ini belum tentu boleh dipakai hari ini juga.",
      angle: "Pisahkan uang usaha, kewajiban, dan laba dengan ritual mingguan sederhana.",
      rationale: "Konsep fundamental yang sering terlewat dan berdampak langsung pada arus kas usaha.",
      keywords: ["keuangan UMKM", "omzet dan laba", "arus kas usaha"],
      points: ["Pisahkan rekening atau pencatatan pribadi dan usaha.", "Catat stok, pembayaran pemasok, serta kewajiban yang segera tiba.", "Tinjau laba setelah biaya, bukan hanya total penjualan."],
      cta: "Mulai dari satu catatan arus kas mingguan yang benar-benar diperbarui.",
    },
    {
      title: "Brief klien yang bagus dimulai dari larangan",
      hook: "Daftar keinginan saja sering belum cukup. Batasan membuat keputusan kreatif lebih tajam.",
      angle: "Tambahkan non-goal, batas waktu, aset, dan pihak pemberi keputusan ke brief.",
      rationale: "Mengajarkan pencegahan revisi dengan alur yang cocok untuk agensi dan freelancer.",
      keywords: ["brief klien", "manajemen proyek", "revisi desain"],
      points: ["Tulis apa yang tidak ingin dicapai agar ruang lingkup tidak melebar.", "Tetapkan satu pemberi keputusan final sebelum produksi dimulai.", "Pastikan aset, format, dan tenggat disepakati dalam dokumen yang sama."],
      cta: "Tambahkan empat pertanyaan ini ke template brief berikutnya.",
    },
  ],
};

function hashNumber(value: string) {
  return parseInt(createHash("sha256").update(value).digest("hex").slice(0, 8), 16);
}

function normalizeKeywords(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const clean = value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return clean.length ? clean : fallback;
}

function cleanIdeas(input: unknown, niche: string, source: string, salt: string): Blueprint[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.title !== "string" || typeof item.hook !== "string") return [];
    const points = Array.isArray(item.points) ? item.points.filter((point): point is string => typeof point === "string").slice(0, 3) : [];
    if (points.length < 3) return [];
    return [{
      title: item.title.trim().slice(0, 110),
      hook: item.hook.trim().slice(0, 240),
      angle: typeof item.angle === "string" ? item.angle.trim() : "Penjelasan singkat dengan contoh yang dapat dipraktikkan.",
      rationale: typeof item.rationale === "string" ? item.rationale.trim() : "Relevan dengan audiens dan memiliki struktur visual yang kuat.",
      keywords: normalizeKeywords(item.keywords, [niche.toLowerCase(), "shorts", "edukasi"]),
      points: points as [string, string, string],
      cta: typeof item.cta === "string" ? item.cta.trim() : "Simpan untuk dicoba nanti.",
    }];
  }).map((item, index) => ({ ...item, score: undefined, salt: `${salt}-${index}` })).map(({ score: _score, salt: _salt, ...item }) => item);
}

async function requestOpenAI(niche: string, audience: string, tone: string, salt: string): Promise<Blueprint[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Kamu adalah kepala strategi YouTube Shorts berbahasa Indonesia. Buat ide orisinal, spesifik, aman, tanpa clickbait atau janji hasil. Balas hanya JSON." },
          { role: "user", content: `Niche: ${niche}\nAudiens: ${audience}\nNada: ${tone}\nBenih variasi: ${salt}\nBuat 6 ide baru, jangan ulang ide populer secara generik. Format: {"ideas":[{"title":"","hook":"","angle":"","rationale":"","keywords":["",""],"points":["","",""],"cta":""}]}. Setiap points berisi tiga fakta/langkah substantif, masing-masing maksimum 140 karakter.` },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { ideas?: unknown };
    const cleaned = cleanIdeas(parsed.ideas, niche, "OpenAI", salt);
    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}

export async function generateIdeaBatch(niche: string, audience: string, tone: string, count = 6) {
  const salt = `${Date.now()}-${randomUUID()}`;
  const fromAI = await requestOpenAI(niche, audience, tone, salt);
  if (fromAI) return { ideas: materialize(fromAI, niche, "OpenAI", salt).slice(0, count), mode: "openai" as const };
  const pool = LIBRARY[niche] || Object.values(LIBRARY).flat();
  const rotated = pool.map((item, index) => ({ item, order: hashNumber(`${salt}-${item.title}-${index}`) })).sort((a, b) => a.order - b.order).map(({ item }) => item);
  return { ideas: materialize(rotated.slice(0, count), niche, "Mesin editorial lokal • bukan tren live", salt), mode: "local" as const };
}

function materialize(items: Blueprint[], niche: string, source: string, salt: string): Idea[] {
  return items.map((item, index) => ({
    ...item,
    id: randomUUID(),
    niche,
    source,
    status: "fresh",
    score: 76 + (hashNumber(`${salt}-${item.title}-${index}`) % 22),
    createdAt: new Date().toISOString(),
  }));
}

export function seedIdeas(): Idea[] {
  const defaults = LIBRARY.Produktivitas.slice(0, 4);
  const extras = [LIBRARY["Teknologi & AI"][0], LIBRARY["Keuangan Pribadi"][0]];
  return materialize([...defaults, ...extras], "Produktivitas", "Kurasi editorial Laju", "seed").map((idea, index) => index > 3 ? { ...idea, niche: index === 4 ? "Teknologi & AI" : "Keuangan Pribadi" } : idea);
}

export function createProjectBlueprint(idea: Idea, theme: "lime" | "coral" | "violet" | "blue" = "lime") {
  const visualOrder: VisualKind[] = ["burst", "waves", "steps", "compare", "stat", "orbit", "burst"];
  const accents = ["#d9ff63", "#ff7657", "#68d8ff", "#b99aff"];
  const scenes: Scene[] = [
    { id: randomUUID(), heading: "Berhenti sebentar.", narration: idea.hook, caption: idea.hook, duration: 3.5, visual: "burst", accent: accents[0], items: [idea.niche, "30 detik"] },
    { id: randomUUID(), heading: "Masalah sebenarnya", narration: idea.angle, caption: idea.angle, duration: 4.5, visual: "waves", accent: accents[1], items: ["Bukan sekadar teori", "Bisa dicoba hari ini"] },
    ...idea.points.slice(0, 3).map((point, index): Scene => ({
      id: randomUUID(),
      heading: `0${index + 1} / ${["Mulai dari dasar", "Ubah caranya", "Uji hasilnya"][index]}`,
      narration: point,
      caption: point,
      duration: 5,
      visual: visualOrder[index + 2],
      accent: accents[(index + 1) % accents.length],
      items: index === 0 ? ["Amati", "Pilih", "Mulai"] : index === 1 ? ["Sebelum", "Sesudah"] : ["Kecil", "Terukur", "Konsisten"],
    })),
    { id: randomUUID(), heading: "Intinya", narration: `${idea.angle} Pilih satu langkah yang paling mungkin kamu lakukan, lalu lihat hasilnya.`, caption: "Satu langkah kecil. Satu hasil yang bisa kamu periksa.", duration: 4, visual: "orbit", accent: accents[2], items: idea.keywords.slice(0, 3) },
    { id: randomUUID(), heading: "Giliranmu.", narration: idea.cta, caption: idea.cta, duration: 3, visual: "burst", accent: accents[0], items: ["Simpan", "Coba", "Bagikan"] },
  ];
  const script = scenes.map((scene, index) => `[${index + 1}] ${scene.narration}`).join("\n\n");
  const tags = Array.from(new Set([...idea.keywords, idea.niche, "Shorts", "edukasi"])).slice(0, 10);
  return {
    title: idea.title.slice(0, 95),
    description: `${idea.hook}\n\n${idea.angle}\n\n${idea.cta}\n\nDibuat sebagai konten edukasi singkat. Verifikasi informasi penting dari sumber tepercaya.\n\n${tags.slice(0, 5).map((tag) => `#${tag.replace(/[^a-zA-Z0-9]/g, "")}`).join(" ")} #Shorts`,
    niche: idea.niche,
    scenes,
    script,
    tags,
    theme,
  };
}

export function ideaFromBrief(brief: string, niche: string, audience: string): Idea {
  const sections = brief.split(/\n|;/).map((part) => part.trim()).filter(Boolean);
  const title = (sections[0] || brief).slice(0, 100);
  const providedPoints = sections.slice(1, 4);
  const points = providedPoints.length === 3 ? providedPoints : [
    `Tentukan hasil yang ingin dipahami oleh ${audience} setelah menonton.`,
    `Gunakan contoh paling konkret tentang “${title}” dan hindari klaim yang tidak bisa dibuktikan.`,
    "Tutup dengan satu tindakan kecil yang dapat dilakukan penonton hari ini.",
  ];
  return {
    id: randomUUID(), title, hook: `Masih bingung soal ${title.replace(/[.!?]+$/, "")}? Mari pecah menjadi tiga bagian.`, angle: "Penjelasan ringkas berdasarkan brief kamu, disusun untuk dibaca dan dipahami dalam satu tontonan.", rationale: "Dibuat langsung dari brief pengguna; tambahkan tiga poin dengan tanda titik koma untuk naskah lokal yang lebih spesifik.", keywords: [niche.toLowerCase(), "tutorial singkat", "shorts"], points, cta: "Simpan video ini dan coba satu langkahnya hari ini.", score: 80, niche, source: "Brief pengguna • mesin lokal", status: "fresh", createdAt: new Date().toISOString(),
  };
}
