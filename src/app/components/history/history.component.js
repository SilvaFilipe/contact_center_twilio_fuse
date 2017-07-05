angular.module('app.components')
  .component('historyCall', {
    templateUrl: 'app/components/history/history.html',
    controller: HistoryController
  });

/** @ngInject */
function HistoryController($rootScope, $scope, $mdDialog, UserService) {
  var $ctrl = this;
  $ctrl.isLoading = false;

  $ctrl.historyPagination = {
    page: 0,
    currentPage: 1
  };

  $ctrl.historySearch = '';

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
    $ctrl.isLoading = true;
    UserService.getOwnCalls($ctrl.historySearch, $ctrl.historyPagination.currentPage)
      .then(function (callsPages) {
        $ctrl.historyPagination.page = parseInt(callsPages.page, 10);
        $ctrl.historyPagination.pages = callsPages.pages;
        $ctrl.historyPagination.total = callsPages.total;
        $ctrl.calls = callsPages.docs;
      })
      .finally(function () {
        $ctrl.isLoading = false;
      });
  };

  $ctrl.resetPagination = function () {
    $ctrl.historyPagination.page = 0;
  };

  $ctrl.getNumberByDirection = function (call) {
    if (call.direction === 'inbound') {
      return call.from;
    } else if (call.direction === 'outbound-api') {
      return call.to;
    } else if (call.direction === 'outbound-sip') {
      return call.to;
    } else {
      return call.to + ' - ' + call.from;
    }
  };

  $ctrl.getDirection = function (call) {
    if (call.direction === 'inbound') {
      return 'inbound';
    } else if (call.direction === 'outbound-api') {
      return 'outbound';
    } else if (call.direction === 'outbound-sip') {
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
        return call.direction == 'inbound';
      } else if ($ctrl.callFilterType == 'placed') {
        return call.direction != 'inbound';
      }
    }
  };

  $ctrl.makeCall = function (call) {
    var phoneNumber = $ctrl.getNumberByDirection(call);
    $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: phoneNumber});
  };

  $ctrl.updateHistoryList = function () {
    //$ctrl.historySearch
    $ctrl.historyPagination.page = 1;
    $ctrl.calls = [];
    $ctrl.historyPagination.currentPage = 1;
    $ctrl.loadCalls();
  };

  $ctrl.showReportDialog = function(ev, call) {
    $mdDialog.show({
      controller: function ReportDialogController($scope, $mdDialog) {
        $scope.call = call;
        setTimeout(function () {
          $scope.isShowChart = true;
        }, 300);

        var customizeTrans = $scope.call.transcription.toString().split(' ');
        $scope.sanitizeText = [];
        var isKeyword = false;
        for (var i in customizeTrans) {
          $scope.call.scriptKeywords.some(function(element, index) {
            if (customizeTrans[i].toLowerCase() === element.toLowerCase()) {
              $scope.sanitizeText.push('<span style="color: #FF9800">' + customizeTrans[i] + '</span>');
              isKeyword = true;
              return true;
            }
          });

          if (!isKeyword) {
            $scope.call.negativeKeywords.some(function(element, index) {
              if (customizeTrans[i].toLowerCase() === element.toLowerCase()) {
                $scope.sanitizeText.push('<span style="color: red">' + customizeTrans[i] + '</span>');
                isKeyword = true;
                return true;
              }
            });

          }

          if (!isKeyword) {
            $scope.call.positiveKeywords.some(function(element, index) {
              if (customizeTrans[i].toLowerCase() === element.toLowerCase()) {
                $scope.sanitizeText.push('<span style="color: green">' + customizeTrans[i] + '</span>');
                isKeyword = true;
                return true;
              }
            });
          }
          if (!isKeyword)
            $scope.sanitizeText.push(customizeTrans[i]);
          isKeyword = false;
        }
        $scope.hide = function () {
          $mdDialog.hide();
        };
        $scope.cancel = function () {
          $mdDialog.cancel();
        };
      },
      templateUrl: 'app/components/history/history.report.dialog.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true
    })
      .then(function() {
      }, function() {
      });
  };

}
