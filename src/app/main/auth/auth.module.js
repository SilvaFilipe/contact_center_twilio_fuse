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
      if (response.status === 401){
        alert('auth failed');
        window.location = "/access/login";
      }
      return $q.reject(response);
    };
  }

  function config($stateProvider, $translatePartialLoaderProvider, msNavigationServiceProvider, $httpProvider) {
    // State
    $stateProvider.state('auth', {
      abstract:true,
      url:'/access'
    });
    // State
    $stateProvider.state('auth.login', {
      url      : '/login',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@auth.login': {
          templateUrl: 'app/main/auth/login/login.html',
          controller : 'LoginController as vm'
        }
      },
      bodyClass: 'login'
    });

    $stateProvider.state('auth.register', {
      url      : '/register',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@auth.register': {
          templateUrl: 'app/main/auth/register/register.html',
          controller : 'RegisterController as vm'
        }
      },
      bodyClass: 'register'
    });

    $stateProvider.state('auth.forgot-password', {
      url      : '/forgot-password',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@auth.forgot-password': {
          templateUrl: 'app/main/auth/forgot-password/forgot-password.html',
          controller : 'ForgotPasswordController as vm'
        }
      },
      bodyClass: 'forgot-password'
    });

    $stateProvider.state('auth.reset-password', {
      url      : '/reset-password/:token',
      views    : {
        'main@': {
          templateUrl: 'app/core/layouts/content-only.html',
          controller : 'MainController as vm'
        },
        'content@auth.reset-password': {
          templateUrl: 'app/main/auth/reset-password/reset-password.html',
          controller : 'ResetPasswordController as vm'
        }
      },
      bodyClass: 'reset-password'
    });

    // Translation
    $translatePartialLoaderProvider.addPart('app/main/auth/login');
    $translatePartialLoaderProvider.addPart('app/main/auth/register');
    $translatePartialLoaderProvider.addPart('app/main/auth/forgot-password');
    $translatePartialLoaderProvider.addPart('app/main/auth/reset-password');
    $httpProvider.interceptors.push('authInterceptor');

  }


  function authService($q, $window, $http, $rootScope, EnvironmentConfig)
  {

    // Private vars
    var currentUser = null;
    $rootScope.apiBaseUrl = EnvironmentConfig.API;
    $rootScope.authBaseUrl = EnvironmentConfig.Auth;
    var authUrl = $rootScope.authBaseUrl;
    var apiUrl = $rootScope.apiBaseUrl;

    var me = this;

    var isAdmin = false;


    // Service interface
    return {
      userIsAdmin : userIsAdmin,
      login       : login,
      logout      : logout,
      isLoggedIn  : isLoggedIn
    };

    //////////

    function userIsAdmin () {
      return $window.sessionStorage.getItem('isAdmin') === 'true';
    }

    function login(email, password) {
      var deferred = $q.defer();
      $http.post(authUrl + 'auth/sign-in', {email: email, password: password}, {withCredentials: true})
        .then(function(res) {
          $http.get(apiUrl + 'api/users/me', {withCredentials: true})
            .then(function (response) {
              console.log(response.data);
              if (response.data.roles.indexOf('admin') > -1) {
                  isAdmin = true;
                  $window.sessionStorage.setItem('isAdmin', "true");
                  console.log('set admin true');
              } else {
                $window.sessionStorage.setItem('isAdmin', "true"); //change to false
                console.log('set admin false');
              }
              var worker =  {friendlyName: response.data.user.friendlyWorkerName};
              var endpoint = navigator.userAgent.toLowerCase() + Math.floor((Math.random() * 1000) + 1);

              $http.post(apiUrl + 'api/agents/login', { worker: worker, endpoint: endpoint }, {withCredentials: true})

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
