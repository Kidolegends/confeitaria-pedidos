import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

interface FetchState<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/** Busca dados de um GET da API e controla carregando/erro. `reload()` busca de novo. */
export function useFetch<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<FetchState<T>>({ key: null, data: null, error: null });
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api<T>('GET', path)
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch((err) => !cancelled && setState((s) => ({ ...s, key, error: errorMessage(err) })));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update: T | null | ((current: T | null) => T | null)) =>
      setState((s) => ({
        ...s,
        data: typeof update === 'function' ? (update as (c: T | null) => T | null)(s.data) : update,
      })),
    [],
  );

  // "loading" = ainda não chegou a resposta da busca atual (mantém os dados antigos na tela)
  const loading = key !== null && state.key !== key;
  return { data: state.data, error: state.error, loading, reload, setData };
}
