import { useContext } from 'react';
import { SupabaseAuthContext } from '@/contexts/SupabaseAuthContext';

export function useSupabaseSession() {
  return useContext(SupabaseAuthContext);
}
