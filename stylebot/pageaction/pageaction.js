$(document).ready(function() {
  PageAction.init();
});

var PageAction = {
  styles: {},

  init: function() {
    chrome.windows.getCurrent({populate: true}, function(aWindow) {
      var tabs = aWindow.tabs;
      var len = tabs.length;
      for (var i = 0; i < len; i++) {
        var tab = tabs[i];
        if (tab.active) {
          $(".share").click(function(e) {
            PageAction.share(e, tab);
          });
          $(".open").click(function(e) {
            PageAction.open(e, tab);
          });
          $(".reset").click(function(e) {
            PageAction.reset(e, tab);
          }).mouseenter(function(e) {
            chrome.tabs.sendRequest(tab.id, {
              name: "previewReset"
            }, function(response){});
          }).mouseleave(function(e) {
            chrome.tabs.sendRequest(tab.id, {
              name: "resetPreview"
            }, function(response){});
          })
          $(".options").click(function(e) {
            PageAction.options(e, tab);
          });

          chrome.tabs.sendRequest(tab.id, {name: "getURLAndSocialData"}, function(response) {
            var socialId = null;

            if (response.social && response.social.id) {
              socialId = response.social.id;
            }

            $.get("http://stylebot.me/search_api?q=" + response.url, function(styles_str) {
              var styles = JSON.parse(styles_str);
              styles = _.sortBy(styles, function(style) {
                return (style.id == socialId) ? -1 : 1;
              });

              var len = styles.length;
              var $menu = $("#menu");
              $menu.html('');

              if (len === 0) {
                var html = '<li class="disabled"><a>No Styles Found.</a></li>';
                $menu.append(html);
                return;
              }

              for (var i = 0; i < len; i++) {
                var name = styles[i].title;
                if (name.length > 25) {
                  name = name.substring(0, 25) + "...";
                }

                var title = styles[i].description;
                var url = styles[i].site;
                var id = styles[i].id;
                var link = "http://stylebot.me/styles/" + id;
                var featured = (styles[i].featured == 1);
                var timestamp = styles[i].updated_at;
                var timeAgo = moment(timestamp).fromNow();
                var username = styles[i].username;
                var userLink = "http://stylebot.me/users/" + styles[i].username;
                var favCount = styles[i].favorites;

                PageAction.styles[id] = styles[i].css;

                var html = '<li class="style-item" data-title="' + name +'" data-id="' +
                id + '" data-desc="' + title +
                '" data-author="' + username +
                '" data-favcount="' + favCount +
                '" data-timeago="' + timeAgo +
                '" data-timestamp="' + timestamp +
                '" role="presentation">' +
                '<div role="menuitem" tabindex="-1" href="#">' +
                name + '<span class="style-meta"><a class="style-link" href="' +
                link + '">link</a>';
                html += ' by <a class="style-author" href="' + userLink + '">' + username +'</a>';

                html += '<span class="pull-right">';

                if (featured) {
                  html += '<span class="style-featured">featured</span>';
                }

                if (socialId == styles[i].id) {
                  html += '<span class="style-installed">installed</span>';
                } else {
                  html += '<span class="hide style-installed">installed</span>';
                }

                html += '</span></div></li>';
                $menu.append(html);
              }

              $('.style-link, .style-author').click(PageAction.openLink);

              $('.style-item').mouseenter(function(e) {
                setTimeout(function() {
                  PageAction.onStyleMouseenter(e, tab);
                }, 0);
              });

              $('#menu').mouseleave(function(e) {
                setTimeout(function() {
                  PageAction.onStyleMouseleave(e, tab)
                }, 100);
              });

              $('.style-item').click(function(e) {
                PageAction.install(e, tab);
              });
            });
          });

          return;
        }
      }
    });
  },

  onStyleMouseenter: function(e, tab) {
    var $el = $(e.target);
    if (!$el.hasClass('style-item')) {
      $el = $el.parents('.style-item');
    }

    var id = $el.data('id');
    var css = PageAction.styles[id];
    var title = $el.data('title');
    var description = $el.data('desc');
    var favCount = $el.data('favcount');
    var author = $el.data('author');
    var timeAgo = $el.data('timeago');

    chrome.tabs.sendRequest(tab.id, {
      name: "preview",
      description: description,
      title: title,
      author: author,
      timeAgo: timeAgo,
      favCount: favCount,
      css: css
    }, function(response){});
  },

  onStyleMouseleave: function(e, tab) {
    chrome.tabs.sendRequest(tab.id, {name: "resetPreview"}, function(response){});
  },

  install: function(e, tab) {
    var $el = $(e.target);
    if ($el.hasClass("style-link") || $el.hasClass("style-author")) {
      return;
    }

    $('.style-installed').hide();
    $('.style-installed', $el).show();

    if (!$el.hasClass('style-item')) {
      $el = $el.parents('.style-item');
    }

    var id = $el.data('id');
    var css = PageAction.styles[id];
    var title = $el.data('title');
    var timestamp = $el.data('timestamp');

    chrome.tabs.sendRequest(tab.id, {
      name: "install",
      id: id,
      title: title,
      css: css,
      timestamp: timestamp
    }, function(response){});
  },

  share: function(e, tab) {
    chrome.windows.getCurrent(null, function(aWindow) {
      chrome.tabs.captureVisibleTab(aWindow.id, {format: "png"}, function(dataUrl) {
        chrome.tabs.sendRequest(tab.id, {
          name: "shareOnSocial",
          screenshot: dataUrl
        }, function(response){});
      });
    });
  },

  open: function(e, tab) {
    chrome.tabs.sendRequest(tab.id, {name: "toggle"}, function(response){});
    window.close();
  },

  options: function(e, tab) {
    chrome.tabs.sendRequest(tab.id, {name: "viewOptions"}, function(response){});
    window.close();
  },

  reset: function(e, tab) {
    chrome.tabs.sendRequest(tab.id, {name: "reset"}, function(response){});
  },

  openLink: function(e, tab) {
    e.preventDefault();
    chrome.tabs.create({
      url: $(e.target).attr('href'),
      active: false
    })
  }
}
