import type { EngineAdapter, EngineAdapterCapabilities } from '../types';
import type { AdapterRoute } from './AdapterRouter';

export type AdapterFactory<TOptions = unknown> = (options?: TOptions) => EngineAdapter;

export interface RegisteredAdapter {
  id: string;
  capabilities: EngineAdapterCapabilities;
  create: AdapterFactory<any>;
}

export class AdapterRegistry {
  private adapters = new Map<string, RegisteredAdapter>();

  register<TOptions>(
    id: string,
    capabilities: EngineAdapterCapabilities,
    create: AdapterFactory<TOptions>
  ): void {
    if (this.adapters.has(id)) {
      throw new Error(`Engine adapter already registered: ${id}`);
    }

    this.adapters.set(id, {
      id,
      capabilities,
      create,
    });
  }

  has(id: string): boolean {
    return this.adapters.has(id);
  }

  create<TOptions>(id: string, options?: TOptions): EngineAdapter {
    const registered = this.adapters.get(id);
    if (!registered) {
      throw new Error(`Engine adapter not registered: ${id}`);
    }

    return registered.create(options);
  }

  list(): RegisteredAdapter[] {
    return Array.from(this.adapters.values());
  }

  find(predicate: (adapter: RegisteredAdapter) => boolean): RegisteredAdapter | undefined {
    return this.list().find(predicate);
  }

  findByRoute(route: Pick<AdapterRoute, 'adapterId' | 'renderer'>): RegisteredAdapter | undefined {
    return this.find(adapter => {
      if (adapter.id === route.adapterId) {
        return true;
      }

      const renderers = adapter.capabilities.renderers ?? [adapter.capabilities.renderer];
      return renderers.includes(route.renderer);
    });
  }
}

export const globalAdapterRegistry = new AdapterRegistry();
