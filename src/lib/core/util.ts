const ids = {};

export function getId(ns: string | { constructor: { name: string } }) {
  let name: string;
  if (typeof ns !== 'string') {
    name = ns.constructor.name;
  } else {
    name = ns;
  }

  if (!ids[name]) {
    ids[name] = 0;
  }
  return `${name}_${++ids[name]}`;
}

export function getPromiseId() {
  return getId('promise');
}

export function tagPromise(p: any, id?: string) {
  p['_pid'] = id || getId('promise');
  return p['_pid'];
}

export function logPromise(p: any, ...args: any[]) {
  console.error(p['_pid'], ...args);
}

export function range(a: number, b: number = 0) {
  if (b < a) {
    [a, b] = [b, a];
  }
  return ' '.repeat(b - a).split('').map((x, i) => i + a);
}

export function range1(a: number, b: number = 1) {
  return range(a + 1, b);
}