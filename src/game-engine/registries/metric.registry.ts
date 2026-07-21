import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricResolver } from '../contracts/metric-resolver';

@Injectable()
export class MetricRegistry implements OnModuleInit {
  private readonly resolvers = new Map<string, MetricResolver>();

  onModuleInit(): void {
    // Resolvers registered via register() from module providers
  }

  register(resolver: MetricResolver): void {
    this.resolvers.set(resolver.code, resolver);
  }

  get(code: string): MetricResolver {
    const resolver = this.resolvers.get(code);
    if (!resolver) {
      throw new Error(`Metric resolver not found: ${code}`);
    }
    return resolver;
  }
}
