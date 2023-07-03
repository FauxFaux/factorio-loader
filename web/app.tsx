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
import { Heats } from './pages/heats';
import { Consumes, Produces } from './pages/recipes';
import { Whence } from './pages/whence';
import { CurrentChain } from './pages/current-chain';
import { FromAir } from './pages/from-air';
import { Resources } from './pages/resources';
import { Plan } from './pages/plan';
import { BusyTrains } from './pages/busy-trains';
import { StationConfig } from './pages/station-config';
import { TrainTraffic } from './pages/train-traffic';
import { ReqChests } from './pages/req-chests';
import { Mall } from './pages/mall';
import RedirectIof from './pages/redirect-iof';
import { Peakers } from './pages/peakers';
import { Chainer } from './pages/chainer';

export class App extends Component {
  render() {
    return (
      <div className="container">
        <div className="row">{header}</div>
        <Router history={createHashHistory() as any}>
          <Home path="/" />
          <WhatTheBrick path="/what-the-brick" />
          <StationStatus path="/station-status" />
          <RedirectIof path="/item/:name" type="item" name="from the path" />
          <RedirectIof path="/fluid/:name" type="fluid" name="from the path" />
          <IoFDetail path="/an/detail/:colon" colon="from the path" />
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
          <Heats path="/an/heats/:colon" colon="from the path" />
          <Chestify path="/an/chestify" />
          <Produces path="/an/produces/:colon" colon="from the path" />
          <Consumes path="/an/consumes/:colon" colon="from the path" />
          <Whence path="/an/whence/:colon" colon="from the path" />
          <CurrentChain path="/an/current-chain/:colon" colon="from the path" />
          <FromAir path="/an/from-air" />
          <Resources path="/an/resources/:resource?" />
          <Plan path="/an/plan/:encoded?" />
          <BusyTrains path="/an/busy-trains" />
          <StationConfig path="/an/station-config" />
          <TrainTraffic path="/an/train-traffic" />
          <ReqChests path="/an/req-chests/:brick" brick={'from the path'} />
          <Mall path="/an/mall" />
          <Peakers path="/an/peakers" />
          <Chainer path="/an/chainer/:wanted" wanted={'from the path'} />
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
            <a href="/an/chestify" className="nav-link px-2 text-white">
              Chestify
            </a>
          </li>
          <li>
            <a href="/an/resources" className="nav-link px-2 text-white">
              Resources
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
          <h2>Items</h2>
          <ItemList limit={60} />
        </div>
        <div className="col">
          <h2>Stations</h2>
          <StationList limit={60} />
        </div>
      </div>
    );
  }
}
