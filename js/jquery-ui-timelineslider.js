/*
 * jQuery.UI.Timeslider plugin
 * 
 * Creates a range slider component for selecting a time period
 * 
 * REQUIRES:
 * - jQuery (1.4.4 and up)
 * - jQuery UI (1.8.10 and up)
 * - jQuery.UI.iPad plugin (http://code.google.com/p/jquery-ui-for-ipad-and-iphone/)
 * - jQuery Mousewheel plugin (https://github.com/brandonaaron/jquery-mousewheel)
 * - timelineslider.css
 * 
 * EXAMPLE:
 * $.getJSON(json, function(data) {
 * 		$(selector).timelineSlider({
 * 			periods: data.periods,
 * 			end: data.end
 * 		})
 * 		.addTouch();
 * }
 * 
 * OPTIONS:
 * To access the option values, use $(selector).data("settings").optionname
 * from 				- index of the first period in selection
 * height 				- height of the thumb
 * maxzoom 				- the maximum zoom level, equal to the deepest period level
 * minzoom 				- minimum zoom level
 * periods 				- JSON object representing the periods, optionally hierarchical
 * scrollspeed			- scroll speed for _autoScroll feature, 0 to disable _autoScroll
 * step					- minimal width (in pixels) of the period in the timeline
 * to					- index of the last period in selection
 * zoomlevel			- initial zoom level
 * 
 * EVENTS:
 * To add an eventlistener, add this to the option list on init: onEventName: function(){do stuff}
 * onAutoScroll			- triggered when timelineslider is _autoScrolling (when thumb is dragged beyond the viewpane)
 * onCreate				- triggered right after creation of the timelineslider 
 * onScaleStart			- triggered when the left or right thumb handles start to get dragged
 * onScale				- triggered when the left or right thumb handles are being dragged
 * onScaleStop			- triggered when the left or right thumb handles are released after being dragged
 * onSlideStart			- triggered when the thumb starts to get dragged
 * onSlide				- triggered when the thumb is being dragged
 * onSlideStop			- triggered when the thumb is released after being dragged
 * onValueChange		- triggered when the selected period has changed
 * onZoomChange			- triggered when a zoom in or out occurs
 * 
 * METHODS:
 * To call a method, use $(selector).timelineSlider("nameOfMethod", parameters)
 * from([index])		- sets from value, when index is omitted gets from value
 * to([index])			- sets to value, when index is omitted gets to value
 * setValue(val)		- sets a new from and to value, accepts an object with from and to {from:val1,to:val2} // OBSOLETE
 * values([val])		- sets sets a new from and to value, accepts an object with from and to {from:val1,to:val2}, when omitted gets values object
 * setZoomLevel(level)	- sets the zoom level, accepts integer // OBSOLETE
 * zoom([level])		- sets zoomlevel value, when level is omitted gets zoomlevel value
 * getPeriod(index)		- returns the period object with the given index
 * destroy				- removes the timelineslider component
 */

(function($) {

var methods = {
	init : function( options ) {
		return this.each( function() {
			// Default settings
			var settings = {
					periods_flat : [],
					maxlevel : 1,
					from : 0,
					to : 1,
					zoomlevel : 1,
					minzoom : 1,
					maxzoom : 3,
					zoomspeed : 1,
					scrollspeed : 10,
					step : 80,
					height: 35,
					onCreate: null,
					onValueChange: null,
					onZoomChange: null,
					onSlideStart: null,
					onSlide: null,
					onSlideStop: null,
					onScaleStart: null,
					onScale: null,
					onScaleStop: null,
					onAutoScroll: null
			};
			// Override defaults when set
			if ( options ) {
				$.extend( settings, options );
			}
			var timelineslider = $(this);
			// Store settings
			timelineslider.data( "settings", settings );
			// Set attributes
			timelineslider.data( "from", timelineslider.data().settings.from );
			timelineslider.data( "to", timelineslider.data().settings.to );
			timelineslider.data( "zoomlevel", timelineslider.data().settings.zoomlevel );
			// Bind events
			timelineslider.bind( "zoom.timelineSlider", { settings: timelineslider.data( "settings" ) }, methods._doZoom);

			// Create slider
			timelineslider.data( "slider", timelineslider.timelineSlider( "_createSlider" ) );
			// Create indicator and hide
			// timelineslider.data( "indicator", timelineslider.timelineSlider( "_createIndicator" ).hide() );
			// Create zoom controls
			timelineslider.data( "zoomcontrols", timelineslider.timelineSlider( "_createZoomControls" ) );
			// Create scroll controls
			timelineslider.data( "scrollcontrols", timelineslider.timelineSlider( "_createScrollControls" ) );

			// Add components to DOM
			timelineslider.prepend( timelineslider.data( "slider" ) ).append( timelineslider.data( "indicator" ) );

			// Init zoom level slider
			timelineslider.timelineSlider( "_doZoom" );
			// Init thumb label
			timelineslider.timelineSlider( "_setThumbLabel" );

			// Init events
			timelineslider.bind( "onCreate", options.onCreate );
			timelineslider.bind( "onValueChange", options.onValueChange );
			timelineslider.bind( "onZoomChange", options.onZoomChange );
			timelineslider.bind( "onSlideStart", options.onSlideStart );
			timelineslider.bind( "onSlide", options.onSlide );
			timelineslider.bind( "onSlideStop", options.onSlideStop );
			timelineslider.bind( "onScaleStart", options.onScaleStart );
			timelineslider.bind( "onScale", options.onScale );
			timelineslider.bind( "onScaleStop", options.onScaleStop );
			timelineslider.bind( "onAutoScroll", options.onAutoScroll );
			
			$(window).bind( "resize", function() {
				timelineslider.timelineSlider( "_centerSlider" );
			});
			
			// Trigger create event
			timelineslider.trigger( "onCreate" );
		});
	},
	destroy : function() {
		return this.each( function() {
			var timelineslider = $(this),
			data = timelineslider.data( "timelineSlider" );
			// Namespacing FTW
			$(window).unbind( ".timelineSlider" );
			data.timelineSlider.remove();
			timelineslider.removeData( "timelineSlider" );
		});
	},
	
	// Getters & Setters
	
	from : function( i ) {
		if ( i ) {
			this.data().from = i;
			this.timelineSlider( "_refresh" );
			return this;
		} else {
			return this.data().from;
		}
	},
	
	to : function( i ) {
		if ( i ) {
			this.data().to = i;
			this.timelineSlider( "_refresh" );
			return this;
		} else {
			return this.data().to;
		}
	},
	
	values : function( val ) {
		if ( val ) {
			this.data().from = val.from;
			this.data().to = val.to;
			this.timelineSlider( "_refresh" );
			return this;
		} else {
			var val = { "from" : this.data().from, "to" : this.data().to };
			return val;
		}
	},
	
	zoomlevel : function( l ) {
		if ( l ) {
			this.data().zoomlevel = l;
			this.timelineSlider( "_doZoom" );
			this.timelineSlider( "_refresh" );
			return this;
		} else {
			return this.data().zoomlevel;
		}
	},

	// Create functions

	_createPeriods : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data("settings");
		var periods = $("<div>").addClass( "periods" );
		var level = 1;
		$.each( settings.periods, function( key, val ) {
			recursiveFunction( key, val, periods, level );
		});
		function recursiveFunction( key, val, parent, level ) {
			var p = actualFunction( key, val, level );
			var value = val['periods'];
			if ( value instanceof Object ) {
				level += 1;
				$.each( value, function( key, val ) {
					p.append( recursiveFunction( key, val, p, level ) );
				} );
			} else { // Only deepest level elements
				settings.periods_flat.push( val );
				settings.maxlevel = level;
			}
			parent.append( p );
		}
		function actualFunction( key, val, level ) {
			var p = $("<div>").addClass( "period" )
			.addClass( val.type )
			.addClass( "level" + level )
			.css( "min-width", timelineslider.data().zoomlevel * settings.step );
			var l = $("<label>").append( $("<span>").text( val.name ) );
			p.append( l );
			return p;
		}
		return periods;
	},
	_createSlider : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		// Create slider container
		var slider = $("<div>").addClass( "slider" )
		.bind( "mousewheel.timelineSlider", methods._scrollZoom )
		.data( "timelineslider", timelineslider );
		// Create track
		var track = $("<div>")
		.addClass( "track" )
		.css( "overflow", "hidden" )
		.css( "white-space", "nowrap" )
		.data( "timelineslider", timelineslider );
		timelineslider.data().track = track;
		// Create periods
		var periods = timelineslider.timelineSlider( "_createPeriods" );
		timelineslider.data().periods = periods;
		// Create thumb
		var thumb = $("<div>")
		.append( $("<label>") )
		.append( $("<div>").addClass("hotspot") )
		.addClass( "thumb" )
		.draggable( { axis:'x', containment: 'parent', handle: '.hotspot' } )
		.bind( "dragstart.timelineSlider", methods._startSlide )
		.bind( "drag.timelineSlider", { timelineslider: timelineslider }, methods._slide )
		.bind( "dragstop.timelineSlider", { timelineslider: timelineslider }, methods._stopSlide )
		.data( "timelineslider", timelineslider );
		timelineslider.data().thumb = thumb;
		// Create left handle
		var handleleft = $("<div>")
		.addClass( "handle" )
		.addClass( "left" )
		.css( "top", -1 * settings.height - 6 + "px" )
		.draggable( { axis:'x', grid: [ ( timelineslider.data().zoomlevel * settings.step ), 0 ] } )
		.bind( "dragstart.timelineSlider", methods._startScale )
		.bind( "drag.timelineSlider", methods._scale )
		.bind( "dragstop.timelineSlider", methods._stopScale )
		.data( "timelineslider", timelineslider );
		timelineslider.data().handleleft = handleleft;
		// Create right handle
		var handleright = $("<div>")
		.addClass( "handle" )
		.addClass( "right" )
		.css( "top", -2 * settings.height - 6 + "px" )
		.draggable( { axis:'x', grid: [ ( timelineslider.data().zoomlevel * settings.step ), 0 ] } )
		.bind( "dragstart.timelineSlider", methods._startScale )
		.bind( "drag.timelineSlider", methods._scale )
		.bind( "dragstop.timelineSlider", methods._stopScale )
		.data( "timelineslider", timelineslider );
		timelineslider.data().handleright = handleright;
		// Create slider
		var new_slider = slider.append( track.append( periods ) ).append( thumb ).append( handleleft ).append( handleright );
		return new_slider;
	},
	/*_createIndicator : function() {
			// Create indicator container
			var indicator = $("<div>").addClass( "indicator" )
				.bind( "zoom.timelineSlider", function() {
					$.noop();
				});
			// Create track
			var track = $("<div>").addClass( "track" );
			indicator.data( "track", track );
			// Create thumb
			var thumb = $("<div>").addClass( "thumb" );
			indicator.data( "thumb", thumb );
			// Create indicator
			var new_indicator = indicator.append( track ).append( thumb );
			return new_indicator;
		},*/
	_createZoomControls : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		var zoomin = timelineslider.find( "#zoomin" );
		var zoomout = timelineslider.find( "#zoomout" );
		if ( zoomin.length ) {
			// Create zoom in button
			zoomin
			.bind( "mousedown", function( e ) {
				timelineslider.data( "zooming", setInterval( function( e ) {
					timelineslider.timelineSlider( "setZoomLevel", settings.zoomspeed )
				}, 100) );
			})
			.bind( "mouseup", function() {
				clearInterval( timelineslider.data( "zooming" ) );
			})
			.data( "timelineslider", timelineslider );
		}
		if ( zoomout.length ) {
			// Create zoom out button
			zoomout
			.bind( "mousedown", function( e ) {
				timelineslider.data( "zooming", setInterval( function( e ) {
					timelineslider.timelineSlider( "setZoomLevel", settings.zoomspeed * -1 )
				}, 100) );
			})
			.bind( "mouseup", function() {
				clearInterval( timelineslider.data( "zooming" ) );
			})
			.data( "timelineslider", timelineslider );
		}
		var zoomcontrols = { "zoomin" : zoomin, "zoomout" : zoomout };
		return zoomcontrols;
	},
	_createScrollControls : function() {
		var timelineslider = $(this);
		var scrollleft = timelineslider.find( "#scrollleft" );
		var scrollright = timelineslider.find( "#scrollright" );
		if ( scrollleft.length ) {
			// Create scroll left button
			scrollleft.bind( "mousedown", function( e ) {
				timelineslider.data( "scrolling", setInterval( function( e ) { timelineslider.timelineSlider( "_doScroll", -1 ) }, 100) );
			})
			.bind( "mouseup", function() {
				clearInterval( timelineslider.data( "scrolling" ) );
			})
			.data( "timelineslider", timelineslider );
		}
		if ( scrollright.length ) {
			// Create scroll right button
			scrollright.bind( "mousedown", function( e ) {
				timelineslider.data( "scrolling", setInterval( function( e ) { timelineslider.timelineSlider( "_doScroll", 1 ) }, 100) );
			})
			.bind( "mouseup", function() {
				clearInterval( timelineslider.data( "scrolling" ) );
			})
			.data( "timelineslider", timelineslider );
		}
		var scrollcontrols = { "scrollleft" : scrollleft, "scrollright" : scrollright };
		return scrollcontrols;
	},

	// General functions
	
	_refresh : function() {
		this.data().thumb.width( ( this.data().to - this.data().from ) * ( this.data().zoomlevel * this.data().settings.step ) + 2 );
		this.timelineSlider( "_centerSlider" );
		this.timelineSlider( "_setThumbLabel" );
	},

	_centerSlider : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		var track = timelineslider.data().track;
		var thumb = timelineslider.data().thumb;
		// Calculate left position of a centered thumb
		var leftcentered = ( track.width() - thumb.width() ) / 2 ;
		thumb.css( "left", leftcentered + "px" );
		track.scrollLeft( timelineslider.data().from * ( timelineslider.data().zoomlevel * settings.step ) - leftcentered );
		// Update handle positions
		timelineslider.timelineSlider( "_updateHandles" );
	},
	_updateHandles : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		var track = timelineslider.data().track;
		var thumb = timelineslider.data().thumb;
		var handleleft = timelineslider.data().handleleft;
		var handleright = timelineslider.data().handleright;
		// Get left position of thumb
		var l = timelineslider.timelineSlider("_thumbLeft");
		// Set left handle position
		handleleft.css("left", l + "px");
		// Set right handle position
		var r = l+thumb.width()-handleright.width();
		handleright.css("left", r + "px");
		// Set new handle containment
		handleleft.draggable( "option", "containment", [ 0, 0, r, 0] );
		handleright.draggable( "option", "containment", [ Number(l) + ( timelineslider.data().zoomlevel * settings.step ), 0, track.width(), 0] );
	},
	_setThumbLabel : function() {
		var timelineslider = $(this);
		var thumb = timelineslider.data().thumb;
		var track = timelineslider.data().track;
		var settings = timelineslider.data().settings;
		var from_index = Math.round((track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (timelineslider.data().zoomlevel * settings.step));
		var to_index = Math.round(from_index + thumb.width() / (timelineslider.data().zoomlevel * settings.step));
		if ( to_index - from_index > 1 ) {
			var label = settings.periods_flat[from_index].name + " - " + settings.periods_flat[to_index-1].name;
		} else {
			var label = settings.periods_flat[from_index].name;
		}
		thumb.find("label").text( label );
	},
	_gatherNewValue : function() {
		var timelineslider = $(this);
		var data = timelineslider.data();
		var settings = data.settings;
		var track = timelineslider.data().track;
		var thumb = timelineslider.data().thumb;
		var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (timelineslider.data().zoomlevel * settings.step) );
		var to_index = Math.round( from_index + thumb.width() / (timelineslider.data().zoomlevel * settings.step) );
		// Check whether value has changed
		if ( from_index != data.from || to_index != data.to ) {
			// Store new values
			data.from = from_index;
			data.to = to_index;
			// Trigger onValueChange event
			timelineslider.trigger("onValueChange");
		}
	},
	// OBSOLETE - replaced by getter setter 'values', please remove
	setValue : function( val ) {
		var timelineslider = $(this);
		var data = timelineslider.data();
		var settings = data.settings;
		// Store new values
		data.from = val.from;
		data.to = val.to;
		timelineslider.timelineSlider( "_refresh" );
	},
	getPeriod : function( index ) {
		var period = $(this).data("settings").periods_flat[index];
		return period;
	},
	_thumbLeft : function() {
		var thumb = $(this).data( "thumb" );
		// Get left position of thumb
		var _thumbLeft = Number( thumb.css( "left" ).substring( 0, thumb.css( "left" ).indexOf( "px" ) ) );
		return _thumbLeft;
	},
	_updateMouse : function( e ) {
		// Get mouse x position
		$(this).data().mousex = e.pageX;
	},
	_updateThumb : function() {
		var timelineslider = $(this).data( "timelineslider" );
		var handleleft = timelineslider.data().handleleft;
		var handleright = timelineslider.data().handleright;
		var thumb = timelineslider.data().thumb;
		// Get position left slider
		var positionleft = Number( handleleft.css( "left" ).substring( 0, handleleft.css( "left" ).indexOf( "px" ) ) );
		// Get position right slider
		var positionright = Number( handleright.css( "left" ).substring( 0, handleright.css( "left" ).indexOf( "px" ) ) ) + handleright.width();
		// Set new Thumb width
		thumb.width( positionright - positionleft );
		// Set new Thumb position
		thumb.css( "left", handleleft.css( "left" ) );
		// Set thumb label
		timelineslider.timelineSlider( "_setThumbLabel" );
	},

	// Scrolling functions

	_doScroll : function( dir ) {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		var track = timelineslider.data().track;
		var thumb = timelineslider.data().thumb;
		var handleleft = timelineslider.data().handleleft;
		var handleright = timelineslider.data().handleright;
		// Animate track
		track.not( ':animated' ).animate( { scrollLeft: track.scrollLeft() + dir * ( timelineslider.data().zoomlevel * settings.step ) }, 500 / settings.scrollspeed, function() {
			// Set thumb label
			timelineslider.timelineSlider( "_setThumbLabel" );
		});
		// Animate thumb
		handleleft.hide();
		handleright.hide();
		thumb.not( ':animated' ).animate( { left: '+=' + dir * ( timelineslider.data().zoomlevel * settings.step ) * -1 }, 500 / settings.scrollspeed, function() {
			timelineslider.timelineSlider( "_updateHandles" );
			handleleft.show();
			handleright.show();
		} );
	},

	// Scaling functions

	_startScale : function() {
		// Trigger onScaleStart event
		$(this).trigger( "onScaleStart" );
	},
	_scale : function() {
		// TODO: Detect side collision
		var timelineslider = $(this);
		// Update thumb position and width
		timelineslider.timelineSlider( "_updateThumb" );
		// Trigger onScale event
		timelineslider.trigger( "onScale" );
	},
	_stopScale : function() {
		var timelineslider = $(this);
		// Update thumb position and width
		timelineslider.timelineSlider( "_updateThumb" );
		// Set new value
		timelineslider.data( "timelineslider" ).timelineSlider( "_gatherNewValue" );
		// Update handle positions
		timelineslider.data( "timelineslider" ).timelineSlider( "_updateHandles" );
		// Trigger onScaleStop event
		timelineslider.trigger( "onScaleStop" );
	},

	// Sliding functions

	_startSlide : function( e ) {
		var timelineslider = $(this).data().timelineslider;
		var handleleft = timelineslider.data().handleleft;
		var handleright = timelineslider.data().handleright;
		// Hide handles
		handleleft.hide();
		handleright.hide();
		// Get grab position on thumb
		var grabposition = e.pageX - timelineslider.timelineSlider( "_thumbLeft" );
		timelineslider.data().grabposition = grabposition;
		// Trigger onSlideStart event
		timelineslider.trigger( "onSlideStart" );
	},
	_slide : function( e ) {
		var timelineslider = $(this).data().timelineslider;
		var track = timelineslider.data().track;
		var step = timelineslider.data().settings.step;
		var grabposition = timelineslider.data().grabposition;
		// Update mouse position
		timelineslider.timelineSlider( "_updateMouse", e );
		// Detect side collision
		if ( timelineslider.data().mousex > track.width() - grabposition || timelineslider.data().mousex < grabposition ) {
			// Start _autoScroll
			if ( timelineslider.data()._autoScroll == null ) {
				timelineslider.data()._autoScroll = setInterval( function() {
					timelineslider.timelineSlider( '_autoScroll', timelineslider );
				}, 1000 / timelineslider.data().settings.scrollspeed );
			}
		} else if ( timelineslider.data()._autoScroll ) {
			// End animation
			track.stop( true, true );
			// Stop _autoScroll
			clearInterval( timelineslider.data()._autoScroll );
			timelineslider.data()._autoScroll = null;
		}
		// Set thumb label
		timelineslider.timelineSlider( "_setThumbLabel" );
		// Trigger onSlide event
		timelineslider.trigger( "onSlide" );
	},
	_stopSlide : function( e ) {
		var timelineslider = e.data.timelineslider;
		var track = timelineslider.data().track;
		var thumb = timelineslider.data().thumb;
		var handleleft = timelineslider.data().handleleft;
		var handleright = timelineslider.data().handleright;
		// End animation
		track.stop( true, true );
		// BEGIN NEW CODE
		// Reset thumb margin and position
		if ( thumb.css( "margin-left" ) != "0px" ) {
			var tl = Number( thumb.css( "left" ).substring( 0, thumb.css( "left" ).indexOf( "px" ) ) );
			var tml = Number( thumb.css( "margin-left" ).substring( 0, thumb.css( "margin-left" ).indexOf( "px" ) ) );
			thumb.css( "left", tl + tml + "px" ).css( "margin-left", "0px" );
			thumb.draggable( "destroy" );
			thumb.draggable( { axis: 'x', containment: 'parent', grid: [(timelineslider.data().zoomlevel * timelineslider.data().settings.step), 0] } );
		}
		// END NEW CODE
		// Set thumb label
		timelineslider.timelineSlider( "_setThumbLabel" );
		// Update handle positions
		timelineslider.timelineSlider( "_updateHandles" );
		// Show handles
		handleleft.show();
		handleright.show();
		if ( timelineslider.data()._autoScroll ) {
			// Stop _autoScroll
			clearInterval( timelineslider.data()._autoScroll );
		}
		// Set new value
		timelineslider.timelineSlider( "_gatherNewValue" );
		// Trigger onSlideStop event
		timelineslider.trigger( "onSlideStop" );
	},
	_autoScroll : function( timelineslider ) {
		var step = timelineslider.data().zoomlevel * timelineslider.data().settings.step;
		var scrollspeed = timelineslider.data().settings.scrollspeed;
		var track = timelineslider.data().track;
		var periods = timelineslider.data().periods;
		var grabposition = timelineslider.data().grabposition;
		// Determine scroll direction
		if ( timelineslider.data().mousex > track.width() - grabposition ) {				
			var diff = step;
			// BEGIN NEW CODE
			// Check whether most right is reached
			if (  track.scrollLeft() != timelineslider.data().settings.periods_flat.length * step - track.width() && track.scrollLeft() + diff > timelineslider.data().settings.periods_flat.length * step - track.width() ) {
				var l =  step - ( ( timelineslider.data().settings.periods_flat.length * step - track.width() ) - track.scrollLeft() );
				timelineslider.data().thumb.css( "margin-left", l + "px" );
			}
			// END NEW CODE
		} else if ( timelineslider.data().mousex < grabposition ) {
			var diff = step * -1;
			// BEGIN NEW CODE
			// Check whether most left is reached
			if (  track.scrollLeft() != 0 && track.scrollLeft() + diff < 0 ) {
				var l = step - track.scrollLeft();
				timelineslider.data().thumb.css( "margin-left", l * -1 + "px" );
			}
			// END NEW CODE
		}
		if ( diff ) {
			// Scroll track
			track.not( ':animated' ).animate( { scrollLeft: track.scrollLeft() + diff}, 500 / scrollspeed, timelineslider.timelineSlider( "_setThumbLabel" ) );
			// Trigger onAutoScroll event
			timelineslider.trigger( "onAutoScroll" );
		}
	},

	// Zooming functions

	_scrollZoom : function(event, delta) {
		var timelineslider = $(this).data().timelineslider;
		var settings = timelineslider.data().settings;
		if ( delta > 0 && timelineslider.data().zoomlevel + 0.1 <= settings.maxzoom ) {
			// Zoom in
			timelineslider.data().zoomlevel += settings.zoomspeed;
			timelineslider.trigger("zoom");
			// TODO: is this zoom event same as onZoomChange?
		} else if ( delta < 0 && timelineslider.data().zoomlevel - 0.1 >= settings.minzoom ) {
			// Zoom out
			timelineslider.data().zoomlevel -= settings.zoomspeed;
			timelineslider.trigger("zoom");
		}
	},
	setZoomLevel : function( diff ) {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		if ( timelineslider.data().zoomlevel + diff >= settings.minzoom && timelineslider.data().zoomlevel + diff <= settings.maxzoom ) {
			// Set zoom level
			timelineslider.data().zoomlevel += diff;
			timelineslider.trigger("zoom");
		}
	},
	_doZoom : function() {
		var timelineslider = $(this);
		var settings = timelineslider.data().settings;
		var from = timelineslider.data().from;
		var to = timelineslider.data().to;
		// Resize periods
		timelineslider.data().periods.find(".period").css("min-width", timelineslider.data().zoomlevel * settings.step);
		// Reset currentlevel class
		timelineslider.data().periods.find(".period").removeClass("currentlevel");
		// Set currentlevel class
		var level = Math.round( timelineslider.data().zoomlevel );
		if ( level > settings.maxlevel ) {
			level = settings.maxlevel;
		}
		timelineslider.data().periods.find( ".level" + level ).addClass("currentlevel");
		// Set thumb
		timelineslider.data().thumb
		.width((timelineslider.data().zoomlevel * settings.step) * (to - from) + 2)
		.css("left", (timelineslider.data().zoomlevel * settings.step) * from + "px");
		// Center slider
		timelineslider.timelineSlider("_centerSlider", $(this));
		// Set new grid
		timelineslider.data().thumb.draggable("option", "grid", [(timelineslider.data().zoomlevel * settings.step), 0]);
		timelineslider.data().handleleft.draggable("option", "grid", [(timelineslider.data().zoomlevel * settings.step), 0]);
		timelineslider.data().handleright.draggable("option", "grid", [(timelineslider.data().zoomlevel * settings.step), 0]);
		// Trigger zoom event
		timelineslider.trigger("onZoomChange");
	}

	/* Indicator functions */

	/*showIndicator : function() {
	},
	updateIndicator : function() {
	},
	hideIndicator : function() {
	}*/
};

$.fn.timelineSlider = function( method ) {

	// Method calling logic
	if ( methods[method] ) {
		return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method ) {
		return methods.init.apply( this, arguments );
	} else {
		$.error( 'Method' + method + ' does not exist on jQuery.timelineSlider' );
	}

}

})(jQuery);