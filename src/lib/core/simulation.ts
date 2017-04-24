import { Event } from './event';
import { MinHeap } from './min-heap';
import { Resource } from "./resource";
import { logPromise } from "./util";
import { Resolution } from "./duration";

type EventHandler = (e: Event, time: number) => void;


export class Simulation extends Resource {
  //Global information
  protected _time: number = 0;
  protected _eventHeap = MinHeap((l: Event, r: Event) => l.time - r.time);
  protected _pending = new Set<Promise<any>>();
  protected _tickers: EventHandler[] = [];

  constructor(private resolution: Resolution = Resolution.MILLISECOND) {
    super('');
  }

  get time() {
    return this._time;
  }

  onEvents(events: Event[]) {
    for (let e of events) {
      e.evaluateTime(this._time, this.resolution);
      this._eventHeap.insert(e);
      //this.log(e, 'Adding');
    }
  }

  onPromiseStart(p: Promise<any>) {
    this._pending.add(p);
  }

  onPromiseEnd(p: Promise<any>) {
    this._pending.delete(p);
  }

  onTick(fn: EventHandler) {
    this._tickers.push(fn);
    return this;
  }

  async run() {
    let top: Event;
    this.broadcast('onStart');

    while ((top = this._eventHeap.removeHead()) || this._pending.size > 0) {
      if (top) {
        if (Number.isNaN(top.time)) {
          console.log(top, top.duration, top.duration.resolve(this.resolution));
        }
        this._time = top.time; // Move time to time of current event
        this.resolve(top);
        for (let ticker of this._tickers) {
          ticker(top, this._time);
        }
      } else {
        await new Promise(resolve => process.nextTick(resolve));
      }
    }
  }
}