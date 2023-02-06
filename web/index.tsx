import { h, Fragment, render } from 'preact';

export function init(element: HTMLElement) {
  element.innerHTML = '';
  render(<h1>hello</h1>, element);
}
