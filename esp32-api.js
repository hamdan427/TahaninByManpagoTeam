const DEFAULT_ESP32_BASE_URL = 'http://192.168.4.1';

function getEsp32BaseUrl() {
  return (localStorage.getItem('esp32BaseUrl') || DEFAULT_ESP32_BASE_URL)
    .trim()
    .replace(/\/$/, '');
}

function setEsp32BaseUrl(url) {
  const normalizedUrl = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\/[^/]+$/i.test(normalizedUrl)) {
    throw new Error('Masukkan alamat ESP32, misalnya http://192.168.4.1');
  }
  localStorage.setItem('esp32BaseUrl', normalizedUrl);
}

async function esp32Request(path) {
  const response = await fetch(`${getEsp32BaseUrl()}${path}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`ESP32 merespons ${response.status}`);
  }

  return response.json();
}

async function startEsp32Measurement() {
  // Input NPK dilakukan melalui Serial Monitor, bukan oleh website.
  // Tetap cek ESP32 agar pemanggil lama tidak mengakses endpoint /api/measure
  // yang memang tidak tersedia pada firmware.
  return checkEsp32();
}

function checkEsp32() {
  return esp32Request('/api/status');
}

async function readEsp32Data() {
  const result = await esp32Request('/api/result');

  return {
    available: result.success === true,
    nitrogen: Number(result.n),
    phosphorus: Number(result.p),
    potassium: Number(result.k),
    recommendations: Array.isArray(result.recommendations)
      ? result.recommendations
      : []
  };
}

async function waitForEsp32Result(onWaiting, timeoutMs = 60000, intervalMs = 1500) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const data = await readEsp32Data();
    if (data.available) return data;

    if (onWaiting) onWaiting();
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('Waktu tunggu input NPK habis');
}
