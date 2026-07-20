import { FallbackAdvice } from '../types/index.js';

export const FALLBACK_ADVICE: FallbackAdvice = {
  advice: 'Sit up straight, pull shoulders back, tuck chin slightly, and raise monitor to eye level.',
  confidence_score: 60,
};

export function getFallbackAdvice(): FallbackAdvice {
  return FALLBACK_ADVICE;
}