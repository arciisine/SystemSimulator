import { Resource } from "../core/resource";
import { Packet } from "./packet";
import { Link } from "./link";
import { Event } from "../core/event";
import { NetworkManager } from "./network-manager";
import { Duration } from "../core/duration";

export class Node extends Resource {

  protected _linkMap: Map<string, Link> = new Map();
  protected processingDelay = Duration.millis(10, 5);
  private _network: NetworkManager;

  constructor(name: string, public links: Link[] = [], public routable: boolean = false) {
    super(name);

    this.links.push(new Link(this, 10000000, Duration.millis(0)));

    for (let l of this.links) {
      this._linkMap.set(l.destination.name, l);
    }
  }

  onNetworkInit(manager: NetworkManager) {
    this._network = manager;
    this._network.register(this);
  }

  addRoutes(...links: Link[]) {
    for (let link of links) {
      this.links.push(link);
      this._linkMap.set(link.destination.name, link);
    }
    if (this._network) {
      this._network.forceRefresh();
    }
  }

  sendPacket(e: Packet) {
    let next = this._network.getNextHop(this, e.finalEvent.to);

    if (!this._linkMap.has(next.name)) {
      throw new Error(`${this.uri} does not have visibility to ${e.finalEvent.to}`);
    }

    let out = new Packet(next.uri, this.receivePacket.name, e.finalEvent, this._linkMap.get(next.name).latency);
    out.source = e.source;
    return out;
  }

  relayMessage(ev: Event) {
    let p = new Packet(this.uri, this.sendPacket.name, ev, this.processingDelay);
    p.targetId = ev.id;
    return p;
  }

  sendMessage(ev: Event) {
    ev.source = this.uri;
    return this.relayMessage(ev);
  }

  receiveMessage(ev: Event) {
    let final = ev.payload<Event>();
    return this.resolve(final);
  }

  receivePacket(ev: Packet) {
    if (ev instanceof Packet) {
      let out: Event;
      if (ev.finalEvent.to !== this.uri) {
        out = this.relayMessage(ev.finalEvent);
      } else {
        out = new Event(this.uri, this.receiveMessage.name, ev.finalEvent, this.processingDelay);
      }
      out.source = ev.source;
      return out;
    } else {
      throw new Error('Cannot receive unroutable events');
    }
  }
}