angular.module('app.components')
  .component('contactsDirectory', {
    templateUrl: 'app/components/contacts-directory/contacts-directory.html',
    controller: ContactsDirectoryController,
    bindings: {
      users: '=',
      //clickToCall: '=?',
      noStar: '=?',
      noCall: '=?'
    }
  })
  .factory('ContactsDirectoryService', ContactsDirectoryService);

/** @ngInject */
function ContactsDirectoryService() {
  var service = this;
  ContactsDirectoryService.selectedUser = {};
  return service;
}

/** @ngInject */
function ContactsDirectoryController($log, $rootScope, $scope, UserService, ContactsDirectoryService) {
  var $ctrl = this;
  $log.log('ContactsDirectoryController load');
  $scope.$on('syncClientReady', function (event, data) {
    $rootScope.syncClient.map('workers')
      .then(function (map) {
        map.getItems({limit: 20}).then(function (item) {
          for (var x = 0; x < item.items.length; x++) {
            var worker = item.items[x];
            $ctrl.updateUserActivity(worker);
          }
        });

        map.on('itemUpdated', function (data) {
          $ctrl.updateUserActivity(data);
        }, function onError(response) {
          console.log(response.data);
        });
      });
  });

  $ctrl.updateUserActivity = function (worker) {
    // console.log('from worker map');
    // console.log(worker);
    if(!$ctrl.users){
      return;
    }
    var workerName = worker.key;
    var workerActivity = worker.value.activity;
    var workerActivitySid = worker.value.activitySid;
    // console.log(workerName);
    // console.log(workerActivity);

    for (var i = 0, len = $ctrl.users.length; i < len; i++) {
      var user = $ctrl.users[i];
      if (user.friendlyWorkerName == workerName) {
        user.activity = workerActivity;
        console.log('set User ', workerName, ' to ', workerActivity, ' ext ', user.extension);
        $scope.$apply();
      }
    }

  }

  $ctrl.updateStarredUser = function (user, id) {
    UserService.starUser(user, !user.starred)
      .then(function () {
        var index = 0;
        for (var i = 0; i < $ctrl.users.length; i++) {
          var user = $ctrl.users[i];
          if (user._id == id) {
            index = i;
            break;
          }
        }

        $ctrl.users[index].starred = !$ctrl.users[index].starred;

      }, function () {
        console.log('failed');
      });
  };

  $ctrl.isStarred = function (user) {
    return user.starred;
  };

  $ctrl.callUser = function (user) {
    $log.log('call inline number ' + user.phone, $ctrl);
    //$rootScope.$broadcast('CallPhoneNumber', {phoneNumber: user.phone});
    if (!$ctrl.noCall) {
      $rootScope.$broadcast('CallPhoneNumber', {phoneNumber: user.extension});
    }
    ContactsDirectoryService.selectedUser = user;
  };

  $ctrl.orderStarredUser = function (user) {
    return user.starred ? -1 : 1;
  };
  $ctrl.isSelected = function (user) {
    if (ContactsDirectoryService.selectedUser) {
      return user._id == ContactsDirectoryService.selectedUser._id;
    }
    return false;
};
}
