angular.module('app.components')
  .component('historyCall', {
    templateUrl: 'app/components/history/history.html',
    controller: HistoryController,
    bindings: {
      calls: '='
    }
  });

/** @ngInject */
function HistoryController($rootScope, $scope, $mdDialog, UserService) {
  var $ctrl = this;

  $ctrl.historyPagination = {
    page: 0,
    currentPage: 1
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
    UserService.getOwnCalls($ctrl.historyPagination.currentPage)
      .then(function (callsPages) {
        $ctrl.historyPagination.page = parseInt(callsPages.page, 10);
        $ctrl.historyPagination.pages = callsPages.pages;
        $ctrl.historyPagination.total = callsPages.total;
        $ctrl.calls = callsPages.docs;
      });
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

  $ctrl.getDirection = function (call) {
    if (call.direction === 'inbound-api') {
      return 'inbound';
    } else if (call.direction === 'outbound-api') {
      return 'outbound';
    }
  };

  $ctrl.openRecordingDialog = function (call) {
    $mdDialog.show({
        controller: function DialogController($scope, $mdDialog) {

          $scope.call = call;

          $scope.hide = function () {
            $mdDialog.hide();
          };

          $scope.cancel = function () {
            $mdDialog.cancel();
          };

        },
        templateUrl: 'app/components/history/history.recoding.dialog.html',
        parent: angular.element(document.body),
        clickOutsideToClose: true
      })
      .then(function () {
      }, function () {
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
  };

  $ctrl.makeCall = function (call) {
    var phoneNumber = $ctrl.getNumberByDirection(call);
    $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: phoneNumber});
  }
}
