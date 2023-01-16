
export default function storageLayer(baseLayer, layerswitcher) {
  let layer;

  const getGeoJsonData = () => getStorageInfo(urlTemplate)
    .then((tiles) => getStoredTilesAsJson(baseLayer, tiles));

  const addStorageLayer = () => {
    getGeoJsonData().then((geojson) => {
      layer = L.geoJSON(geojson).bindPopup(
        (clickedLayer) => clickedLayer.feature.properties.key,
      );
      layerswitcher.addOverlay(layer, 'offline tiles');
    });
  };

  addStorageLayer();

  baseLayer.on('storagesize', (e) => {
    document.getElementById('storage').innerHTML = e.storagesize;
    if (layer) {
      layer.clearLayers();
      getGeoJsonData().then((data) => {
        layer.addData(data);
      });
    }
  });
}