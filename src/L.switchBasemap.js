L.Control.basemapsSwitcher = L.Control.extend({
    options: {
        position: 'topright',
    },

    initialize: function(layers, options){
        L.Util.setOptions(this, options);
        this.layers = layers
    },

    onAdd: function (map){
        const container  = L.DomUtil.create('div', 'leaflet-control-basemapsSwitcher');
        console.log(container)
        this._createItems();


        return container;
    },

    _createItems() {
        this.layers.forEach( (obj, index) => {
            obj.id = index

            const imgContainer = L.DomUtil.create('div', 'basemapImg');
            const img = L.DomUtil.create('div');
            const name = L.DomUtil.create('div', 'name');
            const check = L.DomUtil.create('div', 'check');
            name.innerHTML = obj.name

            if(obj.layer?._map){
                this.activeMap = obj
                check.classList.add('activeMap');
            }
            
            img.style.backgroundImage = `url(${obj.icon})`;
            imgContainer.append(img)

            img.append(name)
            
            imgContainer.addEventListener('click', () =>{

                this._removeLayers(obj.layer);
                
                if(!obj.layer?._map){
                    obj.layer.addTo(this._map);
                    this.activeMap = obj;
                    this._collapse();

                    check.classList.add('activeMap');
                }

            })

            document.getElementById("basemap-control").append(imgContainer)

        })
    },

    _removeLayers(layer){

        this.layers.forEach( (obj) =>{
            if(obj.layer._leaflet_id !== layer._leaflet_id && obj.layer?._map) {
                this._map.removeLayer(obj.layer);
            }
        })
    },



    _expand(){

        this.container.childNodes.forEach( (child) => {
            child.classList.remove('hidden')
        })
    }

})

L.basemapsSwitcher = function(layers, options){
    return new L.Control.basemapsSwitcher(layers, options);  
}
