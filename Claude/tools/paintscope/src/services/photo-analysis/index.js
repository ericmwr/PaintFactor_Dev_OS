// Public API for photo analysis service
// Orchestrates two-pass Gemini analysis and returns merged results

import { callGeminiProxy, fileToInlineData, resizeImage } from './gemini-client';
import { buildOverviewPrompt, buildDetailedPrompt } from './prompt-builder';
import { ROOM_OVERVIEW_SCHEMA, SURFACE_ANALYSIS_SCHEMA } from './response-schema';
import { mapOverviewToRoom, mapDetailToRoom } from './mapper';
import { tagAcceptance } from './confidence';

/**
 * Analyze room photos using Gemini Vision API (two-pass).
 *
 * @param {File[]} files - Image files from the user
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal] - For cancellation
 * @param {function} [options.onProgress] - Progress callback: (phase, message) => void
 * @returns {Promise<Object>} Analysis result with tagged acceptance
 */
export async function analyzeRoomPhotos(files, options = {}) {
  const { signal, onProgress } = options;

  // Phase 1: Resize images
  onProgress?.('resize', 'Optimizing images...');
  const resized = await Promise.all(files.map(f => resizeImage(f)));

  // Phase 2: Convert to base64
  onProgress?.('encode', 'Encoding images...');
  const images = await Promise.all(resized.map(f => fileToInlineData(f)));

  // Phase 3: Room overview pass
  onProgress?.('overview', 'Analyzing room layout...');
  const overviewPrompt = buildOverviewPrompt();
  const overviewRaw = await callGeminiProxy({
    images,
    systemPrompt: overviewPrompt.systemPrompt,
    userPrompt: overviewPrompt.userPrompt,
    responseSchema: ROOM_OVERVIEW_SCHEMA,
    signal,
  });

  const overview = mapOverviewToRoom(overviewRaw);

  // Phase 4: Detailed surface analysis pass
  onProgress?.('detail', 'Identifying surfaces and items...');
  const detailPrompt = buildDetailedPrompt(overviewRaw);
  const detailRaw = await callGeminiProxy({
    images,
    systemPrompt: detailPrompt.systemPrompt,
    userPrompt: detailPrompt.userPrompt,
    responseSchema: SURFACE_ANALYSIS_SCHEMA,
    signal,
  });

  const detail = mapDetailToRoom(detailRaw);

  // Phase 5: Merge and tag acceptance
  onProgress?.('merge', 'Preparing results...');
  const merged = {
    ...detail,
    roomPatch: overview.roomPatch,
    overviewConfidence: overview.confidence,
    room_type: overview.room_type,
    notable_features: overview.notable_features,
  };

  const tagged = tagAcceptance(merged);
  return tagged;
}
