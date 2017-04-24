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

import { JwtHandler } from "../../lib/network/jwt/handler";
import { webServer } from "../common/web";
import { Token } from "../../lib/network/jwt/token";
import { AuthHost, AuthHandler } from "../../lib/network/host/auth-host";
import { copyHeaders } from "../../lib/network/host/request-util";
import { NetworkManager } from "../../lib/network/network-manager";
import { SessionServer } from "../../lib/network/session/server";

type Credentials = { username : string, password: string };

class AuthRestServer extends AuthHost {
  async login(credentials:Request<Credentials>) {
    let [login, res] = await Promise.all([
      this.request('/authDb', 'loginQuery', credentials.body),
      this.request('/authDb', 'expiryQuery', credentials.body)
    ]);
    return login.body;
  }
}

class AccountRestServer extends AuthHost {
  async listAccounts(req:Request<any>) {
    return await this.request('/accountDb', 'listAccounts', {}, copyHeaders(req, 'auth'));
  }
}

class OrderRestServer extends AuthHost {
  async listOrders(req:Request<any>) {
    return await this.request('/orderDb', 'listOrders', {}, copyHeaders(req, 'auth'));
  }

  async placeOrder(req:Request<any>) {
    return await this.request('/orderDb', 'placeOrder', {}, copyHeaders(req, 'auth'));
  }
}

class TrackingRestServer extends AuthHost {
  async trackOrder(req:Request<any>) {
    return await this.request('/trackDb', 'trackOrder', {}, copyHeaders(req, 'auth'));
  }
}

class AuthDbServer extends Host {
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
}

class AccountDbServer extends Host {
  async listAccounts() {
    await this.wait(Duration.millis(250, 30));
    return [{id:getId('account')},{id:getId('account')}];
  }
}

class OrderDbServer extends Host {
  async listOrders() {
    await this.wait(Duration.millis(400, 30));
    return [{id:getId('order')},{id:getId('order')}]
  }

  async placeOrder() {
    await this.wait(Duration.millis(1000, 200));
    return {id:getId('order')};
  }
}

class TrackingDbServer extends Host {
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
      let res = await this.request('/web', 'authRest/login', { username : 'bob', password : 'bobpw' });

      await this.wait(Duration.millis(500, 50));

      let [accounts, orders] = await Promise.all([
        this.request('/web', 'accounts.html')
          .then(p => this.request('/web', 'accountRest/listAccounts', {}, copyHeaders(res, 'auth'))),
        this.request('/web', 'orders.html')
          .then(p => this.request('/web', 'orderRest/listOrders', {}, copyHeaders(res, 'auth')))]);

      await this.request('/web', 'purchase.html')
      let order = await this.request('/web', 'orderRest/placeOrder', {}, copyHeaders(res, 'auth'));

      await this.wait(Duration.millis(500, 50));
      await this.request('/web', 'shipping.html')
      let shipping = await this.request('/web', 'trackRest/trackOrder', {}, copyHeaders(res, 'auth'));
    } catch (e) {
      console.log(e.body);
    }
  }
}

export function Microservice(users:number, parallel:number, authHandler:AuthHandler) {
  let router = new Router([]);
  let clients = range(parallel).map(i => new Client(`client${i}`));

  let authRest = LoadBalancer.from('authRest', 4, name => new AuthRestServer(name).setAuthHandler(authHandler));
  let accountRest = LoadBalancer.from('accountRest', 4, name => new AccountRestServer(name).setAuthHandler(authHandler));
  let orderRest = LoadBalancer.from('orderRest', 4,  name => new OrderRestServer(name).setAuthHandler(authHandler));
  let trackingRest = LoadBalancer.from('trackRest', 4, name => new TrackingRestServer(name).setAuthHandler(authHandler));

  let rests = [authRest, accountRest, orderRest, trackingRest];

  let authDb = new AuthDbServer('authDb', 4, 400);
  let accountDb = new AccountDbServer('accountDb', 4, 400);
  let orderDb = new OrderDbServer('orderDb', 4, 400);
  let trackingDb = new TrackingDbServer('trackDb', 4, 400);

  let session = new SessionServer('session', 4, 400);
  let dbs = [authDb, accountDb, orderDb, trackingDb];

  let web = LoadBalancer.from('web', 2, name => 
    webServer(name)
      .addProxy('authRest', '/authRest')
      .addProxy('accountRest', '/accountRest')
      .addProxy('orderRest', '/orderRest')
      .addProxy('trackRest', '/trackRest'));

  router.addRoutes(
    ...clients.map(client => new Link(client, 100000, Duration.millis(100, 50))),
    new Link(session, 10000000, Duration.nanos(15, 2)),
    new Link(web, 10000000, Duration.nanos(15, 2)),
    ...rests.map(r => new Link(r, 10000000, Duration.nanos(50, 11))),
    ...dbs.map(r => new Link(r, 10000000, Duration.nanos(20, 5)))
  );

  let source = new EventSource(clients, 'scenario', users);

  let sim = new Simulation(Resolution.NANOSECOND)
    .sub(web, ...rests, ...dbs, router, source, session, ...clients)

  NetworkManager.init(sim);

  return sim;
} 