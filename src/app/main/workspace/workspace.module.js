(function ()
{
    'use strict';

    angular
        .module('app.callcenterApplication', ['ngMessages', 'luegg.directives', 'bc.AngularKeypad', 'angularRipple'])
        .config(config);

    /** @ngInject */
    function config($stateProvider, $translatePartialLoaderProvider, msApiProvider, msNavigationServiceProvider)
    {
        // State
        $stateProvider
            .state('app.workspace', {
                url    : '/workplace',
                views  : {
                    'content@app': {
                        templateUrl: 'app/main/workspace/workspace.html',
                        controller : 'WorkflowController as vm'
                    }
                },
                resolve: {
                    SampleData: function (msApi)
                    {
                        return msApi.resolve('sample@get');
                    }
                },
                bodyClass: 'workspace'
            });

        // Translation
        $translatePartialLoaderProvider.addPart('app/main/workspace');

        // Api
        msApiProvider.register('sample', ['app/data/sample/sample.json']);

        // Navigation
        msNavigationServiceProvider.saveItem('fuse', {
            title : 'Pages',
            group : true,
            weight: 1
        });

        msNavigationServiceProvider.saveItem('fuse.workspace', {
            title    : 'Workspace',
            icon     : 'icon-phone',
            state    : 'app.workspace',
            /*stateParams: {
                'param1': 'page'
             },*/
            weight   : 1
        });
    }
})();
