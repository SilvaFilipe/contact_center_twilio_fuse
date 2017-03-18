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

  $ctrl.$onInit = function () {
    console.log('$ctrl.callFilterType')
    $ctrl.callFilterType = 'all';
  };

  $ctrl.getNumberByDirection = function (call) {
    if (call.direction === 'inbound-api') {
      return call.from;
    } else if (call.direction === 'outbound-api') {
      return call.to;
    } else {
      return call.to + ' - ' + call.from;
    }
  };

  $ctrl.filterCalls = function () {

    return function (call) {
      if ($ctrl.callFilterType == 'all') {
        return true;
      }

      if ($ctrl.callFilterType == 'received') {
        return call.direction == 'inbound-api';
      } else if ($ctrl.callFilterType == 'placed') {
        return call.direction != 'inbound-api';
      }
    }
  }
}
