const textInput = document.querySelector('#qr-text');
const qrCanvas = document.querySelector('#qr-canvas');
const generateStatus = document.querySelector('#generate-status');
const downloadLink = document.querySelector('#download-link');
const dropZone = document.querySelector('#drop-zone');
const fileInput = document.querySelector('#file-input');
const previewCanvas = document.querySelector('#preview-canvas');
const decodeStatus = document.querySelector('#decode-status');
const decodedText = document.querySelector('#decoded-text');
const copyButton = document.querySelector('#copy-button');

const qrContext = qrCanvas.getContext('2d');
let fallbackImageUrl;

function setStatus(element, message, kind = '') {
  element.textContent = message;
  element.className = `status${kind ? ` ${kind}` : ''}`;
}

function setDownloadEnabled(enabled) {
  if (enabled) {
    downloadLink.removeAttribute('aria-disabled');
    return;
  }

  downloadLink.removeAttribute('href');
  downloadLink.setAttribute('aria-disabled', 'true');
}

function drawPlaceholder() {
  qrContext.fillStyle = '#ffffff';
  qrContext.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  qrContext.fillStyle = '#5e6b83';
  qrContext.font = '700 18px system-ui, sans-serif';
  qrContext.textAlign = 'center';
  qrContext.textBaseline = 'middle';
  qrContext.fillText('Type text to generate', qrCanvas.width / 2, qrCanvas.height / 2);
  setDownloadEnabled(false);
}

function updateDownloadLink() {
  downloadLink.href = qrCanvas.toDataURL('image/png');
  setDownloadEnabled(true);
}

function drawQrToCanvas(qr) {
  const moduleCount = qr.getModuleCount();
  const margin = 4;
  const cellSize = Math.floor(qrCanvas.width / (moduleCount + margin * 2));
  const qrSize = cellSize * moduleCount;
  const offset = Math.floor((qrCanvas.width - qrSize) / 2);

  qrContext.fillStyle = '#ffffff';
  qrContext.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  qrContext.fillStyle = '#152033';

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col)) {
        qrContext.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
      }
    }
  }
}

function generateQrCode() {
  const value = textInput.value.trim();

  if (!value) {
    drawPlaceholder();
    setStatus(generateStatus, 'Enter text to generate a QR code.');
    return;
  }

  if (typeof window.qrcode !== 'function') {
    drawPlaceholder();
    setStatus(generateStatus, 'QR generator failed to load. Refresh the page and try again.', 'error');
    return;
  }

  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(value, 'Byte');
    qr.make();
    drawQrToCanvas(qr);
    updateDownloadLink();
    setStatus(generateStatus, 'QR code updated in real time.', 'success');
  } catch {
    setDownloadEnabled(false);
    setStatus(generateStatus, 'This text is too long to encode as a QR code.', 'error');
  }
}

function resetDecodeState(message = 'No image selected.', statusType = '') {
  decodedText.value = '';
  copyButton.disabled = true;
  previewCanvas.hidden = true;
  setStatus(decodeStatus, message, statusType);
}

function showPreview(image) {
  const context = previewCanvas.getContext('2d');
  const scale = Math.min(previewCanvas.width / image.width, previewCanvas.height / image.height, 1);
  const width = Math.max(1, Math.floor(image.width * scale));
  const height = Math.max(1, Math.floor(image.height * scale));
  const x = Math.floor((previewCanvas.width - width) / 2);
  const y = Math.floor((previewCanvas.height - height) / 2);

  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  context.drawImage(image, x, y, width, height);
  previewCanvas.hidden = false;
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  if (fallbackImageUrl) {
    URL.revokeObjectURL(fallbackImageUrl);
  }

  fallbackImageUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected file could not be read as an image.'));
    image.src = fallbackImageUrl;
  });
}

async function decodeFile(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    resetDecodeState('Please select an image file.', 'error');
    return;
  }

  if (typeof window.jsQR !== 'function') {
    resetDecodeState('QR decoder failed to load. Refresh the page and try again.', 'error');
    return;
  }

  resetDecodeState('Scanning image...');

  try {
    const image = await loadImage(file);
    showPreview(image);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = image.width;
    canvas.height = image.height;
    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (!result) {
      resetDecodeState('No QR code was found in this image.', 'error');
      return;
    }

    decodedText.value = result.data;
    copyButton.disabled = !result.data;
    setStatus(decodeStatus, 'QR code decoded successfully.', 'success');
  } catch (error) {
    resetDecodeState(error.message || 'Unable to decode this image.', 'error');
  }
}

textInput.addEventListener('input', generateQrCode);

window.addEventListener('load', generateQrCode);

fileInput.addEventListener('change', () => {
  decodeFile(fileInput.files?.[0]);
});

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  decodeFile(event.dataTransfer.files?.[0]);
});

copyButton.addEventListener('click', async () => {
  if (!decodedText.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(decodedText.value);
    setStatus(decodeStatus, 'Decoded text copied to clipboard.', 'success');
  } catch {
    decodedText.focus();
    decodedText.select();
    setStatus(decodeStatus, 'Select and copy the decoded text manually.', 'error');
  }
});

window.addEventListener('beforeunload', () => {
  if (fallbackImageUrl) {
    URL.revokeObjectURL(fallbackImageUrl);
  }
});
