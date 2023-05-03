import { Component } from 'preact';
import { route } from 'preact-router';

export default class RedirectIof extends Component<{
  type: string;
  name: string;
}> {
  componentWillMount() {
    route(`/an/detail/${this.props.type}:${this.props.name}`, true);
  }

  render() {
    return null;
  }
}
