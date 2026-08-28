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
 * availability are resolved from the database every time the cart is shown, so
 * a stale cart can never display an old price.
 *
 * It also remembers WHICH JOURNEY the customer is in. Entering through
 * "Plan an Event" sets mode to "event", and everything added from then on
 * belongs to an event request rather than becoming a normal order.
 */

export type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  choiceIds: string[];
  quantity: number;
  instructions: string;
};

export type OrderMode = "normal" | "event";

export type EventType = "BIRTHDAY" | "ENGAGEMENT" | "WEDDING" | "OTHER";

/** Collected before dishes are chosen; extras are added after. */
export type EventDraft = {
  eventType: EventType | null;
  eventTypeOther: string;
  date: string;
  time: string;
  guestCount: string;
  venue: string;
  decorRequested: boolean;
  setupRequested: boolean;
  servingStaffRequested: boolean;
  extrasNotes: string;
};

export const EMPTY_EVENT: EventDraft = {
  eventType: null,
  eventTypeOther: "",
  date: "",
  time: "",
  guestCount: "",
  venue: "",
  decorRequested: false,
  setupRequested: false,
  servingStaffRequested: false,
  extrasNotes: "",
};

type CartState = { lines: CartLine[]; mode: OrderMode; event: EventDraft };

const STORAGE_KEY = "thediine.cart.v2";
const EMPTY: CartState = { lines: [], mode: "normal", event: EMPTY_EVENT };

export function lineKey(
  productId: string,
  variantId: string | null,
  choiceIds: string[],
  instructions: string,
) {
  return [productId, variantId ?? "-", [...choiceIds].sort().join(","), instructions.trim()].join("|");
}

type CartContextValue = {
  lines: CartLine[];
  mode: OrderMode;
  event: EventDraft;
  count: number;
  ready: boolean;
  addLine: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  setMode: (mode: OrderMode) => void;
  updateEvent: (patch: Partial<EventDraft>) => void;
  /** Leaves the event journey and returns to normal ordering. */
  exitEvent: () => void;
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
      event: { ...EMPTY_EVENT, ...(parsed.event ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
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

  const clear = useCallback(() => setState((s) => ({ ...EMPTY, mode: s.mode, event: s.event })), []);
  const setMode = useCallback((mode: OrderMode) => setState((s) => ({ ...s, mode })), []);
  const updateEvent = useCallback(
    (patch: Partial<EventDraft>) =>
      setState((s) => ({ ...s, event: { ...s.event, ...patch } })),
    [],
  );
  const exitEvent = useCallback(
    () => setState((s) => ({ ...s, mode: "normal", event: EMPTY_EVENT })),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      mode: state.mode,
      event: state.event,
      count: state.lines.reduce((n, l) => n + l.quantity, 0),
      ready,
      addLine,
      setQuantity,
      removeLine,
      clear,
      setMode,
      updateEvent,
      exitEvent,
    }),
    [state, ready, addLine, setQuantity, removeLine, clear, setMode, updateEvent, exitEvent],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTHDAY: "Birthday",
  ENGAGEMENT: "Engagement",
  WEDDING: "Wedding",
  OTHER: "Other",
};
