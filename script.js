// ================================
// PISANG AMBON - FINAL LOKAL (NO API)
// ================================

// ============================
// ELEMENT
// ============================
const imageInput = document.getElementById("imageInput");
const originalCanvas = document.getElementById("originalCanvas");
const segmentedCanvas = document.getElementById("segmentedCanvas");

const predictedAge = document.getElementById("predictedAge");
const statusText = document.getElementById("statusText");

const processingContainer = document.getElementById("processingContainer");
const resultsContainer = document.getElementById("resultsContainer");

const video = document.getElementById("video");
const startCameraBtn = document.getElementById("startCamera");
const captureBtn = document.getElementById("captureImage");

const historyList = document.getElementById("historyList");

let ctxOriginal = originalCanvas.getContext("2d");
let ctxSegment = segmentedCanvas.getContext("2d");

// ============================
// VARIABEL
// ============================
let currentFileName = "Kamera";

// ============================
// MODEL REGRESI
// ============================
const INTERCEPT = -21.251;
const COEF = { H: 0.038, S: 0.005, V: 0.313, B: 0.045, A: -4.302 };

// ============================
// CAMERA
// ============================
startCameraBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch {
    alert("Tidak bisa akses kamera!");
  }
});

// ============================
// REMOVE BG (FAKE - LOKAL)
// ============================
async function removeBackground(file) {
  return URL.createObjectURL(file);
}

// ============================
// UPLOAD IMAGE
// ============================
imageInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  currentFileName = file.name;

  processingContainer.style.display = "block";
  resultsContainer.style.display = "none";

  const processedImageURL = await removeBackground(file);
  const img = new Image();

  img.onload = function () {
    originalCanvas.width = img.width;
    originalCanvas.height = img.height;
    segmentedCanvas.width = img.width;
    segmentedCanvas.height = img.height;

    ctxOriginal.drawImage(img, 0, 0);
    processImage();
  };

  img.src = processedImageURL;
});

// ============================
// CAMERA CAPTURE
// ============================
function handleImage(canvas) {
  processingContainer.style.display = "block";
  resultsContainer.style.display = "none";

  canvas.toBlob(async (blob) => {
    const processedImageURL = await removeBackground(blob);
    const img = new Image();

    img.onload = function () {
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      segmentedCanvas.width = img.width;
      segmentedCanvas.height = img.height;

      ctxOriginal.drawImage(img, 0, 0);
      processImage();
    };

    img.src = processedImageURL;
  }, "image/png");
}

captureBtn.addEventListener("click", () => {
  currentFileName = "Kamera_" + new Date().getTime();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  handleImage(canvas);
});

// ============================
// RGB → HSV
// ============================
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let d = max - min;

  let h = 0, s = 0, v = max;
  s = max === 0 ? 0 : d / max;

  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, v * 100];
}

// ============================
// PREDIKSI
// ============================
function predictBananaAge(h, s, v, brown, area) {
  let age = INTERCEPT +
    (COEF.H * h) +
    (COEF.S * s) +
    (COEF.V * v) +
    (COEF.B * brown) +
    (COEF.A * area);

  return Math.max(0, Math.min(age, 7));
}

function getBananaStatus(age) {
  if (age > 3) return "Matang";
  else if (age > 1) return "Terlalu matang";
  else return "Busuk";
}

// ============================
// PROCESS IMAGE
// ============================
function processImage() {
  const width = originalCanvas.width;
  const height = originalCanvas.height;

  const imageData = ctxOriginal.getImageData(0, 0, width, height);
  const data = imageData.data;

  const segmented = ctxSegment.createImageData(width, height);
  const segData = segmented.data;

  let totalHue = 0, totalSat = 0, totalVal = 0;
  let bananaPixels = 0, brownPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const [h, s, v] = rgbToHsv(r, g, b);

    if (v < 15 || v > 98 || s < 10) {
      segData[i + 3] = 0;
      continue;
    }

    const isYellow = (h >= 25 && h <= 65 && s > 30 && v > 50);
    const isBrown = (h >= 10 && h <= 35 && s > 20 && v > 20 && v < 70);

    if (isYellow || isBrown) {
      bananaPixels++;

      totalHue += h;
      totalSat += s;
      totalVal += v;

      if (isBrown) {
        brownPixels++;
        segData[i] = 120;
        segData[i + 1] = 60;
        segData[i + 2] = 20;
      } else {
        segData[i] = 255;
        segData[i + 1] = 255;
        segData[i + 2] = 0;
      }

      segData[i + 3] = 255;
    } else {
      segData[i + 3] = 0;
    }
  }

  if (bananaPixels < 300) {
    alert("❌ Bukan pisang / tidak jelas");
    processingContainer.style.display = "none";
    return;
  }

  const totalPixels = width * height;
  const areaRatio = bananaPixels / totalPixels;
  const yellowRatio = (bananaPixels - brownPixels) / bananaPixels;

  if (areaRatio < 0.03 || yellowRatio < 0.25) {
    alert("❌ Tidak valid sebagai pisang");
    processingContainer.style.display = "none";
    return;
  }

  ctxSegment.putImageData(segmented, 0, 0);

  const avgHue = totalHue / bananaPixels;
  const avgSat = totalSat / bananaPixels;
  const avgVal = totalVal / bananaPixels;
  const brownRatio = (brownPixels / bananaPixels) * 100;

  let age = predictBananaAge(avgHue, avgSat, avgVal, brownRatio, areaRatio);
  if (isNaN(age)) age = 0;

  const status = getBananaStatus(age);

  predictedAge.innerText = age.toFixed(1);
  statusText.innerText = status;

  saveToHistory(originalCanvas.toDataURL(), age.toFixed(1), status);

  processingContainer.style.display = "none";
  resultsContainer.style.display = "block";
}

// ============================
// HISTORY
// ============================
let historyData = JSON.parse(localStorage.getItem("bananaHistory")) || [];

function saveToHistory(image, age, status) {
  historyData.unshift({
    image,
    age,
    status,
    fileName: currentFileName,
    date: new Date().toLocaleString()
  });

  if (historyData.length > 10) historyData.pop();

  localStorage.setItem("bananaHistory", JSON.stringify(historyData));
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = "";

  historyData.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";

    div.innerHTML = `
      <img src="${item.image}">
      <div>
        <b>${item.age} hari</b> - ${item.status}<br>
        <small>${item.fileName}</small><br>
        <small>${item.date}</small>
      </div>
    `;

    historyList.appendChild(div);
  });
}

// ============================
// INIT
// ============================
window.onload = () => {
  renderHistory();
};
