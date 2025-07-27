// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjvtncdjcslnkfctqnfy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua_chave_anon_aqui';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);