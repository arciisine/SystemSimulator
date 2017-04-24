import { Node } from "./node";
import { Duration, Resolution } from "../core/duration";

export class Link {
  public weight: number;

  constructor(
    public destination: Node,
    public bandwidth: number, // bits per second
    public latency: Duration
  ) {
    let samples = 10;
    this.weight = Duration.resolveValue(this.latency, Resolution.NANOSECOND);
  }
}