import { Component } from 'preact';

import { data } from '../datae';
import { Recipe } from '../objects';

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
    return (
      <div>
        <h1>Next</h1>
        <ul>
          {techs.map(([name, tech]) => (
            <li>
              {stepsToUnlock(name)}: {name} requires{' '}
              {tech.requires
                .filter((r) => !data.technologies[r].researched)
                .join(', ')}
              {tech.unlocks?.map((u) => {
                const recipe = data.recipes[u];
                recipe.ingredients;
                return <Recipe name={u} />;
              })}
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
