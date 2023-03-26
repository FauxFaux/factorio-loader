import { Component, ComponentChild, createRef } from 'preact';
import { data } from './datae';
import { ItemIcon, RenderIcons } from './lists';
import { ProductAmount } from './components/how-to-make';

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

export interface JColon {
  colon: string;
}

export interface JIngredient extends JColon {
  amount: number;
  minimum_temperature?: number;
  maximum_temperature?: number;
}

export type JProduct = JColon &
  ({ amount: number } | { amount_min: number; amount_max: number }) & {
    probability?: number;
    temperature?: number;
  };

export interface JRecipe {
  category: string;
  ingredients: JIngredient[];
  products: JProduct[];
  localised_name: string;
  producers: string[];
  time: number;
}

export class Recipe extends Component<{ name: string }, { expando?: boolean }> {
  render(
    props: { name: string },
    state: { expando?: boolean },
  ): ComponentChild {
    if (!props.name || props.name === 'undefined')
      return <span>nothing at all (nothing at all)</span>;
    const recipe = data.recipes.regular[props.name];
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
        <RecipeInOut name={props.name} />
      </p>
    );
  }
}

export class RecipeInOut extends Component<{ name: string }> {
  render(props: { name: string }) {
    const recipe = data.recipes.regular[props.name];
    if (!recipe) throw new Error(`unknown recipe: ${recipe}`);

    return (
      <div>
        Ingredients:
        <ul>
          {recipe.ingredients?.map((ing) => (
            <li>
              {ing.amount} * <ColonJoined colon={ing.colon} />
            </li>
          ))}
        </ul>
        Products:
        <ul>
          {recipe.products?.map((prod) => {
            return (
              <li>
                <ProductAmount product={prod} /> &times;{' '}
                <ColonJoined colon={prod.colon} />
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

export class ColonJoined extends Component<{ colon: string }> {
  render(props: { colon: string }) {
    const [type, name] = props.colon.split(':', 2);
    if (type === 'item' || type === 'fluid') {
      return (
        <span>
          <ItemIcon name={name} alt={name} />{' '}
          <ItemOrFluid type={type} name={name} />
        </span>
      );
    }
    return (
      <span>
        <i>{type}</i>: {name}
      </span>
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
      <a
        ref={this.ref}
        href={`/item/${props.name}`}
        class="item"
        data-bs-toggle="tooltip"
        title={`item ${props.name} (${item.stack_size})`}
      >
        {item.localised_name}
      </a>
    );
  }
}

export class Fluid extends Component<{ name: string }, {}> {
  render(props: { name: string }): ComponentChild {
    const fluid = data.fluids[props.name];
    if (!fluid) return <span class="error">UNKNOWN FLUID {props.name}</span>;

    return (
      <a
        class="fluid"
        data-bs-toggle="tooltip"
        href={`/fluid/${props.name}`}
        title={`fluid ${props.name}`}
      >
        {fluid.localised_name}
      </a>
    );
  }
}

export class BlockLine extends Component<{ block: string }> {
  render(props: { block: string }) {
    return (
      <span>
        <a href={'/block/' + props.block}>{props.block}</a> (
        <TagList tags={data.doc[props.block].tags} />)
      </span>
    );
  }
}

export class TagList extends Component<{ tags: string[] }> {
  render(props: { tags: string[] }) {
    return (
      <span>
        {[...new Set(props.tags)].sort().map((tag, i) => (
          <>
            <RenderIcons text={tag} />
            {i !== props.tags.length - 1 ? ', ' : ''}
          </>
        ))}
      </span>
    );
  }
}
