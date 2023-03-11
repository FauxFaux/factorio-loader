import { initOnNode } from '../scripts/data-hack-for-node.js';
import {
  buildMaking,
  buildMissingIngredients,
} from '../web/muffler/walk-recipes.js';
import { haveMade } from '../web/muffler/walk-techs.js';

initOnNode();

test('water', () => {
  const canMake = haveMade();
  const recipesMaking = buildMaking();

  expect(buildMissingIngredients(canMake, recipesMaking)).toMatchSnapshot();
});
