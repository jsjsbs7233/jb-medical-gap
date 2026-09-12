/**
 * Supabase 클라이언트.
 * - anon 클라이언트: 브라우저/일반 서버 코드에서 읽기용.
 * - service 클라이언트: 서버 라우트에서만 쓴다(적재·쓰기). 절대 클라이언트로 보내지 않는다.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

/** 서버 전용. route.ts 안에서만 부른다. */
export function getSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
