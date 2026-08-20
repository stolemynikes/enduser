import { useEffect } from 'react';

/** Sets document.title for the lifetime of the component, restoring the
 *  previous title on unmount. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}
