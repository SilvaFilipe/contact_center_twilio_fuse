(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('counter', counter);

    /** @ngInject */
    function counter()
    {
      return function(value) {

        var minutes = Math.floor(value / 60);
        var seconds = value - (minutes * 60);

        if (minutes < 10){
          minutes = '0' + minutes;
        }

        if (seconds < 10){
          seconds = '0' + seconds;
        }

        return minutes + ':' + seconds;

      };
    }

})();
