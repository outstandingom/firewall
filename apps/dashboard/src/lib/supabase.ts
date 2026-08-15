import { createClient } from '@supabase/supabase-js';

// We can use the environment variables that Vite injects, but since the user has a .env at the root,
// they might need to ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present, OR
// we can hardcode the ones they provided earlier for now, or just try to use Vite env.
// The user explicitly provided:
// Project URL: https://hkigsjwppfbtkuqhaxsp.supabase.co
// Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// In a production app, we use import.meta.env, but let's fall back to hardcoded if missing for ease of testing.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hkigsjwppfbtkuqhaxsp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhraWdzandwcGZidGt1cWhheHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY2MjEsImV4cCI6MjA4NDc2MjYyMX0.wNueoaWZWlJY5TnQiZQKEfKwaSPhyt69X3M80ezO-Gc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
