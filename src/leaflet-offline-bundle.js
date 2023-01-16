  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var L__default = /*#__PURE__*/_interopDefaultLegacy(L);

  /**
   * Api methods used in control and layer
   * For advanced usage
   *
   * @module TileManager
   *
   */
  const tileStoreName = 'tileStore';
  const urlTemplateIndex = 'urlTemplate';
  const dbPromise = idb.openDB('leaflet.offline', 2, {
    upgrade(db, oldVersion) {
      idb.deleteDB('leaflet_offline');
      idb.deleteDB('leaflet_offline_areas');

      if (oldVersion < 1) {
        const tileStore = db.createObjectStore(tileStoreName, {
          keyPath: 'key'
        });
        tileStore.createIndex(urlTemplateIndex, 'urlTemplate');
        tileStore.createIndex('z', 'z');
      }
    }

  });
  /**
   * @typedef {Object} tileInfo
   * @property {string} key storage key
   * @property {string} url resolved url
   * @property {string} urlTemplate orig url, used to find tiles per layer
   * @property {string} x left point of tile
   * @property {string} y top point coord of tile
   * @property {string} z tile zoomlevel
   * @property {Number} createdAt
   */

  /**
   * @example
   * ```js
   * import { getStorageLength } from 'leaflet.offline'
   * getStorageLength().then(i => console.log(i + 'tiles in storage'))
   * ```
   * @return {Promise<Number>} get number of store tiles
   */

  async function getStorageLength() {
    return (await dbPromise).count(tileStoreName);
  }
  /**
   * @example
   * ```js
   * import { getStorageInfo } from 'leaflet.offline'
   * getStorageInfo('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
   * ```
   * @param {string} urlTemplate
   *
   * @return {Promise<tileInfo[]>}
   */

  async function getStorageInfo(urlTemplate) {
    const range = IDBKeyRange.only(urlTemplate);
    return (await dbPromise).getAllFromIndex(tileStoreName, urlTemplateIndex, range);
  }
  /**
   * @example
   * ```js
   * import { downloadTile } from 'leaflet.offline'
   * downloadTile(tileInfo.url).then(blob => saveTile(tileInfo, blob))
   * ```
   * @param {string} tileUrl
   * @return {Promise<blob>}
   */

  async function downloadTile(tileUrl) {
    return fetch(tileUrl).then(response => {
      if (!response.ok) {
        throw new Error("Request failed with status ".concat(response.statusText));
      }

      return response.blob();
    });
  }
  /**
   * TODO validate tileinfo props?
   *
   * @example
   * ```js
   * saveTile(tileInfo, blob).then(() => console.log(`saved tile from ${tileInfo.url}`))
   * ```
   *
   * @param {tileInfo} tileInfo
   * @param {Blob} blob
   *
   * @return {Promise}
   */

  async function saveTile(tileInfo, blob) {
    ['urlTemplate', 'z', 'x', 'y', 'key', 'url', 'createdAt'].forEach(key => {
      if (tileInfo[key] === undefined) {
        throw Error("Missing ".concat(key, " prop"));
      }
    });
    return (await dbPromise).put(tileStoreName, {
      blob,
      ...tileInfo
    });
  }
  /**
   *
   * @param {string} urlTemplate
   * @param {object} data  x, y, z, s
   * @param {string} data.s subdomain
   *
   * @returns {string}
   */

  function getTileUrl(urlTemplate, data) {
    return L__default["default"].Util.template(urlTemplate, { ...data,
      r: L__default["default"].Browser.retina ? '@2x' : ''
    });
  }
  /**
   * @example
   * const p1 = L.point(10, 10)
   * const p2 = L.point(40, 60)
   * getTileUrls(layer, L.bounds(p1,p2), 12)
   *
   * @param {object} layer leaflet tilelayer
   * @param {object} bounds L.bounds
   * @param {number} zoom zoomlevel 0-19
   *
   * @return {Array.<tileInfo>}
   */

  function getTileUrls(layer, bounds, zoom) {
    const tiles = [];
    const tileBounds = L__default["default"].bounds(bounds.min.divideBy(layer.getTileSize().x).floor(), bounds.max.divideBy(layer.getTileSize().x).floor());

    for (let j = tileBounds.min.y; j <= tileBounds.max.y; j += 1) {
      for (let i = tileBounds.min.x; i <= tileBounds.max.x; i += 1) {
        const tilePoint = new L__default["default"].Point(i, j);
        const data = { ...layer.options,
          x: i,
          y: j,
          z: zoom
        };
        tiles.push({
          key: getTileUrl(layer._url, { ...data,
            s: layer.options.subdomains['0']
          }),
          url: getTileUrl(layer._url, { ...data,
            s: layer._getSubdomain(tilePoint)
          }),
          z: zoom,
          x: i,
          y: j,
          urlTemplate: layer._url,
          createdAt: Date.now()
        });
      }
    }

    return tiles;
  }
  /**
   * Get a geojson of tiles from one resource
   *
   * @example
   * const urlTemplate = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
   * const getGeoJsonData = () => LeafletOffline.getStorageInfo(urlTemplate)
   *  .then((data) => LeafletOffline.getStoredTilesAsJson(baseLayer, data));
   *
   * getGeoJsonData().then((geojson) => {
   *   storageLayer = L.geoJSON(geojson).bindPopup(
   *     (clickedLayer) => clickedLayer.feature.properties.key,
   *   );
   * });
   *
   * @param {object} layer
   * @param {tileInfo[]} tiles
   *
   * @return {object} geojson
   */

  function getStoredTilesAsJson(layer, tiles) {
    const featureCollection = {
      type: 'FeatureCollection',
      features: []
    };

    for (let i = 0; i < tiles.length; i += 1) {
      const topLeftPoint = new L__default["default"].Point(tiles[i].x * layer.getTileSize().x, tiles[i].y * layer.getTileSize().y);
      const bottomRightPoint = new L__default["default"].Point(topLeftPoint.x + layer.getTileSize().x, topLeftPoint.y + layer.getTileSize().y);
      const topLeftlatlng = L__default["default"].CRS.EPSG3857.pointToLatLng(topLeftPoint, tiles[i].z);
      const botRightlatlng = L__default["default"].CRS.EPSG3857.pointToLatLng(bottomRightPoint, tiles[i].z);
      featureCollection.features.push({
        type: 'Feature',
        properties: tiles[i],
        geometry: {
          type: 'Polygon',
          coordinates: [[[topLeftlatlng.lng, topLeftlatlng.lat], [botRightlatlng.lng, topLeftlatlng.lat], [botRightlatlng.lng, botRightlatlng.lat], [topLeftlatlng.lng, botRightlatlng.lat], [topLeftlatlng.lng, topLeftlatlng.lat]]]
        }
      });
    }

    return featureCollection;
  }
  /**
   * Remove tile by key
   * @param {string} key
   *
   * @returns {Promise}
   */

  async function removeTile(key) {
    return (await dbPromise).delete(tileStoreName, key);
  }
  /**
   * Get single tile blob
   *
   * @param {string} key
   *
   * @returns {Promise<Blob>}
   */

  async function getTile(key) {
    return (await dbPromise).get(tileStoreName, key).then(result => result && result.blob);
  }
  /**
   * Remove everything
   *
   * @return {Promise}
   */

  async function truncate() {
    return (await dbPromise).clear(tileStoreName);
  }

  /**
   * A layer that uses stored tiles when available. Falls back to online.
   *
   * @class TileLayerOffline
   * @hideconstructor
   * @example
   * const tileLayerOffline = L.tileLayer
   * .offline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
   *   attribution: 'Map data {attribution.OpenStreetMap}',
   *   subdomains: 'abc',
   *   minZoom: 13,
   * })
   * .addTo(map);
   */

  const TileLayerOffline = L__default["default"].TileLayer.extend(
  /** @lends  TileLayerOffline */
  {
    _ongoingSave: false,

    initialize(url, options) {
      this._url = url;
      L__default["default"].setOptions(this, options);
      this.on('savestart', () => {
        this._ongoingSave = true;
      });
      this.on('saveend', () => {
        this._ongoingSave = false;
      });
    },

    /**
     * Create tile HTMLElement
     * @private
     * @param  {object}   coords x,y,z
     * @param  {Function} done
     * @return {HTMLElement}  img
     */
    createTile(coords, done) {
      let error;
      const tile = L__default["default"].TileLayer.prototype.createTile.call(this, coords, () => {});
      const url = tile.src;
      tile.src = '';
      this.setDataUrl(coords).then(dataurl => {
        tile.src = dataurl;
        done(error, tile);
      }).catch(() => {
        tile.src = url;
        L__default["default"].DomEvent.on(tile, 'load', L__default["default"].Util.bind(this._tileOnLoad, this, done, tile));
        L__default["default"].DomEvent.on(tile, 'error', L__default["default"].Util.bind(this._tileOnError, this, done, tile));
      });
      return tile;
    },

    /**
     * dataurl from localstorage
     * @private
     * @param {object} coords x,y,z
     * @return {Promise<string>} objecturl
     */
    setDataUrl(coords) {
      if (this._ongoingSave) return Promise.reject(new Error('On download state'));
      return getTile(this._getStorageKey(coords)).then(data => {
        if (data && typeof data === 'object') {
          return URL.createObjectURL(data);
        }

        throw new Error('tile not found in storage');
      });
    },

    /**
     * get key to use for storage
     * @private
     * @param  {string} url url used to load tile
     * @return {string} unique identifier.
     */
    _getStorageKey(coords) {
      return getTileUrl(this._url, { ...coords,
        ...this.options,
        s: this.options.subdomains['0']
      });
    },

    /**
     * getTileUrls for single zoomlevel
     * @private
     * @param  {object} L.latLngBounds
     * @param  {number} zoom
     * @return {object[]} the tile urls, key, url, x, y, z
     */
    getTileUrls(bounds, zoom) {
      return getTileUrls(this, bounds, zoom);
    }

  });
  /**
   * Control finished calculating storage size
   * @event storagesize
   * @memberof TileLayerOffline
   * @type {ControlStatus}
   */

  /**
   * Start saving tiles
   * @event savestart
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile fetched
   * @event loadtileend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * All tiles fetched
   * @event loadend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile saved
   * @event savetileend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * All tiles saved
   * @event saveend
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Tile removed
   * @event tilesremoved
   * @memberof TileLayerOffline
   * @type {object}
   */

  /**
   * Leaflet tilelayer
   * @external "L.tileLayer"
   * @see {@link https://leafletjs.com/reference-1.6.0.html#tilelayer|TileLayer}
   */

  /**
   * @function external:"L.tileLayer".offline
   * @param  {string} url     [description]
   * @param  {object} options {@link http://leafletjs.com/reference-1.2.0.html#tilelayer}
   * @return {TileLayerOffline}      an instance of TileLayerOffline
   */

  L__default["default"].tileLayer.offline = (url, options) => new TileLayerOffline(url, options);

  /**
   * Status of ControlSaveTiles, keeps info about process during downloading
   * ans saving tiles. Used internal and as object for events.
   * @typedef {Object} ControlStatus
   * @property {number} storagesize total number of saved tiles.
   * @property {number} lengthToBeSaved number of tiles that will be saved in db
   * during current process
   * @property {number} lengthSaved number of tiles saved during current process
   * @property {number} lengthLoaded number of tiles loaded during current process
   * @property {array} _tilesforSave tiles waiting for processing
   */

  /**
   * Shows control on map to save tiles
   * @class ControlSaveTiles
   *
   *
   * @property {ControlStatus} status
   *
   * @example
   * const controlSaveTiles = L.control.savetiles(baseLayer, {
   * zoomlevels: [13, 16], // optional zoomlevels to save, default current zoomlevel
   * confirm(layer, successCallback) {
   *   if (window.confirm(`Save ${layer._tilesforSave.length}`)) {
   *     successCallback();
   *   }
   * },
   * confirmRemoval(layer, successCallback) {
   *   if (window.confirm('Remove all the tiles?')) {
   *     successCallback();
   *   }
   * },
   * saveText: '<i class="fa fa-download" aria-hidden="true" title="Save tiles"></i>',
   * rmText: '<i class="fa fa-trash" aria-hidden="true"  title="Remove tiles"></i>',
   * });
   */

  const ControlSaveTiles = L__default["default"].Control.extend(
  /** @lends ControlSaveTiles */
  {
    options: {
      position: 'topleft',
      saveText: '+',
      rmText: '-',
      maxZoom: 19,
      saveWhatYouSee: false,
      bounds: null,
      confirm: null,
      confirmRemoval: null,
      parallel: 50,
      alwaysDownload: true
    },
    status: {
      storagesize: null,
      lengthToBeSaved: null,
      lengthSaved: null,
      lengthLoaded: null,
      _tilesforSave: null
    },

    /**
     * @private
     * @param  {Object} baseLayer
     * @param  {Object} options
     * @return {void}
     */
    initialize(baseLayer, options) {
      this._baseLayer = baseLayer;
      this.setStorageSize();
      L__default["default"].setOptions(this, options);
    },

    /**
     * Set storagesize prop on object init
     * @return {Promise<Number>}
     * @private
     */
    setStorageSize() {
      if (this.status.storagesize) {
        return Promise.resolve(this.status.storagesize);
      }

      return getStorageLength().then(numberOfKeys => {
        this.status.storagesize = numberOfKeys;

        this._baseLayer.fire('storagesize', this.status);

        return numberOfKeys;
      }).catch(() => 0);
    },

    /**
     * get number of saved files
     * @param  {Function} callback [description]
     * @private
     */
    getStorageSize(callback) {
      this.setStorageSize().then(result => {
        if (callback) {
          callback(result);
        }
      });
    },

    /**
     * Change baseLayer
     * @param {TileLayerOffline} layer
     */
    setLayer(layer) {
      this._baseLayer = layer;
    },

    /**
     * Update a config option
     * @param {string} name
     * @param {mixed} value
     */
    setOption(name, value) {
      if (this.options[name] === undefined) {
        throw new Error("Option ".concat(name, " doe not exist"));
      }

      this.options[name] = value;
    },

    onAdd() {
      const container = L__default["default"].DomUtil.create('div', 'savetiles leaflet-bar');
      const {
        options
      } = this;

      this._createButton(options.saveText, 'savetiles', container, this._saveTiles);

      this._createButton(options.rmText, 'rmtiles', container, this._rmTiles);

      return container;
    },

    _createButton(html, className, container, fn) {
      const link = L__default["default"].DomUtil.create('a', className, container);
      link.innerHTML = html;
      link.href = '#';
      L__default["default"].DomEvent.on(link, 'mousedown dblclick', L__default["default"].DomEvent.stopPropagation).on(link, 'click', L__default["default"].DomEvent.stop).on(link, 'click', fn, this).on(link, 'click', this._refocusOnMap, this);
      return link;
    },

    /**
     * starts processing tiles
     * @private
     * @return {void}
     */
    _saveTiles() {
      let bounds;
      let tiles = []; // minimum zoom to prevent the user from saving the whole world

      const minZoom = 5; // current zoom or zoom options

      let zoomlevels = [];

      if (this.options.saveWhatYouSee) {
        const currentZoom = this._map.getZoom();

        if (currentZoom < minZoom) {
          throw new Error("It's not possible to save with zoom below level 5.");
        }

        const {
          maxZoom
        } = this.options;

        for (let zoom = currentZoom; zoom <= maxZoom; zoom += 1) {
          zoomlevels.push(zoom);
        }
      } else {
        zoomlevels = this.options.zoomlevels || [this._map.getZoom()];
      }

      const latlngBounds = this.options.bounds || this._map.getBounds();

      for (let i = 0; i < zoomlevels.length; i += 1) {
        bounds = L__default["default"].bounds(this._map.project(latlngBounds.getNorthWest(), zoomlevels[i]), this._map.project(latlngBounds.getSouthEast(), zoomlevels[i]));
        tiles = tiles.concat(this._baseLayer.getTileUrls(bounds, zoomlevels[i]));
      }

      this._resetStatus(tiles);

      const successCallback = async () => {
        this._baseLayer.fire('savestart', this.status);

        const loader = () => {
          if (tiles.length === 0) {
            return Promise.resolve();
          }

          const tile = tiles.shift();
          return this._loadTile(tile).then(loader);
        };

        const parallel = Math.min(tiles.length, this.options.parallel);

        for (let i = 0; i < parallel; i += 1) {
          loader();
        }
      };

      if (this.options.confirm) {
        this.options.confirm(this.status, successCallback);
      } else {
        successCallback();
      }
    },

    /**
     * set status prop on save init
     * @param {string[]} tiles [description]
     * @private
     */
    _resetStatus(tiles) {
      this.status = {
        lengthLoaded: 0,
        lengthToBeSaved: tiles.length,
        lengthSaved: 0,
        _tilesforSave: tiles
      };
    },

    /**
     * @private
     * @param {string} tile
     * @param { blob} blob
     * @return {void}
     */
    _saveTileAndUpdateStatus(tile, blob) {
      this.status.lengthLoaded += 1;

      this._saveTile(tile, blob);

      this._baseLayer.fire('loadtileend', this.status);

      if (this.status.lengthLoaded === this.status.lengthToBeSaved) {
        this._baseLayer.fire('loadend', this.status);
      }
    },

    /**
     * Loop over status._tilesforSave prop till all tiles are downloaded
     * Calls _saveTile for each download
     * @private
     * @return {void}
     */
    _loadTile: async function _loadTile(jtile) {
      const self = this;
      const tile = jtile;

      if (this.options.alwaysDownload) {
        await downloadTile(tile.url).then(blob => {
          self._saveTileAndUpdateStatus(tile, blob);
        });
      } else {
        await getTile(tile.key).then(blobGetTile => {
          if (blobGetTile === undefined) {
            downloadTile(tile.url).then(blob => {
              self._saveTileAndUpdateStatus(tile, blob);
            });
          } else {
            self._saveTileAndUpdateStatus(tile, blobGetTile);
          }
        });
      }
    },

    /**
     * @private
     * @param  {object} tileInfo save key
     * @param {string} tileInfo.key
     * @param {string} tileInfo.url
     * @param {string} tileInfo.x
     * @param {string} tileInfo.y
     * @param {string} tileInfo.z
     * @param  {blob} blob    [description]
     * @return {void}         [description]
     */
    _saveTile(tileInfo, blob) {
      // original is synchronous
      const self = this;
      saveTile(tileInfo, blob).then(() => {
        self.status.lengthSaved += 1;

        self._baseLayer.fire('savetileend', self.status);

        if (self.status.lengthSaved === self.status.lengthToBeSaved) {
          self._baseLayer.fire('saveend', self.status);

          self.setStorageSize();
        }
      }).catch(err => {
        throw new Error(err);
      });
    },

    _rmTiles() {
      const self = this;

      const successCallback = () => {
        truncate().then(() => {
          self.status.storagesize = 0;

          self._baseLayer.fire('tilesremoved');

          self._baseLayer.fire('storagesize', self.status);
        });
      };

      if (this.options.confirmRemoval) {
        this.options.confirmRemoval(this.status, successCallback);
      } else {
        successCallback();
      }
    }

  });
  /**
   * Leaflet control
   * @external "L.control"
   * @see {@link https://leafletjs.com/reference-1.6.0.html#control|Control}
   */

  /**
   * @function external:"L.control".savetiles
   * @param  {object} baseLayer     {@link http://leafletjs.com/reference-1.2.0.html#tilelayer}
   * @property {Object} options
   * @property {string} [options.position] default topleft
   * @property {string} [options.saveText] html for save button, default +
   * @property {string} [options.rmText] html for remove button, deflault -
   * @property {number} [options.maxZoom] maximum zoom level that will be reached
   * when saving tiles with saveWhatYouSee. Default 19
   * @property {number} [options.parallel] parallel downloads (default 50)
   * @property {boolean} [options.saveWhatYouSee] save the tiles that you see
   * on screen plus deeper zooms, ignores zoomLevels options. Default false
   * @property {function} [options.confirm] function called before confirm, default null.
   * Args of function are ControlStatus and callback.
   * @property {function} [options.confirmRemoval] function called before confirm, default null
   * @return {ControlSaveTiles}
   */

  L__default["default"].control.savetiles = (baseLayer, options) => new ControlSaveTiles(baseLayer, options);




