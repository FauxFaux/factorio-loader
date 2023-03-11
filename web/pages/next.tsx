import { Component } from 'preact';

import { data } from '../datae.js';
import { ColonJoined, Recipe } from '../objects.js';
import { unlockedRecipes } from '../muffler/walk-techs.js';

export function techToUnlock(recipe: string): string | null {
  const found = Object.entries(data.technologies).find(([, tech]) =>
    tech.unlocks.includes(recipe),
  );
  if (found) return found[0];
  return null;
}

export function stepsToUnlockRecipe(recipe: string): number {
  const tech = techToUnlock(recipe);
  if (!tech) return 98;
  return stepsToUnlock(tech);
}

export function stepsToUnlock(tech: string): number {
  const techData = data.technologies[tech];
  if (!techData) return 99;
  if (techData.researched) return 0;
  if (techData.requires.length === 0) return 1;
  return techData.requires.map(stepsToUnlock).reduce((a, b) => a + b, 1);
}

export class Next extends Component<{}> {
  render() {
    const techs = Object.entries(data.technologies)
      .filter(([name, tech]) => !tech.researched)
      .sort(([a], [b]) => stepsToUnlock(a) - stepsToUnlock(b));

    const canMake = new Set(
      [...unlockedRecipes()].flatMap(
        (recipe) =>
          data.recipes.regular[recipe]?.products?.flatMap((p) => p.colon) ?? [],
      ),
    );

    // at 700 the browser/virtual dom crashes
    const limit = 200;
    return (
      <div>
        <h1>Next</h1>
        <table class={'table'}>
          <thead>
            <tr>
              <th>nth</th>
              <th>research name</th>
              <th>new items</th>
              <th>unlocked recipes</th>
            </tr>
          </thead>
          <tbody>
            {techs.slice(0, limit).map(([name, tech]) => {
              const products = [
                ...new Set(
                  tech.unlocks.flatMap((u) =>
                    data.recipes.regular[u].products.map((p) => p.colon),
                  ),
                ),
              ];
              const newProducts = products.filter(
                // (p) => (data.prodStats[p]?.output?.total ?? 0) === 0,
                (p) => !canMake.has(p),
              );
              return renderTechRow(name, tech, newProducts);
            })}
            <tr>
              <td colSpan={4}>...and {techs.length - limit} more</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

function renderTechRow(
  name: string,
  tech: { researched: boolean; requires: string[]; unlocks: string[] },
  newProducts: string[],
) {
  return (
    <tr>
      <td>
        {stepsToUnlock(name) === 1 ? (
          '1'
        ) : (
          <abbr
            title={tech.requires
              .filter((r) => !data.technologies[r].researched)
              .join(', ')}
          >
            {stepsToUnlock(name)}
          </abbr>
        )}
      </td>
      <td>{name}</td>
      <td>
        <ul>
          {newProducts.map((p) => (
            <li>
              <ColonJoined colon={p} />
            </li>
          ))}
        </ul>
      </td>
      <td>
        <ul>
          {tech.unlocks?.map((u) => {
            return (
              <li>
                <Recipe name={u} />
              </li>
            );
          })}
        </ul>
      </td>
    </tr>
  );
}
