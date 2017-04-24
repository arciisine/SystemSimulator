import { Event } from "./event";
import { getId, tagPromise, logPromise, getPromiseId } from './util';
import { Duration } from "./duration";

type Handler = (ev: Event) => Event[];

type Notify = (res: any) => void;
type Defer = { resolve: Notify, reject: Notify, promise?: Promise<any> };
type Cls<T> = new (...args: any[]) => T;


export class Resource {
  id: string = getId(this);
  _uri: string;
  _parent: Resource;
  private _children: Map<string, Resource> = new Map();
  private _actions: Map<string, Defer> = new Map();

  constructor(public name: string) { }

  get uri() {
    if (!this._uri) {
      let out = '';
      let r: Resource = this;
      while (r) {
        out = !out ? `/${r.name}` : [`/${r.name}`, out].join('/').replace(/\/+/g, '/');
        r = r.parent;
      }
      this._uri = out;
    }
    return this._uri;
  }

  sub(...resources: Resource[]) {
    for (let resource of resources) {
      this._children.set(resource.name, resource);
      resource.parent = this;
    }
    return this;
  }

  set parent(parent: Resource) {
    this._parent = parent;
    delete this._uri;
  }

  get parent() {
    return this._parent;
  }

  get root() {
    return this.parent ? this.parent.root() : this;
  }

  protected invoke(event: Event) {
    return this[event.action](event);
  }

  protected emit(event: string, data: any) {
    if (this[event]) {
      (this[event] as any)(data);
    }
    if (this.parent) {
      this.parent.emit(event, data);
    }
  }

  broadcast(event: string, data?: any) {
    if (this[event]) {
      (this[event] as any)(data);
    }
    for (let child of this._children.values()) {
      child.broadcast(event, data);
    }
  }

  resolve(event: Event) {
    if (event.to === this.uri) {
      let res = this.invoke(event);
      if (res instanceof Event) {
        this.emitEvents(res);
      } else if (Array.isArray(res) && res[0] instanceof Event) {
        this.emitEvents(...res);
      } else if (res && res.then) {
        tagPromise(res);
        return res;
      }
    } else {
      let sub = event.to.substring(this.uri.length);
      let next = sub.split('/')[sub.charAt(0) === '/' ? 1 : 0];
      let res = this._children.get(next);
      return res.resolve(event);
    }
  }

  emitEvents(...events: Event[]) {
    for (let ev of events) {
      ev.source = this.uri;
    }
    this.emit('onEvents', events);
  }

  spawnAction(ev: Event) {
    let id = ev.targetId || ev.id;

    let pid = getPromiseId();
    let p = new Promise((resolve, reject) => {
      tagPromise(resolve, pid);
      this._actions.set(id, { resolve, reject });
      this.emitEvents(ev);
    })

    this._actions.get(id).promise = p;

    tagPromise(p, pid);

    this.emit('onPromiseStart', p);
    return p;
  }

  private resolveAction(ev: Event) {
    let id = ev.targetId || ev.id;
    let notifier = this._actions.get(id);
    this._actions.delete(id);
    this.emit('onPromiseEnd', notifier.promise);
    return notifier;
  }

  completeAction(ev: Event) {
    this.resolveAction(ev).resolve(ev);
  }

  failAction(ev: Event) {
    this.resolveAction(ev).reject(ev);
  }

  wait(duration: Duration) {
    let ev = new Event(this.uri, this.completeAction.name, { waiting: true }, duration);
    return this.spawnAction(ev);
  }
}