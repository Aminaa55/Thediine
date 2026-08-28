"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The cart holds REFERENCES, not prices.
 *
 * Only ids and quantities are kept in the browser; names, prices and
 * availability are resolved from the database every time the cart is shown.
 * A stale localStorage cart can therefore never show — or charge — an old price.
 */

export type CartLine = {
  /** Stable identity for this exact configuration. */
  key: string;
  productId: string;
  variantId: string | null;
  choiceIds: string[];
  quantity: number;
  instructions: string;
};

export type OrderMode = "normal" | "event";

type CartState = { lines: CartLine[]; mode: OrderMode };

const STORAGE_KEY = "thediine.cart.v1";
const EMPTY: CartState = { lines: [], mode: "normal" };

export function lineKey(
  productId: string,
  variantId: string | null,
  choiceIds: string[],
  instructions: string,
) {
  // Two lines merge only when the dish is configured identically.
  return [productId, variantId ?? "-", [...choiceIds].sort().join(","), instructions.trim()].join("|");
}

type CartContextValue = {
  lines: CartLine[];
  mode: OrderMode;
  count: number;
  ready: boolean;
  addLine: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  setMode: (mode: OrderMode) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function read(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    if (!Array.isArray(parsed.lines)) return EMPTY;
    return {
      lines: parsed.lines.filter((l) => l && l.productId && l.quantity > 0),
      mode: parsed.mode === "event" ? "event" : "normal",
    };
  } catch {
    // Private browsing, cleared storage, or corrupt data — start empty.
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  // Rendered empty on the server, hydrated from storage on the client.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable — the cart still works for this page view.
    }
  }, [state, ready]);

  const addLine = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line.productId, line.variantId, line.choiceIds, line.instructions);
    setState((s) => {
      const existing = s.lines.find((l) => l.key === key);
      if (existing) {
        return {
          ...s,
          lines: s.lines.map((l) =>
            l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l,
          ),
        };
      }
      return { ...s, lines: [...s.lines, { ...line, key }] };
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setState((s) => ({
      ...s,
      lines:
        quantity <= 0
          ? s.lines.filter((l) => l.key !== key)
          : s.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
    }));
  }, []);

  const removeLine = useCallback((key: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) }));
  }, []);

  const clear = useCallback(() => setState((s) => ({ ...EMPTY, mode: s.mode })), []);
  const setMode = useCallback((mode: OrderMode) => setState((s) => ({ ...s, mode })), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      mode: state.mode,
      count: state.lines.reduce((n, l) => n + l.quantity, 0),
      ready,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setMode,
    }),
    [state, ready, addLine, setQuantity, removeLine, clear, setMode],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
