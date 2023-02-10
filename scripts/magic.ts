const [ox, oy] = [-14, -47];
const [w, h] = [192, 128];

export function toBlock([x, y]: readonly [number, number]) {
  x -= ox;
  y -= oy;
  const by = Math.floor(y / h);
  if (Math.abs(by) % 2 == 1) {
    x -= w / 2;
  }
  const bx = Math.floor(x / w);

  return [bx, by] as const;
}

export function fromBlock([x, y]: readonly [number, number]): readonly [
  number,
  number,
] {
  x *= w;
  if (Math.abs(y) % 2 == 1) {
    x += w / 2;
  }
  y *= h;
  x += ox;
  y += oy;
  return [x, y];
}
