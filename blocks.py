import collections
import sys
import os
import math
from typing import Iterable, Tuple

(ox, oy) = (-14, -47)
(w, h) = (192, 128)


def main():
    base = sys.argv[1]
    state = collections.defaultdict(dict)
    for block, name, _ in load(base, 'tags'):
        state[block]['tags'].append(name)

    for (block, items) in state.items():
        print(block)
        for (item, count) in items.items():
            print(f" * {item}: {count}")


def load(base: str, kind: str):
    content = open(os.path.join(base, f"{kind}.rec")).read()
    for line in map(lambda x: x.split('\036'), content.split('\035')):
        [x, y, _, name] = line[:4]
        block = to_block(x, y)
        ext = line[4:]
        yield block, name, ext


def fallback(name: str, rest: list):
    return None


def assembler(name: str, rest: list):
    if len(rest) > 0:
        return 'ass', name, rest[0]
    return 'ass', name, None


def tags(name: str, _: list):
    return 'tag', name


def to_block(x: float, y: float) -> Tuple[int, int]:
    """
    >>> to_block(0, 0)
    (0, 0)
    >>> to_block(-200, 0)
    (-1, 0)
    >>> to_block(-20, 0)
    (-1, 0)
    >>> to_block(-100, 100)
    (-1, 1)
    >>> to_block(-120, 100)
    (-2, 1)
    >>> to_block(100, 100)
    (0, 1)
    """
    x = float(x)
    y = float(y)
    x -= ox
    y -= oy
    by = math.floor(y / h)
    if abs(by) % 2 == 1:
        x -= w / 2
    bx = math.floor(x / w)

    return bx, by


handlers = {
    "assembling-machine": assembler,
    "tags": tags,
}

if __name__ == '__main__':
    main()
