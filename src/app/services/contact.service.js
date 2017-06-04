'use strict';

(function () {
  'use strict';

  angular.module('app.services').factory('ContactService', ContactService);

  /** @ngInject */
  function ContactService($http, $rootScope, UserService) {
    var apiUrl = $rootScope.apiBaseUrl + 'api';

      var ContactService = {
      create: function create(contact) {
        console.log('contact', contact);
        return $http.post(apiUrl + '/contacts', contact)
          .then(function (response) {
            return response.data;
          })
      },
      getOwnContacts: function getOwnContacts() {
        console.log(getOwnContacts)
        return $http.get(apiUrl + '/users/' + UserService.getCurrentUser()._id + '/contacts')
          .then(function (response) {
            return response.data;
          })
      },
      uploadAvatar: function uploadAvatar(contact_id, avatarFile) {
        var fd = new FormData();
        console.log(avatarFile);
        fd.append('file', avatarFile);

        return $http.post(apiUrl + '/contacts/' + contact_id + '/uploadAvatar', fd, {
            headers: {'Content-Type': undefined},
            transformRequest: angular.identity
          })
          .then(function (response) {
            return response.data;
          });
      },
      /**
       * Adds contact to group
       * @param groupId
       * @param contactId
       * @returns {Promise|Promise.<T>|*}
       */
      addToGroup: function addToGroup(groupId, contactId) {
        return $http.post(apiUrl + '/groups/' + groupId + '/contacts/' + contactId)
          .then(function (response) {
            return response.data;
          })
      },
      addToUser: function addToUser(userId, contactId) {
        return $http.post(apiUrl + '/users/' + userId + '/contacts/' + contactId)
          .then(function (response) {
            return response.data;
          })
      },
      addToQueues: function addToQueues(queueId, contactId) {
        return $http.post(apiUrl + '/queues/' + queueId + '/contacts/' + contactId)
          .then(function (response) {
            return response.data;
          })
      }
    };

    return ContactService;
  }
})();
