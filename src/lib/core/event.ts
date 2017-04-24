import { getId } from "./util";
import { Resolution, Duration } from "./duration";

export class Event {

  static log(e: Event, message: string = e.constructor.name) {
    console.log(message, e.time, e.id, e.source, e.to, e.action, e.duration, JSON.stringify(e.payload()));
  }

  id: string = getId(this);
  _receivedTime: number;
  _time: number;
  source: string;
  targetId?: string;

  constructor(
    public to: string,
    public action: string,
    private _payload: any = {},
    public duration: Duration = Duration.millis(0)
  ) { }

  payload<T>() {
    return this._payload as T;
  }

  evaluateTime(current: number, base: Resolution) {
    this._receivedTime = current;
    this._time = current + this.duration.resolve(base);
  }

  get time() {
    return this._time;
  }
}
