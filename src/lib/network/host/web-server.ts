import { Duration } from "../../core/duration";
import { Request } from "./request";
import { Proxy } from "./proxy";
import { Event } from "../../core/event";

export class WebServer extends Proxy {

  private files: Map<string, string> = new Map();

  addFile(name: string, body?: string) {
    this.files.set(name, body || name);
    return this;
  }

  addFiles(...files: ({ name: string, body?: string } | string)[]) {
    for (let file of files) {
      if (typeof file === 'string') {
        this.files.set(file, file);
      } else {
        this.files.set(file.name, file.body || file.name);
      }
    }
    return this;
  }

  async getFile(name: string) {
    await this.wait(Duration.millis(15, 5));
    return this.files.get(name);
  }

  invoke(req: Event) {
    if (req instanceof Request && this.files.has(req.action)) {
      return this.getFile(req.action);
    } else {
      return super.invoke(req);
    }
  }
}