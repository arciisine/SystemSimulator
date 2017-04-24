import { getId, range } from '../lib/core/util';
import { Simulation } from '../lib/core/simulation';
import { Event } from '../lib/core/event';
import { Resource } from "../lib/core/resource";
import { Duration, Resolution } from "../lib/core/duration";
import { EventSource } from "../lib/core/event-source";
import { Node } from '../lib/network/node';
import { Link } from '../lib/network/link';
import { Host } from "../lib/network/host/host";
import { Request } from "../lib/network/host/request";
import { Response } from "../lib/network/host/response";
import { WebServer } from "../lib/network/host/web-server";
import { Router } from "../lib/network/router/router";
import { LoadBalancer } from "../lib/network/router/load-balancer";
import { NetworkManager } from "../lib/network/network-manager";
import { copyHeaders } from "../lib/network/host/request-util";

class Server extends WebServer {
  async login(credentials: Request<any>) {
    return {
      username: credentials.body.username,
      firstname: 'Bob',
      lastname: 'Jones',
      id: getId('user'),
      created: Date.now()
    };
  }

  async listAccounts(req: Request<any>) {
    return [{ id: getId('account') }, { id: getId('account') }];;
  }
}

class Client extends Host {
  async scenario() {
    await this.request('/web', 'login.html')
    await this.wait(Duration.seconds(2, .5));
    let res = await this.request('/web', 'login', { username: 'bob', password: 'bobpw' });

    await this.wait(Duration.millis(500, 50));
    await this.request('/web', 'accounts.html')
    let accounts = await this.request('/web', 'listAccounts', {}, copyHeaders(res, 'auth'));
    console.log(accounts.body);
  }
}

let router = new Router([]);
let web = new Server('web').addFiles('login.html', 'accounts.html');
let clients = range(1).map(i => new Client(`client${i}`, 2));

router.addRoutes(
  ...clients.map(client => new Link(client, 100000, Duration.millis(100, 50))),
  new Link(web, 10000000, Duration.nanos(15, 2)),
  new Link(web, 10000000, Duration.nanos(50, 11))
);

let source = new EventSource(clients, 'scenario', 1);

let sim = new Simulation(Resolution.NANOSECOND)
  .sub(web, router, source, ...clients)
  .onTick(e => {
    setTimeout(() => Event.log(e), e.time / 10 ** 6 * 2);
  })

NetworkManager.init(sim);

sim.run();