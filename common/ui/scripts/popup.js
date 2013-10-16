/**
 * popup.js
 *
 * This is the script which controls the beavior of the popup component of the
 * frontend. The popup contains a contacts list and filters which allow the user
 * to conveniently access all desired uproxy info and interactions.
 */

'use strict';


var popup = angular.module('UProxyExtension-popup', ['UProxyExtension'])
  // Main extension controller.
  .controller('MainCtrl', ['$scope', function ($scope) {
    // View states.
    $scope.optionsTooltip = false;

    // Initial filter state.
    $scope.filters = {
      'online': true,
      'myAccess': false,
      'friendsAccess': false,
      'uproxy': false
    };
    $scope.filterTips = {
      'uproxy': 'Only show contacts with UProxy installed.',
      'myAccess': 'Show contacts who provide me access.',
      'friendsAccess': 'Show contacts who use me for access.',
      'online': 'Show offline contacts.',
    };
    var _getTrust = function(client) {
      return $scope.instances[client.instanceId].trust;
    };

    $scope.stringifyContact = function(contact) {
      return JSON.stringify(contact);
    };

    // On the contacts details page, dynamically update |currentInstance| to
    // reflect user actions and state changes in the DOM.
    $scope.updateCurrentInstance = function() {
      if (!$scope.ui.instance) {
        return;
      }
      $scope.$apply(function() {
        $scope.ui.instance = $scope.instances[$scope.ui.instance.instanceId];
      });
    }

    // On an update to the roster, update the variously sorted lists.
    // TODO(finish)
    $scope.updateSortedContacts = function() {
      $scope.alphabeticalContacts = []
    };
    // $scope.onAppData.addListener($scope.updateSortedContacts);

    // Opening the detailed contact view.
    $scope.viewContact = function(c) {
      console.log("viewContact: c=\n", c);
      for (var clientId in c.clients) {
        if ($scope.isMessageableUproxyClient(c.clients[clientId])) {
          console.log("viewContact: sendInstance: " + clientId);
          $scope.sendInstance(clientId);
        }
      }
      $scope.ui.contact = c;
      $scope.ui.instance = $scope.instanceOfContact(c);
      console.log('current instance ' + $scope.ui.instance);
      $scope.ui.rosterNudge = true;
      $scope.notificationSeen(c);
      if (!$scope.ui.isProxying) {
        $scope.ui.proxy = null;
      }
      // $scope.ui.refreshDOM();
    };

    // Toggling the 'options' page which is just the splash page.
    $scope.toggleOptions = function() {
      $scope.ui.splashPage = !$scope.ui.splashPage;
    };

    $scope.toggleSearch = function() {
      $scope.ui.searchBar = !$scope.ui.searchBar;
    };

    $scope.toggleFilter = function(filter) {
      if (undefined === $scope.filters[filter]) {
        return;
      }
      console.log('Toggling ' + filter + ' : ' + $scope.filters[filter]);
      $scope.filters[filter] = !$scope.filters[filter];

    };

    // Display the help tooltip for the filter.
    $scope.showFilter = function(filter) {
      $scope.filterTip = $scope.filterTips[filter];
      $scope.showFilterTip = true;
    };

    // Multifiter function for determining whether a contact should be hidden.
    // Returns |true| if contact |c| should *not* appear in the roster.
    $scope.contactIsFiltered = function(c) {
      var searchText = $scope.search,
          compareString = c.name.toLowerCase();
      // First, compare filters.
      if (($scope.filters.online && !c.online) ||
          ($scope.filters.uproxy && !c.canUProxy)) {
        return true;
      }
      // Otherwise, if there is no search text, this contact is visible.
      if (!searchText) {
        return false;
      }
      if (compareString.indexOf(searchText) >= 0) {
        return false;
      }
      return true;  // Does not match the search text, should be hidden.
    };

    $scope.$watch('ui.contact',function(){
      var contact = $scope.ui.contact;
      if (contact) {
        console.log('current contact changed');
        $scope.ui.contact = $scope.model.roster[contact.userId];
      }
    });
    $scope.$watch('ui.instance',function(){
      var instance = $scope.ui.instance;
      if (instance) {
        console.log('current instance changed');
        $scope.ui.instance = $scope.model.instances[instance.instanceId];
      }
    });
    // Refresh local state variables when the popup is re-opened.
    // if ($scope.ui.contact) {
      // $scope.ui.contact = $scope.model.roster[$scope.ui.contact.userId];
    // }
    // if ($scope.ui.instance) {
      // $scope.ui.instance = $scope.model.instances[$scope.ui.instance.instanceId];
    // }
  }]);
