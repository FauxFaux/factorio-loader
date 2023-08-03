import { Component, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { BrotliWasmType } from 'brotli-wasm';
import { serializeError } from 'serialize-error';

interface ProcMgmtState {}

export class ProcMgmt extends Component<{ encoded?: string }, ProcMgmtState> {
  render(props: { encoded?: string }, state: ProcMgmtState) {
    const []
    return (
      <div>
        <h1>Proc Mgmt</h1>
        <p>Proc Mgmt</p>
      </div>
    );
  }
}
