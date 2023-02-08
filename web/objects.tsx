import { Component, ComponentChild, createRef } from 'preact';
import { data } from './index';

export interface JItem {
  group: { name: string };
  subgroup: { name: string };
  localised_name: string;
  stack_size: number;
  type: 'item' | 'module' | 'tool' | unknown;
  wire_count: number;
}

export interface JFluid {
  group: { name: string };
  subgroup: { name: string };
  localised_name: string;
}

export interface JIngredient {
  amount: number;
  name: string;
  type: 'item' | 'fluid';
}

export interface JProduct {
  amount: number;
  name: string;
  type: 'item' | 'fluid';
  probability?: number;
}

export interface JRecipe {
  category: string;
  ingredients: JIngredient[];
  products: JProduct[];
  localised_name: string;
}

export class Recipe extends Component<{ name: string }, { expando?: boolean }> {
  render(
    props: { name: string },
    state: { expando?: boolean },
  ): ComponentChild {
    if (!props.name || props.name === 'undefined')
      return <span>nothing at all (nothing at all)</span>;
    const recipe = data.recipes[props.name];
    if (!recipe) return <span class="error">UNKNOWN RECIPE {props.name}</span>;
    if (!state.expando)
      return (
        <abbr
          class="recipe"
          title={`${props.name} (${recipe.ingredients?.length} -> ${recipe.products?.length})`}
          onClick={() => {
            this.setState({ expando: true });
          }}
        >
          {recipe.localised_name}
        </abbr>
      );
    return (
      <p
        onClick={() => {
          this.setState({ expando: false });
        }}
      >
        <h4>{recipe.localised_name}</h4>
        Ingredients:
        <ul>
          {recipe.ingredients?.map((ing) => (
            <li>
              {ing.amount} * <ItemOrFluid type={ing.type} name={ing.name} />
            </li>
          ))}
        </ul>
        Products:
        <ul>
          {recipe.products?.map((prod) => {
            let statSuffix = '';
            if (prod.probability && prod.probability !== 1) {
              statSuffix = ` @ ${prod.probability * 100}%`;
            }
            return (
              <li>
                {prod.amount} *{' '}
                <ItemOrFluid type={prod.type} name={prod.name} />
                {statSuffix}
              </li>
            );
          })}
        </ul>
      </p>
    );
  }
}

export class ItemOrFluid extends Component<{
  name: string;
  type: 'item' | 'fluid';
}> {
  render(props: { name: string; type: 'item' | 'fluid' }): ComponentChild {
    switch (props.type) {
      case 'item':
        return <Item name={props.name} />;
      case 'fluid':
        return <Fluid name={props.name} />;
      default:
        throw new Error(`impossible item type: ${props.type}`);
    }
  }
}

export class Item extends Component<{ name: string }, {}> {
  ref = createRef();

  render(props: { name: string }): ComponentChild {
    const item = data.items[props.name];
    if (!item) return <span class="error">UNKNOWN ITEM {props.name}</span>;

    // this works at a JS level but the UI library seems to give up if you have more than like THREE
    // useEffect(() => new Tooltip(this.ref.current).dispose, [this.ref]);

    return (
      <abbr
        ref={this.ref}
        class="item"
        data-bs-toggle="tooltip"
        title={`item ${props.name} (${item.stack_size})`}
      >
        {item.localised_name}
      </abbr>
    );
  }
}

export class Fluid extends Component<{ name: string }, {}> {
  render(props: { name: string }): ComponentChild {
    const fluid = data.fluids[props.name];
    if (!fluid) return <span class="error">UNKNOWN FLUID {props.name}</span>;

    return (
      <abbr
        class="fluid"
        data-bs-toggle="tooltip"
        title={`fluid ${props.name}`}
      >
        {fluid.localised_name}
      </abbr>
    );
  }
}

export class IoFDetail extends Component<{
  name: string;
  type: 'item' | 'fluid';
}> {
  render(props: { name: string; type: 'item' | 'fluid' }) {
    const obj = (props.type === 'item' ? data.items : data.fluids)[props.name];
    if (!obj)
      return (
        <span>
          unknown {props.type} {props.name}
        </span>
      );

    const recipies = Object.entries(data.recipes).filter(
      ([, recipe]) =>
        undefined !==
        recipe.products.find(
          (prod) => prod.type === props.type && prod.name === props.name,
        ),
    );

    return (
      <div class="container-fluid">
        <h2>{obj.localised_name}</h2>
        <p>Type: {props.type}</p>
        <p>Internal name: {props.name}</p>
        <p>
          Group: {obj.group?.name}, subgroup: {obj.subgroup?.name}
        </p>
        <ul>
          {recipies.map(([name, recipe]) => (
            <li>
              <Recipe name={name} /> (<span class="font-monospace">{name}</span>
              ) from
              <ul class="list-group list-group-horizontal">
                {recipe.ingredients.map((ing) => (
                  <li class={'list-group-item'}>
                    <ItemOrFluid type={ing.type} name={ing.name} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}