(function ()
{
  'use strict';

  angular
    .module('app.admin')
    .controller('AdminDidsController', AdminDidsController);

  /** @ngInject */
  function AdminDidsController($scope, $mdDialog, $mdToast, DidService)
  {
    var vm = this;
    vm.dtOptions = {
      dom       : 'rt<"bottom"<"left"<"length"l>><"right"<"info"i><"pagination"p>>>',
      pagingType: 'simple',
      pageLength: 50,
      autoWidth : false,
      responsive: true,
      order: [[ 1, "asc" ]],
      columnDefs: [{"orderable": false, "targets": 2}, {"orderable": false, "targets": 3}],

    };
    vm.dtInstance = {};

    // customize search box
    var searchBox = angular.element('body').find('#admin-dids-search');

    if ( searchBox.length > 0 )
    {
      searchBox.on('keyup', function (event)
      {
        vm.dtInstance.DataTable.search(event.target.value);
        vm.dtInstance.DataTable.search(event.target.value).draw();
      });
    }

    //get all dids
    DidService.getAll().then(function (dids) {
      vm.dids = dids;
      vm.removingDids = [];
      if (vm.dids.length) {
        vm.dids = vm.dids.map(function (did) {
          did.userFlag = false;
          return did;
        });
      }
      $scope.$watch(function () {
        return vm.dids;
      },function(dids){
        vm.removingDids = [];
        dids.filter(function (did) {
          if (did.userFlag) {
            if (!angular.isDefined(did.user)) {
              vm.removingDids.push({id: did._id, sid: did.sid, userId: ''});
            }
            else vm.removingDids.push({id: did._id, sid: did.sid, userId: did.user._id});
          }
        });
      }, true);

      // for add did
      vm.user = {_id: '', dids: []};

      $scope.$watch(function () {
        return vm.user;
      },function(user){
        if (user.dids.length) {
          vm.dids.push(user.dids[0]);
          user.dids = [];
          vm.dtInstance.rerender();
        }
      }, true);

    });

    vm.openDeleteDidDialog = openDeleteDidDialog;

    function openDeleteDidDialog (ev) {
      // Appending dialog to document.body to cover sidenav in docs app
      var confirm = $mdDialog.confirm()
        .title('Confirm')
        .textContent('Are you sure you want to delete the selected dids?')
        .ariaLabel('delete dids')
        .targetEvent(ev)
        .clickOutsideToClose(true)
        .parent(angular.element(document.body))
        .ok('Yes')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {
        DidService.deleteDids(vm.removingDids).then(function (res) {
          vm.dids = vm.dids.filter(function (did) {
            return !did.userFlag
          });
          vm.dtInstance.rerender();
          $mdToast.showSimple("Successfully Deleted Dids.");
        }, function (err) {
          console.log(err);
          $mdToast.showSimple('Internal Server Error.');
        });
      }, function() {
        console.log('Delete is canceled');
      });
    }
  }
})();
