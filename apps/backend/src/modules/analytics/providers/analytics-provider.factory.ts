import { Injectable, BadRequestException } from '@nestjs/common';
import { AnalyticsProvider } from './analytics-provider.interface';
import { AmplitudeProvider } from './amplitude/amplitude.provider';

@Injectable()
export class AnalyticsProviderFactory {
  private readonly providers: Map<string, AnalyticsProvider>;

  constructor(private readonly amplitudeProvider: AmplitudeProvider) {
    this.providers = new Map<string, AnalyticsProvider>([
      ['amplitude', amplitudeProvider],
    ]);
  }

  getProvider(providerType: string): AnalyticsProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new BadRequestException(
        `Analytics provider "${providerType}" is not supported. Supported: ${[...this.providers.keys()].join(', ')}`,
      );
    }
    return provider;
  }

  getSupportedTypes(): string[] {
    return [...this.providers.keys()];
  }
}
