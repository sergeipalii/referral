import { Injectable } from '@nestjs/common';
import { AmplitudeApiClient, AmplitudeRawEvent } from './amplitude-api.client';
import {
  AnalyticsEvent,
  AnalyticsProvider,
} from '../analytics-provider.interface';
import { decrypt } from '../../../../utils/crypto.util';

export interface AmplitudeConfig {
  apiKey: string;
  secretKey: string;
  projectId?: string;
}

@Injectable()
export class AmplitudeProvider implements AnalyticsProvider {
  readonly type = 'amplitude';

  constructor(private readonly amplitudeApiClient: AmplitudeApiClient) {}

  async fetchEvents(
    encryptedConfig: string,
    encryptionKey: string,
    utmParamName: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AnalyticsEvent[]> {
    const config: AmplitudeConfig = JSON.parse(
      decrypt(encryptedConfig, encryptionKey),
    );

    const rawEvents = await this.amplitudeApiClient.exportEvents(
      config.apiKey,
      config.secretKey,
      rangeStart,
      rangeEnd,
    );

    return rawEvents
      .map((raw) => this.mapEvent(raw, utmParamName))
      .filter((e): e is AnalyticsEvent => e !== null);
  }

  private mapEvent(
    raw: AmplitudeRawEvent,
    utmParamName: string,
  ): AnalyticsEvent | null {
    // Check event_properties first, then user_properties
    const partnerCode: string | undefined =
      raw.event_properties?.[utmParamName] ??
      raw.user_properties?.[utmParamName];

    if (!partnerCode || typeof partnerCode !== 'string') {
      return null;
    }

    // Parse event_time: "2024-01-15 14:30:00.000000" → YYYY-MM-DD
    const eventDate = raw.event_time?.slice(0, 10) ?? null;
    if (!eventDate) {
      return null;
    }

    return {
      eventName: raw.event_type,
      partnerCode: partnerCode.trim(),
      eventDate,
      revenueAmount: typeof raw.revenue === 'number' ? raw.revenue : undefined,
    };
  }
}
