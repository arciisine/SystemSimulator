import { Host } from "../host/host";
import { Request } from "../host/request";
import { copyHeaders } from "../host/request-util";
import { Response } from "../host/response";

export const SessionHandler = {
  async authed(this: Host, request: Request<any>) {
    let res = await this.request('/session', 'get', { sessionId: request.headers.auth });
    return;
  },
  async login(this: Host, user: any) {
    let session = await this.request('/session', 'init', user);
    return new Response(user, { auth: session.body.sessionId });
  }
}