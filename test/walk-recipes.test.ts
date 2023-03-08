import { initOnNode } from '../scripts/data-hack-for-node';
import {
  buildMaking,
  buildMissingIngredients,
} from '../web/muffler/walk-recipes';
import { haveMade } from '../web/muffler/walk-techs';

initOnNode();

test('water', () => {
  const canMake = haveMade();
  const recipesMaking = buildMaking();

  expect(buildMissingIngredients(canMake, recipesMaking)).toMatchSnapshot();
});
