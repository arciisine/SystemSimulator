import { Resource } from "./resource";
import { Event } from "./event";

export function MethodPrefix(fn: (this: Resource, req: Event) => Promise<any>) {
  return (cls: any) => {
    for (let k of Object.getOwnPropertyNames(cls.prototype)) {
      if (k !== 'constructor') {
        let clsFn = cls.prototype[k];
        cls.prototype[k] = function (event: Event) {
          return fn.call(this, event).then(() => clsFn.call(this, event));
        };
      }
    }
    return cls;
  };
}

export function Prefix(fn: (this: Resource, req: Event) => Promise<any>) {
  return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    let orig = target[propertyKey];
    descriptor.value = function (event: Event) {
      return fn.call(this, event).then(() => orig.call(this, event));
    };
    return descriptor;
  };
}