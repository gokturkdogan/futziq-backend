import { Injectable } from '@nestjs/common';
import { GameFamilyHandler } from '../contracts/game-family-handler';

@Injectable()
export class GameFamilyRegistry {
  private readonly handlers = new Map<string, GameFamilyHandler>();

  register(handler: GameFamilyHandler): void {
    this.handlers.set(handler.family, handler);
  }

  get(family: string): GameFamilyHandler {
    const handler = this.handlers.get(family);
    if (!handler) {
      throw new Error(`Game family handler not found: ${family}`);
    }
    return handler;
  }
}
