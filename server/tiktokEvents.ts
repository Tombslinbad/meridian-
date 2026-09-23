// Re-export self-contained TikTok Events API implementation from /api/index
// to ensure zero code divergence while keeping /api/index.ts completely standalone for Vercel.
export {
  TIKTOK_API_URL,
  getTikTokPixelId,
  getTikTokAccessToken,
  hashEmail,
  hashPhone,
  sendTikTokEvent,
  sendTikTokCompletePayment,
  type TikTokUserData,
  type TikTokEventPayload,
} from '../api/index';
