import { Component, JSX } from 'preact';
import { useLib } from '../muffler/libs';

interface ProcMgmtState {}

export class ProcMgmt extends Component<{ encoded?: string }, ProcMgmtState> {
  render(props: { encoded?: string }, state: ProcMgmtState) {
    const [mgmtErr, mgmt] = useLib('process-mgmt');
    if (mgmtErr) return mgmtErr;
    const [brotliErr, brotli] = useLib('brotli-wasm');
    if (brotliErr) return brotliErr;

    return (
      <div>
        <h1>Proc Mgmt</h1>
        <p>Proc Mgmt</p>
      </div>
    );
  }
}
