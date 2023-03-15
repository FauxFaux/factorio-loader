import { Component } from 'preact';
import * as blueprint from '../muffler/blueprints';
import { ColonJoined } from '../objects';

export class Chestify extends Component<{}, { input?: string }> {
  onInput = (e: any) => {
    this.setState({ input: e.target.value });
  };
  render(props: unknown, state: { input?: string }) {
    let output;
    let explain;
    if (state.input) {
      try {
        const bp = blueprint.decode(state.input);
        const items = blueprint.enumerate(bp);
        explain = Object.entries(items)
          .sort(([_, a], [__, b]) => b - a)
          .map(([name, count]) => (
            <li>
              {count} * <ColonJoined colon={name} />
            </li>
          ));

        const chesty = blueprint.toChest(bp, items);
        output = (
          <textarea
            class={'form-control big-boy'}
            readonly={true}
            value={blueprint.encode(chesty)}
          />
        );
      } catch (e) {
        console.error(e);
        explain = <div class={'alert alert-danger'}>{String(e)}</div>;
      }
    } else {
      explain = (
        <div class={'alert alert-info'}>
          Paste a blueprint string above and commit (i.e. lose focus)
        </div>
      );
    }

    return (
      <>
        <div class={'row'}>
          <div class={'col-6'}>
            <textarea
              class={'form-control big-boy'}
              onPaste={this.onInput}
              onChange={this.onInput}
            />
          </div>
          <div className={'col-6'}>{output}</div>
        </div>
        <div class={'row'}>
          <div class={'col-12'}>{explain}</div>
        </div>
      </>
    );
  }
}
