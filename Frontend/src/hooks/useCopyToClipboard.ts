"use client";

import { useCallback, useState } from "react";

/**
 * Hook reutilizable para copiar textos (códigos de creador, API Keys, guiones)
 * con estado temporal de confirmación.
 */
export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = useCallback(
    async (text: string, identifier = "default") => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(identifier);
        setTimeout(() => {
          setCopiedKey((prev) => (prev === identifier ? null : prev));
        }, resetDelayMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetDelayMs]
  );

  return {
    copiedKey,
    isCopied: (identifier = "default") => copiedKey === identifier,
    copyText,
  };
}

