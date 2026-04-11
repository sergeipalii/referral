import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as zlib from 'zlib';
import * as JSZip from 'jszip';

export interface AmplitudeRawEvent {
  event_type: string;
  event_properties: Record<string, any>;
  user_properties: Record<string, any>;
  event_time: string;
  revenue?: number;
  [key: string]: any;
}

@Injectable()
export class AmplitudeApiClient {
  private readonly logger = new Logger(AmplitudeApiClient.name);
  private readonly baseUrl = 'https://amplitude.com/api/2';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Export raw events from Amplitude for the given date range.
   * Uses the Amplitude Export API: GET /api/2/export
   * Requires paid Amplitude plan.
   */
  async exportEvents(
    apiKey: string,
    secretKey: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AmplitudeRawEvent[]> {
    const start = this.formatAmplitudeDate(rangeStart);
    const end = this.formatAmplitudeDate(rangeEnd);

    const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

    this.logger.log(`Fetching Amplitude events from ${start} to ${end}`);

    const response = await firstValueFrom(
      this.httpService.get<Buffer>(`${this.baseUrl}/export`, {
        params: { start, end },
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        responseType: 'arraybuffer',
        timeout: 120_000,
      }),
    );

    return this.parseExportResponse(Buffer.from(response.data));
  }

  /**
   * Parse the ZIP archive returned by the Amplitude Export API.
   * Each file inside is gzipped NDJSON.
   */
  private async parseExportResponse(buffer: Buffer): Promise<AmplitudeRawEvent[]> {
    const events: AmplitudeRawEvent[] = [];

    try {
      const zip = await JSZip.loadAsync(buffer);
      const filePromises = Object.values(zip.files)
        .filter((f) => !f.dir)
        .map(async (file) => {
          const compressed = await file.async('nodebuffer');
          const ndjson = await this.gunzip(compressed);
          return this.parseNdjson(ndjson);
        });

      const results = await Promise.all(filePromises);
      for (const batch of results) {
        events.push(...batch);
      }
    } catch (err) {
      this.logger.error('Failed to parse Amplitude export response', err);
      throw err;
    }

    this.logger.log(`Parsed ${events.length} raw events from Amplitude`);
    return events;
  }

  private gunzip(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    });
  }

  private parseNdjson(ndjson: string): AmplitudeRawEvent[] {
    return ndjson
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as AmplitudeRawEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is AmplitudeRawEvent => e !== null);
  }

  /** Format: YYYYMMDDTHH (Amplitude Export API hour-precision format) */
  private formatAmplitudeDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getUTCFullYear()}` +
      `${pad(date.getUTCMonth() + 1)}` +
      `${pad(date.getUTCDate())}` +
      `T${pad(date.getUTCHours())}`
    );
  }
}
