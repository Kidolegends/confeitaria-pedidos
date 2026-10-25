import { createContext, useContext, type ReactNode } from 'react';
import type { PublicStore } from './types';
import { useFetch } from './useFetch';

// Configurações públicas da loja (nome, WhatsApp, horários...), buscadas uma vez para o site todo
const StoreContext = createContext<{ store: PublicStore | null; reload: () => void }>({
  store: null,
  reload: () => undefined,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const { data, reload } = useFetch<PublicStore>('/store');
  return <StoreContext.Provider value={{ store: data, reload }}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  return useContext(StoreContext);
}
