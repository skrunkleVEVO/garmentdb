import { useEffect, useRef, useState } from 'react';
import { load, save } from '../lib/storage.js';

/** useState that mirrors itself into localStorage. Third value is true if the last write failed. */
export function usePersistentState(key, initial) {
  const [state, setState] = useState(() => load(key, initial));
  const [writeFailed, setWriteFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setWriteFailed(!save(key, state));
  }, [key, state]);

  return [state, setState, writeFailed];
}
