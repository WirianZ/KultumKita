// script.js

const BATCH_SIZE = 4;
const badgeColors = ["bg-[#5A7865]", "bg-[#A3B19B]", "bg-[#C88A68]", "bg-[#5A7865]"];
const namaHariList = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Tema mingguan: minggu ganjil = English, minggu genap = Arabic (berselang-seling)
const HARI_AKTIF_PER_MINGGU = 4; // Senin - Kamis = 1 deret card
const TEMA_MINGGU = {
  english: {
    label: "English",
    card: "border-[#9DBFDB] bg-[#E6F0F8]",
    pill: "bg-[#3B6E99] text-white"
  },
  arabic: {
    label: "Arabic",
    card: "border-[#DDBF73] bg-[#FAF0D2]",
    pill: "bg-[#8A6A12] text-white"
  }
};

// Konfigurasi Paginasi
const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let semuaJadwalGlobal = [];

/**
 * Helper untuk format tanggal lengkap ke bahasa Indonesia
 */
function formatTanggalLengkap(dateObj) {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return dateObj.toLocaleDateString('id-ID', options);
}

/**
 * Fungsi utama untuk menghasilkan jadwal mingguan berdasarkan data kelas
 */
function generateJadwalMingguan(dataKelas, tanggalMulaiStr = '30/10/2026') {
  let statePointer = {
    indexKelasTerakhir: 0,
    pointerAbsen: {}
  };

  dataKelas.forEach(kelas => {
    statePointer.pointerAbsen[kelas.idKelas] = 0;
  });

  const parts = tanggalMulaiStr.split('/');
  let tanggalBerjalan = new Date(parts[2], parts[1] - 1, parts[0]);
  
  let hasilJadwal = [];
  let counterHari = 0;

  while (counterHari < 48) {
    const kodeHari = tanggalBerjalan.getDay();

    if (kodeHari >= 1 && kodeHari <= 4) {
      counterHari++;

      const jumlahKelas = dataKelas.length;
      const kelasSaatIni = dataKelas[statePointer.indexKelasTerakhir];
      const totalSiswa = kelasSaatIni.daftarSiswa.length;

      const indexAwal = statePointer.pointerAbsen[kelasSaatIni.idKelas];

      // Ambil siswa secara melingkar: kalau sampai absen terakhir,
      // slot yang kosong diisi dari absen paling awal.
      // Math.min mencegah satu siswa muncul dua kali di kelas yang siswanya < BATCH_SIZE.
      const jumlahAmbil = Math.min(BATCH_SIZE, totalSiswa);
      const siswaMaju = [];
      for (let i = 0; i < jumlahAmbil; i++) {
        siswaMaju.push(kelasSaatIni.daftarSiswa[(indexAwal + i) % totalSiswa]);
      }

      // Giliran berikutnya lanjut dari siswa setelah siswa terakhir yang tampil
      statePointer.pointerAbsen[kelasSaatIni.idKelas] = (indexAwal + jumlahAmbil) % totalSiswa;
      statePointer.indexKelasTerakhir = (statePointer.indexKelasTerakhir + 1) % jumlahKelas;

      hasilJadwal.push({
        hari: namaHariList[kodeHari],
        tanggal: formatTanggalLengkap(tanggalBerjalan),
        namaKelas: kelasSaatIni.namaKelas,
        petugas: siswaMaju.map(s => s.nama)
      });
    }
    tanggalBerjalan.setDate(tanggalBerjalan.getDate() + 1);
  }

  return hasilJadwal;
}

/**
 * Merender card khusus untuk halaman aktif
 */
function renderHalaman(page) {
  const container = document.getElementById("jadwal-container");
  if (!container) return;
  
  container.innerHTML = "";

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const jadwalHalamanIni = semuaJadwalGlobal.slice(startIndex, endIndex);

  if (jadwalHalamanIni.length === 0) {
    container.innerHTML = `<p class="text-sm text-gray-400 col-span-full text-center py-8">Tidak ada data jadwal.</p>`;
    return;
  }

  jadwalHalamanIni.forEach((jadwal, index) => {
    const listPetugasHTML = jadwal.petugas.map((nama, idx) => `
      <li class="flex items-center space-x-3 rounded-lg bg-white/70 p-2.5 transition hover:bg-white">
        <div class="flex h-7 w-7 items-center justify-center rounded-full ${badgeColors[idx % badgeColors.length]} text-xs font-bold text-white">
          ${idx + 1}
        </div>
        <span class="text-sm font-medium text-gray-700">${nama}</span>
      </li>
    `).join('');

    const isHariIni = (page === 1 && index === 0);

    // Tentukan minggu ke-berapa berdasarkan urutan global (bukan urutan di halaman),
    // supaya pola English/Arabic tetap nyambung antar halaman paginasi.
    const urutanGlobal = startIndex + index;
    const mingguKe = Math.floor(urutanGlobal / HARI_AKTIF_PER_MINGGU);
    const tema = mingguKe % 2 === 0 ? TEMA_MINGGU.english : TEMA_MINGGU.arabic;

    const cardHTML = `
      <div class="rounded-2xl border ${tema.card} p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
        <div>
          <span class="mb-3 inline-block rounded-full {tema.label}</span>
          <div class="mb-4 border-b border-black/10 pb-3 flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-[#2A342D]">${jadwal.hari}</h3>
              <p class="text-xs text-[#5A7865] font-semibold mt-0.5">${jadwal.namaKelas}</p>
              <p class="text-xs text-gray-500">${jadwal.tanggal}</p>
            </div>
            ${isHariIni ? '<span class="rounded-full bg-[#5A7865]/10 px-2.5 py-1 text-xs font-medium text-[#5A7865]">Hari Ini</span>' : ''}
          </div>

          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Petugas / Peserta</p>
            <ul class="space-y-2">
              ${listPetugasHTML}
            </ul>
          </div>
        </div>
      </div>
    `;

    container.innerHTML += cardHTML;
  });

  renderPaginationControls();
}

/**
 * Merender kontrol nomor halaman di bagian bawah container
 */
function renderPaginationControls() {
  let paginationContainer = document.getElementById("pagination-container");
  
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.className = "flex justify-center items-center space-x-2 mt-8 pt-6 border-t border-gray-100";
    document.getElementById("jadwal-container")?.after(paginationContainer);
  }

  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(semuaJadwalGlobal.length / ITEMS_PER_PAGE);

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const button = document.createElement("button");
    button.innerText = i;
    button.className = `min-w-[40px] h-10 px-3 text-sm font-semibold rounded-xl transition cursor-pointer ${
      i === currentPage
        ? "bg-[#5A7865] text-white shadow-sm"
        : "bg-[#F4F5F0]/60 text-[#2A342D] hover:bg-[#A3B19B]/30"
    }`;

    button.addEventListener("click", () => {
      currentPage = i;
      renderHalaman(currentPage);
      document.getElementById("jadwal-container")?.scrollIntoView({ behavior: 'smooth' });
    });

    paginationContainer.appendChild(button);
  }
}

/**
 * Pengendali Navigasi Tab (Home & About)
 */
function setupNavigation() {
  const navHome = document.getElementById("nav-home");
  const navAbout = document.getElementById("nav-about");
  const homeView = document.getElementById("home-view");
  const aboutView = document.getElementById("about-view");

  if (!navHome || !navAbout || !homeView || !aboutView) {
    console.warn("Elemen navigasi tidak ditemukan di HTML.");
    return;
  }

  function setTab(activeTab) {
    if (activeTab === "home") {
      homeView.classList.remove("hidden");
      aboutView.classList.add("hidden");

      navHome.className = "text-[#F4F5F0] font-semibold border-b-2 border-[#F4F5F0] pb-0.5 transition-all duration-200 cursor-pointer";
      navAbout.className = "text-[#F4F5F0]/70 hover:text-[#F4F5F0] font-medium transition-colors duration-200 cursor-pointer";
    } else {
      homeView.classList.add("hidden");
      aboutView.classList.remove("hidden");

      navAbout.className = "text-[#F4F5F0] font-semibold border-b-2 border-[#F4F5F0] pb-0.5 transition-all duration-200 cursor-pointer";
      navHome.className = "text-[#F4F5F0]/70 hover:text-[#F4F5F0] font-medium transition-colors duration-200 cursor-pointer";
    }
  }

  navHome.addEventListener("click", (e) => {
    e.preventDefault();
    setTab("home");
  });

  navAbout.addEventListener("click", (e) => {
    e.preventDefault();
    setTab("about");
  });
}

/**
 * Fungsi utama untuk memuat data dari task.json
 */
async function muatDanTampilkanJadwal() {
  try {
    const response = await fetch('task.json');
    if (!response.ok) {
      throw new Error('Gagal memuat file task.json');
    }
    const dataKelas = await response.json();

    const tanggalMulai = '30/10/2026';
    const infoPeriodeEl = document.getElementById("info-periode");
    if (infoPeriodeEl) {
      infoPeriodeEl.innerText = `Periode Mulai: ${tanggalMulai}`;
    }

    semuaJadwalGlobal = generateJadwalMingguan(dataKelas, tanggalMulai);
    currentPage = 1;
    renderHalaman(currentPage);

  } catch (error) {
    console.error('Terjadi kesalahan:', error);
    const container = document.getElementById("jadwal-container");
    if (container) {
      container.innerHTML = `<p class="text-red-500 text-sm col-span-full text-center">Gagal memuat data jadwal dari task.json.</p>`;
    }
  }
}

// Inisialisasi utama saat DOM siap
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  muatDanTampilkanJadwal();
});