// ================================
// FINAL FIXED VERSION
// ================================

// ELEMENT
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

let currentFileName = "Kamera";

// MODEL
const INTERCEPT = -21.251;
const COEF = { H: 0.038, S: 0.005, V: 0.313, B: 0.045, A: -4.302 };

// CAMERA
startCameraBtn.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
});

captureBtn.addEventListener("click", () => {
  currentFileName = "Kamera_" + Date.now();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  video.srcObject.getTracks().forEach(track => track.stop());

  handleImage(canvas);
});

// UPLOAD
imageInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  currentFileName = file.name;

  const img = new Image();
  img.onload = () => drawAndProcess(img);
  img.src = URL.createObjectURL(file);
});

// HANDLE
function handleImage(canvas) {
  const img = new Image();
  img.onload = () => drawAndProcess(img);
  img.src = canvas.toDataURL();
}

// DRAW
function drawAndProcess(img) {
  originalCanvas.width = img.width;
  originalCanvas.height = img.height;
  segmentedCanvas.width = img.width;
  segmentedCanvas.height = img.height;

  ctxOriginal.drawImage(img, 0, 0);

  removeBG();
  processImage();
}

// BG REMOVAL SIMPLE
function removeBG() {
  const imgData = ctxOriginal.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, v] = rgbToHsv(data[i], data[i+1], data[i+2]);
    if (v > 95 || v < 20 || s < 10) data[i+3] = 0;
  }

  ctxOriginal.putImageData(imgData, 0, 0);
}

// HSV
function rgbToHsv(r,g,b){
  r/=255;g/=255;b/=255;
  let max=Math.max(r,g,b),min=Math.min(r,g,b);
  let d=max-min,h=0,s=max===0?0:d/max,v=max;

  if(d!==0){
    switch(max){
      case r:h=(g-b)/d+(g<b?6:0);break;
      case g:h=(b-r)/d+2;break;
      case b:h=(r-g)/d+4;break;
    }
    h/=6;
  }
  return [h*360,s*100,v*100];
}

// PREDIKSI
function predictBananaAge(h,s,v,b,a){
  return Math.max(0,Math.min(
    INTERCEPT + COEF.H*h + COEF.S*s + COEF.V*v + COEF.B*b + COEF.A*a,7));
}

function getBananaStatus(age){
  if(age>3)return"Matang";
  if(age>1)return"Terlalu matang";
  return"Busuk";
}

// PROCESS
function processImage(){
  const data = ctxOriginal.getImageData(0,0,originalCanvas.width,originalCanvas.height).data;
  const segmented = ctxSegment.createImageData(originalCanvas.width,originalCanvas.height);

  let totalH=0,totalS=0,totalV=0,pixels=0,brown=0;

  for(let i=0;i<data.length;i+=4){
    if(data[i+3]===0)continue;

    const [h,s,v]=rgbToHsv(data[i],data[i+1],data[i+2]);

    const y=(h>=25&&h<=65&&s>30&&v>50);
    const br=(h>=10&&h<=35&&s>20&&v>20&&v<70);

    if(y||br){
      pixels++;
      totalH+=h; totalS+=s; totalV+=v;

      if(br) brown++;
    }
  }

  if(pixels<300){
    alert("Bukan pisang");
    return;
  }

  const age = predictBananaAge(
    totalH/pixels,
    totalS/pixels,
    totalV/pixels,
    (brown/pixels)*100,
    pixels/(originalCanvas.width*originalCanvas.height)
  );

  const status = getBananaStatus(age);

  predictedAge.innerText = age.toFixed(1);
  statusText.innerText = status;

  saveToHistory(originalCanvas.toDataURL(), age.toFixed(1), status);
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
  historyList.innerHTML = "";

  historyData.forEach(item => {
    const div = document.createElement("div");

    div.innerHTML = `
      <img src="${item.image}" width="100">
      <div>
        <b>${item.age} hari</b> - ${item.status}<br>
        <small>${item.fileName}</small><br>
        <small>${item.date}</small>
      </div>
      <hr>
    `;

    historyList.appendChild(div);
  });
}

function clearHistory() {
  localStorage.removeItem("bananaHistory");
  historyData = [];
  renderHistory();
}

// ============================
// EXCEL
// ============================
function downloadExcel() {
  if (historyData.length === 0) return alert("Tidak ada data");

  const ws = XLSX.utils.json_to_sheet(historyData);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, "pisang.xlsx");
}

// INIT
window.onload = renderHistory;
