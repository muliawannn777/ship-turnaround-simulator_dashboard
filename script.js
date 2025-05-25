document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const elements = {
    gtInput: document.getElementById("gt"),
    cargoTypeSelect: document.getElementById("cargoType"),
    cranesInput: document.getElementById("cranes"),
    craneValue: document.getElementById("craneValue"),
    calculateBtn: document.getElementById("calculateBtn"),
    timeResult: document.getElementById("time"),
    progressFill: document.getElementById("progressFill"),
    recommendationText: document.getElementById("recommendation"),
    breakdownText: document.getElementById("breakdown"),
    liquidFields: document.getElementById("liquidFields"),
    craneGroup: document.getElementById("craneGroup"),
    dryBulkFields: document.getElementById("dryBulkFields"),
    pumpCapacityInput: document.getElementById("pumpCapacity"),
    unloaderTypeSelect: document.getElementById("unloaderType"),
    unloaderCapacityInput: document.getElementById("unloaderCapacity"),
    refreshDashboardBtn: document.getElementById("refreshDashboard"),
    maritimeDashboard: document.getElementById("maritimeDashboard"),
    currentYear: document.getElementById("currentYear"),
  };

  // Google Apps Script URL
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbySZQG-wGLpJPGumpZokA9pzwhao8xVlw3rXWt1tA_fdnpSUwjz35m4skuzUtu2Z3V6EQ/exec";

  // Format GT Input
  elements.gtInput.addEventListener("input", function () {
    let value = this.value.replace(/[^\d]/g, "");
    if (value.length > 3) {
      value = parseInt(value).toLocaleString("id-ID");
    }
    this.value = value;
  });

  // Toggle Input Fields
  function toggleInputFields() {
    const isLiquid = elements.cargoTypeSelect.value === "liquid";
    elements.liquidFields.style.display = isLiquid ? "block" : "none";
    elements.craneGroup.style.display = isLiquid ? "none" : "block";
    if (!isLiquid) elements.pumpCapacityInput.value = "";
  }

  // Update Crane Value Display
  elements.cranesInput.addEventListener("input", function () {
    elements.craneValue.textContent = this.value;
  });

  // Main Calculation Function
  elements.calculateBtn.addEventListener("click", async function () {
    // Validate Input
    const gt = parseInt(elements.gtInput.value.replace(/\./g, ""));
    if (!gt || gt <= 0) {
      showAlert("Masukkan GT kapal yang valid!", "error");
      elements.gtInput.focus();
      return;
    }

    // Calculate Operation Time
    const { operationalTime, breakdownDetails } = calculateOperationTime(
      gt,
      elements.cargoTypeSelect.value,
      parseInt(elements.cranesInput.value),
      parseInt(elements.pumpCapacityInput.value) || 0
    );

    const totalTime = operationalTime + 4;

    // Update UI
    updateResultsUI(
      totalTime,
      breakdownDetails,
      elements.cargoTypeSelect.value
    );

    // Save to Google Sheets
    try {
      const saveResult = await saveToGoogleSheets({
        timestamp: new Date().toISOString(),
        gt: gt,
        cargoType: elements.cargoTypeSelect.value,
        cranes:
          elements.cargoTypeSelect.value === "liquid"
            ? 0
            : parseInt(elements.cranesInput.value),
        pumpCapacity:
          elements.cargoTypeSelect.value === "liquid"
            ? parseInt(elements.pumpCapacityInput.value) || 1000
            : 0,
        estimatedTime: totalTime,
      });

      console.log("Save result:", saveResult);
      showAlert("Data berhasil disimpan!", "success");
    } catch (error) {
      console.error("Error saving data:", error);
      showAlert(`Gagal menyimpan data: ${error.message}`, "error");
    }
  });

  // Calculate Operation Time
  function calculateOperationTime(gt, cargoType, cranes, pumpCapacity) {
    let operationalTime, breakdownDetails;

    if (cargoType === "liquid") {
      operationalTime = (gt / 500) * (1000 / pumpCapacity);
      breakdownDetails = generateBreakdown(
        "liquid",
        operationalTime,
        pumpCapacity,
        gt
      );
    } else {
      const baseTime = (gt / 1000) * (cargoType === "container" ? 0.9 : 1.3);
      const craneEfficiency = 1 - 0.08 * (cranes - 1);
      operationalTime = baseTime * craneEfficiency;
      breakdownDetails = generateBreakdown(
        cargoType,
        operationalTime,
        cranes,
        gt
      );
    }
    if (cargoType === "dry_bulk") {
      alert(
        "Fitur dry bulk sedang dalam pengembangan lebih lanjut untuk menghitung berdasarkan alat khusus (Grab/Pneumatic Unloader)"
      );
      return; // Menghentikan eksekusi
    }
    return { operationalTime, breakdownDetails };
  }

  // Save to Google Sheets
  async function saveToGoogleSheets(data) {
    try {
      console.log("Sending data to Google Sheets:", data);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Google Sheets response:", result);

      if (result.status !== "success") {
        throw new Error(result.message || "Failed to save data");
      }

      return result;
    } catch (error) {
      console.error("Save error:", error);
      throw error;
    }
  }

  // Generate Breakdown Details
  function generateBreakdown(type, operationalTime, equipmentValue, gt) {
    const formattedGT = gt.toLocaleString("id-ID");

    if (type === "liquid") {
      return `
        <strong>Breakdown Waktu:</strong><br>
        - Pumping: ~${Math.round(
          operationalTime
        )} jam (${equipmentValue} m³/jam)<br>
        - Administrasi: ~4 jam<br>
        <small>Kapal Tanker ${formattedGT} GT</small>
      `;
    } else {
      const shipType = type === "container" ? "Container" : "Dry Bulk";
      const efficiency =
        type === "container"
          ? Math.round((1 - 0.08 * (equipmentValue - 1)) * 100)
          : "N/A";

      return `
        <strong>Breakdown Waktu:</strong><br>
        - Bongkar muat: ~${Math.round(operationalTime)} jam<br>
        - Crane: ${equipmentValue} unit${
        type === "container" ? ` (efisiensi ${efficiency}%)` : ""
      }<br>
        - Administrasi: ~4 jam<br>
        <small>Kapal ${shipType} ${formattedGT} GT</small>
      `;
    }
  }

  // Update UI
  function updateResultsUI(totalTime, breakdownDetails, cargoType) {
    elements.timeResult.textContent = Math.round(totalTime);
    elements.breakdownText.innerHTML = breakdownDetails;
    updateProgressBar(totalTime, cargoType);
    generateRecommendation(totalTime, cargoType);
  }

  // Update Progress Bar
  function updateProgressBar(time, cargoType) {
    const maxTime = cargoType === "liquid" ? 36 : 24;
    const percentage = (time / maxTime) * 100;
    elements.progressFill.style.width = `${Math.min(percentage, 100)}%`;

    elements.progressFill.style.background =
      time <= 12
        ? "#10b981"
        : time <= (cargoType === "liquid" ? 24 : 18)
        ? "#f59e0b"
        : "#ef4444";
  }

  // Generate Recommendation
  function generateRecommendation(time, cargoType) {
    let icon, message;

    if (cargoType === "liquid") {
      if (time <= 18) {
        icon = "fa-check-circle";
        message = "Efisiensi pumping sangat baik";
      } else {
        icon = "fa-exclamation-triangle";
        message = "Butuh peningkatan kapasitas pumping";
      }
    } else {
      const cranes = parseInt(elements.cranesInput.value);

      if (time <= 12) {
        icon = "fa-check-circle";
        message = "Operasi sangat efisien";
      } else if (time <= 18) {
        icon = "fa-info-circle";
        message = cranes < 4 ? "Tambahkan crane" : "Optimasi alur kerja";
      } else {
        icon = "fa-exclamation-triangle";
        message = "Butuh evaluasi menyeluruh";
      }
    }

    elements.recommendationText.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  }

  // Refresh Dashboard
  elements.refreshDashboardBtn.addEventListener("click", function () {
    elements.maritimeDashboard.src = elements.maritimeDashboard.src;
    showAlert("Memperbarui dashboard...", "info");
  });

  // Show Alert Notification
  function showAlert(message, type) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <i class="fas ${
        type === "error"
          ? "fa-exclamation-circle"
          : type === "success"
          ? "fa-check-circle"
          : "fa-info-circle"
      }"></i>
      ${message}
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
      alert.classList.add("fade-out");
      setTimeout(() => alert.remove(), 500);
    }, 3000);
  }

  // Initialize
  toggleInputFields();
  elements.cargoTypeSelect.addEventListener("change", toggleInputFields);
  elements.currentYear.textContent = new Date().getFullYear();

  // Debug: Test Google Sheets connection
  console.log("System initialized. Ready to connect to:", GOOGLE_SCRIPT_URL);
});
