import { Event } from "../core/event";
import { Node } from "./node";
import { Duration } from "../core/duration";

export class Packet extends Event {
  constructor(to: string, action: string, finalEvent: Event, duration?: Duration) {
    super(to, action, { finalEvent }, duration);
  }

  get finalEvent() {
    return this.payload<{ finalEvent: Event }>().finalEvent;
  }
}