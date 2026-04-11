export interface AnalyticsEvent {
  /** Amplitude event name */
  eventName: string;
  /** Value extracted from UTM parameter */
  partnerCode: string;
  /** UTC date as 'YYYY-MM-DD' */
  eventDate: string;
  /** Revenue value from event property (if available) */
  revenueAmount?: number;
}

export interface AnalyticsProvider {
  readonly type: string;

  /**
   * Fetch and parse events from the analytics system for the given date range.
   * @param encryptedConfig  AES-256-GCM encrypted JSON string with provider credentials
   * @param encryptionKey    Hex-encoded 32-byte key for decryption
   * @param utmParamName     Name of the event/user property holding the referral code
   * @param rangeStart       Start of the export range (inclusive)
   * @param rangeEnd         End of the export range (exclusive)
   */
  fetchEvents(
    encryptedConfig: string,
    encryptionKey: string,
    utmParamName: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<AnalyticsEvent[]>;
}
