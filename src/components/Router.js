import { Observable, Subject } from 'rxjs';
import 'rx-history';

import '../lib/Utils';

let createRouter = function(opts) {
  let { history, map } = opts;
  let subject = new Subject();
  let state = {};
  let subscription = {};

  // We pass in a Routes Map
  // This performs routing on N-dimensions
  //
  //   /slide/subslide
  //   /slide/subslide/trislide/fragments
  //   /users/1/photos/3
  //
  // @todo: Expose navigate function that takes directions
  // and calls an internal Subject producing a "navigate"
  // event that we act upon by checking if the direction
  // is available, looking up the route in the map
  // and performing a history change
  let fromRouter = (router) => {
    return subject;
  };

  Observable.fromRouter = fromRouter;

  let Path = {
    cleanUp: path => (path.trim()),
    isEmpty: path => (path.length > 0)
  };

  let start = function () {
    let outAction = (action) => {
      return (e) => e.action !== action;
    };

    // @todo: split this into two streams after map(toList)
    //
    //  1. if there's some indices,
    //     map them to paths,
    //     replaceUri
    //
    //  2. if there's some paths,
    //     map them to indices,
    //     build state,
    //     emit
    subscription = Observable.fromHistory(history)
      .do((e) => console.log(e))
      .filter(outAction("REPLACE"))
      .pluck("pathname")
      .map(Path.cleanUp)
      .distinctUntilChanged()
      .map(toList)
      .distinctUntilChanged()
      .map(toIndices)
      .do(saveState)
      .do(emitState)
      .map(toPaths)
      .distinctUntilChanged()
      .subscribe(replaceUri);
    //.map(this.toDirections)
  };

  let stop = function() {
    subscription && subscription.complete();
  };

  let asObservable = function () {
    return subject;
  };

  /**
   * @todo: Add tests to see if these are even valid.
   * @param {number[]} target Where to route to
   */
  let jump = function (target) {
    console.log("jumping to", target);
    this.history.push(buildUri(target));
  };

  /**
   * Returns next state by adding state + nav
   * @param state Current state
   * @param {number[]} nav
   * @returns {number[]} New state
   */
  let nextState = (state, nav) => {
    return nav.map((a, i) => state[i] + a)
  };

  /**
   * Navigates by directions
   * @param directions array of directions
   */
  let navigate = function (directions) {
    jump(nextState(state, directions));
  };

  /**
   * Saves state
   * @param state State
   */
  let saveState = function (state) {
    state = state;
  };

  /**
   * navigate.0.next => right
   * navigate.1.next => down
   * navigate.2.next => in
   * navigate.3.next => nextFragment
   *
   * navigate.jump(0,2,3)
   * navigate.0.first
   * navigate.0.last
   *
   * State:
   *  {
   *    current: [n, m, ...], // indices
   *    directions: [
   *      { next: true, previous: true },
   *      { next: true, previous: true },
   *      ...
   *    ]
   *  }
   */
  let emitState = function (state) {
    subject.next({
      current: state //this is just the indices
    });
  };

  /**
   * Returns array representation of path.
   * Casts numeric path-parts to actual integers.
   * in:  "hello/1"
   * out: ["hello", 1]
   *
   * @param {string} path path as string
   * @returns {*[]} Array of path-parts (split by "/")
   */
  let toList = (path) => {
    return path.split("/").compact().map((key) => {
      let n = Number(key);
      return Number.isNaN(n) && key || n;
    });
  };

  /**
   * Recursively goes through lists, checking if
   * the key passes the filter, and map that
   * with the mapper
   * @param {*[]} keys Array of keys related to the
   *                   levels of the list
   * @param {*[]} list (Nested) array of routes
   * @param {function} filter Filter method used
   *                          for finding the right
   *                          route per level
   * @param mapper function Mapper method returning
   * @returns {*[]} Array of mapped entries for each
   *                level of the routing
   */
  let walk = (keys, list, filter, mapper) => {
    if (keys.length < 1 && list) return mapper(list[0]);
    if (keys.length < 1 || !list) return;
    return list.filter(filter(keys[0]))
      .map( (entry) => [
        mapper(entry),
        walk(keys.slice(1), entry.children, filter, mapper)
      ]).flatten().compact();
  };

  /**
   * Builds uri from path-array by joining with "/" and
   * adding leading "/".
   *
   * @param path *[] Path array
   * @returns {string}
   */
  let buildUri = function (path) {
    return '/' + path.join('/');
  };

  /**
   * Returns integer-array representation of path-array.
   *
   * in:  ["hello", 0]
   * out: [1, 0]
   *
   * @param keys *[] Path array
   * @returns number[] Index-based path-array
   */
  let toIndices = function (keys) {
    let filter = (key) => {
      return (entry) => (entry.name === key || entry.index === key)

    };
    let mapper = (entry) => entry.index;
    let indices = walk(keys, this.map, filter, mapper);
    return indices.length > 0 && indices || [0];
  };

  /**
   * Returns name-based array presentation of path-array
   *
   * @param keys *[] Path array
   * @returns *[] Name-based path-array
   */
  let toPaths = function (keys) {
    let filter = (key) => {
      return (entry) => (entry.name === key || entry.index === key)
    };
    let mapper = (entry) => (entry.name || entry.index);
    return walk(keys, this.map, filter, mapper);
  };

  /**
   * Replaces history with path built with keys
   * @param keys *[] Path array
   */
  let replaceUri = function (keys) {
    history.replace(buildUri(keys));
  };

  return {
    start: start,
    stop: stop,
    jump: jump,
    navigate: navigate,
    asObservable: asObservable
  }
};

export default createRouter;