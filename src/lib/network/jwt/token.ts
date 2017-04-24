import { getId } from '../../core/util';
import { Duration } from "../../core/duration";

export class Token {
  id: string;

  constructor(
    size: number,
    algo: string
  ) {
    this.id = getId('token');
  }

  get duration(): Duration {
    return Duration.micros(800, 20);
  }
}