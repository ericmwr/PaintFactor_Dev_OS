// Confidence scoring and aggregation for photo analysis results

export const CONFIDENCE_LEVELS = { high: 3, medium: 2, low: 1 };

/**
 * Determine if a field should be pre-checked for acceptance
 * based on its confidence level.
 * @param {string} confidence - 'high', 'medium', or 'low'
 * @returns {boolean}
 */
export function shouldPreAccept(confidence) {
  return confidence === 'high' || confidence === 'medium';
}

/**
 * Compute an overall confidence for a set of fields.
 * Returns the minimum confidence across all fields.
 * @param {string[]} confidences - Array of confidence strings
 * @returns {string} Aggregated confidence level
 */
export function aggregateConfidence(confidences) {
  if (!confidences.length) return 'low';
  const min = Math.min(...confidences.map(c => CONFIDENCE_LEVELS[c] || 1));
  if (min >= 3) return 'high';
  if (min >= 2) return 'medium';
  return 'low';
}

/**
 * Tag each detection result with an accept flag based on confidence.
 * High + medium are pre-accepted; low is not.
 * @param {Object} analysisResult - The mapped analysis result with confidence fields
 * @returns {Object} Same structure with `accepted` boolean added to each field
 */
// Categories that contain detection data (arrays of objects with confidence)
const DETECTION_ARRAYS = new Set(['doors', 'windows', 'openings', 'fixtures']);
// Categories that contain nested detection objects (id → {confidence, ...})
const DETECTION_OBJECTS = new Set(['surfaces', 'trim', 'specialty']);

export function tagAcceptance(analysisResult) {
  const tagged = {};

  for (const [category, data] of Object.entries(analysisResult)) {
    if (DETECTION_ARRAYS.has(category) && Array.isArray(data)) {
      // Arrays of detection items — each has a confidence field
      tagged[category] = data.map(item => ({
        ...item,
        accepted: shouldPreAccept(item.confidence),
      }));
    } else if (DETECTION_OBJECTS.has(category) && data && typeof data === 'object') {
      // Nested detection objects (surfaces.walls, trim.baseboard, etc.)
      tagged[category] = {};
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && 'confidence' in val) {
          tagged[category][key] = { ...val, accepted: shouldPreAccept(val.confidence) };
        } else {
          tagged[category][key] = val;
        }
      }
    } else {
      // Pass through non-detection data as-is (roomPatch, notable_features, overviewConfidence, etc.)
      tagged[category] = data;
    }
  }

  return tagged;
}
