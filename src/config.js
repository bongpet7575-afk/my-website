// src/config.js
export const config = {
  supabase: {
    url: 'https://xagwrqrgcuuitwgroiwh.supabase.co',
    key: 'sb_publishable_xSMSx_To3wMdH7EMxktY2Q_XrpeiHAK',
  },
  app: {
    name: 'ROTANA\'S RPG',
    version: '1.0.0',
  },
};

// Validate on load
if (!config.supabase.url || !config.supabase.key) {
  throw new Error('Missing Supabase environment variables');
}