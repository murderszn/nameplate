import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextValue {
  orgId: string;
  userId?: string;
  membershipId?: string;
}

const storage = new AsyncLocalStorage<TenantContextValue>();

export class TenantContext {
  static run<T>(value: TenantContextValue, callback: () => T): T {
    return storage.run(value, callback);
  }

  static current(): TenantContextValue | undefined {
    return storage.getStore();
  }

  static require(): TenantContextValue {
    const value = storage.getStore();
    if (!value) throw new Error('Tenant context is not available outside an authenticated transaction');
    return value;
  }
}
