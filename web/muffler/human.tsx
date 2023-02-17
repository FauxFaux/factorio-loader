export function humaniseNo(count: number): string {
  if (count > 1e6)
    return (
      (count / 1e6).toLocaleString('en', { maximumFractionDigits: 0 }) + 'M'
    );
  if (count > 1e3)
    return (
      (count / 1e3).toLocaleString('en', { maximumFractionDigits: 0 }) + 'k'
    );
  return count.toLocaleString('en', { maximumFractionDigits: 0 });
}

export function humanise(count: number) {
  if (count > 1e6)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e6).toFixed() + 'M'}
      </abbr>
    );
  if (count > 1e3)
    return (
      <abbr
        title={`${count.toLocaleString('en', { maximumFractionDigits: 0 })}`}
      >
        {(count / 1e3).toFixed() + 'k'}
      </abbr>
    );
  return <abbr title="just a piddly digit">{count}</abbr>;
}
