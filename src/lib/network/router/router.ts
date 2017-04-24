import { Link } from "../link";
import { Node } from "../node";
import { getId } from "../../core/util";
import { Event } from "../../core/event";
import { Packet } from "../packet";

export class Router extends Node {
  constructor(links: Link[], name?: string) {
    super(name || getId('router'), links, true);
  }

  addRoutes(...links: Link[]) {
    super.addRoutes(...links);
    for (let l of links) {
      let next = new Link(this, l.bandwidth, l.latency);
      if (!(l.destination instanceof Router)) {
        l.destination.addRoutes(next);
      } else {
        Node.prototype.addRoutes.call(l.destination, next);
      }
    }
    return this;
  }
}