import collections
import sys
import os
import math
from typing import Iterable, Tuple

(ox, oy) = (-14, -47)
(w, h) = (192, 128)


def main():
    state = collections.defaultdict(collections.Counter)
    for arg in sys.argv[1:]:
        basename = os.path.basename(arg)
        ty = os.path.splitext(basename)[0]
        content = open(arg).read()
        doc = map(lambda x: x.split('\036'), content.split('\035'))
        handler = handlers.get(ty, fallback)
        for line in doc:
            [x, y, _, name] = line[:4]
            (bx, by) = to_block(x, y)
            crap = line[4:]
            wanted = handler(name, crap)
            if wanted:
                state[(bx, by)][wanted] += 1

    for (block, items) in state.items():
        print(block)
        for (item, count) in items.items():
            print(f" * {item}: {count}")



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
