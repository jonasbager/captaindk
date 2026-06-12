import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardkodet med vilje: Lovables preview/build injicerer sin egen VITE_SUPABASE_URL,
// der peger på det døde Lovable Cloud-projekt (oxxioffwasbwbsinbowi). Captain har
// præcis ét backend — cevmfwrcpwnyijqabspx — og nøglen er en publishable key (offentlig).
export const SUPABASE_URL = 'https://cevmfwrcpwnyijqabspx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LBg3kWXETAC1Tk7EaxWGKA_0G5mo8mE';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
