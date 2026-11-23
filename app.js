const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const gridCanvas = document.getElementById("gridCanvas");
const gridCtx = gridCanvas.getContext("2d");

const hRuler = document.getElementById("hRuler");
const hRulerCtx = hRuler.getContext("2d");
const vRuler = document.getElementById("vRuler");
const vRulerCtx = vRuler.getContext("2d");

const toolbar = document.getElementById("toolbar");
const focusBtn = document.getElementById("focusBtn");
const showToolbarBtn = document.getElementById("showToolbarBtn");

const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");
const alphaPicker = document.getElementById("alphaPicker");
const sizeValue = document.getElementById("sizeValue");
const alphaValue = document.getElementById("alphaValue");

const gridBtn = document.getElementById("gridBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");

const uploadImgBtn = document.getElementById("uploadImgBtn");
const imageInput = document.getElementById("imageInput");

const toolButtons = document.querySelectorAll(".tool-btn");
const swatches = document.querySelectorAll(".swatch");

const coordsText = document.getElementById("coordsText");
const canvasSizeText = document.getElementById("canvasSizeText");

let isDrawing = false;
let showGrid = false;
let currentBrush = "pen";
let currentColor = colorPicker.value;
let brushSize = Number(sizePicker.value);
let brushAlpha = Number(alphaPicker.value) / 100;

let startX = 0;
let startY = 0;
let snapshotBeforeShape = null;

// سجل التراجع والإعادة
let history = [];
let redoStack = [];
const maxHistory = 25;

function isShapeTool(brush) {
  return brush === "line" || brush === "rect" || brush === "circle";
}

function saveState(clearRedo = true) {
  if (history.length >= maxHistory) history.shift();
  history.push(canvas.toDataURL());
  if (clearRedo) redoStack = [];
}

function drawRulers() {
  hRuler.width = hRuler.clientWidth;
  hRuler.height = hRuler.clientHeight;
  vRuler.width = vRuler.clientWidth;
  vRuler.height = vRuler.clientHeight;

  hRulerCtx.clearRect(0, 0, hRuler.width, hRuler.height);
  vRulerCtx.clearRect(0, 0, vRuler.width, vRuler.height);

  hRulerCtx.fillStyle = "#9ca3af";
  hRulerCtx.font = "9px sans-serif";
  for (let x = 0; x < hRuler.width; x += 20) {
    const isMajor = x % 100 === 0;
    hRulerCtx.beginPath();
    hRulerCtx.moveTo(x, hRuler.height);
    hRulerCtx.lineTo(x, isMajor ? 6 : 14);
    hRulerCtx.strokeStyle = isMajor ? "#cbd5e1" : "#52525b";
    hRulerCtx.stroke();
    if (isMajor && x > 0) {
      hRulerCtx.fillText(x, x + 3, 11);
    }
  }

  vRulerCtx.fillStyle = "#9ca3af";
  vRulerCtx.font = "9px sans-serif";
  for (let y = 0; y < vRuler.height; y += 20) {
    const isMajor = y % 100 === 0;
    vRulerCtx.beginPath();
    vRulerCtx.moveTo(vRuler.width, y);
    vRulerCtx.lineTo(isMajor ? 6 : 14, y);
    vRulerCtx.strokeStyle = isMajor ? "#cbd5e1" : "#52525b";
    vRulerCtx.stroke();
    if (isMajor && y > 0) {
      vRulerCtx.save();
      vRulerCtx.translate(10, y - 3);
      vRulerCtx.rotate(-Math.PI / 2);
      vRulerCtx.fillText(y, 0, 0);
      vRulerCtx.restore();
    }
  }
}

function setupCanvas() {
  const width = 900;
  const height = 520;

  canvas.width = width;
  canvas.height = height;
  gridCanvas.width = width;
  gridCanvas.height = height;

  canvasSizeText.textContent = `${width} × ${height} px`;

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  history = [];
  redoStack = [];
  saveState(false);
  drawGridLines();
  drawRulers();
}

function drawGridLines() {
  gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  const step = Math.max(10, brushSize);

  gridCtx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  gridCtx.lineWidth = 1;

  for (let x = 0; x <= gridCanvas.width; x += step) {
    gridCtx.beginPath();
    gridCtx.moveTo(x, 0);
    gridCtx.lineTo(x, gridCanvas.height);
    gridCtx.stroke();
  }

  for (let y = 0; y <= gridCanvas.height; y += step) {
    gridCtx.beginPath();
    gridCtx.moveTo(0, y);
    gridCtx.lineTo(gridCanvas.width, y);
    gridCtx.stroke();
  }
}

setupCanvas();
window.addEventListener("resize", drawRulers);

// إرفاق صورة من الجهاز ورسمها متناسبة داخل اللوحة
uploadImgBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const maxW = canvas.width - 40;
      const maxH = canvas.height - 40;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (canvas.width - drawW) / 2;
      const offsetY = (canvas.height - drawH) / 2;

      ctx.save();
      ctx.globalAlpha = brushAlpha;
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.restore();
      saveState();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
  imageInput.value = "";
});

// أداة القطارة لالتقاط اللون من اللوحة
function pickColorAt(x, y) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return;

  const pixel = ctx.getImageData(px, py, 1, 1).data;
  const hex =
    "#" +
    [pixel[0], pixel[1], pixel[2]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");

  currentColor = hex;
  colorPicker.value = hex;
  swatches.forEach((s) => {
    s.classList.toggle("active", s.dataset.color.toLowerCase() === hex.toLowerCase());
  });
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: 255
  };
}

function floodFill(startX, startY, fillHex) {
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || x0 >= canvas.width || y0 < 0 || y0 >= canvas.height) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  const startIdx = (y0 * width + x0) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  const fillCol = hexToRgb(fillHex);

  if (
    targetR === fillCol.r &&
    targetG === fillCol.g &&
    targetB === fillCol.b &&
    targetA === fillCol.a
  ) {
    return;
  }

  function matchesTarget(idx) {
    return (
      Math.abs(data[idx] - targetR) <= 12 &&
      Math.abs(data[idx + 1] - targetG) <= 12 &&
      Math.abs(data[idx + 2] - targetB) <= 12 &&
      Math.abs(data[idx + 3] - targetA) <= 12
    );
  }

  function setPixelColor(idx) {
    data[idx] = fillCol.r;
    data[idx + 1] = fillCol.g;
    data[idx + 2] = fillCol.b;
    data[idx + 3] = fillCol.a;
  }

  const visited = new Uint8Array(width * height);
  const stack = [[x0, y0]];

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const pos = cy * width + cx;
    if (visited[pos]) continue;
    visited[pos] = 1;

    const idx = pos * 4;
    if (!matchesTarget(idx)) continue;

    setPixelColor(idx);

    if (cx > 0) stack.push([cx - 1, cy]);
    if (cx < width - 1) stack.push([cx + 1, cy]);
    if (cy > 0) stack.push([cx, cy - 1]);
    if (cy < height - 1) stack.push([cx, cy + 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawShape(x1, y1, x2, y2) {
  ctx.save();
  ctx.globalAlpha = brushAlpha;
  ctx.strokeStyle = currentColor;
  ctx.lineWidth = brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  if (currentBrush === "line") {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  } else if (currentBrush === "rect") {
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
  } else if (currentBrush === "circle") {
    const radiusX = Math.abs(x2 - x1) / 2;
    const radiusY = Math.abs(y2 - y1) / 2;
    const centerX = x1 + (x2 - x1) / 2;
    const centerY = y1 + (y2 - y1) / 2;
    ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
}

focusBtn.addEventListener("click", () => {
  toolbar.style.display = "none";
  showToolbarBtn.style.display = "block";
  drawRulers();
});

showToolbarBtn.addEventListener("click", () => {
  toolbar.style.display = "flex";
  showToolbarBtn.style.display = "none";
  drawRulers();
});

gridBtn.addEventListener("click", () => {
  showGrid = !showGrid;
  gridCanvas.style.display = showGrid ? "block" : "none";
  gridBtn.classList.toggle("active", showGrid);
  if (showGrid) drawGridLines();
});

toolButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toolButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentBrush = btn.dataset.brush;
  });
});

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    swatches.forEach((s) => s.classList.remove("active"));
    swatch.classList.add("active");
    currentColor = swatch.dataset.color;
    colorPicker.value = currentColor;
  });
});

colorPicker.addEventListener("input", (e) => {
  currentColor = e.target.value;
  swatches.forEach((s) => s.classList.remove("active"));
});

sizePicker.addEventListener("input", (e) => {
  brushSize = Number(e.target.value);
  sizeValue.textContent = brushSize;
  if (showGrid) drawGridLines();
});

alphaPicker.addEventListener("input", (e) => {
  const val = Number(e.target.value);
  brushAlpha = val / 100;
  alphaValue.textContent = `${val}%`;
});

function drawPixel(x, y) {
  const pixelSize = Math.max(10, brushSize);
  const gridX = Math.floor(x / pixelSize) * pixelSize;
  const gridY = Math.floor(y / pixelSize) * pixelSize;

  ctx.globalAlpha = brushAlpha;
  ctx.fillStyle = currentColor;
  ctx.fillRect(gridX, gridY, pixelSize, pixelSize);
}

function drawSpray(x, y) {
  ctx.globalAlpha = brushAlpha;
  ctx.fillStyle = currentColor;
  for (let i = 0; i < 25; i++) {
    const offsetX = (Math.random() - 0.5) * brushSize * 2;
    const offsetY = (Math.random() - 0.5) * brushSize * 2;
    ctx.fillRect(x + offsetX, y + offsetY, 1.5, 1.5);
  }
}

canvas.addEventListener("mousedown", (e) => {
  if (currentBrush === "eyedropper") {
    pickColorAt(e.offsetX, e.offsetY);
    return;
  }

  if (currentBrush === "text") {
    const text = prompt("اكتب النص الذي تريد إضافته:");
    if (text && text.trim() !== "") {
      ctx.save();
      ctx.globalAlpha = brushAlpha;
      ctx.fillStyle = currentColor;
      const fontSize = Math.max(14, brushSize * 2);
      ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
      ctx.fillText(text, e.offsetX, e.offsetY);
      ctx.restore();
      saveState();
    }
    return;
  }

  if (currentBrush === "fill") {
    ctx.globalAlpha = 1;
    floodFill(e.offsetX, e.offsetY, currentColor);
    saveState();
    return;
  }

  isDrawing = true;
  startX = e.offsetX;
  startY = e.offsetY;

  if (isShapeTool(currentBrush)) {
    snapshotBeforeShape = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return;
  }

  if (currentBrush === "pixel") {
    drawPixel(e.offsetX, e.offsetY);
  } else if (currentBrush === "spray") {
    drawSpray(e.offsetX, e.offsetY);
  } else {
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  }
});

canvas.addEventListener("mousemove", (e) => {
  coordsText.textContent = `${Math.round(e.offsetX)}, ${Math.round(e.offsetY)} px`;

  if (!isDrawing || currentBrush === "fill" || currentBrush === "eyedropper" || currentBrush === "text") {
    return;
  }

  if (isShapeTool(currentBrush)) {
    if (snapshotBeforeShape) {
      ctx.putImageData(snapshotBeforeShape, 0, 0);
    }
    drawShape(startX, startY, e.offsetX, e.offsetY);
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (currentBrush === "pen") {
    ctx.globalAlpha = brushAlpha;
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  } else if (currentBrush === "marker") {
    ctx.globalAlpha = Math.min(0.35, brushAlpha * 0.35);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize * 1.8;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  } else if (currentBrush === "spray") {
    drawSpray(e.offsetX, e.offsetY);
  } else if (currentBrush === "pixel") {
    drawPixel(e.offsetX, e.offsetY);
  } else if (currentBrush === "eraser") {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = brushSize * 2;
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  }
});

window.addEventListener("mouseup", () => {
  if (!isDrawing) return;
  isDrawing = false;
  snapshotBeforeShape = null;
  if (!isShapeTool(currentBrush) && currentBrush !== "pixel" && currentBrush !== "spray") {
    ctx.closePath();
  }
  saveState();
});

function applyHistorySnapshot(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function undo() {
  if (history.length <= 1) return;
  const popped = history.pop();
  redoStack.push(popped);
  applyHistorySnapshot(history[history.length - 1]);
}

function redo() {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  history.push(nextState);
  applyHistorySnapshot(nextState);
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (
    ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
  ) {
    e.preventDefault();
    redo();
  }
});

clearBtn.addEventListener("click", () => {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
});

saveBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "pix-art-drawing.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});