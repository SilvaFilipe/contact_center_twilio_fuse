angular.module('app.components')
  .component('contactsDirectory', {
    templateUrl: 'app/components/contacts-directory/contacts-directory.html',
    controller: ContactsDirectoryController,
    bindings: {
      users: '='
    }
  });

/** @ngInject */
function ContactsDirectoryController($log, $rootScope, UserService){
  var $ctrl = this;

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
