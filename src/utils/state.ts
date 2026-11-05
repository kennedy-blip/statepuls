import type { ActionEntry, JsonValue, StoreState } from '../types';

export const baseState: StoreState = {
  user: {
    id: 'usr_8f42a1',
    name: 'Alex Morgan',
    email: 'alex@acme.dev',
    role: 'admin',
    isAuthenticated: false,
    preferences: { language: 'en', timezone: 'America/New_York' },
  },
  cart: {
    items: [],
    total: 0,
    currency: 'USD',
    couponCode: null,
  },
  settings: {
    theme: 'light',
    notifications: true,
    autoSave: true,
    sidebarCollapsed: false,
  },
  ui: {
    activeModal: null,
    isLoading: false,
    toastCount: 0,
  },
};

export function cloneState(state: StoreState): StoreState {
  return JSON.parse(JSON.stringify(state)) as StoreState;
}

export function setAtPath(state: StoreState, path: string[], value: JsonValue): StoreState {
  const next = cloneState(state);
  let target: Record<string, JsonValue> | JsonValue[] = next;
  for (const segment of path.slice(0, -1)) {
    target = (target as Record<string, JsonValue>)[segment] as Record<string, JsonValue> | JsonValue[];
  }
  (target as Record<string, JsonValue>)[path[path.length - 1]] = value;
  return next;
}

export function getAtPath(state: StoreState, path: string[]): JsonValue {
  return path.reduce<JsonValue>((value, segment) => (value as Record<string, JsonValue>)[segment], state);
}

export function formatBytes(value: string): string {
  const bytes = new Blob([value]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;
}

export function stateSize(state: StoreState): string {
  return formatBytes(JSON.stringify(state));
}

export function createInitialHistory(): ActionEntry[] {
  const now = Date.now();
  const initial = cloneState(baseState);
  const login = setAtPath(initial, ['user', 'isAuthenticated'], true);
  const withCart = setAtPath(login, ['cart', 'items'], [
    { id: 'prod_001', name: 'Studio Headphones', quantity: 1, price: 129 },
    { id: 'prod_002', name: 'Desk Mat', quantity: 1, price: 39 },
  ]);
  const withTotal = setAtPath(withCart, ['cart', 'total'], 168);
  const dark = setAtPath(withTotal, ['settings', 'theme'], 'dark');

  return [
    { id: 'initial', type: 'STORE_INITIALIZED', timestamp: now - 282000, payload: { source: 'app/bootstrap' }, state: initial, category: 'system' },
    { id: 'login', type: 'AUTH_LOGIN_SUCCESS', timestamp: now - 214000, payload: { userId: 'usr_8f42a1', role: 'admin' }, state: login, category: 'auth' },
    { id: 'cart', type: 'CART_ADD_ITEM', timestamp: now - 126000, payload: { items: 2, total: 168 }, state: withTotal, category: 'cart' },
    { id: 'theme', type: 'SETTINGS_TOGGLE_DARK_MODE', timestamp: now - 43000, payload: { theme: 'dark' }, state: dark, category: 'settings' },
  ];
}

export function timeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}