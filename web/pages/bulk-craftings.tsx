import { Component } from 'preact';
import { useQuery } from 'preact-fetching';
import { cacheableNow, STATUS_ORDER } from './craftings';
import { Coord, data } from '../datae';
import { Colon } from '../muffler/colon';
import { RecipeName } from '../muffler/walk-recipes';
import { Status } from './current-chain';
import { ColonJoined } from '../objects';
import { GpsLink } from '../lists';
import { isBuilding } from './recipes';

interface State {}

export class BulkCraftings extends Component<{}, State> {
  render(props: {}, state: State) {
    const now = cacheableNow();
    const url = `https://facto-exporter.goeswhere.com/api/bulk-status?__cachebust=${now}`;
    const {
      isLoading,
      isError,
      error,
      data: fetched,
    } = useQuery(url, async () => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch failure: ${resp.status}`);

      interface Body {
        statuses: [number, [number, number, number, number]][];
      }

      const body: Body = await resp.json();
      return {
        statuses: Object.fromEntries(body.statuses),
      };
    });
    if (isLoading) {
      return <div>Loading...</div>;
    }
    if (isError || !fetched) {
      console.error(error);
      return <div class={'alert alert-danger'}>ERROH: {error}</div>;
    }

    const recipeMakes: Record<RecipeName, Colon[]> = Object.fromEntries(
      Object.entries(data.recipes.regular).map(([name, recipe]) => [
        name,
        recipe.products.map((p) => p.colon),
      ]),
    );

    type Unit = number;

    const productUnits: Record<Colon, Unit[]> = {};

    const unitNames: Record<
      Unit,
      { machine: string; recipe: RecipeName; pos: Coord }
    > = {};

    for (const [_loc, { asms }] of Object.entries(data.doc)) {
      for (const [machine, recipe, _modules, pos, unit] of asms) {
        if (!recipe || !recipeMakes[recipe]) continue;
        for (const colon of recipeMakes[recipe]) {
          if (isBuilding(colon)) continue;
          if (!productUnits[colon]) productUnits[colon] = [];
          productUnits[colon].push(unit);
        }
        unitNames[unit] = { machine, recipe, pos };
      }
    }

    /*
      (unit, (
       s.produced_change,
       s.last_status_change,
       s.last_status,
       s.previous_status,
      ))
     */

    const entries = Object.entries(productUnits).map(([colon, units]) => {
      const have = units
        .map((u) => [u, ...(fetched.statuses[u] ?? [])])
        .filter((s) => s.length > 1);

      const lastProduced = Math.max(
        ...have
          .map(([, producedChanged]) => producedChanged)
          .filter((x) => x > 0),
      );
      const bestStatus = Math.min(
        ...have.map(([, , , status]) => status).filter((x) => x > 0),
      );
      const statusTransTime = Math.max(
        ...have
          .filter(
            ([, , , status, statusChange]) =>
              status === bestStatus && !!statusChange,
          )
          .map(([, , statusChange]) => statusChange),
      );
      const exemplar = have.find(
        ([, , statusChange, status]) =>
          status === bestStatus && statusChange === statusTransTime,
      );

      return {
        colon,
        lastProduced,
        bestStatus,
        statusTransTime,
        exemplar,
      };
    });

    const statusSort = (status: number) => {
      const proposal = STATUS_ORDER.indexOf(status);
      if (proposal === -1) return STATUS_ORDER.length + status;
      return proposal;
    };

    const ts = (v: number | undefined) => {
      if (!v) return '??';
      if (v < 0) return 'never';
      if (v === Infinity) return 'always';
      return new Date(v * 1000).toTimeString().slice(0, 5);
    };

    entries.sort(
      (a, b) =>
        statusSort(b.bestStatus) - statusSort(a.bestStatus) ||
        a.lastProduced - b.lastProduced ||
        a.statusTransTime - b.statusTransTime,
    );

    return (
      <table class={'table'}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Last made</th>
            <th>Least broken status</th>
            <th>Status transition</th>
            <th>Previous status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(
            ({
              colon,
              lastProduced,
              bestStatus,
              statusTransTime,
              exemplar,
            }) => {
              const [
                unit,
                _producedChanged,
                _lastStatusChange,
                _lastStatus,
                previousStatus,
              ] = exemplar || [];
              return (
                <tr>
                  <td>
                    <ColonJoined colon={colon} />
                  </td>
                  <td>{ts(lastProduced)}</td>
                  <td>
                    <Status status={bestStatus} />
                  </td>
                  <td>{ts(statusTransTime)}</td>
                  <td>
                    {unit ? (
                      <GpsLink
                        caption={unitNames[unit].machine}
                        gps={unitNames[unit].pos}
                      />
                    ) : null}
                  </td>
                  <td>
                    <Status status={previousStatus} />
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    );
  }
}
