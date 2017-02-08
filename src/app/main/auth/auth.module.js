(function ()
{
  'use strict';

  angular
    .module('app.auth', [])
    .config(config)
    .service('authInterceptor', authInterceptor)
    .factory('authService', authService);

  function authInterceptor($q) {
    var service = this;

    service.responseError = function(response) {
      if (response.status == 401){
        window.location = "/login";
      }
      return $q.reject(response);
    };
  }

  function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider, $httpProvider) {
    // State
    $stateProvider.state('app.auth_login', {
      url      : '/login',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@app.auth_login': {
          templateUrl: 'app/main/auth/login/login.html',
          controller : 'LoginController as vm'
        }
      },
      bodyClass: 'login'
    });

    $stateProvider.state('app.auth_register', {
      url      : '/register',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@app.auth_register': {
          templateUrl: 'app/main/auth/register/register.html',
          controller : 'RegisterController as vm'
        }
      },
      bodyClass: 'register'
    });

    // Translation
    $translatePartialLoaderProvider.addPart('app/main/auth/login');
    $translatePartialLoaderProvider.addPart('app/main/auth/register');
    $httpProvider.interceptors.push('authInterceptor');

  }


  function authService($q, $window, $http, $rootScope)
  {

    // Private vars
    var currentUser = null;

    var me = this;

    var isAdmin = false;


    // Service interface
    return {
      isAdmin    : isAdmin,
      login       : login,
      logout      : logout,
      isLoggedIn  : isLoggedIn
    };

    //////////

    function login(email, password) {
      var deferred = $q.defer();
      $http.post('/auth/sign-in', {email: email, password: password})
        .then(function(res) {
          $http.get('/api/users/me')
            .then(function (response) {
              console.log(response.data);
              if (response.data.roles.indexOf('admin')) {
                  isAdmin = true;
              }
              var worker =  {friendlyName: 'w' + response.data.user._id};
              var endpoint = navigator.userAgent.toLowerCase() + Math.floor((Math.random() * 1000) + 1);

              $http.post('/api/agents/login', { worker: worker, endpoint: endpoint })

                .then(function onSuccess(response) {
                  me.loggedInUser = response.data;
                  $rootScope.setCurrentUser(me.loggedInUser);
                  $window.sessionStorage.setItem('currentUser', JSON.stringify(me.loggedInUser));
                  deferred.resolve(response);
                }, function onError(response) {
                  console.log(response);
                  deferred.reject(response);

              });
          });

        }, function(err) {
          console.log(err);
          deferred.reject(err.data);

        });

      return deferred.promise;
    }


    function logout() {
      this.loggedInUser = null;
      $rootScope.setCurrentUser(null);
      $window.sessionStorage.removeItem('currentUser');
    }

    function isLoggedIn() {
      if (this.loggedInUser == null) {
        try {
          var storedUser = $window.sessionStorage.getItem('currentUser');
          if (storedUser) {
            this.loggedInUser = JSON.parse(storedUser);
          }
        }
        catch (err) {
          $window.sessionStorage.removeItem('currentUser');
          this.loggedInUser = null;
        }

      }
      return (this.loggedInUser != null);
    }




  }

})();
