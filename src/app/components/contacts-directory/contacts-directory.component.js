angular.module('app.components')
  .component('contactsDirectory', {
    templateUrl: 'app/components/contacts-directory/contacts-directory.html',
    controller: ContactsDirectoryController,
    bindings: {
      users: '='
    }
  });

/** @ngInject */
function ContactsDirectoryController($log, $rootScope, UserService, $scope){
  var $ctrl = this;
  $log.log('ContactsDirectoryController load');
  $scope.$on('syncClientReady', function (event, data) {
    $rootScope.syncClient.map('workers' )
      .then(function(map) {
        map.getItems({ limit: 20 }).then(function(item) {
          for (var x=0; x<item.items.length; x++){
            var worker = item.items[x];
            $ctrl.updateUserActivity(worker);
            // update users
          }
          $scope.$apply();
        });


        map.on('itemUpdated', function(data) {
          // $log.log('UPDATED workers');
          // console.log(data);
          $ctrl.updateUserActivity(data);
//          vm.queueData = data;
        }, function onError(response) {
          console.log(response.data);
        });
      });
  });

  $ctrl.updateUserActivity = function (worker){
    // console.log('from worker map');
    // console.log(worker);
    var workerName = worker.key;
    var workerActivity = worker.value.activity;
    var workerActivitySid = worker.value.activitySid;
    // console.log(workerName);
    // console.log(workerActivity);

    for (var i = 0, len = $ctrl.users.length; i < len; i++) {
      var user = $ctrl.users[i];
      if (user.friendlyWorkerName == workerName){
        user.activity = workerActivity;
        console.log('set User ', workerName, ' to ', workerActivity, ' ext ', user.extension);
        // console.log(user);
      }
    }

  }

  $ctrl.updateStarredUser = function (user, id) {
    UserService.starUser(user, !user.starred)
      .then(function () {
        var index = 0;
        for (var i = 0; i < $ctrl.users.length; i++) {
          var user = $ctrl.users[i];
          if(user._id == id){
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
    $log.log('call inline number ' + user.phone);
    //$rootScope.$broadcast('CallPhoneNumber', {phoneNumber: user.phone});
    $rootScope.$broadcast('CallPhoneNumber', { phoneNumber: user.extension });
  };

  $ctrl.orderStarredUser = function(user){
    return user.starred ? -1 : 1;
  };
}
