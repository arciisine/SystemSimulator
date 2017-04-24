import { Host } from "./host";
import { Request } from "./request";
import { Event } from "../../core/event";

let clone = (o) => JSON.parse(JSON.stringify(o));

export class Proxy extends Host {

  private proxies: Map<string, string> = new Map();

  addProxy(name: string, target: string) {
    this.proxies.set(name, target);
    return this;
  }

  invoke(ev: Event) {
    if (ev instanceof Request && ev.action.indexOf('/') > 0) {
      let [proxy, action] = ev.action.split('/');
      proxy = this.proxies.get(proxy);
      let e = new Request(proxy, action, clone(ev.body), clone(ev.headers));
      return this.request(e);
    } else {
      return super.invoke(ev);
    }
  }
}