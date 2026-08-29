"use client";

import type { EventTypeId } from "./ordering";
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

/**
 * Which part of the cart a dish belongs to.
 *
 * This is NOT a global mode. It travels with the journey the customer is in —
 * the event menu carries `?for=event` in its links — so starting an event never
 * changes the meaning of every Add to Cart button on the site.
 */
export type OrderScope = "normal" | "event";

/** One definition, in a module a server component can also read. */
export type EventType = EventTypeId;

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
  event: EventDraft;
};

const STORAGE_KEY = "thediine.cart.v4";
const EMPTY: CartState = { normalLines: [], eventLines: [], event: EMPTY_EVENT };

export function lineKey(
  productId: string,
  variantId: string | null,
  choiceIds: string[],
  instructions: string,
) {
  return [productId, variantId ?? "-", [...choiceIds].sort().join(","), instructions.trim()].join("|");
}

type CartContextValue = {
  /** Both parts of the one cart. They coexist and are edited independently. */
  normalLines: CartLine[];
  eventLines: CartLine[];
  event: EventDraft;
  /** True once an event request has been started. */
  hasEvent: boolean;
  ready: boolean;
  normalCount: number;
  eventCount: number;
  /** Everything in the cart, both parts. */
  count: number;
  addLine: (scope: OrderScope, line: Omit<CartLine, "key">) => void;
  setQuantity: (scope: OrderScope, key: string, quantity: number) => void;
  removeLine: (scope: OrderScope, key: string) => void;
  updateEvent: (patch: Partial<EventDraft>) => void;
  /** Begins a fresh request, discarding any previous draft and its dishes. */
  startNewEvent: () => void;
  /** Abandons the event request and its dishes. The normal order is untouched. */
  cancelEvent: () => void;
  /** Emptied after a normal order is placed. The event request is untouched. */
  clearNormal: () => void;
  /** Emptied after an event request is sent. The normal order is untouched. */
  clearEvent: () => void;
  /** Only ever called because the customer explicitly chose it. */
  moveNormalIntoEvent: () => void;
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
      event: { ...EMPTY_EVENT, ...(parsed.event ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

/** Applies an update to one named part of the cart, never the other. */
function onScope(s: CartState, scope: OrderScope, fn: (lines: CartLine[]) => CartLine[]): CartState {
  return scope === "event"
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

  const addLine = useCallback((scope: OrderScope, line: Omit<CartLine, "key">) => {
    const key = lineKey(line.productId, line.variantId, line.choiceIds, line.instructions);
    setState((s) =>
      onScope(s, scope, (lines) => {
        const existing = lines.find((l) => l.key === key);
        return existing
          ? lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l))
          : [...lines, { ...line, key }];
      }),
    );
  }, []);

  const setQuantity = useCallback((scope: OrderScope, key: string, quantity: number) => {
    setState((s) =>
      onScope(s, scope, (lines) =>
        quantity <= 0
          ? lines.filter((l) => l.key !== key)
          : lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
      ),
    );
  }, []);

  const removeLine = useCallback((scope: OrderScope, key: string) => {
    setState((s) => onScope(s, scope, (lines) => lines.filter((l) => l.key !== key)));
  }, []);

  const updateEvent = useCallback(
    (patch: Partial<EventDraft>) => setState((s) => ({ ...s, event: { ...s.event, ...patch } })),
    [],
  );

  const startNewEvent = useCallback(
    () => setState((s) => ({ ...s, eventLines: [], event: EMPTY_EVENT })),
    [],
  );

  const cancelEvent = useCallback(
    () => setState((s) => ({ ...s, eventLines: [], event: EMPTY_EVENT })),
    [],
  );

  /**
   * After an order is placed, only that part of the cart is emptied.
   *
   * A customer who sends an event request and still has a regular order keeps
   * the regular order exactly as it was, and the other way round.
   */
  const clearNormal = useCallback(() => setState((s) => ({ ...s, normalLines: [] })), []);
  const clearEvent = useCallback(
    () => setState((s) => ({ ...s, eventLines: [], event: EMPTY_EVENT })),
    [],
  );

  const moveNormalIntoEvent = useCallback(
    () => setState((s) => ({ ...s, eventLines: [...s.eventLines, ...s.normalLines], normalLines: [] })),
    [],
  );

  const value = useMemo<CartContextValue>(() => {
    const total = (ls: CartLine[]) => ls.reduce((n, l) => n + l.quantity, 0);
    const normalCount = total(state.normalLines);
    const eventCount = total(state.eventLines);
    return {
      normalLines: state.normalLines,
      eventLines: state.eventLines,
      event: state.event,
      hasEvent: state.event.eventType !== null || state.eventLines.length > 0,
      ready,
      normalCount,
      eventCount,
      count: normalCount + eventCount,
      addLine,
      setQuantity,
      removeLine,
      updateEvent,
      startNewEvent,
      cancelEvent,
      clearNormal,
      clearEvent,
      moveNormalIntoEvent,
    };
  }, [state, ready, addLine, setQuantity, removeLine, updateEvent, startNewEvent, cancelEvent,
      clearNormal, clearEvent, moveNormalIntoEvent]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export { EVENT_TYPE_LABELS } from "./ordering";
