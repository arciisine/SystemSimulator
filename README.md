# SystemSimulator

The system simulator framework is a set of tools to properly emulate the performance of distributed applications, and the interplay between multiple nodes within the application.  This framework mimics networking to allow for simulation of latency costs, and has primitive support for routers, loadbalancers, and more.

## Getting started

Ensure NodeJS 7.0.0 or higher is installed

Install local dependencies, run `npm i`
Install global dependencies, run `npm i -g ts-node`

To run a simulation, run `ts-node src/test/<name>.ts`

## A Sample Setup

To use the simulator, you need to model your application appropriately (including setting up the networking between the nodes).

A very simple application (similar to a basic PHP application) 

```ts
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
```

As you can see, the Server and Client have to be defined and given their logic.  Atop that the router and the interconnects need to be organized as well.

Once all of the configuration is established, the simulation is created, and all sub resources are registered. This registration allows for proper event propagation and removes the need for any global variables that would prohibit running multiple simulations.

And finally, we need to establish the networking manager within the simulation.  Instead of requiring each node to pass the network manager in as a constructor param, we realy upon dependency injection to allow all nodes in the same simulation to receive the same network manager. Something of note, is that in lieu of using IP address or hostnames, a URI is provided to each node in the simulation.  This allows for directing requests at specific nodes or even sub resources on a node (think applications living on a host).  This separates out the targeting and lookup process apart from the networking subsystem.

Once this is done, the simulation is ready to run. Enjoy!
