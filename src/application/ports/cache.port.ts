/**
 * Port interface for caching (Dependency Inversion Principle).
 * Abstracts Redis or any other caching mechanism.
 */
export interface ICachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
}

export const CACHE_PORT = Symbol('ICachePort');
