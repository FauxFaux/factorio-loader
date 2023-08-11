import { Component, JSX } from 'preact';
import _maxBy from 'lodash/maxBy';

import { makeUpRecipe, recipeBan, RecipeName } from '../muffler/walk-recipes';
import { actualSpeed, effectsOf, PickRecipe } from './plan';
import { Colon } from '../muffler/colon';
import { route } from 'preact-router';
import { ColonJoined, FRecipe } from '../objects';
import { computed, data } from '../datae';
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
    const input = (props.recipes ?? '').split(',').filter((x) => x);

    const recipes: FRecipe[] = input
      .map((name) => makeUpRecipe(name))
      .filter((recp): recp is FRecipe => !!recp);

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
    for (const recipe of recipes) {
      const us = byRecp[recipe.name].action;
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

    const rows = recipes.map((recipe, i) => {
      return (
        <tr>
          <td>
            <button
              class="btn btn-sm"
              onClick={() => {
                const existing = input.filter((x) => x !== recipe.name);
                this.setRecipes(existing);
              }}
            >
              ➖
            </button>
          </td>
          <td>
            {recipe.localisedName} ({recipe.name})
          </td>
          <td>{byRecp[recipe.name].assemblers}</td>
          <td>{(statuses[i].eff * 100).toFixed(0)}%</td>
          <td>{statuses[i].msg}</td>
          <td>
            <ActionPill
              action={actionMul(byRecp[recipe.name].action, statuses[i].eff)}
            />
          </td>
        </tr>
      );
    });

    const condemned = input
      .filter((name) => name.startsWith('condemn:'))
      .map((name) => name.slice('condemn:'.length));

    const missing = Object.entries(soFar)
      .filter(([, count]) => count < 0)
      .filter(([colon]) => !condemned.includes(colon))
      .sort(([, a], [, b]) => a - b);

    const missingRows = missing.map(([colon, count]) => {
      const bad = (name: RecipeName) => byRecp?.[name]?.action[colon] ?? 0;
      const interestingRecipes = computed.recipes
        .filter((r) => !recipeBan(r.name))
        .filter((recipe) =>
          recipe.products.some((product) => product.colon === colon),
        )
        .filter((r) => !recipes.some((already) => r.name === already.name))
        .filter((r) => bad(r.name) > 0);

      const maxRecipes = 5;
      // const dropped = interestingRecipes.length - maxRecipes;

      const makers = interestingRecipes
        .slice(0, maxRecipes)
        .sort((a, b) => bad(b.name) - bad(a.name))
        .map((recp) => (
          <tr>
            <td>
              <button
                class="btn btn-sm"
                onClick={() => this.setRecipes([...input, recp.name])}
              >
                ➕
              </button>
            </td>
            <td>
              {' '}
              {recp.localisedName} <span class={'text-muted'}>{recp.name}</span>
            </td>
            <td>
              <ActionPill action={byRecp[recp.name].action} />
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
              onClick={() => this.setRecipes([...input, `condemn:${colon}`])}
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
