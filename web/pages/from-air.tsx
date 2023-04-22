import { Component } from 'preact';
import { ingredients, RecipeName } from '../muffler/walk-recipes';
import { data } from '../datae';
import { Colon, fromColon, splitColon } from '../muffler/colon';
import { ColonJoined, Recipe } from '../objects';
import { ItemIcon } from '../lists';

export class FromAir extends Component {
  render() {
    const had: Record<Colon, RecipeName> = {};
    const steps: (typeof had)[] = [];
    for (let i = 0; i < 20; i++) {
      const have: Record<Colon, RecipeName> = {};
      for (const [name, recipe] of Object.entries(data.recipes.regular)) {
        if (/biomass-(?:saps|.*-spore)/.test(name)) continue;
        if (ingredients(name).every((ing) => ing.colon in had)) {
          for (const product of recipe.products) {
            if (!(product.colon in had)) {
              have[product.colon] = name;
            }
          }
        }
      }
      if (Object.keys(have).length === 0) break;
      steps.push(have);
      for (const colon of Object.keys(have)) {
        had[colon] = have[colon];
      }
    }

    return (
      <div class={'col'}>
        <table class={'table'}>
          <thead>
            <tr>
              <th>Step</th>
              <th>Colon</th>
              <th>Recipe</th>
              <th>Ingredients</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, i) =>
              Object.entries(step).map(([colon, recipe]) => (
                <tr>
                  <td>{i + 1}</td>
                  <td>
                    <ColonJoined colon={colon} />
                  </td>
                  <td>
                    {recipe === 'environment' ? (
                      'found'
                    ) : (
                      <Recipe name={recipe} />
                    )}
                  </td>
                  <td>
                    {ingredients(recipe).map((ing) => (
                      <ItemIcon
                        name={splitColon(ing.colon)[1]}
                        alt={fromColon(ing.colon)[1].localised_name}
                      />
                    ))}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    );
  }
}
