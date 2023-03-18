const [ox, oy] = [-16, -48];
export const BRICK_W = 192;
export const BRICK_H = 128;

export function removeOffset([x, y]: readonly [number, number]): readonly [
  number,
  number,
] {
  return [x - ox, y - oy];
}

export function toBlock([x, y]: readonly [number, number]) {
  x -= ox;
  y -= oy;
  const by = Math.floor(y / BRICK_H);
  if (Math.abs(by) % 2 == 1) {
    x -= BRICK_W / 2;
  }
  const bx = Math.floor(x / BRICK_W);

  return [bx, by] as const;
}

export function fromBlock([x, y]: readonly [number, number]): readonly [
  number,
  number,
] {
  x *= BRICK_W;
  if (Math.abs(y) % 2 == 1) {
    x += BRICK_W / 2;
  }
  y *= BRICK_H;
  x += ox;
  y += oy;
  return [x, y];
}

export function fromLoc(props: { loc: string }) {
  return fromBlock(
    props.loc.split(',').map((x) => parseInt(x)) as [number, number],
  );
}
