import { Host } from "../host/host";
import { Event } from "../../core/event";
import { Link } from "../link";
import { Request } from "../host/request";
import { Router } from "./router";
import { Packet } from "../packet";
import { Duration } from "../../core/duration";
import { range } from "../../core/util";

export class LoadBalancer extends Router {

  static from(name: string, count: number, handler: (name: string) => Host) {
    return new LoadBalancer(name).sub(...range(count).map(x => handler(`${name}${x}`)));
  }

  private _childList: Host[] = [];

  constructor(name: string) {
    super([], name);
  }

  sub(...hosts: Host[]) {
    super.sub(...hosts);
    this._childList.push(...hosts);

    for (let host of hosts) {
      this.addRoutes(new Link(host, 0, Duration.nanos(5)));
    }
    return this;
  }

  invoke(event: Event) {
    if (event instanceof Request) { //If load balancer doesn't know about the action, delgate
      let delegate = this._childList.sort((a, b) => a.activeRequests - b.activeRequests)[0];
      let req = new Request(delegate.uri, event.action, event.body, event.headers);
      req.id = event.id;
      req.source = event.source;
      return this.relayMessage(req);
    } else {
      return super.invoke(event);
    }
  }
}