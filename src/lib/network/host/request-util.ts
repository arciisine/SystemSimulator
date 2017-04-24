import { Request } from "./request";

export function copyHeaders(req: Request<any>, ...keys: string[]) {
  let out = {};
  for (let k of keys) {
    if (req.headers[k]) {
      out[k] = req.headers[k];
    }
  }
  return out;
}