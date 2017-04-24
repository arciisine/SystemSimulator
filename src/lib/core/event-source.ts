import { Resource } from "./resource";
import { Duration } from "./duration";
import { getId, range } from "./util";

export class EventSource extends Resource {
  private active: Set<Promise<{ idx: number, promise: Promise<any> }>> = new Set();
  private finished: number = 0;
  private fns: Function[] = [];
  private available: number[] = [];

  constructor(objs: Resource[], method: string, public count: number, public duration: Duration = Duration.millis(0)) {
    super(`${getId(objs[0].constructor.name)}_source`);
    this.fns = objs.map(obj => obj[method].bind(obj));
    this.available = range(this.fns.length);
  }

  private async _run() {
    try {
      while (this.finished < this.count) {
        while (this.available.length && (this.finished + this.active.size) <= this.count) {
          let idx = this.available.shift();
          let promise;
          promise = this.fns[idx]().then(() => ({ promise, idx }), () => ({ promise, idx }));
          this.active.add(promise);
        }
        let { idx, promise } = await Promise.race(this.active);
        this.active.delete(promise);
        this.available.push(idx)
        this.finished++;
      }
    } catch (e) {
      console.log(e);
    }
  }

  onStart() {
    let p = this._run();
    this.emit('onPromiseStart', p);
    p
      .then(e => this.emit('onPromiseEnd', p))
      .catch(e => this.emit('onPromiseEnd', p))
  }
}