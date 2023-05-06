import { Component } from 'preact';
import { route } from 'preact-router';
import { ItemOrFluid } from '../objects';

export default class RedirectIof extends Component<{
  type: 'item' | 'fluid';
  name: string;
}> {
  componentWillMount() {
    route(`/an/detail/${this.props.type}:${this.props.name}`, true);
  }

  render() {
    return (
      <div>
        <p>
          This page is broken because this web framework cannot do a redirect to
          save its life, please click on the item again.
        </p>
        <p>
          <ItemOrFluid name={this.props.name} type={this.props.type} />
        </p>
        <p>I'm so sorry.</p>
      </div>
    );
  }
}
