import { Node } from "../node";
import { Event } from "../../core/event";
import { Token } from "./token";
import { Duration } from "../../core/duration";
import { Resource } from "../../core/resource";
import { Request } from "../host/request";
import { Response } from "../host/response";


export const JwtHandler = {
  async authed(this: Resource, ev: Request<any>) {
    if (ev.headers.auth) {
      await this.wait((ev.headers.auth as Token).duration);
    } else {
      throw new Error("Not logged in");
    }
  },
  async login(this: Resource, user: any) {
    return new Response(user, { auth: new Token(1000, 'sha512') });
  }
}