angular.module('app.components')
  .component('historyCall', {
    templateUrl: 'app/components/history/history.html',
    controller: HistoryController,
    bindings: {
      calls: '='
    }
  });

/** @ngInject */
function HistoryController($scope, $mdDialog, UserService) {
  var $ctrl = this;

  $ctrl.historyPagination = {
    page: 0
  };

  $ctrl.$onInit = function () {

    $ctrl.callFilterType = 'all';

    $ctrl.loadCalls();

    //emit this to reload calls
    $scope.$on('history.reload', function () {
      $ctrl.resetPagination();
      $ctrl.loadCalls();
    });

  };

  $ctrl.loadCalls = function loadCalls() {
    UserService.getOwnCalls($ctrl.historyPagination.page + 1)
      .then(function (callsPages) {
        $ctrl.historyPagination.page = parseInt(callsPages.page, 10);
        $ctrl.historyPagination.pages = callsPages.pages;
        $ctrl.historyPagination.total = callsPages.total;
        $ctrl.calls = callsPages.docs;
      })
  };

  $ctrl.resetPagination = function () {
    $ctrl.historyPagination.page = 0;
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

  $ctrl.openRecordingDialog = function (call) {
    $mdDialog.show({
        controller: function DialogController($scope, $mdDialog) {

          $scope.call = call;

          $scope.hide = function() {
            $mdDialog.hide();
          };

          $scope.cancel = function() {
            $mdDialog.cancel();
          };

          $scope.answer = function(answer) {
            $mdDialog.hide(answer);
          };
        },
        templateUrl: 'app/components/history/history.recoding.dialog.html',
        parent: angular.element(document.body),
        clickOutsideToClose:true
      })
      .then(function(answer) {
        $scope.status = 'You said the information was "' + answer + '".';
      }, function() {
        $scope.status = 'You cancelled the dialog.';
      });
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
