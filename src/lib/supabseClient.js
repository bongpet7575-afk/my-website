// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xagwrqrgcuuitwgroiwh.supabase.co';
const supabaseKey = 'sb_publishable_xSMSx_To3wMdH7EMxktY2Q_XrpeiHAK';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;