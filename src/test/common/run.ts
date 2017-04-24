import { JwtHandler } from "../../lib/network/jwt/handler";
import { SessionHandler } from "../../lib/network/session/handler";
import { Simulation } from "../../lib/core/simulation";
import { AuthHandler } from "../../lib/network/host/auth-host";
import { Duration, Resolution } from "../../lib/core/duration";

const increments = [10, 100, 1000, 5000, 10000];

export async function run(builder: (users: number, parallel: number, handler: AuthHandler) => Simulation) {
  for (let { handler, name } of [{ handler: SessionHandler, name: 'session' }, { handler: JwtHandler, name: 'jwt' }]) {
    for (let k of increments) {
      let par = Math.max(1, Math.trunc(Math.sqrt(k)));
      let sim = builder(k, par, handler)

      await sim.run();
      console.log([builder.name, name, k, par, Math.trunc((sim.time / k) / 10 ** 6)].map(x => `${x}`).join('\t'));
    }
  }
}