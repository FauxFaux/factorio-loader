import { Component } from 'preact';

import { data } from '../datae';
import { ColonJoined, Recipe } from '../objects';
import { objToColon } from '../muffler/colon';

function stepsToUnlock(tech: string): number {
  const techData = data.technologies[tech];
  if (!techData) return 0;
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
      Object.values(data.technologies)
        .filter((tech) => tech.researched)
        .flatMap((tech) =>
          tech.unlocks.flatMap((recipe) =>
            data.recipes[recipe].products.flatMap((p) => objToColon(p)),
          ),
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
                    data.recipes[u].products.map((p) => objToColon(p)),
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
              <ColonJoined label={p} />
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
