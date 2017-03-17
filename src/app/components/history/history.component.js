angular.module('app.components')
  .component('historyCall', {
    templateUrl: 'app/components/history/history.html',
    controller: HistoryController,
    bindings: {
      calls: '='
    }
  });

/** @ngInject */
function HistoryController() {
  var $ctrl = this;

  $ctrl.getNumberByDirection = function (call) {
    if (call.direction === 'inbound-api') {
      return call.from;
    } else if(call.direction === 'outbound-api') {
      return call.to;
    } else{
      return call.to + ' - ' + call.from;
    }
  }
}
