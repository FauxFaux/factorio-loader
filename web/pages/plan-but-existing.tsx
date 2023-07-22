import { Component, JSX } from 'preact';
import _maxBy from 'lodash/maxBy';

import { makeUpRecipe, recipeBan, RecipeName } from '../muffler/walk-recipes';
import { actualSpeed, effectsOf, PickRecipe } from './plan';
import { Colon } from '../muffler/colon';
import { route } from 'preact-router';
import { ColonJoined, JRecipe } from '../objects';
import { data } from '../datae';
import { Action, ActionPill } from './block';
import { actionMakes } from './peakers';
import { humanise } from '../muffler/human';

interface Props {
  recipes?: string;
}

interface State {
  pickProduce?: Colon;
}

export class PlanButExisting extends Component<Props> {
  render(props: Props, state: State) {
    const input = (props.recipes ?? '')
      .split(',')
      .filter((x) => x);

    const recipes: [RecipeName, JRecipe][] = input
      .map((name) => [name, makeUpRecipe(name)] as const)
      .filter((pair): pair is [RecipeName, JRecipe] => !!pair[1]);

    const byRecp: Record<RecipeName, { assemblers: number; action: Action }> =
      {};
    for (const obj of Object.values(data.doc)) {
      for (const [factory, recipeName, modules] of obj.asms) {
        if (!recipeName) continue;
        const recp = makeUpRecipe(recipeName);
        if (!recp) continue;
        if (!byRecp[recipeName])
          byRecp[recipeName] = {
            assemblers: 0,
            action: {},
          };
        const into = byRecp[recipeName];
        into.assemblers += 1;
        const scale = actualSpeed(factory, modules) / recp.time;
        for (const [colon, count] of Object.entries(effectsOf(recp, scale))) {
          into.action[colon] = (into.action[colon] ?? 0) + count;
        }
      }
    }

    const statuses: {
      eff: number;
      msg: JSX.Element;
    }[] = [];
    const soFar: Action = {};
    for (const [name, recipe] of recipes) {
      const us = byRecp[name].action;
      const ourProducts = actionMakes(us);
      const relevantProducts = ourProducts.filter((colon) =>
        Object.keys(soFar).includes(colon),
      );
      if (0 === relevantProducts.length) {
        statuses.push({
          eff: 1,
          msg: <>makes nothing relevant; assuming wanted for later</>,
        });
      } else {
        const picked = _maxBy(
          relevantProducts.map((colon) => {
            const weMake = us[colon];
            if (soFar[colon] < 0) {
              const theyWant = -soFar[colon];
              const eff = Math.min(1, theyWant / weMake);
              return {
                eff,
                msg: (
                  <>
                    makes {weMake} {colon} but they want {theyWant}
                  </>
                ),
              };
            }

            return {
              eff: 0,
              msg: <>already no demand for {colon}</>,
            };
          }),
          (v) => v.eff,
        );

        statuses.push(picked!);
      }
      const ourEff = statuses[statuses.length - 1].eff;
      for (const [colon, count] of Object.entries(us)) {
        soFar[colon] = (soFar[colon] ?? 0) + count * ourEff;
      }
    }

    const rows = recipes.map(([name, recipe], i) => {
      return (
        <tr>
          <td>
            <button
              class="btn btn-sm"
              onClick={() => {
                const existing = input.filter((x) => x !== name);
                this.setRecipes(existing);
              }}
            >
              ➖
            </button>
          </td>
          <td>
            {recipe.localised_name} ({name})
          </td>
          <td>{byRecp[name].assemblers}</td>
          <td>{(statuses[i].eff * 100).toFixed(0)}%</td>
          <td>{statuses[i].msg}</td>
          <td>
            <ActionPill
              action={actionMul(byRecp[name].action, statuses[i].eff)}
            />
          </td>
        </tr>
      );
    });

    const condemned = input.filter((name) => name.startsWith('condemn:'))
      .map((name) => name.slice('condemn:'.length));

    const missing = Object.entries(soFar)
      .filter(([, count]) => count < 0)
      .filter(([colon]) => !condemned.includes(colon))
      .sort(([, a], [, b]) => a - b);

    const missingRows = missing.map(([colon, count]) => {
      const bad = (name: RecipeName) => byRecp?.[name]?.action[colon] ?? 0;
      const interestingRecipes = Object.entries(data.recipes.regular)
        .filter(([name]) => !recipeBan(name))
        .filter(([, recipe]) =>
          recipe.products.some((product) => product.colon === colon),
        )
        .filter(([name]) => !recipes.some(([already]) => name === already))
        .filter(([name]) => bad(name) > 0);

      const maxRecipes = 5;
      const dropped = interestingRecipes.length - maxRecipes;

      const makers = interestingRecipes
        .slice(0, maxRecipes)
        .sort(([a], [b]) => bad(b) - bad(a))
        .map(([name, recp]) => (
          <tr>
            <td>
            <button
              class="btn btn-sm"
              onClick={() =>
                this.setRecipes([...input, name])
              }
            >
              ➕
            </button>
            </td>
            <td>
              {' '}
              {recp.localised_name} <span class={'text-muted'}>{name}</span>
            </td>
            <td>
              <ActionPill action={byRecp[name].action} />
            </td>
          </tr>
        ));

      const rowSpan = makers.length + 1;

      const firstRow = (
        <tr>
          <td rowSpan={rowSpan}>{humanise(-count)}</td>
          <td rowSpan={rowSpan}>
            <ColonJoined colon={colon} />
          </td>
          <td colSpan={3}>
            <button
              class="btn btn-sm btn-secondary"
              onClick={() =>
                this.setRecipes([...input, `condemn:${colon}`])
              }
            >
              CONDEMN
            </button>
          </td>
        </tr>
      );

      return [firstRow, ...makers];
    });

    return (
      <>
        <h3>Current production chain</h3>
        <table class={'table'}>
          <thead />
          <tbody>{rows}</tbody>
        </table>
        <h3>Missing items</h3>
        <table class={'table'}>
          <tbody>{missingRows}</tbody>
        </table>
        <PickRecipe
          setColon={(pickProduce?: Colon) => this.setState({ pickProduce })}
          puck={(next: RecipeName) => {
            this.setState({ pickProduce: undefined });
            this.setRecipes([...input, next]);
          }}
          colon={state.pickProduce}
        />
      </>
    );
  }

  setRecipes(recipes: RecipeName[]) {
    route(`/an/plan-but-existing/${recipes.join(',')}`);
  }
}

export function actionMul(action: Action, num: number): Action {
  const ret: Action = {};
  for (const [colon, count] of Object.entries(action)) {
    ret[colon] = count * num;
  }
  return ret;
}

export function actionPlus(left: Action, right: Action): Action {
  const ret: Action = { ...left };
  for (const [colon, count] of Object.entries(right)) {
    ret[colon] = (ret[colon] ?? 0) + count;
  }
  return ret;
}
