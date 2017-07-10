angular.module('app.components')
  .component('addDid', {
    templateUrl: 'app/components/add-did/add-did.html',
    controller: AddDidController,
    bindings: {
      user: '=',
      flow: '='
    }
  });

/** @ngInject */
function AddDidController($scope, $rootScope, $mdDialog, AdminUserService) {
  var $ctrl = this;

  $ctrl.openAddDidDialog = openAddDidDialog;

  function openAddDidDialog (ev) {
    $mdDialog.show({
      controller: DidDialogController,
      templateUrl: 'app/components/add-did/user-add-did.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      locals:{userId: $ctrl.user._id},
    })
      .then(function(did) {
        $ctrl.user.dids.push(did);
      }, function() {
        $scope.status = 'You cancelled the dialog.';
      });
  }

  function DidDialogController($scope, $mdDialog, AdminUserService, $mdToast, $timeout, userId) {
    $scope.isTollFree = '0';
    $scope.hide = function() {
      $mdDialog.hide();
    };
    $scope.cancel = function() {
      $mdDialog.cancel();
    };

    $scope.searchDid = function() {
      $scope.loadingProgress = true;
      if (!angular.isDefined($scope.areaCode)) {
        $scope.areaCode = "";
      }
      if (!angular.isDefined($scope.contains)) {
        $scope.contains = "";
      }
      AdminUserService.didSearch($scope.areaCode, $scope.contains, $scope.countryCode.toUpperCase(), $scope.isTollFree).then(function (res) {
        $scope.loadingProgress = false;
        $mdToast.showSimple("Did Searched Successfully.");
        $scope.didSearch = res.data;
      }, function (err) {
        $scope.loadingProgress = false;
        console.log(err);
        $mdToast.showSimple('Internal Server Error.');
      });
    };

    $scope.purchaseDid = function () {
      $scope.loadingProgress = true;
      var data = {phoneNumber: $scope.selectedDid, userId: userId, flow: $ctrl.flow || 'companyDirectory'};
      AdminUserService.didPurchase(data).then(function (res) {
        $scope.loadingProgress = false;
        $mdToast.showSimple("Did Purcharsed Successfully.");
        $mdDialog.hide(res.data);
      }, function (err) {
        $scope.loadingProgress = false;
        console.log(err);
        $mdToast.showSimple(err.data);
      });
    };

    $scope.$watch('isTollFree', function (newValue, oldValue) {
      $scope.didSearch = null;
      if (newValue === '1') {
        $scope.searchDid();
      }
    });

    $scope.$watch('countryCode', function (newValue, oldValue) {
      $scope.didSearch = null;
      $scope.areaCode = '';
      $scope.searchDid();
    });

  }

}
