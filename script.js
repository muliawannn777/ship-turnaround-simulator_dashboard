document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const elements = {
    // Input elements
    gtInput: document.getElementById("gt"),
    cargoTypeSelect: document.getElementById("cargoType"),
    cranesInput: document.getElementById("cranes"),
    craneValue: document.getElementById("craneValue"),
    dwtInput: document.getElementById("dwt"),
    teuInput: document.getElementById("teu"),
    pumpCapacityInput: document.getElementById("pumpCapacity"),
    conveyorSpeedInput: document.getElementById("conveyorSpeed"),
    liquidTypeSelect: document.getElementById("liquidType"),

    // Field groups
    containerFields: document.getElementById("containerFields"),
    dryBulkFields: document.getElementById("dryBulkFields"),
    liquidFields: document.getElementById("liquidFields"),
    dwtGroup: document.getElementById("dwtGroup"),

    // Output elements
    calculateBtn: document.getElementById("calculateBtn"),
    timeResult: document.getElementById("time"),
    progressFill: document.getElementById("progressFill"),
    recommendationText: document.getElementById("recommendation"),
    breakdownText: document.getElementById("breakdown"),

    // Other
    currentYear: document.getElementById("currentYear"),
  };

  // Data industri dari UNCTAD/MarineTraffic/2022
  const industryData = {
    container: {
      medianTime: 19.2, // jam
      maxGT: 237200,
      avgTEU: 3431,
    },
    dry_bulk: {
      medianTime: 50.64, // jam
      maxDWT: 404389,
      avgDWT: 57268,
    },
    liquid: {
      medianTime: 23.52, // jam (0.98 hari dari tabel)
      maxDWT: 323183, // dari kolom "Maximum cargo carrying capacity"
      avgDWT: 27275, // dari kolom "Average cargo carrying capacity"
      densityFactors: {
        crude: 0.88, // Minyak mentah
        refined: 0.85, // Produk olahan
        chemical: 0.92, // Bahan kimia
        lng: 0.47, // LNG
        lpg: 0.58, // LPG
        other: 0.85, // Default
      },
      // Kapasitas pompa realistis berdasarkan data UNCTAD
      realisticPumpCapacity: 1160, // 27.275 DWT / 23.52 jam ≈ 1160 ton/jam
    },
  };

  elements.currentYear.textContent = new Date().getFullYear();

  // FORMAT INPUT ANGKA DENGAN TITIK RIBUAN
  function formatNumberInput(inputElement) {
    inputElement.addEventListener("input", function () {
      // Simpan posisi kursor
      const cursorPosition = this.selectionStart;
      const originalLength = this.value.length;

      // Hapus semua karakter non-digit
      let value = this.value.replace(/[^\d]/g, "");

      // Format dengan titik ribuan
      if (value.length > 3) {
        value = parseInt(value).toLocaleString("id-ID");
      }

      this.value = value;

      // Sesuaikan posisi kursor
      const addedChars = this.value.length - originalLength;
      this.setSelectionRange(
        cursorPosition + addedChars,
        cursorPosition + addedChars
      );
    });
  }

  // Terapkan format ke semua input numerik
  formatNumberInput(elements.gtInput);
  formatNumberInput(elements.dwtInput);
  formatNumberInput(elements.teuInput);
  formatNumberInput(elements.pumpCapacityInput);
  formatNumberInput(elements.conveyorSpeedInput);

  // Fungsi untuk mengkonversi string berformat ke number
  function parseFormattedNumber(formattedValue) {
    return parseFloat(formattedValue.replace(/\./g, "")) || 0;
  }

  // TOGGLE FIELD BERDASARKAN JENIS MUATAN
  function toggleFieldsByCargoType() {
    const type = elements.cargoTypeSelect.value;

    // Semua field disembunyikan dulu
    document.querySelectorAll(".cargo-specific, #dwtGroup").forEach((el) => {
      el.hidden = true;
    });

    // Sembunyikan semua field grup dahulu
    function toggleFields() {
      const cargoType = elements.cargoTypeSelect.value;

      // Semua field disembunyikan dahulu (termasuk DWT)
      elements.dwtGroup.style.display = "none";
      elements.containerFields.style.display = "none";
      elements.dryBulkFields.style.display = "none";
      elements.liquidFields.style.display = "none";

      // Tampilkan hanya yang diperlukan
      switch (cargoType) {
        case "container":
          elements.containerFields.style.display = "block";
          break;
        case "dry_bulk":
          elements.dryBulkFields.style.display = "block";
          elements.dwtGroup.style.display = "block";
          break;
        case "liquid":
          elements.liquidFields.style.display = "block";
          elements.dwtGroup.style.display = "block";
          break;
      }
    }

    function initializeFields() {
      // Reset semua nilai input
      elements.dwtInput.value = "";

      // Sembunyikan semua field spesifik
      toggleFields();

      // Paksa hidden untuk DWT jika belum terapply
      elements.dwtGroup.style.display = "none";
    }

    elements.cargoTypeSelect.addEventListener("change", function () {
      toggleFields();

      // Reset DWT jika pindah ke container
      if (this.value === "container") {
        elements.dwtInput.value = "";
      }
    });
    // Jalankan inisialisasi saat pertama load
    initializeFields();
  }

  // Event listener untuk perubahan jenis muatan
  elements.cargoTypeSelect.addEventListener("change", function () {
    toggleFieldsByCargoType();

    // Reset nilai DWT jika pindah ke container
    if (this.value === "container") {
      elements.dwtInput.value = "";
    }
  });
  // Update tampilan nilai crane
  elements.cranesInput.addEventListener("input", function () {
    elements.craneValue.textContent = this.value;
  });

  // VALIDASI INPUT REALISTIS
  function validateInputs(cargoType, values) {
    // Validasi GT minimal 1000
    if (values.gt < 1000) {
      alert("GT minimal 1.000");
      return false;
    }

    // Validasi berdasarkan jenis muatan
    if (cargoType === "container") {
      if (values.teu < 100) {
        alert("Jumlah TEU minimal 100");
        return false;
      }
      if (values.gt > industryData.container.maxGT) {
        alert(
          `GT melebihi kapasitas maksimum industri (${industryData.container.maxGT.toLocaleString(
            "id-ID"
          )})`
        );
        return false;
      }
    } else if (cargoType === "dry_bulk") {
      if (values.dwt < 1000) {
        alert("DWT minimal 1.000");
        return false;
      }
      if (values.dwt > industryData.dry_bulk.maxDWT) {
        alert(
          `DWT melebihi kapasitas maksimum industri (${industryData.dry_bulk.maxDWT.toLocaleString(
            "id-ID"
          )})`
        );
        return false;
      }
    } else if (cargoType === "liquid") {
      // Validasi DWT
      if (values.dwt < 1000) {
        alert("DWT minimal 1.000");
        return false;
      }
      if (values.dwt > industryData.liquid.maxDWT) {
        alert(
          `DWT melebihi kapasitas maksimum industri (${industryData.liquid.maxDWT.toLocaleString(
            "id-ID"
          )})`
        );
        return false;
      }

      // Validasi Pump Capacity
      const minPump = 500; // Minimum untuk kapal kecil
      const maxPump = 10000; // Maksimum untuk VLCC
      if (values.pumpCapacity < minPump || values.pumpCapacity > maxPump) {
        alert(`Kapasitas pompa harus antara ${minPump}-${maxPump} ton/jam`);
        return false;
      }
      // Validasi jenis liquid
      if (
        !Object.keys(industryData.liquid.densityFactors).includes(
          values.liquidType
        )
      ) {
        alert("Jenis liquid tidak valid");
        return false;
      }
    }

    return true;
  }

  // KALKULASI WAKTU OPERASIONAL
  function calculateOperationTime(cargoType, values) {
    let operationalTime = 0;
    let breakdown = "";

    if (cargoType === "container") {
      // Asumsi 1 TEU membutuhkan ~4.8 menit (0.08 jam) dengan 2 crane
      const baseTimePerTEU = 0.08; // jam per TEU
      const craneEfficiency = 1 + 0.12 * (values.cranes - 2);
      operationalTime = (values.teu * baseTimePerTEU) / craneEfficiency;

      breakdown = `
        <h3>Breakdown Container</h3>
        <ul>
          <li><strong>Waktu Operasi:</strong> ${operationalTime.toFixed(
            1
          )} jam</li>
          <li><strong>Jumlah TEU:</strong> ${values.teu.toLocaleString(
            "id-ID"
          )}</li>
          <li><strong>STS Crane:</strong> ${values.cranes} unit</li>
          <li><strong>Efisiensi Crane:</strong> ${(
            craneEfficiency * 100
          ).toFixed(0)}%</li>
          <li><small>Rata-rata industri: ${
            industryData.container.medianTime
          } jam (${industryData.container.avgTEU.toLocaleString(
        "id-ID"
      )} TEU)</small></li>
        </ul>
      `;
    } else if (cargoType === "dry_bulk") {
      // Formula dry bulk: waktu berdasarkan conveyor dengan faktor handling
      const handlingFactor = 1.1;
      operationalTime = (values.dwt / values.conveyorSpeed) * handlingFactor;

      breakdown = `
        <h3>Breakdown Dry Bulk</h3>
        <ul>
          <li><strong>Waktu Operasi:</strong> ${operationalTime.toFixed(
            1
          )} jam</li>
          <li><strong>Kapasitas DWT:</strong> ${values.dwt.toLocaleString(
            "id-ID"
          )} ton</li>
          <li><strong>Kecepatan Conveyor:</strong> ${values.conveyorSpeed.toLocaleString(
            "id-ID"
          )} ton/jam</li>
          <li><small>Rata-rata industri: ${
            industryData.dry_bulk.medianTime
          } jam (${industryData.dry_bulk.avgDWT.toLocaleString(
        "id-ID"
      )} DWT)</small></li>
        </ul>
      `;
    } else if (cargoType === "liquid") {
      // Formula liquid: waktu berdasarkan pompa dengan density factor
      const densityFactor =
        industryData.liquid.densityFactors[values.liquidType] || 0.85;
      operationalTime = values.dwt / (values.pumpCapacity * densityFactor);

      const liquidNames = {
        crude: "Minyak Mentah",
        refined: "Produk Olahan",
        chemical: "Kimia",
        lng: "LNG",
        other: "Lainnya",
      };
    }

    return { operationalTime, breakdown };
  }
  function calculateLiquidTime(dwt, pumpCapacity, liquidType) {
    // Data tetap mengacu ke tabel UNCTAD
    const industryDWT = 27275; // Average DWT liquid bulk carriers
    const industryTime = 23.52; // Median time (0.98 hari)

    // Density factor disesuaikan agar hasil = 23.52 jam saat DWT = 27.275 & pump = 1.160
    const densityFactors = {
      crude: 0.88, // Minyak mentah (default)
      other: 0.88,
    };

    // Validasi jenis liquid
    if (!densityFactors[liquidType]) {
      liquidType = "crude"; // Fallback ke crude
    }

    // Rumus inti (dengan adjustment otomatis)
    const operationalTime =
      (dwt / (pumpCapacity * densityFactors[liquidType])) *
      (1160 / pumpCapacity);

    return operationalTime;
  }

  // KALKULASI LIQUID
  function calculateLiquidOperation(values) {
    const { dwt, pumpCapacity, liquidType } = values;
    const { densityFactors, realisticPumpCapacity } = industryData.liquid;

    // 1. Hitung waktu dasar
    const density = densityFactors[liquidType] || 0.85;
    let operationalTime = dwt / (pumpCapacity * density);

    // 2. Adjust agar kapal berukuran rata-rata (27,275 DWT) ≈ 23.52 jam
    const adjustmentFactor = Math.sqrt(realisticPumpCapacity / pumpCapacity);
    operationalTime *= adjustmentFactor;

    // 3. Breakdown detail
    const breakdown = `
    <h3>Breakdown Liquid Bulk</h3>
    <ul>
      <li><strong>Waktu Operasi:</strong> ${operationalTime.toFixed(1)} jam</li>
      <li><strong>Kapasitas DWT:</strong> ${dwt.toLocaleString(
        "id-ID"
      )} ton</li>
      <li><strong>Kapasitas Pompa:</strong> ${pumpCapacity.toLocaleString(
        "id-ID"
      )} ton/jam</li>
      <li><strong>Jenis Liquid:</strong> ${liquidType}</li>
      <li><strong>Density Factor:</strong> ${density.toFixed(2)}</li>
      <li><small>Rata industri: ${
        industryData.liquid.medianTime
      } jam (${industryData.liquid.avgDWT.toLocaleString(
      "id-ID"
    )} DWT)</small></li>
    </ul>
  `;

    return { operationalTime, breakdown };
  }

  // HASIL
  function displayResults(time, breakdown, cargoType) {
    elements.timeResult.textContent = time.toFixed(1);

    elements.breakdownText.innerHTML = breakdown;

    updateProgressBar(time, cargoType);

    generateRecommendation(time, cargoType);
  }

  function updateProgressBar(time, cargoType) {
    const maxTime = cargoType === "dry_bulk" ? 72 : 48; // dry bulk lebih lama
    const percentage = Math.min(100, (time / maxTime) * 100);
    elements.progressFill.style.width = `${percentage}%`;

    // Warna berdasarkan efisiensi
    elements.progressFill.style.backgroundColor =
      time < maxTime * 0.5
        ? "#10b981" // hijau untuk efisien
        : time < maxTime * 0.75
        ? "#f59e0b" // kuning untuk sedang
        : "#ef4444"; // merah untuk tidak efisien
  }

  function generateRecommendation(time, cargoType) {
    let icon, message;

    if (cargoType === "container") {
      if (time < 15) {
        icon = "fa-check-circle";
        message = "Operasi sangat efisien";
      } else if (time < 25) {
        icon = "fa-info-circle";
        message = "Pertimbangkan menambah crane";
      } else {
        icon = "fa-exclamation-triangle";
        message = "Butuh optimasi operasi";
      }
    } else if (cargoType === "dry_bulk") {
      if (time < 30) {
        icon = "fa-check-circle";
        message = "Operasi sangat efisien";
      } else if (time < 45) {
        icon = "fa-info-circle";
        message = "Pertimbangkan upgrade conveyor";
      } else {
        icon = "fa-exclamation-triangle";
        message = "Butuh evaluasi menyeluruh";
      }
    } else if (cargoType === "liquid") {
      if (time < 15) {
        icon = "fa-check-circle";
        message = "Pumping sangat efisien";
      } else if (time < 25) {
        icon = "fa-info-circle";
        message = "Pertimbangkan upgrade pompa";
      } else {
        icon = "fa-exclamation-triangle";
        message = "Butuh peningkatan kapasitas";
      }
    }

    elements.recommendationText.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  }

  // EVENT LISTENER UNTUK TOMBOL HITUNG
  elements.calculateBtn.addEventListener("click", function () {
    const cargoType = elements.cargoTypeSelect.value;
    if (!cargoType) {
      alert("Pilih jenis muatan terlebih dahulu");
      return;
    }

    const inputValues = {
      gt: parseFormattedNumber(elements.gtInput.value),
      teu: parseFormattedNumber(elements.teuInput.value),
      dwt: parseFormattedNumber(elements.dwtInput.value),
      cranes: parseInt(elements.cranesInput.value) || 1,
      pumpCapacity:
        parseFormattedNumber(elements.pumpCapacityInput.value) || 1000,
      conveyorSpeed:
        parseFormattedNumber(elements.conveyorSpeedInput.value) || 2000,
      liquidType: elements.liquidTypeSelect.value,
    };

    // Validasi input
    if (!validateInputs(cargoType, inputValues)) return;

    // Kalkulasi waktu
    const { operationalTime, breakdown } = calculateOperationTime(
      cargoType,
      inputValues
    );

    displayResults(operationalTime, breakdown, cargoType);
  });

  // Inisialisasi awal
  toggleFieldsByCargoType();
});
