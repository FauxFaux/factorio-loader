import { Component } from 'preact';
import { computed, data } from '../datae';
import { objToColon } from '../muffler/colon';
import { JRecipe, Recipe } from '../objects';

export class HowToMake extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const recpies = Object.entries(data.recipes).filter(
      ([, recipe]) =>
        undefined !==
        recipe.products.find((prod) => objToColon(prod) === props.colon),
    );

    return (
      <ul>
        {recpies
          .sort(([, a], [, b]) => usefulness(b) - usefulness(a))
          .map(([name, recipe]) => (
            <li>
              <Recipe name={name} />: {usefulness(recipe)}
            </li>
          ))}
      </ul>
    );
  }
}

function usefulness(recipe: JRecipe): number {
  let score = 0;

  score -= recipe.ingredients.length;
  score -= recipe.products.length;

  for (const ing of recipe.ingredients) {
    const scale = ing.amount ?? 1;
    const colon = objToColon(ing);

    if (ing.type === 'fluid') {
      score -= 1;
    }

    // it was shipped by ltn last simulation
    const ps = data.prodStats[colon];
    if ((ps?.ltn ?? 0) > 1e3 * scale) {
      score += 2;
    }

    // we've made a load of them
    if (ps?.output?.total ?? 0 > 1e4 * scale) {
      score += 1;
    }

    // we're making a load of them
    if (ps?.output?.perTime[3] ?? 0 > 1e2 * scale) {
      score += 1;
    }
  }

  for (const prod of recipe.products) {
    const colon = objToColon(prod);
    const scale = (prod.probability ?? 1) * (prod.amount ?? 1);

    if (prod.type === 'fluid') {
      score -= 1;
    }

    // it was shipped by ltn last simulation
    const ps = data.prodStats[colon];
    if ((ps?.ltn ?? 0) > 1e3 * scale) {
      score += 2;
    }

    // we've made a load of them
    if (ps?.input?.total ?? 0 > 1e4 * scale) {
      score += 1;
    }

    // we're making a load of them
    if (ps?.input?.perTime[3] ?? 0 > 1e2 * scale) {
      score += 1;
    }
  }

  return score;
}
