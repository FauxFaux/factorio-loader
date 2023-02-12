import { provideStationPurpose } from '../web/station-status';
import { data } from '../web';
import { readFileSync } from 'fs';

for (const key of Object.keys(data)) {
  (data as any)[key] = JSON.parse(
    readFileSync(require.resolve(`../data/${key}.json`), { encoding: 'utf-8' }),
  );
}

test.each([
  '[item=duralumin] Duralumin Provide',
  'Iron Ore Provide',
  'Incubated Petri Dish Provide',
  'Useless Provide',
  'Auog Bonemeal Provide',
])('%s', (name) => {
  expect(provideStationPurpose(name)).toMatchSnapshot();
});
