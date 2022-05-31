var routeColor = '#000000'
var roadColor = '#4AA96C'
var connectorColor = '#FFE162'
var gravelColor = '#009DAE'
var reconColor = '#9D84B7'
var cautionColor = '#D9534F'


var campIcon = L.icon({
  iconUrl: 'resources/camp.png',
  iconSize: [23, 32],
  iconAnchor: [11, 32],
  popupAnchor: [0,-32],
});

var recIcon = L.icon({
  iconUrl: 'resources/rec-site.png',
  iconSize: [23, 32],
  iconAnchor: [11, 32],
  popupAnchor: [0,-32],
});

var foodIcon = L.icon({
  iconUrl: 'resources/food.png',
  iconSize: [23, 32],
  iconAnchor: [11, 32],
  popupAnchor: [0,-32],
});

var groceryIcon = L.icon({
  iconUrl: 'resources/grocery.png',
  iconSize: [23, 32],
  iconAnchor: [11, 32],
  popupAnchor: [0,-32],
});

var bikeIcon = L.icon({
  iconUrl: 'resources/bike.png',
  iconSize: [23, 32],
  iconAnchor: [11, 32],
  popupAnchor: [0,-32],
});

var cafeIcon = L.icon({
    iconUrl: 'resources/cafe.png',
    iconSize: [23, 32],
    iconAnchor: [11, 32],
    popupAnchor: [0,-32],
});
var warningIcon = L.icon({
  iconUrl: 'resources/warning.png',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0,-8],
});

function themeMarker(icon, marker){
    switch (icon){
        case "tent":
            marker.setIcon(campIcon)
            break;
        case "grocery":
            marker.setIcon(groceryIcon)
            break;
        case "bench":
            marker.setIcon(recIcon)
            break;
        case "food":
            marker.setIcon(foodIcon)
            break;
        case "restaurant":
            marker.setIcon(foodIcon)
            break;
        case "cafe":
            marker.setIcon(cafeIcon)
            break;
        case "bikeshop":
            marker.setIcon(bikeIcon)
            break;
        case "warning":
            marker.setIcon(warningIcon)
            break;         
    }

}