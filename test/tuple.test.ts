import { Tuple, Record } from '@bloomberg/record-tuple-polyfill';
test('tuples', () => {
  expect(Tuple(1, 2, 3)).toBe(Tuple(1, 2, 3));
  expect(Record({ a: 5, b: 3 })).toBe(Record({ a: 5, b: 3 }));
});
