declare module "ical" {
  interface IcalEvent {
    type: string;
    start: Date;
    end: Date;
    summary?: string;
    description?: string;
    url?: string;
    location?: string;
    rrule?: unknown;
    recurrenceid?: Date;
    recurrences?: Record<string, unknown>;
    [key: string]: unknown;
  }

  interface IcalParseResult {
    [uid: string]: IcalEvent;
  }

  const ical: {
    parseICS(text: string): IcalParseResult;
    parseFile(filename: string): IcalParseResult;
  };

  export default ical;
}
