import { Component } from 'preact';
import Router from 'preact-router';
import { createHashHistory } from 'history';

import { WhatTheBrick } from './pages/what-the-brick';
import { StationStatus } from './pages/station-status';
import { IoFDetail } from './pages/objects';
import { BlockPage } from './pages/block';
import { Map } from './pages/map';

import { LtnTree } from './ltn-tree';
import { ItemList, StationList } from './lists';

import 'leaflet/dist/leaflet.css';
import './main.css';
import { Next } from './pages/next';
import { Pulses } from './pages/pulses';
import { Chestify } from './pages/chestify';

export class App extends Component {
  render() {
    return (
      <div className="container">
        <div className="row">{header}</div>
        <Router history={createHashHistory() as any}>
          <Home path="/" />
          <WhatTheBrick path="/what-the-brick" />
          <StationStatus path="/station-status" />
          <IoFDetail path="/item/:name" type="item" name="from the path" />
          <IoFDetail path="/fluid/:name" type="fluid" name="from the path" />
          <BlockPage path="/block/:loc" loc="from the path" />
          <LtnTree
            path="/ltn-tree/:type/:name"
            type="item"
            name="from the path"
          />
          <Map
            path="/map/:gps?/:zoom?"
            gps="from the path"
            zoom="from the path"
          />
          <Next path="/an/next" />
          <Pulses path="/an/pulses/:colon" colon="from the path" />
          <Chestify path="/an/chestify" />
        </Router>
      </div>
    );
  }
}

const header = (
  <header className="p-3">
    <div className="container">
      <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
        <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
          <li>
            <a href="/" className="nav-link px-2 text-white">
              Station / Item search
            </a>
          </li>
          <li>
            <a href="/what-the-brick" className="nav-link px-2 text-white">
              What the brick?!
            </a>
          </li>
          <li>
            <a href="/station-status" className="nav-link px-2 text-white">
              Station status
            </a>
          </li>
          <li>
            <a href="/map" className="nav-link px-2 text-white">
              Map
            </a>
          </li>
          <li>
            <a href="/an/next" className="nav-link px-2 text-white">
              Next
            </a>
          </li>
          <li>
            <a
              href="https://github.com/FauxFaux/factorio-loader"
              className="nav-link px-2 text-white"
            >
              github
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
);

class Home extends Component {
  render() {
    return (
      <div class="row">
        <div class="col">
          <h2>Stations</h2>
          <StationList limit={100} />
        </div>
        <div class="col">
          <h2>Items</h2>
          <ItemList limit={100} />
        </div>
      </div>
    );
  }
}
