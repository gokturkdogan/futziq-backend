import { Injectable } from '@nestjs/common';

export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class NoOpRedisClient implements RedisClient {
  async get(): Promise<string | null> {
    return null;
  }
  async set(): Promise<void> {
    return;
  }
  async del(): Promise<void> {
    return;
  }
}
