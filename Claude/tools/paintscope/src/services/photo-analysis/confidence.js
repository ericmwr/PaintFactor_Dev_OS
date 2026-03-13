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
 * Default scope per category when confidence is high/medium.
 * Low-confidence items default to 'skip'.
 */
const DEFAULT_SCOPE = {
  surfaces: 'paint',
  trim: 'paint',
  doors: 'paint',
  windows: 'paint',
  openings: 'include',
  fixtures: 'protect',
  specialty: 'paint',
};

/**
 * Tag each detection result with a scope based on confidence and category.
 * High + medium get the category default scope; low gets 'skip'.
 * @param {Object} analysisResult - The mapped analysis result with confidence fields
 * @returns {Object} Same structure with `scope` string added to each detection
 */
// Categories that contain detection data (arrays of objects with confidence)
const DETECTION_ARRAYS = new Set(['doors', 'windows', 'openings', 'fixtures']);
// Categories that contain nested detection objects (id → {confidence, ...})
const DETECTION_OBJECTS = new Set(['surfaces', 'trim', 'specialty']);

export function tagAcceptance(analysisResult) {
  const tagged = {};

  for (const [category, data] of Object.entries(analysisResult)) {
    const defaultScope = DEFAULT_SCOPE[category] || 'paint';

    if (DETECTION_ARRAYS.has(category) && Array.isArray(data)) {
      tagged[category] = data.map(item => ({
        ...item,
        scope: shouldPreAccept(item.confidence) ? defaultScope : 'skip',
      }));
    } else if (DETECTION_OBJECTS.has(category) && data && typeof data === 'object') {
      tagged[category] = {};
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && 'confidence' in val) {
          tagged[category][key] = {
            ...val,
            scope: shouldPreAccept(val.confidence) ? defaultScope : 'skip',
          };
        } else {
          tagged[category][key] = val;
        }
      }
    } else {
      tagged[category] = data;
    }
  }

  return tagged;
}
