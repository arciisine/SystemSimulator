export enum Resolution {
  NANOSECOND = 0,
  MICROSECOND = 1,
  MILLISECOND = 2,
  CENTISECOND = 3,
  DECISECOND = 4,
  SECOND = 5,
  MINUTE = 6,
  HOUR = 7,
  DAY = 8,
  YEAR = 9
}
const RATIO: Map<Resolution, number> = new Map([
  [Resolution.NANOSECOND, 0],
  [Resolution.MICROSECOND, 1000],
  [Resolution.MILLISECOND, 1000],
  [Resolution.CENTISECOND, 10],
  [Resolution.DECISECOND, 10],
  [Resolution.SECOND, 10],
  [Resolution.MINUTE, 60],
  [Resolution.HOUR, 60],
  [Resolution.DAY, 24],
  [Resolution.YEAR, 365]
]);

const ORDER = Array.from(RATIO.keys()).sort();

const COMPUTED_RATIO: Map<Resolution, Map<Resolution, number>> = new Map(
  ORDER.map(base => {
    let sub: Map<Resolution, number> = new Map(
      ORDER.slice(base + 1).reduce((acc, b) => {
        let next = [b, RATIO.get(b) * acc[acc.length - 1][1]] as [Resolution, number];
        acc.push(next);
        return acc;
      }, [[base, 1]] as [Resolution, number][])
    );
    return [base, sub] as [Resolution, Map<Resolution, number>];
  })
);

export class Duration {
  private static CACHE: Map<string, Duration> = new Map();

  static years(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.YEAR);
  }

  static days(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.DAY);
  }

  static hours(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.HOUR);
  }

  static minutes(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.MINUTE);
  }

  static seconds(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.SECOND);
  }

  static millis(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.MILLISECOND);
  }

  static micros(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.MICROSECOND);
  }

  static nanos(value: number, stddev: number = 0) {
    return Duration.of(value, stddev, Resolution.NANOSECOND);
  }

  static of(value: number, stddev: number = 0, resolution: Resolution) {
    let key = `${value}~${stddev}~${resolution}`;
    if (!Duration.CACHE.has(key)) {
      Duration.CACHE.set(key, new this(value, stddev, resolution));
    }
    return Duration.CACHE.get(key);
  }

  static resolveValue(duration: Duration, resolution: Resolution) {
    let delta = COMPUTED_RATIO.get(resolution).get(duration._resolution);
    return delta * duration._value;;
  }

  constructor(private _value: number, private _stddev: number, private _resolution: Resolution) { }

  resolve(base: Resolution) {
    let delta = COMPUTED_RATIO.get(base).get(this._resolution);
    return (this._value + (Math.trunc(Math.random() * this._stddev * 2) - this._stddev)) * delta;
  }

  get value() {
    return this._value;
  }

  get resolution() {
    return this._resolution;
  }

  get stddev() {
    return this._stddev;
  }

  toString() {
    return `${this.constructor.name}<${this._value},${this._stddev} ${Resolution[this._resolution]}>`;
  }
}