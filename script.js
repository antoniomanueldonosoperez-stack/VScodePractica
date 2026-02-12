// script.js
// Inicia la cámara (preferentemente trasera) y la muestra en el elemento <video id="video">.

async function startCamera() {
  const video = document.getElementById('video');
  if (!video) return console.error('Elemento <video> no encontrado.');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('getUserMedia no es compatible con este navegador.');
    return;
  }

  // Preferimos la cámara trasera con facingMode: 'environment'.
  const constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();
    console.log('Cámara iniciada (ideal: trasera).');
  } catch (err) {
    console.warn('No fue posible solicitar la cámara con facingMode ideal:', err);
    // Fallback: intentamos con cualquier cámara disponible
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
      await video.play();
      console.log('Cámara iniciada (fallback).');
    } catch (err2) {
      console.error('No se pudo acceder a la cámara:', err2);
    }
  }
}

// Detener los tracks de vídeo cuando se abandone la página
function stopCamera() {
  const video = document.getElementById('video');
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(t => t.stop());
    video.srcObject = null;
    console.log('Cámara detenida.');
  }
}

// Intentamos arrancar la cámara cuando el DOM esté listo
let mobilenetModel = null;
let classifyRunning = false;

async function loadMobileNet() {
  const status = document.getElementById('status');
  try {
    if (status) status.textContent = 'Cargando MobileNet...';
    // mobilenet está disponible globalmente por el script CDN incluido en el HTML
    mobilenetModel = await mobilenet.load();
    console.log('MobileNet cargado.');
    if (status) status.textContent = 'MobileNet cargado.';
  } catch (err) {
    console.error('Error cargando MobileNet:', err);
    if (status) status.textContent = 'Error cargando MobileNet.';
  }
}

async function classifyLoop() {
  const video = document.getElementById('video');
  const ul = document.getElementById('predictions');
  const status = document.getElementById('status');

  if (!mobilenetModel) return;
  if (!video || video.readyState < 2) {
    // video no está listo aún
    setTimeout(classifyLoop, 300);
    return;
  }

  if (classifyRunning) return; // evitar reentradas
  classifyRunning = true;

  try {
    if (status) status.textContent = 'Clasificando...';
    const predictions = await mobilenetModel.classify(video);

    // Limpiar resultados anteriores
    if (ul) ul.innerHTML = '';

    if (predictions && predictions.length) {
      predictions.forEach(p => {
        const li = document.createElement('li');
        // Mostrar etiqueta y probabilidad formateada
        li.textContent = `${p.className} — ${(p.probability * 100).toFixed(2)}%`;
        if (ul) ul.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'Sin predicciones.';
      if (ul) ul.appendChild(li);
    }

    if (status) status.textContent = 'Listo';
  } catch (err) {
    console.error('Error en clasificación:', err);
    if (status) status.textContent = 'Error en clasificación.';
  } finally {
    classifyRunning = false;
    // Repetir clasificación cada 700 ms
    setTimeout(classifyLoop, 700);
  }
}

// Intentamos arrancar la cámara y el modelo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  await startCamera();
  await loadMobileNet();
  // arrancar la detección si la cámara y el modelo están listos
  classifyLoop();
});

// Paramos la cámara al cerrar/recargar
window.addEventListener('beforeunload', () => {
  stopCamera();
});
