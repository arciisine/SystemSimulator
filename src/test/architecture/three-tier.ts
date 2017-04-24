import { getId, range } from '../../lib/core/util';
import { Simulation} from '../../lib/core/simulation';
import { Event} from '../../lib/core/event';
import { Resource } from "../../lib/core/resource";
import { Duration, Resolution } from "../../lib/core/duration";
import { EventSource } from "../../lib/core/event-source";
import { MethodPrefix, Prefix } from "../../lib/core/resource-util";

import { Node } from '../../lib/network/node';
import { Link } from '../../lib/network/link';

import { Host } from "../../lib/network/host/host";
import { Request } from "../../lib/network/host/request";
import { Response } from "../../lib/network/host/response";
import { WebServer } from "../../lib/network/host/web-server";

import { Router } from "../../lib/network/router/router";
import { LoadBalancer } from "../../lib/network/router/load-balancer";

import { NetworkManager } from "../../lib/network/network-manager";
import { SessionHandler } from "../../lib/network/session/handler";
import { SessionServer } from "../../lib/network/session/server";
import { webServer } from "../common/web";
import { copyHeaders } from "../../lib/network/host/request-util";
import { AuthHost, AuthHandler } from "../../lib/network/host/auth-host";

type Credentials = { username : string, password: string };


class RestServer extends AuthHost {

  async login(credentials:Request<Credentials>) {
    let [login, res] = await Promise.all([
      this.request('/db', 'loginQuery', credentials.body),
      this.request('/db', 'expiryQuery', credentials.body)
    ]);
    return login.body;
  }

  async listAccounts(req:Request<any>) {
    return await this.request('/db', 'listAccounts', {}, copyHeaders(req, 'auth'));
  }

  async listOrders(req:Request<any>) {
    return await this.request('/db', 'listOrders', {}, copyHeaders(req, 'auth'));
  }

  async placeOrder(req:Request<any>) {
    return await this.request('/db', 'placeOrder', {}, copyHeaders(req, 'auth'));
  }

  async trackOrder(req:Request<any>) {
    return await this.request('/db', 'trackOrder', {}, copyHeaders(req, 'auth'));
  }
}

class DbServer extends Host {
  async loginQuery(req:Request<Credentials>) {
    let credentials = req.body;
    
    await this.wait(Duration.millis(100, 20));

    return {
      username : credentials.username,
      firstname : 'Bob',
      lastname : 'Jones',
      id : getId('user'),
      created : Date.now()
    }
  }
  async expiryQuery(cred:any) {
    await this.wait(Duration.millis(100, 20));
    return { hi : 'world' };
  }
  async listAccounts() {
    await this.wait(Duration.millis(250, 30));
    return [{id:getId('account')},{id:getId('account')}];
  }

  async listOrders() {
    await this.wait(Duration.millis(400, 30));
    return [{id:getId('order')},{id:getId('order')}]
  }

  async placeOrder() {
    await this.wait(Duration.millis(1000, 200));
    return {id:getId('order')};
  }

  async trackOrder() {
    await this.wait(Duration.millis(1500, 300));
    return {id:getId('order'), status:5};
  }
}

let i = 0;

class Client extends Host {
  constructor(name: string) {
    super(name, 2);
  }

  async scenario() {
    try {
      await this.request('/web', 'index.html')
      await this.wait(Duration.millis(500, 50));
      await this.request('/web', 'login.html')
      let res = await this.request('/web', 'rest/login', { username : 'bob', password : 'bobpw' });

      await this.wait(Duration.millis(500, 50));
      await this.request('/web', 'accounts.html')
      let accounts = await this.request('/web', 'rest/listAccounts', {}, copyHeaders(res, 'auth'));


      await this.wait(Duration.millis(500, 50));
      await this.request('/web', 'orders.html')
      let orders = await this.request('/web', 'rest/listOrders', {}, copyHeaders(res, 'auth'));

      await this.request('/web', 'purchase.html')
      let order = await this.request('/web', 'rest/placeOrder', {}, copyHeaders(res, 'auth'));

      await this.wait(Duration.millis(500, 50));
      await this.request('/web', 'shipping.html')
      let shipping = await this.request('/web', 'rest/trackOrder', {}, copyHeaders(res, 'auth'));
    } catch (e) {
      console.log(e.body);
    }
  }
}

export function ThreeTier(users:number, parallel:number, authHandler:AuthHandler) {

  let router = new Router([]);
  let clients = range(parallel).map(i => new Client(`client${i}`));

  let rest = LoadBalancer.from('rest', 4, name => new RestServer(name).setAuthHandler(authHandler));

  let web = LoadBalancer.from('web', 2, name => webServer(name).addProxy('rest', '/rest'));

  let session = new SessionServer('session', 4, 400);
  let db = new DbServer('db', 4, 400);

  router.addRoutes(
    ...clients.map(client => new Link(client, users, Duration.millis(100, 50))),
    new Link(session, 10000000, Duration.nanos(15, 2)),
    new Link(web, 10000000, Duration.nanos(15, 2)),
    new Link(rest, 10000000, Duration.nanos(50, 11)),
    new Link(db, 10000000, Duration.nanos(20, 5))
  );

  let source = new EventSource(clients, 'scenario', users);

  let sim = new Simulation(Resolution.NANOSECOND)
    .sub(web, rest, db, router, source, session, ...clients);

  NetworkManager.init(sim);

  return sim;
}
