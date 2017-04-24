import { Request } from "./request";
import { Host } from "./host";
import { Event } from "../../core/event";

export interface AuthHandler {
  authed(req: Request<any>): Promise<any>;
  login(payload: any): Promise<any>;
}

export class AuthHost extends Host {

  private handler: AuthHandler;

  setAuthHandler(handler: AuthHandler) {
    this.handler = handler;
    return this;
  }

  protected invoke(event: Event) {
    if (event instanceof Request) {
      if (event.action !== 'login') {
        return this.handler.authed.call(this, event)
          .then(() => this[event.action](event));
      } else {
        return this[event.action](event)
          .then(res => {
            return this.handler.login.call(this, res);
          });
      }
    } else {
      return this[event.action](event);
    }
  }
}