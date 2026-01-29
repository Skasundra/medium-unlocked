import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// NOTE:
// The auto-generated Supabase client relies on build-time env injection.
// In some preview builds those env vars can be missing, causing a blank screen.
// This client adds a safe fallback so the app can always boot.

const FALLBACK_SUPABASE_URL = "https://sddjbefeajpxgxxzpqyv.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkZGpiZWZlYWpweGd4eHpwcXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTIzNTYsImV4cCI6MjA4NTE2ODM1Nn0.B6Q4dECMcRhmoqI5XYs8Ssl96GdQChE4_Ilfw0eW59I";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  // some environments use ANON instead of PUBLISHABLE
  (import.meta.env as any).VITE_SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
