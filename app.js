const textInput = document.querySelector('#qr-text');
const qrCanvas = document.querySelector('#qr-canvas');
const generateStatus = document.querySelector('#generate-status');
const downloadLink = document.querySelector('#download-link');
const dropZone = document.querySelector('#drop-zone');
const fileInput = document.querySelector('#file-input');
const previewImage = document.querySelector('#preview-image');
const decodeStatus = document.querySelector('#decode-status');
const decodedText = document.querySelector('#decoded-text');
const copyButton = document.querySelector('#copy-button');

const qrContext = qrCanvas.getContext('2d');
let currentPreviewUrl;

function setStatus(element, message, kind = '') {
  element.textContent = message;
  element.className = `status${kind ? ` ${kind}` : ''}`;
}

function drawPlaceholder() {
  qrContext.fillStyle = '#ffffff';
  qrContext.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  qrContext.fillStyle = '#5e6b83';
  qrContext.font = '700 18px system-ui, sans-serif';
  qrContext.textAlign = 'center';
  qrContext.textBaseline = 'middle';
  qrContext.fillText('Type text to generate', qrCanvas.width / 2, qrCanvas.height / 2);
  downloadLink.removeAttribute('href');
  downloadLink.setAttribute('aria-disabled', 'true');
}

function updateDownloadLink() {
  downloadLink.href = qrCanvas.toDataURL('image/png');
  downloadLink.removeAttribute('aria-disabled');
}

function generateQrCode() {
  const value = textInput.value.trim();

  if (!value) {
    drawPlaceholder();
    setStatus(generateStatus, 'Enter text to generate a QR code.');
    return;
  }

  if (!window.QRCode?.toCanvas) {
    drawPlaceholder();
    setStatus(generateStatus, 'QR generator failed to load. Check your connection and refresh.', 'error');
    return;
  }

  window.QRCode.toCanvas(
    qrCanvas,
    value,
    {
      width: 320,
      margin: 2,
      color: {
        dark: '#152033',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    },
    (error) => {
      if (error) {
        setStatus(generateStatus, 'This text is too long to encode as a QR code.', 'error');
        downloadLink.removeAttribute('href');
        downloadLink.setAttribute('aria-disabled', 'true');
        return;
      }

      updateDownloadLink();
      setStatus(generateStatus, 'QR code updated in real time.', 'success');
    },
  );
}

function resetDecodeState(message = 'No image selected.') {
  decodedText.value = '';
  copyButton.disabled = true;
  setStatus(decodeStatus, message);
}

function showPreview(file) {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
  }

  currentPreviewUrl = URL.createObjectURL(file);
  previewImage.src = currentPreviewUrl;
  previewImage.hidden = false;
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected file could not be read as an image.'));
    image.src = URL.createObjectURL(file);
  });
}

async function decodeFile(file) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    resetDecodeState('Please select an image file.');
    setStatus(decodeStatus, 'Please select an image file.', 'error');
    return;
  }

  if (!window.jsQR) {
    resetDecodeState('QR decoder failed to load. Check your connection and refresh.');
    setStatus(decodeStatus, 'QR decoder failed to load. Check your connection and refresh.', 'error');
    return;
  }

  showPreview(file);
  resetDecodeState('Scanning image...');

  try {
    const image = await loadImage(file);
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
      resetDecodeState('No QR code was found in this image.');
      setStatus(decodeStatus, 'No QR code was found in this image.', 'error');
      return;
    }

    decodedText.value = result.data;
    copyButton.disabled = !result.data;
    setStatus(decodeStatus, 'QR code decoded successfully.', 'success');
  } catch (error) {
    resetDecodeState(error.message || 'Unable to decode this image.');
    setStatus(decodeStatus, error.message || 'Unable to decode this image.', 'error');
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
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
  }
});
