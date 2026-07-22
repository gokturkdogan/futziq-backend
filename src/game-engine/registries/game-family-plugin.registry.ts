import { Injectable } from '@nestjs/common';
import { GameFamilyPlugin } from '../../game-engine/contracts/game-family.plugin';

@Injectable()
export class GameFamilyPluginRegistry {
  private readonly plugins = new Map<string, GameFamilyPlugin>();

  register(plugin: GameFamilyPlugin): void {
    this.plugins.set(plugin.family, plugin);
  }

  get(family: string): GameFamilyPlugin {
    const plugin = this.plugins.get(family);
    if (!plugin) {
      throw new Error(`Game family plugin not found: ${family}`);
    }
    return plugin;
  }

  list(): GameFamilyPlugin[] {
    return [...this.plugins.values()];
  }
}
