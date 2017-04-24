import { Host } from "../host/host";
import { Request } from "../host/request";
import { Duration } from "../../core/duration";
import { getId } from "../../core/util";

export class SessionServer extends Host {
  private session: Map<string, any> = new Map();

  async get(id: Request<{ sessionId: string }>) {
    await this.wait(Duration.millis(3, 2));

    let res = this.session.get(id.body.sessionId);

    if (!res) {
      throw new Error("Session not found");
    }
    return res;
  }

  async init(ev: Request<any>) {
    await this.wait(Duration.millis(5, 2));
    let sessionId = getId('session');
    this.session.set(sessionId, ev.body);
    return { sessionId };
  }
}