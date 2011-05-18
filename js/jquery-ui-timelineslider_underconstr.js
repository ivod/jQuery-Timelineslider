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
 * periods_flat			- READONLY, an array containing only the deepest level (smallest) periods
 * scrollspeed			- scroll speed for autoscroll feature, 0 to disable autoscroll
 * step					- minimal width (in pixels) of the period in the timeline
 * to					- index of the last period in selection
 * zoom					- initial zoom level
 * 
 * EVENTS:
 * To add an eventlistener, add this to the option list on init: onEventName: function(){do stuff}
 * onAutoScroll			- triggered when timelineslider is autoscrolling (when thumb is dragged beyond the viewpane)
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
 * setValue(val)		- sets a new from and to value, accepts an object with from and to {from:val1,to:val2}
 * setZoomLevel(level)	- sets the zoom level, accepts integer
 * destroy				- removes the timelineslider component
 */

/* TODO: calculate step size for exact period fit, based on preferred width (step parameter) */
/* TODO: make zooming independent of period hierarchy and make intelligent control for viewing labels of period levels */
/* TODO: Show period status (data/no data) */
/* TODO: Show indicator */
/* TODO: Put object references in periods_flat, don't make clones */
/* TODO: Add scroll left and right buttons
/* TODO: Make one global reference var for each component
/* TODO: clean up */

/* BUG: thumb is centered after scroll when it was at maximum position */
/* BUG: can't select last period when step is not exactly right to fit in screen */

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
					zoom : 1,
					minzoom : 1,
					maxzoom : 1,
					zoomspeed : 1,
					scrollspeed : 10,
					step : 150,
					height: 20,
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
				var $this = $(this);
				// Store settings
				$this.data( "settings", settings );
				// Bind events
				$this.bind( "zoom.timelineSlider", { settings: $this.data( "settings" ) }, methods.zoom);
				
				// Create slider
				$this.data( "slider", $this.timelineSlider( "createSlider" ) );
				// Create indicator and hide
				$this.data( "indicator", $this.timelineSlider( "createIndicator" ).hide() );
				// Create zoom controls
				$this.data( "zoomcontrols", $this.timelineSlider( "createZoomControls" ) );
				// Create scroll controls
				$this.data( "scrollcontrols", $this.timelineSlider( "createScrollControls" ) );
				// Add components to DOM
				$this.append( $this.data( "slider" ) ).append( $this.data( "indicator" ) );
				
				// Init zoom level slider
				$this.timelineSlider( "zoom" );
				// Init thumb label
				$this.timelineSlider( "setThumbLabel" );
				
				// Init events
				$this.bind( "onCreate", settings.onCreate );
				$this.bind( "onValueChange", settings.onValueChange );
				$this.bind( "onZoomChange", settings.onZoomChange );
				$this.bind( "onSlideStart", settings.onSlideStart );
				$this.bind( "onSlide", settings.onSlide );
				$this.bind( "onSlideStop", settings.onSlideStop );
				$this.bind( "onScaleStart", settings.onScaleStart );
				$this.bind( "onScale", settings.onScale );
				$this.bind( "onScaleStop", settings.onScaleStop );
				$this.bind( "onAutoScroll", settings.onAutoScroll );
				
				// Trigger create event
				$this.trigger( "onCreate" );
			});
		},
		destroy : function() {
			return this.each( function() {
		         var $this = $(this),
		             data = $this.data( "timelineSlider" );
		         // Namespacing FTW
		         $(window).unbind( ".timelineSlider" );
		         data.timelineSlider.remove();
		         $this.removeData( "timelineSlider" );
			});
		},
		
		// Create functions
		
		createPeriods : function( settings ) {
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
					.css( "min-width", settings.zoom * settings.step );
				var l = $("<label>").append( $("<span>").text( val.name ) );
				p.append( l );
				return p;
			}
			return periods;
		},
		createSlider : function() {
			var $this = $(this);
			// Reference to timelineslider settings object
			var settings = $this.data( "settings" );
			// Create slider container
			var slider = $("<div>").addClass( "slider" )
				.bind( "mousewheel.timelineSlider", methods.scrollZoom )
				.data( "timelineslider", $this );
			// Create track
			var track = $("<div>")
				.addClass( "track" )
				.css( "overflow", "hidden" )
				.css( "white-space", "nowrap" )
				.data( "timelineslider", $this );
			slider.data( "track", track );
			// Create periods
			var periods = $this.timelineSlider( "createPeriods", settings );
			slider.data( "periods", periods );
			// Create thumb
			var thumb = $("<div>")
				.append( $("<label>") )
				.addClass( "thumb" )
				.width( ( settings.zoom * settings.step ) * ( settings.to - settings.from ) )
				.draggable( { axis:'x', containment: 'parent' } )
				.bind( "dragstart.timelineSlider", methods.startSlide )
				.bind( "drag.timelineSlider", { timelineslider: $this }, methods.slide )
				.bind( "dragstop.timelineSlider", { timelineslider: $this }, methods.stopSlide )
				.data( "timelineslider", $this );
			slider.data( "thumb", thumb );
			// Create left handle
			var handleleft = $("<div>")
				.addClass( "handle" )
				.addClass( "left" )
				.css( "top", -1 * settings.height + "px" )
				.draggable( { axis:'x', grid: [ ( settings.zoom * settings.step ), 0 ] } )
				.bind( "dragstart.timelineSlider", methods.startScale )
				.bind( "drag.timelineSlider", methods.scale )
				.bind( "dragstop.timelineSlider", methods.stopScale )
				.data( "timelineslider", $this );
			slider.data( "handleleft", handleleft );
			// Create right handle
			var handleright = $("<div>")
				.addClass( "handle" )
				.addClass( "right" )
				.css( "top", -2 * settings.height + "px" )
				.draggable( { axis:'x', grid: [ ( settings.zoom * settings.step ), 0 ] } )
				.bind( "dragstart.timelineSlider", methods.startScale )
				.bind( "drag.timelineSlider", methods.scale )
				.bind( "dragstop.timelineSlider", methods.stopScale )
				.data( "timelineslider", $this );
			slider.data( "handleright", handleright );
			// Create slider
			var new_slider = slider.append( track.append( periods ) ).append( thumb ).append( handleleft ).append( handleright );
			return new_slider;
		},
		createIndicator : function() {
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
		},
		createZoomControls : function() {
			var $this = $(this);
			var settings = $this.data( "settings" );
			var zoomin = $this.find( "#zoomin" );
			var zoomout = $this.find( "#zoomout" );
			if ( zoomin.length ) {
				// Create zoom in button
				zoomin.bind( "mousedown", function( e ) {
						$this.data( "zooming", setInterval( function( e ) { $this.timelineSlider( "setZoomLevel", settings.zoomspeed ) }, 100) );
					})
					.bind( "mouseup", function() {
						clearInterval( $this.data( "zooming" ) );
					})
					.data( "timelineslider", $this );
			}
			if ( zoomout.length ) {
				// Create zoom out button
				zoomout.bind( "mousedown", function( e ) {
						$this.data( "zooming", setInterval( function( e ) { $this.timelineSlider( "setZoomLevel", settings.zoomspeed * -1 ) }, 100) );
					})
					.bind( "mouseup", function() {
						clearInterval( $this.data( "zooming" ) );
					})
					.data( "timelineslider", $this );
			}
			var zoomcontrols = { "zoomin" : zoomin, "zoomout" : zoomout };
			return zoomcontrols;
		},
		createScrollControls : function() {
			var $this = $(this);
			var scrollleft = $this.find( "#scrollleft" );
			var scrollright = $this.find( "#scrollright" );
			if ( scrollleft.length ) {
				// Create scroll left button
				scrollleft.bind( "mousedown", function( e ) {
						$this.data( "scrolling", setInterval( function( e ) { $this.timelineSlider( "doScroll", -1 ) }, 100) );
					})
					.bind( "mouseup", function() {
						clearInterval( $this.data( "scrolling" ) );
					})
					.data( "timelineslider", $this );
			}
			if ( scrollright.length ) {
				// Create scroll right button
				scrollright.bind( "mousedown", function( e ) {
						$this.data( "scrolling", setInterval( function( e ) { $this.timelineSlider( "doScroll", 1 ) }, 100) );
					})
					.bind( "mouseup", function() {
						clearInterval( $this.data( "scrolling" ) );
					})
					.data( "timelineslider", $this );
			}
			var scrollcontrols = { "scrollleft" : scrollleft, "scrollright" : scrollright };
			return scrollcontrols;
		},
		
		// General functions
		
		centerSlider : function() {
			// UNDER CONSTRUCTION: can't scroll most left
			var $this = $(this);
			var settings = $this.data( "settings" );
			var track = $this.data( "slider" ).data( "track" );
			var thumb = $this.data( "slider" ).data( "thumb" );
			// Calculate steps left of thumb to center thumb
			// var stepsleft = Math.floor( ( ( track.width() - thumb.width() ) / 2 ) / ( settings.zoom * settings.step ) );
			// Calculate left position of a centered thumb
			var leftcentered = ( track.width() - thumb.width() ) / 2 ;
			/*if ( stepsleft > settings.from ) {
				stepsleft = settings.from;
			} else if ( 0 ) { // if thumb is scrolled too far to right to be able to center it
				// calculate correct stepsleft
			}*/
			//thumb.css( "left", stepsleft * ( settings.zoom * settings.step ) + "px" );
			thumb.css( "left", leftcentered + "px" );
			//track.scrollLeft( ( settings.from - stepsleft ) * ( settings.zoom * settings.step ) );
			track.scrollLeft( settings.from * ( settings.zoom * settings.step ) - leftcentered );
			// Update handle positions
			$this.timelineSlider( "updateHandles", $this );
		},
		updateHandles : function( timelineslider ) {
			var track = timelineslider.data("slider").data("track");
			var thumb = timelineslider.data("slider").data("thumb");
			var handleleft = timelineslider.data("slider").data("handleleft");
			var handleright = timelineslider.data("slider").data("handleright");
			// Get left position of thumb
			var l = $(this).timelineSlider("thumbLeft", timelineslider);
			// Set left handle position
			handleleft.css("left", l + "px");
			// Set right handle position
			var r = l+thumb.width()-handleright.width();
			handleright.css("left", r + "px");
			// Set new handle containment
			handleleft.draggable( "option", "containment", [ 0, 0, r, 0] );
			handleright.draggable( "option", "containment", [ Number(l), 0, track.width(), 0] );
		},
		setThumbLabel : function() {
			// UNDER CONSTRUCTION: show only parent label if all selected periods are a complete set
			var $this = $(this);
			var thumb = $this.data("slider").data("thumb");
			var track = $this.data("slider").data("track");
			var settings = $this.data("settings");
			var from_index = Math.round((track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step));
			var to_index = Math.round(from_index + thumb.width() / (settings.zoom * settings.step));
			for( var i = from_index; i < to_index + 1; i++ ) {
				parentnode = settings.periods_flat[i];
			}
			if ( to_index - from_index > 1 ) {
				var label = settings.periods_flat[from_index].name + " - " + settings.periods_flat[to_index-1].name;
			} else {
				var label = settings.periods_flat[from_index].name;
			}
			thumb.find("label").text( label );
		},
		gatherNewValue : function( timelineslider ) {
			var settings = timelineslider.data("settings");
			var track = timelineslider.data("slider").data("track");
			var thumb = timelineslider.data("slider").data("thumb");
			var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step) );
			var to_index = Math.round( from_index + thumb.width() / (settings.zoom * settings.step) );
			// Check whether value has changed
			if ( settings.periods_flat[from_index] != settings.from || settings.periods_flat[to_index] != settings.to ) {
				settings.from = from_index;
				settings.to = to_index;
				// Trigger onValueChange event
				$(this).trigger("onValueChange");
			}
		},
		setValue : function( val ) {
			var $this = $(this);
			var settings = $this.data("settings");
			// Store new values
			settings.from = val.from;
			settings.to = val.to;
			// Set new thumb width
			$this.data("slider").data("thumb").width( ( val.to - val.from ) * ( settings.zoom * settings.step ) );
			$this.timelineSlider( "centerSlider" );
			$this.timelineSlider( "setThumbLabel" );
			// Trigger onValueChange event
			$this.trigger("onValueChange");
		},
		getPeriod : function( index ) {
			var period = $(this).data("settings").periods_flat[index];
			return period;
		},
		
		// Scrolling functions
		
		doScroll : function( dir ) {
			var $this = $(this);
			var settings = $this.data( "settings" );
			var track = $this.data( "slider" ).data( "track" );
			var thumb = $this.data( "slider" ).data( "thumb" );
			track.not( ':animated' ).animate( { scrollLeft: track.scrollLeft() + dir * ( settings.zoom * settings.step ) }, 500 / settings.scrollspeed, function() {
				// Set thumb label
				$this.timelineSlider( "setThumbLabel" );
			});
		},
		autoScroll : function( timelineslider, diff ) {
			console.log("autoScroll");
			// var settings = timelineslider.data( "settings" );
			// var step = timelineslider.data( "settings" ).zoom * timelineslider.data( "settings" ).step;
			var scrollspeed = timelineslider.data( "settings" ).scrollspeed;
			var track = timelineslider.data( "slider" ).data( "track" );
			// var thumb = timelineslider.data( "slider" ).data( "thumb" );
			// var grabposition = timelineslider.data( "slider" ).data( "thumb" ).data( "grabposition" );
			// Determine scroll direction
			/*if ( timelineslider.data( "mousex" ) > track.width() - grabposition ) {				
				var diff = step;
			} else if ( timelineslider.data( "mousex" ) < grabposition ) {
				var diff = step * -1;
			}*/
			if ( diff ) {
				if ( track.scrollLeft() + diff < 0 ) {
					console.log( "hit left" );
				}
				// Scroll track
				track.not( ':animated' ).animate( { scrollLeft: track.scrollLeft() + diff}, 500 / scrollspeed, timelineslider.timelineSlider( "setThumbLabel" ) );
				// Trigger onAutoScroll event
				timelineslider.trigger( "onAutoScroll" );
			}
		},
		
		// Scaling functions
		
		startScale : function() {
			// Trigger onScaleStart event
			$(this).trigger( "onScaleStart" );
		},
		scale : function() {
			// TODO: Detect side collision
			var $this = $(this);
			// Update thumb position and width
			$this.timelineSlider( "updateThumb" );
			// Trigger onScale event
			$this.trigger( "onScale" );
		},
		stopScale : function() {
			var $this = $(this);
			// Update thumb position and width
			$this.timelineSlider( "updateThumb" );
			// Set new value
			$this.timelineSlider( "gatherNewValue", $this.data( "timelineslider" ) );
			// Update handle positions
			$this.timelineSlider( "updateHandles", $this.data( "timelineslider" ) );
			// Trigger onScaleStop event
			$this.trigger( "onScaleStop" );
		},
		updateThumb : function( e ) {
			var $this = $(this);
			var handleleft = $this.data( "timelineslider" ).data( "slider" ).data( "handleleft" );
			var handleright = $this.data( "timelineslider" ).data( "slider" ).data( "handleright" );
			var thumb = $this.data( "timelineslider" ).data( "slider" ).data( "thumb" );
			// Get position left slider
			var positionleft = Number( handleleft.css( "left" ).substring( 0, handleleft.css( "left" ).indexOf( "px" ) ) );
			// Get position right slider
			var positionright = Number( handleright.css( "left" ).substring( 0, handleright.css( "left" ).indexOf( "px" ) ) ) + handleright.width();
			// Set new Thumb width
			thumb.width( positionright - positionleft );
			// Set new Thumb position
			thumb.css( "left", handleleft.css( "left" ) );
			// Set thumb label
			$this.data( "timelineslider" ).timelineSlider( "setThumbLabel" );
		},
		
		// Sliding functions
		
		startSlide : function( e ) {
			var $this = $(this);
			var handleleft = $this.data( "timelineslider" ).data( "slider" ).data( "handleleft" );
			var handleright = $this.data( "timelineslider" ).data( "slider" ).data( "handleright" );
			// Hide handles
			handleleft.hide();
			handleright.hide();
			// Get grab position on thumb
			var grabposition = e.pageX - $this.timelineSlider( "thumbLeft", $this.data( "timelineslider" ) );
			$this.data( "grabposition", grabposition );
			// Trigger onSlideStart event
			$this.trigger( "onSlideStart" );
		},
		thumbLeft : function( timelineslider ) {
			var thumb = timelineslider.data( "slider" ).data( "thumb" );
			// Get left position of thumb
			var thumbleft = Number( thumb.css( "left" ).substring( 0, thumb.css( "left" ).indexOf( "px" ) ) );
			return thumbleft;
		},
		updateMouse : function( e ) {
			// Get mouse x position
			$(this).data( "timelineslider" ).data( "mousex", e.pageX );
		},
		slide : function( e ) {
			var $this = $(this);
			var track = $this.data( "timelineslider" ).data( "slider" ).data( "track" );
			var thumb = $this.data( "timelineslider" ).data( "slider" ).data( "thumb" );
			var settings = $this.data( "timelineslider" ).data( "settings" );
			var step = $this.data( "timelineslider" ).data( "settings" ).step;
			var grabposition = $this.data( "grabposition" );
			// Update mouse position
			$this.timelineSlider( "updateMouse", e );
			// Detect side collision
			/*if ( $this.data( "timelineslider" ).data( "mousex" ) > track.width() - grabposition || $this.data( "timelineslider" ).data( "mousex" ) < grabposition ) {
				// Start autoscroll
				if ( $this.data( "autoscroll" ) == null ) {
					// Remove thumb grid
					console.log( "disable grid");
					thumb.draggable( "option", "grid", null );
					// When left first reposition track left
					// When right first reposition track right
					if ( $this.data( "timelineslider" ).data( "mousex" ) < grabposition ) {
						var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step) );
						track.scrollLeft( from_index * (settings.zoom * settings.step) );
					} else if ( $this.data( "timelineslider" ).data( "mousex" ) > track.width() - grabposition ) {
						var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step) );
						var to_index = Math.round( from_index + thumb.width() / (settings.zoom * settings.step) );
						track.scrollLeft( to_index * (settings.zoom * settings.step) - track.width() );
					}
					$this.data( "autoscroll", setInterval( function() {
						$this.timelineSlider( 'autoScroll', e.data.timelineslider );
					}, 1000 / e.data.timelineslider.data( "settings" ).scrollspeed ) );
				}*/
			if ( $this.data( "timelineslider" ).data( "mousex" ) > track.width() - grabposition || $this.data( "timelineslider" ).data( "mousex" ) < grabposition ) {
				if ( $this.data( "timelineslider" ).data( "mousex" ) < grabposition ) {
					// Left collision
					if ( !$this.data( "autoscroll" ) ) {
						// Init left autoscroll
						console.log( "Init left autoscroll" );
						// var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step) );
						// track.scrollLeft( from_index * (settings.zoom * settings.step) );
						// thumb.draggable( "option", "grid", null );
						$this.data( "autoscroll", setInterval( function() {
							$this.timelineSlider( 'autoScroll', e.data.timelineslider, step * -1 );
						}, 1000 / e.data.timelineslider.data( "settings" ).scrollspeed ) );
					}
				} else if ( $this.data( "timelineslider" ).data( "mousex" ) > track.width() - grabposition ) {
					// Right collision
					if ( !$this.data( "autoscroll" ) ) {
						// Init right autoscroll
						console.log( "Init right autoscroll" );
						// var from_index = Math.round( (track.scrollLeft() + Number(thumb.css("left").substring(0, thumb.css("left").indexOf("px")))) / (settings.zoom * settings.step) );
						// var to_index = Math.round( from_index + thumb.width() / (settings.zoom * settings.step) );
						// track.scrollLeft( to_index * (settings.zoom * settings.step) - track.width() );
						// thumb.draggable( "option", "grid", null );
						$this.data( "autoscroll", setInterval( function() {
							$this.timelineSlider( 'autoScroll', e.data.timelineslider, step );
						}, 1000 / e.data.timelineslider.data( "settings" ).scrollspeed ) );
					}
				}
			} else if ( $this.data( "autoscroll" ) ) {
				// End animation
				track.stop( true, true );
				// Stop autoscroll
				clearInterval( $this.data( "autoscroll" ) );
				$this.data( "autoscroll", null );
				// Enable thumb grid
				console.log( "re enable grid");
				//thumb.draggable( "option", "grid", [(settings.zoom * settings.step), 0]);
			}
			// Set thumb label
			$this.data( "timelineslider" ).timelineSlider( "setThumbLabel" );
			// Trigger onSlide event
			$this.trigger( "onSlide" );
		},
		stopSlide : function( e ) {
			var $this = $(this);
			var timelineslider = e.data.timelineslider;
			var settings = timelineslider.data( "settings" );
			var track = timelineslider.data( "slider" ).data( "track" );
			var thumb = timelineslider.data( "slider" ).data( "thumb" );
			var handleleft = timelineslider.data( "slider" ).data( "handleleft" );
			var handleright = timelineslider.data( "slider" ).data( "handleright" );
			// End animation
			track.stop( true, true );
			// Update handle positions
			timelineslider.timelineSlider( "updateHandles", $this.data( "timelineslider" ) );
			// Show handles
			handleleft.show();
			handleright.show();
			if ( $this.data( "autoscroll" ) ) {
				// Stop autoscroll
				clearInterval( $this.data( "autoscroll" ) );
				delete( $this.data( "autoscroll" ) );
				// Enable thumb grid
				// console.log( "re enable grid");
				// thumb.draggable("option", "grid", [(settings.zoom * settings.step), 0]);
			}
			// Set new value
			$this.timelineSlider( "gatherNewValue", $this.data( "timelineslider" ) );
			// Trigger onSlideStop event
			$this.trigger( "onSlideStop" );
		},
		
		// Zooming functions
		
		scrollZoom : function(event, delta) {
			// Reference to timelineslider settings object
			var settings = $(this).data("timelineslider").data("settings");
			if ( delta > 0 && settings.zoom + 0.1 <= settings.maxzoom ) {
				// Zoom in
				settings.zoom += settings.zoomspeed;
				$(this).data("timelineslider").trigger("zoom");
				// TODO: is this zoom event same as onZoomChange?
			} else if ( delta < 0 && settings.zoom - 0.1 >= settings.minzoom ) {
				// Zoom out
				settings.zoom -= settings.zoomspeed;
				$(this).data("timelineslider").trigger("zoom");
			}
		},
		setZoomLevel : function( diff ) {
			// Reference to timelineslider settings object
			var settings = $(this).data("settings");
			if ( settings.zoom + diff >= settings.minzoom && settings.zoom + diff <= settings.maxzoom ) {
				// Set zoom level
				settings.zoom += diff;
				$(this).trigger("zoom");
			}
		},
		zoom : function() {
			var settings = $(this).data("settings");
			// Resize periods
			$(this).data("slider").data("periods").find(".period").css("min-width", settings.zoom*settings.step);
			// Reset currentlevel
			$(this).data("slider").data("periods").find(".period").removeClass("currentlevel");
			// Set currentlevel
			var level = Math.round( settings.zoom );
			if ( level > settings.maxlevel ) {
				level = settings.maxlevel;
			}
			$(this).data("slider").data("periods").find( ".level" + level ).addClass("currentlevel");
			// Redraw thumb
			$(this).data("slider").data("thumb")
				.width((settings.zoom * settings.step) * (settings.to - settings.from))
				.css("left", (settings.zoom * settings.step) * settings.from + "px");
			// Center slider
			$(this).timelineSlider("centerSlider", $(this));
			// Set new grid
			$(this).data("slider").data("thumb").draggable("option", "grid", [(settings.zoom * settings.step), 0]);
			$(this).data("slider").data("handleleft").draggable("option", "grid", [(settings.zoom * settings.step), 0]);
			$(this).data("slider").data("handleright").draggable("option", "grid", [(settings.zoom * settings.step), 0]);
			// Trigger zoom event
			$(this).trigger("onZoomChange");
		},
		zoomIn : function() {
			console.log( "zoomIn" );
		},
		zoomOut : function() {
		},
		
		/* Indicator functions */
		
		showIndicator : function() {
		},
		updateIndicator : function() {
		},
		hideIndicator : function() {
		}
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