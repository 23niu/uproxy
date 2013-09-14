/*
 * background.js is evaluated when the app is loaded.
 */

// We use the launch window for debugging.
// TODO: Have a version of the UI here also.
function launchWindow(launchData) {
  chrome.app.window.create('scraps/launch.html', {
    id: "uproxy",
    minWidth: 640,
    minHeight: 480
  });
}
chrome.app.runtime.onLaunched.addListener(launchWindow);

