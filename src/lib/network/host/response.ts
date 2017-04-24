import { Event } from "../../core/event";

export class Response<T> extends Event {
  constructor(payload: T = {} as T, public headers: { [key: string]: any } = {}) {
    super(null, null, payload)
  }

  get body() {
    return this.payload<T>();
  }
}