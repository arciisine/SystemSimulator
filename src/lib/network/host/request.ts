import { Event } from "../../core/event";

export class Request<T> extends Event {
  constructor(to: string, action: string, payload: T = {} as T, public headers: { [key: string]: any } = {}) {
    super(to, action, payload)
  }

  get body() {
    return this.payload<T>();
  }
}