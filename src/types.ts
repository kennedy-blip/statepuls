export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type StoreState = { [key: string]: JsonValue };

export type ActionEntry = {
  id: string;
  type: string;
  timestamp: number;
  payload: JsonValue;
  state: StoreState;
  category: 'auth' | 'cart' | 'settings' | 'system';
};

export type StorageKind = 'local' | 'session' | 'indexed';

export type StorageRecord = {
  key: string;
  value: string;
  expires: string | null;
};