import { decode } from '../web/muffler/blueprints';

test('blueprint decode', () => {
  const train =
    '0eNqdUk1rwzAM/StBZyfkY26awE7bpYfddiuluIlITR07OE66UvLfJzctK3QbbPhgS356T5bfGXZqwM5K7aA8g6yM7qFcn6GXjRbK59ypQyhBOmyBgRatj/YuVKYyrXFyRJgYSF3jB5TJtGGA2kkncSa6BKetHtodWgL8QMGgMz1VGe01iSlMM87gRIesiKOEL1JOMsZKIhQzLp7YA396z9+gRiur8Cgawv8msUyjYhEXWf4oEnH/upEyxhJWD0p9o5v9Tzfnf9Kl4fbVHutBXaf7NUEfJ3f38y/e2GA9SusGocL5Y5+V02GNnXGb4NVv1OVRSLclA9SXXmd+Yu+Exe3VBMYS7mYILSoSpiH4nKwOVJHF8bTxi81+Ke/sxUCJHZKl4EXYxgTvVkgdvB2C1YruRrT9pdN0mTzlRZrzhCfZIp6mTwVq34Y=';
  const smallPartsRequest =
    '0eNqFkEsOwjAMRO/idYqSQvjkKqhCpRiwlCalSRFVlbvjlI/YsRrZGr0Ze4KjHbDryUUwE1DjXQCznyDQxdU27+LYIRigiC0IcHWbJ+svFCI1RXPFEIsebwMr9pAEkDvhA4xKlQB0kSLhizkP48EN7ZGdRv2nCeh8YIB3uQlDy4UWMLLKheaot/NwJsv2V8on/ksPbW1t0dV9DIVUzGz8kM/VUqYql5xPMz+fEHBn2pxabtVqsys3Wmm1XMuUnj6OZkc=';
  expect(decode(train)).toMatchSnapshot();
  expect(decode(smallPartsRequest)).toMatchSnapshot();
});
