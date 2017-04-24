import { Event } from "../../core/event";
import { Duration } from "../../core/duration";

import { Link } from "../link";
import { Node } from "../node";
import { Router } from "../router/router";
import { Request } from "./request";
import { Response } from "./response";

export class Host extends Node {
  _queue: Event[] = [];
  _localActions: Map<String, Promise<any>> = new Map();
  delayBetweenRequests = Duration.millis(0);

  constructor(
    name: string,
    public processors: number = 10,
    public queueSize: number = Number.MAX_SAFE_INTEGER
  ) {
    super(name);
  }

  get activeRequests() {
    return this._localActions.size;
  }

  receiveMessage(ev: Event) {
    let full = ev.payload<Event>();

    if (full instanceof Request) {
      if (this._queue.length >= this.queueSize) {
        this.notifyCompleteAction(full, { message: 'Dropping' }, false);
      } else if (this._localActions.size < this.processors) {
        //If method is async
        let res = super.receiveMessage(ev);
        if (res && res.then) {
          this._localActions.set(full.id, res);
          res
            .then(v => this.notifyCompleteAction(full, v, true))
            .catch(v => { this.notifyCompleteAction(full, v, false) });
        }
      } else {
        this._queue.push(ev);
      }
    } else {
      super.receiveMessage(ev);
    }
  }

  request<T>(ev: Request<T>): Promise<Response<any>>;
  request<T>(to: string, action: string, payload?: T, headers?: { [key: string]: string }): Promise<Response<any>>;
  request<T>(ev: Request<T> | string, action?: string, payload?: T, headers?: { [key: string]: string }): Promise<Response<any>> {
    if (typeof ev === 'string') {
      ev = new Request(ev, action, payload, headers);
    }
    //console.log(this.uri, "Request", ev.to, ev.action, ev.body);
    let out = this.sendMessage(ev);
    return this.spawnAction(out);
  }

  notifyCompleteAction<T>(ev: Event, payload: T | Response<T>, success: boolean) {
    this._localActions.delete(ev.id);
    let out: Response<T> = payload instanceof Response ? payload : new Response<T>(payload);

    //Set response settings
    out.targetId = ev.id;
    out.to = ev.source;
    out.source = this.uri;
    out.action = success ? this.completeAction.name : this.failAction.name;

    let toSend = this.sendMessage(out);
    this.emitEvents(toSend);

    // Pull from queue
    if (this._queue.length) {
      let next = this._queue.shift();
      next.duration = this.delayBetweenRequests;
      this.emitEvents(next);
    }
  }
}