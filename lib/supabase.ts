import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** clinics 테이블 한 행 (CLAUDE.md §3 스키마) */
export interface ClinicRow {
  id: string; // 심평원 ykiho
  name: string;
  sido: string | null;
  sigungu: string | null;
  addr: string | null;
  tel: string | null;
  lat: number;
  lng: number;
}

/** traffic_cache 테이블 한 행 */
export interface TrafficCacheRow {
  grid_key: string;
  clinic_id: string;
  total_time: number; // 초
  total_dist: number; // 미터
  created_at?: string;
}

let cached: SupabaseClient | null | undefined;

/**
 * 서버 전용 Supabase 클라이언트 (Service Role 키 사용).
 * 환경변수가 없으면 null을 반환한다 — 호출부는 null이면 Supabase 없이
 * 동작하도록(직접 HIRA 호출 + 인메모리 캐시) 만들어져 있다.
 */
export function supabaseServer(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
