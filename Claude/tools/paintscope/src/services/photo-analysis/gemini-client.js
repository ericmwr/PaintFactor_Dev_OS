// HTTP client for POST /api/analyze-room — talks to the Vite proxy middleware

/**
 * Send images + prompts to the Gemini proxy and get structured JSON back.
 * @param {Object} params
 * @param {Array<{mimeType: string, data: string}>} params.images - Base64-encoded images
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {Object} params.responseSchema - OpenAPI 3.0 schema
 * @param {AbortSignal} [params.signal] - For cancellation
 * @returns {Promise<Object>} Parsed JSON from Gemini
 */
export async function callGeminiProxy({ images, systemPrompt, userPrompt, responseSchema, signal }) {
  const res = await fetch('/api/analyze-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images,
      systemPrompt,
      userPrompt,
      responseSchema,
      model: 'gemini-3.1-pro-preview',
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Gemini proxy returned ${res.status}`);
  }

  const data = await res.json();
  // The proxy returns { result: "..." } where result is a JSON string
  try {
    return JSON.parse(data.result);
  } catch {
    throw new Error('Failed to parse Gemini response as JSON');
  }
}

/**
 * Convert a File object to base64 inline data for the API.
 * @param {File} file
 * @returns {Promise<{mimeType: string, data: string}>}
 */
export async function fileToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>"
      const base64 = reader.result.split(',')[1];
      resolve({ mimeType: file.type, data: base64 });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image file to max dimensions to reduce API payload.
 * @param {File} file
 * @param {number} [maxDim=1536] - Max width or height in pixels
 * @returns {Promise<File>} Resized file (or original if smaller)
 */
export async function resizeImage(file, maxDim = 1536) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(file);
        return;
      }
      const scale = maxDim / Math.max(img.width, img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original
    };
    img.src = url;
  });
}
