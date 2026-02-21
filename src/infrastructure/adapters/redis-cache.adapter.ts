import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ICachePort } from '../../application/ports/cache.port';

/**
 * Redis-backed adapter for the ICachePort.
 * Handles serialization, TTL management, and pattern-based invalidation.
 */
@Injectable()
export class RedisCacheAdapter implements ICachePort {
  private readonly logger = new Logger(RedisCacheAdapter.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis not available, caching disabled: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Cache GET failed for key "${key}": ${error}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache SET failed for key "${key}": ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache DELETE failed for key "${key}": ${error}`);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Cache DELETE BY PATTERN failed for "${pattern}": ${error}`);
    }
  }
}
