(function () {
  var pageUrl = document.location.href,
      pageId = getPageId(pageUrl),
      pmntAdded = isPmntAdded();

  console.log('pageId:', pageId);
  console.log('pmntAdded:', pmntAdded);

  if (pageId === 'welcome' && pmntAdded) {
    if (shouldPromptPromoCode()) {
      document.location.href = 'https://cloud.digitalocean.com/settings/billing';
    }
  }
  if (pageId === 'billing' && pmntAdded) {
    showOverlay();
  }

  function showOverlay() {
    var overlay = document.createElement('div');
    overlay.id = '__uProxyOverlay';
    overlay.style.position   = 'fixed';
    overlay.style.top        = '0';
    overlay.style.left       = '0';
    overlay.style.bottom     = '0';
    overlay.style.right      = '0';
    overlay.style.opacity    = '.97';
    overlay.style.background = '#12A391';
    overlay.style.zIndex   = '10000';
    overlay.style.textAlign  = 'center';

    var h1 = document.createElement('h1');
    h1.style.fontWeight = 'bold';
    h1.innerText = _('Authorize uProxy to connect with DigitalOcean');
    overlay.appendChild(h1);

    if (shouldPromptPromoCode()) {
      var promoContainer = document.createElement('div');
      var promoInput = document.createElement('input');
      promoInput.style.width = '300px';
      promoInput.placeholder = _('Have a promo code? Enter it here.');
      var applyButton = document.createElement('button');
      applyButton.innerText = 'Apply';
      var DOtoken = document.querySelector('input[name="authenticity_token"]');
      if (!DOtoken) {
        console.log('Missing DOtoken. DigitalOcean UI changed?');
        return;
      }
      applyButton.onclick = function (evt) {
        var data = new FormData();
        data.append('code', promoInput.value);
        data.append('authenticity_token', DOtoken.value);
        var req = new Request('/promos', {
          method: 'post',
          headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-csrf-token': DOtoken.value,
            'x-requested-with': 'XMLHttpRequest'
          },
          body: data,
          credentials: 'include'
        });
        fetch(req).then(function (resp) {
          return resp.json();
        }).then(function (data) {
          if (typeof data !== 'object' || data.status === 'invalid') {
            // TODO: handle failure
            return;
          }
          debugger;
          // TODO: call `setPromoCodeApplied(1)` if the submission succeeds.
          //setPromoCodeApplied(1);
        }).catch(function (e) {
          debugger;
          // TODO: handle failure
        });
      };

      promoContainer.appendChild(promoInput);
      promoContainer.appendChild(applyButton);
      overlay.appendChild(promoContainer);
    }

    var proceedContainer = document.createElement('div');
    var proceedLink = document.createElement('a');
    proceedLink.style.color = '#fff';
    proceedLink.style.fontSize = '48px';
    proceedLink.style.fontWeight = 'bold';
    proceedLink.style.textDecoration = 'underline';
    proceedLink.innerText = 'Proceed';
    // This url should close the tab and open the uProxy extension, which
    // instructs the user to click 'sign in' after creating the DO account.
    // Requires: https://github.com/uproxy/uproxy/tree/bemasc-autoclose
    // Eventually we should save the user this extra click, and have this
    // trigger oauth directly.
    proceedLink.href = 'https://www.uproxy.org/autoclose';
    proceedContainer.appendChild(proceedLink);
    overlay.appendChild(proceedContainer);

    document.body.appendChild(overlay);
  }

  function shouldPromptPromoCode() {
    return havePromoCode() && !isPromoCodeApplied();
  }

  function havePromoCode() {
    // TODO: grab this from ui_context.model.globalSettings.promo
    return true;
  }

  var _PROMO_CODE_APPLIED_KEY = '__uProxyPromoCodeApplied';

  function isPromoCodeApplied() {
    return !!localStorage[_PROMO_CODE_APPLIED_KEY];
  }

  function setPromoCodeApplied(val) {
    if (val) {
      localStorage[_PROMO_CODE_APPLIED_KEY] = 1;
    } else {
      delete localStorage[_PROMO_CODE_APPLIED_KEY];
    }
  }

  /**
   * Return whether the user has added a credit card.
   * Ideally we could use some API to check this, but none is available.
   * So unfortunately we must resort to sniffing the current page's content.
   * TODO: Can we make this less brittle?
   */
  function isPmntAdded() {
    if (pageId === 'welcome') {
      // The blue 'Create Droplet' button is disabled until a payment menthod
      // has been added, so use this to detect whether payment method added.
      // (There's also a green 'Create Droplet' button in the topnav, which
      // is never disabled. The following selector targets only the button
      // we care about, not the one in the topnav.)
      var cdbtn = document.querySelector('a[href="/droplets/new"].action');
      return !hasClass(cdbtn, 'is-disabled');
    }
    if (pageId === 'billing') {
      var pd = document.getElementById('Payment-details');
      if ('data-shelfid' in pd.attributes) {
        return !hasClass(pd, 'is-open');
      }
      return false;
    }
  }

  function getPageId(url) {
    if (url.indexOf('cloud.digitalocean.com/welcome') > -1) {
      return 'welcome';
    }
    if (url.indexOf('cloud.digitalocean.com/settings/billing') > -1) {
      return 'billing';
    }
  }

  function _(s) {
    return s;
  }

  function hasClass(el, className) {
    var cl = el.classList;
    for (var i=0, c=cl[i]; c; c=cl[++i]) {
      if (c === className) {
        return true;
      }
    }
    return false;
  }

  (function modifyUI() {
    (function hideEls() {
      // hide elements for the following selectors on all pages
      ['a.create_droplet'   // 'Create Droplet' button in topnav
      ].map(hideEl);

      if (pageId === 'welcome') {
        // hide the 'Create Droplet' box
        // (there's no more-specific selector for it than this, unfortunately)
        hideEl('div.small-4:last-child');
      }

      function hideEl(selector) {
        var el = document.querySelector(selector);
        el && (el.style.opacity = '0.1');
      }
    })();
  })();
})();
