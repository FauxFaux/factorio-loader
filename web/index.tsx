import 'preact/debug';
import { render } from 'preact';

import hashes from '../dist/hashes.json';
import { App } from './app';
import { data, precompute } from './datae';

export function init(element: HTMLElement) {
  element.innerHTML = 'Loading ~10MB of unbundled JSON...';
  (async () => {
    await fillDataWithFetch();
    element.innerHTML = 'Data downloaded, reticulating splines...';
    precompute();
    element.innerHTML = 'Data downloaded, booting...';
    element.innerHTML = '';
    render(<App />, element);
  })().catch(async (e) => {
    const { serializeError } = await import('serialize-error');
    console.error(e);
    // really
    element.innerHTML = `<pre>${JSON.stringify(serializeError(e), null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`;
  });
}

async function fillDataWithFetch() {
  const get = async (url: string) => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failure: ${url}: ${resp.status}`);
    return await resp.json();
  };
  await Promise.all(
    (Object.keys(data) as (keyof typeof data)[]).map(async (k) => {
      const key = `${k}.json` as const;
      (data as any)[k] = await get(`../data/${key}?v=${hashes[key]}`);
    }),
  );
}

init(document.getElementById('app')!);
