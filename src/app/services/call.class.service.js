/**
 * Created by dev on 3/29/17.
 */


(function () {
  'use strict';

  angular.module('app.services')
    .factory('Call', Call)
    .factory('ExtensionCall', ExtensionCall)
    .factory('InboundCall', InboundCall)
    .factory('OutboundCall', OutboundCall);

  function Call() {
    // instantiate Call class
    var Call = function (params) {
      if (params) {
        this.fromNumber = params.fromNumber;
        this.duration = (params.duration == undefined ? 0: params.duration);
        this.callSid = params.callSid;
        this.onhold = false;
        this.recording = false;
        this.muted = false;
        this.createdAt = new Date();
        this.callStatus = 'active';
        this.conferenceName = params.conferenceName;
      }
    };

    Call.prototype.showOutgoingIcon = function() {
      return this.callStatus != 'completed' && this.type == 'outbound'
    };

    Call.prototype.showIngoingIcon = function() {
      return this.callStatus != 'completed' && this.type == 'inbound';
    };

    Call.prototype.isCompleted = function() {
      return this.callStatus == 'completed';
    };

    Call.prototype.isInGoingCall = function() {
      return this.type == 'inbound' && this.direction != 'extension';
    };

    Call.prototype.isOutGoingCall = function() {
      return this.type == 'outbound';
    };

    Call.prototype.isExtensionCall = function() {
      return this.direction == 'extension';
    };

    return Call;

  }

  function ExtensionCall(Call) {

    var ExtensionCall = function(params) {
      Call.apply(this, arguments);
      this.direction = 'extension';
      this.callerName = params.callerName;
      this.type = params.type;

    };

    // reuse the original Call prototype
    ExtensionCall.prototype = new Call();

    // define a new internal private method for this class

    // let's override original Call method


    return ExtensionCall;
  }

  function InboundCall(Call) {

    var InboundCall = function(params) {
      Call.apply(this, arguments);
      this.direction = 'inbound';
      this.type = 'inbound';

    };

    // reuse the original Call prototype
    InboundCall.prototype = new Call();

    // define a new internal private method for this class


    // let's override original Call method


    return InboundCall;
  }

  function OutboundCall(Call) {

    var OutboundCall = function(params) {
      Call.apply(this, arguments);
      this.direction = 'outbound';
      this.type = 'outbound';

    };

    // reuse the original Call prototype
    OutboundCall.prototype = new Call();

    // define a new internal private method for this class


    // let's override original Call method


    return OutboundCall;
  }

})();
