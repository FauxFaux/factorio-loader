import { Component } from 'preact';
import { data } from '../datae';
import { BlockLine } from '../objects';
import { BlockThumb } from './map';
import { humanise } from '../muffler/human';
import { GpsLink } from '../lists';
import { fromLoc } from '../../scripts/magic';

export class Resources extends Component<{ resource?: string }> {
  render(props: { resource?: string }) {
    const resource = props.resource;
    if (!resource) {
      const totals: Record<string, number> = {};
      const bricks: Record<string, number> = {};
      for (const { resources } of Object.values(data.doc)) {
        for (const [name, amount] of Object.entries(resources)) {
          totals[name] = (totals[name] ?? 0) + amount;
          bricks[name] = (bricks[name] ?? 0) + 1;
        }
      }

      return (
        <div className="row">
          <div className="col">
            <h2>Resources</h2>
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Amount</th>
                  <th>Locations</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals)
                  .sort(([, a], [, b]) => a - b)
                  .map(([name, amount]) => (
                    <tr>
                      <td>
                        <a href={`/an/resources/${name}`}>{name}</a>
                      </td>
                      <td>{humanise(amount)}</td>
                      <td>{bricks[name]}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const hits = Object.entries(data.doc)
      .map(([name, { resources }]) => [name, resources[resource] ?? 0] as const)
      .filter(([, amount]) => amount > 0);

    return (
      <div className="row">
        <div className="col">
          <h2>Resource: {resource}</h2>
          <table className="table table-sm table-striped">
            <thead>
              <tr>
                <th>Map</th>
                <th>Brick</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {hits
                .sort(([, a], [, b]) => b - a)
                .map(([name, amount]) => {
                  const [bx, by] = fromLoc({ loc: name });
                  return (
                    <tr>
                      <td>
                        <BlockThumb loc={name} />
                      </td>
                      <td>
                        <GpsLink
                          caption={`brick ${name}`}
                          gps={[bx + 192 / 2, by + 128 / 2]}
                        />
                        <BlockLine block={name} />
                      </td>
                      <td>{humanise(amount)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
