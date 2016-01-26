import React from 'react';
import ReactDOM from 'react-dom';

import { Subject } from 'rxjs';

export default React.createClass({

  propTypes: {
    navigate:   React.PropTypes.func.isRequired,
    directions: React.PropTypes.array.isRequired
  },

  isValidMotion: function (motion) {
    return this.motions.indexOf(motion) !== -1;
  },

  componentWillMount: function () {
    this.motions = Object.keys(this.props.motions);
    this.clicks = new Subject(),
    this.clicks
      .pluck('target', 'id')
      .filter(this.isValidMotion)
      .subscribe(this.props.navigate);
  },

  componentWillUnmount: function () {
    this.clicks.complete();
  },

  next: function (e) {
    this.clicks.next(e);
    e.preventDefault();
  },

  buttons: function () {
    let toButton = function (m) {
      const options = {
        "key": m.name,
        "href": '', // @todo add right href here
        "ref": `button-${m.name}`,
        "id": m.name,
        "onClick": this.next,
        "className": m.disabled && 'disabled' || 'enabled'
      };
      return <a {...options}></a>;
    }.bind(this);

    let isEnabled = function (m) {
      let {level, direction} = this.props.motions[m];
      let l = this.props.directions[level];
      let disabled = true;
      if(l !== undefined) {
        disabled = !l[direction];
      }
      return {
        disabled,
        name: m
      };
    }.bind(this);

    return this.motions.map(isEnabled).map(toButton);
  },

  render: function () {
    return (<div className="ui-controls">{this.buttons()}</div>);
  }

});