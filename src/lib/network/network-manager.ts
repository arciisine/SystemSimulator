import { Node } from "./node";
import { MinHeap } from "../core/min-heap";
import { Simulation } from "../core/simulation";

const inf = Number.POSITIVE_INFINITY;

export class NetworkManager {

  static init(sim: Simulation) {
    sim.broadcast('onNetworkInit', new NetworkManager());
    return sim;
  }

  private NODES = new Set<Node>();

  private ROUTE_CACHE = new Map<string, Node[]>()
  private LOOKUP: Map<string, Node>;
  private ROUTERS: Set<Node>;

  forceRefresh() {
    this.ROUTE_CACHE.clear();
    delete this.LOOKUP;
    delete this.ROUTERS;
  }

  register(node: Node) {
    this.NODES.add(node);
  }

  private computeLookup() {
    if (!this.LOOKUP) {
      let m = this.LOOKUP = new Map<string, Node>();
      for (let n of this.NODES) {
        m.set(n.uri, n);
      }
    }
  }

  private computeRouters() {
    if (!this.ROUTERS) {
      let s = this.ROUTERS = new Set<Node>();
      for (let n of this.NODES) {
        if (n.routable) {
          s.add(n);
        }
      }
    }
  }

  lookup(uri: string) {
    this.computeLookup();
    return this.LOOKUP.get(uri);
  }

  getRouters() {
    this.computeRouters();
    return this.ROUTERS;
  }

  calculateRoute(src: Node, dest: string) {

    let end = this.lookup(dest);

    if (!end) {
      throw new Error(`Unknown node: ${dest}`);
    }

    let dist = new Map<Node, number>();
    let prev = new Map<Node, Node>();
    let q = MinHeap<Node>((a, b) => {
      let [c, d] = [dist.get(a), dist.get(b)];
      if (c === inf && d === inf) {
        return 0;
      } else if (c === inf || d === inf) {
        return c === inf ? 1 : -1;
      } else {
        return c - d;
      }
    });

    //Prime router with src/dest and routable nodes
    Array
      .from(this.getRouters())
      .concat([src, end])
      .forEach(n => {
        dist.set(n, n === src ? 0 : inf);
        q.insert(n);
      });

    //Loop through all routers
    while (q.size > 0) {
      let u = q.removeHead();
      for (let n of u.links) {
        let v = n.destination;
        let alt = dist.get(u) + n.weight;
        if (alt < dist.get(v)) {
          dist.set(v, alt);
          prev.set(v, u);
          q.remove(v);
          q.insert(v);
        }
      }
    }

    let route: Node[] = [end];
    while (prev.has(route[0])) {
      route.unshift(prev.get(route[0]));
    }
    return route;
  }

  getRoute(src: Node, dest: string) {
    let key = `${src.uri}~~${dest}`;
    if (!this.ROUTE_CACHE.has(key)) {
      this.ROUTE_CACHE.set(key, this.calculateRoute(src, dest));
    }
    return this.ROUTE_CACHE.get(key);
  }

  getNextHop(src: Node, dest: string) {
    let out = this.getRoute(src, dest);
    return out[1];
  }
}