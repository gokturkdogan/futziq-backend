import { Injectable } from '@nestjs/common';
import { ScopeResolver } from '../contracts/scope-resolver';

@Injectable()
export class ScopeRegistry {
  private readonly resolvers = new Map<string, ScopeResolver>();

  register(resolver: ScopeResolver): void {
    this.resolvers.set(resolver.code, resolver);
  }

  get(code: string): ScopeResolver {
    const resolver = this.resolvers.get(code);
    if (!resolver) {
      throw new Error(`Scope resolver not found: ${code}`);
    }
    return resolver;
  }
}
