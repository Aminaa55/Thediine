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

/**
 * guestCount is stored as the exact STRING the customer typed.
 *
 * It used to sit in an <input type="number">, where an arrow key or a stray
 * mouse-wheel scroll silently steps the value — which is how 153 became 152.
 * It is now a plain text field, digits only, parsed only when validated.
 */

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

/**
 * Normal and event lines are kept in SEPARATE lists.
 *
 * Starting an event can therefore never sweep up dishes that were added as a
 * normal order — the two journeys cannot mix by construction, not merely by
 * convention. Moving items across is an explicit, offered choice.
 */
type CartState = {
  normalLines: CartLine[];
  eventLines: CartLine[];
  mode: OrderMode;
  event: EventDraft;
};

const STORAGE_KEY = "thediine.cart.v3";
const EMPTY: CartState = { normalLines: [], eventLines: [], mode: "normal", event: EMPTY_EVENT };

export function lineKey(
  productId: string,
  variantId: string | null,
  choiceIds: string[],
  instructions: string,
) {
  return [productId, variantId ?? "-", [...choiceIds].sort().join(","), instructions.trim()].join("|");
}

type CartContextValue = {
  /** The active list, decided by mode. */
  lines: CartLine[];
  mode: OrderMode;
  event: EventDraft;
  count: number;
  ready: boolean;
  /** Dishes waiting in the OTHER journey — used to offer the customer a choice. */
  normalCount: number;
  eventCount: number;
  addLine: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  /**
   * Enters the event journey. Never touches the normal order.
   * `moveExistingItems` copies the normal dishes across, and is only ever
   * called because the customer chose it.
   */
  startEvent: (moveExistingItems?: boolean) => void;
  /** Leaves the event journey. Event dishes stay put, waiting. */
  leaveEvent: () => void;
  /** Abandons the event request entirely and discards its dishes. */
  cancelEvent: () => void;
  updateEvent: (patch: Partial<EventDraft>) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function clean(lines: unknown): CartLine[] {
  if (!Array.isArray(lines)) return [];
  return (lines as CartLine[]).filter((l) => l && l.productId && l.quantity > 0);
}

function read(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    return {
      normalLines: clean(parsed.normalLines),
      eventLines: clean(parsed.eventLines),
      mode: parsed.mode === "event" ? "event" : "normal",
      event: { ...EMPTY_EVENT, ...(parsed.event ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

/** Applies an update to whichever list the customer is currently building. */
function onActive(s: CartState, fn: (lines: CartLine[]) => CartLine[]): CartState {
  return s.mode === "event"
    ? { ...s, eventLines: fn(s.eventLines) }
    : { ...s, normalLines: fn(s.normalLines) };
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
    setState((s) =>
      onActive(s, (lines) => {
        const existing = lines.find((l) => l.key === key);
        return existing
          ? lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l))
          : [...lines, { ...line, key }];
      }),
    );
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setState((s) =>
      onActive(s, (lines) =>
        quantity <= 0
          ? lines.filter((l) => l.key !== key)
          : lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
      ),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setState((s) => onActive(s, (lines) => lines.filter((l) => l.key !== key)));
  }, []);

  const clear = useCallback(() => setState((s) => onActive(s, () => [])), []);

  const startEvent = useCallback((moveExistingItems = false) => {
    setState((s) => ({
      ...s,
      mode: "event",
      eventLines: moveExistingItems ? [...s.eventLines, ...s.normalLines] : s.eventLines,
      normalLines: moveExistingItems ? [] : s.normalLines,
    }));
  }, []);

  const leaveEvent = useCallback(() => setState((s) => ({ ...s, mode: "normal" })), []);

  const cancelEvent = useCallback(
    () => setState((s) => ({ ...s, mode: "normal", eventLines: [], event: EMPTY_EVENT })),
    [],
  );

  const updateEvent = useCallback(
    (patch: Partial<EventDraft>) => setState((s) => ({ ...s, event: { ...s.event, ...patch } })),
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const lines = state.mode === "event" ? state.eventLines : state.normalLines;
    const total = (ls: CartLine[]) => ls.reduce((n, l) => n + l.quantity, 0);
    return {
      lines,
      mode: state.mode,
      event: state.event,
      count: total(lines),
      normalCount: total(state.normalLines),
      eventCount: total(state.eventLines),
      ready,
      addLine,
      setQuantity,
      removeLine,
      clear,
      startEvent,
      leaveEvent,
      cancelEvent,
      updateEvent,
    };
  }, [state, ready, addLine, setQuantity, removeLine, clear, startEvent, leaveEvent, cancelEvent, updateEvent]);

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
