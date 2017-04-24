const heap = require('min-heap');

interface MinHeap<T> {
  new (comparator?: (l: T, r: T) => number): MinHeap<T>
  size: number;
  clear(): void;
  insert(item: T);
  contains(item: T): boolean;
  remove(item: T): boolean;
  removeHead(): T;
  _bubble(): any;
}

export function MinHeap<T>(comparator?: (l: T, r: T) => number) {
  return new heap(comparator) as MinHeap<T>;
}