$(window).on('load', function() {
  var documentSettings = {};
  var completePoints = false;
  var showPointsLegend = true;
  var markerIcons = [];

  /**
   * Sets the map view so that all markers are visible, or
   * to specified (lat, lon) and zoom if all three are specified
   */
  function centerAndZoomMap(points) {
    var lat = map.getCenter().lat, latSet = false;
    var lon = map.getCenter().lng, lonSet = false;
    var zoom = 12, zoomSet = false;
    var center;

    if (getSetting('_initLat') !== '') {
      lat = getSetting('_initLat');
      latSet = true;
    }

    if (getSetting('_initLon') !== '') {
      lon = getSetting('_initLon');
      lonSet = true;
    }

    if (getSetting('_initZoom') !== '') {
      zoom = parseInt(getSetting('_initZoom'));
      zoomSet = true;
    }

    if ((latSet && lonSet) || !points) {
      center = L.latLng(lat, lon);
    } else {
      center = points.getBounds().getCenter();
    }

    if (!zoomSet && points) {
      zoom = map.getBoundsZoom(points.getBounds());
    }

    map.setView(center, zoom);
  }


  /**
   * Given a collection of points, determines the layers based on 'Group'
   * column in the spreadsheet.
   */
  function determineLayers(points) {
    var layerNamesFromSpreadsheet = [];
    var layers = {};
    for (var i in points) {
      var pointLayerNameFromSpreadsheet = points[i]['GroupColor'];
      if (layerNamesFromSpreadsheet.indexOf(pointLayerNameFromSpreadsheet) === -1) {
        layerNamesFromSpreadsheet.push(pointLayerNameFromSpreadsheet);       
        markerIcons.push( '&nbsp;&nbsp;&nbsp;<i class="fa fa-file fa-lg " style="color: '+ points[i]['Color']+ '"></i>&nbsp;&nbsp;' );
      }
    } 
    
    for (var i in points) {
      var pointLayerNameFromSpreadsheet = points[i]['GroupSides'];
      if (layerNamesFromSpreadsheet.indexOf(pointLayerNameFromSpreadsheet) === -1) {
        layerNamesFromSpreadsheet.push(pointLayerNameFromSpreadsheet);       
        markerIcons.push( '&nbsp;&nbsp;&nbsp;<img src="icons/' + points[i]['Sides'] + '.png" class="markers-legend-icon">&nbsp;&nbsp;');
      }
      
    }
   
    for (var i in layerNamesFromSpreadsheet) {
      var layerNameFromSpreadsheet = layerNamesFromSpreadsheet[i];
      layers[layerNameFromSpreadsheet] = L.layerGroup();
      layers[layerNameFromSpreadsheet].addTo(map);
    }
	
    if (layerNamesFromSpreadsheet.length === 1){showPointsLegend = false;}	

    return layers;
  }

  /**
   * Assigns points to appropriate layers and clusters them if needed
   */
  function mapPoints(points, layers) {
    var markerArray = [];
    // check that map has loaded before adding points to it?
    for (var i in points) {
      var point = points[i];
      if (point.Latitude !== '' && point.Longitude !== '') {
      if (point['Radius'] !== '') {
          var marker = new L.RegularPolygonMarker([point.Latitude, point.Longitude],
                                                   {numberOfSides: point['Sides'] === '0' ? 50 : point['Sides'] , 
                                                    weight: 2,
                                                    color: point['Color'], 
                                                    fillOpacity: 0.8, 
                                                    imageCircleUrl: point['Marker Icon'], 
                                                    radius: point['Radius'],
                                                   }) ;  
        } 
        
        marker.bindTooltip(point['Name'],{ permanent: false , direction: 'auto'});
        marker.bindPopup("<b>" + point['Name'] + '</b><br>' + point['Description']);
        marker.addTo(layers[point.GroupColor]);
        marker.addTo(layers[point.GroupSides]);
        markerArray.push(marker);
      }
    }

    var group = L.featureGroup(markerArray);       
        
    var pos = trySetting('_pointsLegendPos', 'topleft');

    var pointsLegend = L.control.layers(null, layers, {
      collapsed: false,
      position: pos,
    });
    
    pointsLegend.addTo(map);
    pointsLegend._container.id = 'points-legend';
    pointsLegend._container.className += ' ladder';     
    
    $('#points-legend').prepend('<h6 class="pointer">' + getSetting('_pointsLegendTitle') + '</h6>');    
    	

    completePoints = true;
    return group;
  }


  /**
   * Here all data processing from the spreadsheet happens
   */
  function onMapDataLoad() {
    var options = mapData.sheets(constants.optionsSheetName).elements;
    createDocumentSettings(options);

    document.title = getSetting('_mapTitle');
    addBaseMap();

    // Add point markers to the map
    var points = mapData.sheets(constants.pointsSheetName);
    var layers;
    var group = '';
    if (points && points.elements.length > 0) {
      layers = determineLayers(points.elements);
      group = mapPoints(points.elements, layers);
    } else {
      completePoints = true;
    }
    centerAndZoomMap(group);
  

    // Add zoom control
    if (getSetting('_mapZoom') !== 'off') {
      L.control.zoom({position: getSetting('_mapZoom')}).addTo(map);
    }

    addTitle();   

    // Change Map attribution to include author's info + urls
    changeAttribution();           
    
    // Append icons to categories in markers legend
    $('#points-legend form label span').each(function(i) {
      var legendIcon = markerIcons[i];
      $(this).prepend(legendIcon); 
    });
    
    
    // When all processing is done, hide the loader and make the map visible
    showMap();
    
    function showMap() {
      if (completePoints ) {
        $('.ladder h6').append('<span class="legend-arrow"><i class="fa fa-chevron-down"></i></span>');
        $('.ladder h6').addClass('minimize');


        $('.ladder h6').click(function() {
          if ($(this).hasClass('minimize')) {
            $('.ladder h6').addClass('minimize');
            $('.legend-arrow i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
            $(this).removeClass('minimize')
              .parent().find('.legend-arrow i')
              .removeClass('fa-chevron-down')
              .addClass('fa-chevron-up');
          } else {
            $(this).addClass('minimize');
            $(this).parent().find('.legend-arrow i')
              .removeClass('fa-chevron-up')
              .addClass('fa-chevron-down');
          }
        });

        $('.ladder h6').get(0).click();

        $('#map').css('visibility', 'visible');
        $('.loader').hide();

    
      } else {
        setTimeout(showMap, 50);
      }
    }
  }

  /**
   * Adds title and subtitle from the spreadsheet to the map
   */
  function addTitle() {
    var dispTitle = getSetting('_mapTitleDisplay');

    if (dispTitle !== 'off') {
      var title = '<h3 class="pointer">' + getSetting('_mapTitle') + '</h3>';
      var subtitle = '<h5>' + getSetting('_mapSubtitle') + '</h5>';

      if (dispTitle == 'topleft') {
        $('div.leaflet-top').prepend('<div class="map-title leaflet-bar leaflet-control leaflet-control-custom">' + title + subtitle + '</div>');
      } else if (dispTitle == 'topcenter') {
        $('#map').append('<div class="div-center"></div>');
        $('.div-center').append('<div class="map-title leaflet-bar leaflet-control leaflet-control-custom">' + title + subtitle + '</div>');
      }

      $('.map-title h3').click(function() { location.reload(); });
    }
  }



  /**
   * Changes map attribution (author, GitHub repo, email etc.) in bottom-right
   */
  function changeAttribution() {
    var attributionHTML = $('.leaflet-control-attribution')[0].innerHTML;
    var credit = 'View <a href="' + googleDocURL + '" target="_blank">data</a>';
    var name = getSetting('_authorName');
    var url = getSetting('_authorURL');

    if (name && url) {
      if (url.indexOf('@') > 0) { url = 'mailto:' + url; }
      credit += ' by <a href="' + url + '">' + name + '</a> | ';
    } else if (name) {
      credit += ' by ' + name + ' | ';
    } else {
      credit += ' | ';
    }

    credit = '';
    if (getSetting('_codeCredit')) credit += ' by ' + getSetting('_codeCredit');
    credit += ' with ';
    $('.leaflet-control-attribution')[0].innerHTML = credit + attributionHTML;
  }


  /**
   * Loads the basemap and adds it to the map
   */
  function addBaseMap() {
    var basemap = trySetting('_tileProvider', 'CartoDB.Positron');
    L.tileLayer.provider(basemap, {
      maxZoom: 18
    }).addTo(map);
    L.control.attribution({
      position: trySetting('_mapAttribution', 'bottomright')
    }).addTo(map);
  }

  /**
   * Returns the value of a setting s
   * getSetting(s) is equivalent to documentSettings[constants.s]
   */
  function getSetting(s) {
    return documentSettings[constants[s]];
  }


  /**
   * Returns the value of setting named s from constants.js
   * or def if setting is either not set or does not exist
   * Both arguments are strings
   * e.g. trySetting('_authorName', 'No Author')
   */
  function trySetting(s, def) {
    s = getSetting(s);
    if (!s || s.trim() === '') { return def; }
    return s;
  }



  /**
   * Triggers the load of the spreadsheet and map creation
   */
   var mapData;
   mapData = Tabletop.init({
   	key: googleDocURL,
        callback: function(data, mapData) { onMapDataLoad(); }
   });


  /**
   * Reformulates documentSettings as a dictionary, e.g.
   * {"webpageTitle": "Leaflet Boilerplate", "infoPopupText": "Stuff"}
   */
  function createDocumentSettings(settings) {
    for (var i in settings) {
      var setting = settings[i];
      documentSettings[setting.Setting] = setting.Customize;
    }
  }



  // Returns a string that contains digits of val split by comma evey 3 positions
  // Example: 12345678 -> "12,345,678"
  function comma(val) {
      while (/(\d+)(\d{3})/.test(val.toString())) {
          val = val.toString().replace(/(\d+)(\d{3})/, '$1' + ',' + '$2');
      }
      return val;
  }
  


  
  

});
