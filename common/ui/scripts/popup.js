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
    $scope.splashPage = false;   // Splash / options page.
    $scope.rosterNudge = false;  // Full roster vs. Individual Contact Details
    $scope.advancedOptions = false;

    // Initial filter state.
    $scope.filters = {
      'all': true,
      'online': true,
      'myAccess': false,
      'friendsAccess': false
    };
    $scope.instances = $scope.model.instances;

    //
    $scope.currentContact = {};  // Visible for the individual contact page.

    var _getTrust = function(client) {
      return $scope.instances[client.instanceId].trust;
    };

    // Whether UProxy is logged in to *any* network.
    $scope.loggedIn = function() {
      return $scope.isOnline('google') || $scope.isOnline('facebook');
    };
    $scope.splashPage = !$scope.loggedIn();

    // Opening the detailed contact view.
    $scope.toggleContact = function(c) {
      $scope.currentContact = c;
      console.log(c);
      $scope.rosterNudge = true;
    };

    // Toggling the 'options' page which is just the splash page.
    $scope.toggleOptions = function() {
      $scope.splashPage = !$scope.splashPage;
    };

    // Multifiter function for determining whether a contact should be hidden.
    $scope.contactIsFiltered = function(c) {
      var searchText = $scope.search,
          compareString = c.name.toLowerCase();
      // First, compare filters.
      if (!$scope.filters.offline && !c.online) {
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

  }]);
