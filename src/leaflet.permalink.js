L.Permalink = {
    //gets the map center, zoom-level and rotation from the URL if present, else uses default values
    getMapLocation: function (zoom, center) {
        'use strict';
        zoom = (zoom || zoom === 0) ? zoom : 9;
        center = (center) ? center : [49.09311, -123.68723];
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
          });
        let value = params.lat;

        if (params.lat !== null) {
            console.log('position loaded via qs')
                center = {
                    lat: params.lat,
                    lng: params.long
                };
                zoom = params.zoom;
            
        }
        return {zoom: zoom, center: center};
    },

    setup: function (map) {
        'use strict';
        var shouldUpdate = true;
        var updatePermalink = function () {
            if (!shouldUpdate) {
                // do not update the URL when the view was changed in the 'popstate' handler (browser history navigation)
                shouldUpdate = true;
                return;
            }

            var center = map.getCenter();
            var queryString = ''
            queryString += ('lat=' + Math.round(center.lat * 100000) / 100000 + '&')
            queryString += ('long=' + Math.round(center.lng * 100000) / 100000 + '&' )
            queryString += ('zoom=' + map.getZoom() )
            var pageUrl = window.location.protocol + "//" + window.location.host + '?' + queryString + window.location.hash 
            console.log(window.location.hash);
            window.history.replaceState({path:pageUrl}, '', pageUrl);
        };

        map.on('moveend', updatePermalink);

        // restore the view state when navigating through the history, see
        // https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate
        window.addEventListener('popstate', function (event) {
            if (event.state === null) {
                return;
            }
            map.setView(event.state.center, event.state.zoom);
            shouldUpdate = false;
        });
    }
};