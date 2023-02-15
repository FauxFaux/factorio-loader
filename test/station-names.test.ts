import { provideStationPurpose } from '../web/station-status';
import { initOnNode } from '../scripts/data-hack-for-node';

initOnNode();

test.each([
  '[item=duralumin] Duralumin Provide',
  'Iron Ore Provide',
  'Incubated Petri Dish Provide',
  'Useless Provide',
  'Auog Bonemeal Provide',
  'Chemical Science Pack Provide (from science!)',
  'Laboratory Instruments Provide',
  'High Power Resistors / Ceramic Capacitors / Air-Core Conductor Provide',
  'slaked lime Provide Station',
])('%s', (name) => {
  expect(provideStationPurpose(name)).toMatchSnapshot();
});
