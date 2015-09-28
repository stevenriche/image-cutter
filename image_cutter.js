/*
 * Image Cutter v1.0 
 * @name Image Cutter
 * @author Steven Riche http://www.joustmultimedia.com
 * @version 1.0
 * @date January 7, 2013
 * @copyright (c) 2013 Steven Riche
 * @license MIT License http://opensource.org/licenses/MIT
 * Javascript plug-in for image cropping user-interface. Copy, modify, and use freely for both personal and commercial use
 * For more info, examples, and documentation, visit http://www.joustmultimedia.com/blog/post/image_cutter
 */

var ImageCutter = function(options){
	// Set up our default options
	var default_options = {
		'id'				: 'image_cutter',	// element id of the div containing the image to crop
		'action'			: 'index.php', // function that the submitted form calls
		'callbackFn'		: '', // callback function, if any, called when coordinates are set. sends object w/ coordinates
		'initCallbackFn'	: '', // callback function, if any, called after code is first initiated
		'startingSelection'	: false, // if true, should have a starting selection. overridden by fixedWidth or fixedHeight
		'startingLeft'		: 0, // if starting selection, left attribute
		'startingTop'		: 0, // if starting selection, top attribute
		'startingWidth'		: 100, // if starting selection, width attribute in pixels, or 'full' for 100%. Overridden by fixedWidth
		'startingHeight'	: 100, // if starting selection, height attribute in pixels, or 'full' for 100%. Overridden by fixedHeight
		'startingAll'		: false, // if true, overrides starting selection and selects entire area
		'fixedWidth'		: 0, // fixed width, in pixels. turned off if 0
		'fixedHeight'		: 0, // fixed height, in pixels. turned off if 0
		'fixedRatio'		: 0, // fixed aspect ratio, width / height. turned off if 0
		'maxWidth'			: 0, // max width, if not set to 0
		'maxHeight'			: 0, // max height, if not set to 0
		'minWidth'			: 0, // min width, if not set to 0. overrides starting selection
		'minHeight'			: 0, // min height, if not set to 0. overrides starting selection
		'submitBtn'			: true, // if true, displays submit button
		'submitValue'		: 'Crop', // value in submit button
		'submitClass'		: '', // class to be assigned to submit button, if any
		'clearBtn'			: 'none', // if 'clear', adds button that removes selection, if 'full' add button that selects all
		'clearBtnValue'		: 'Clear', // value in clear button
		'clearBtnClass'		: '', // class to assign clear button, if any
		'zoomBtn'			: true, // if true, displays zoom in and out button
		'zoomInClass'		: '', // class to assign zoom in button, if any
		'zoomOutClass'		: '', // class to assign zoom out button, if any
		'zoomInValue'		: 'Zoom In', // value in zoom in button
		'zoomOutValue'		: 'Zoom Out', // value in zoom out button
		'zoomInAmount'		: '20', // % amount that the zoom changes in
		'zoomOutAmount'		: '25', // % amount that the zoom changes out 
		'autoScale'			: 'none', // 'scaledown' to automatically scale down a big image, or 'fit' to scale large and small images
		'shadowBoxColor'	: '#000000', // hex value of the shadowbox overlay
		'shadowBoxOpacity'	: 0.5, // opacity of the shadowbox overlay (between 0 and 1)
		'shadowBoxClass'	: '', // class to be assigned to shadowbox, if any
		'selectionClass'	: '', // class to be assigned to selection area, if any
		'swapArrows'		: false, // if true, swap out arrow spans for divs... should be used with assigning classes to arrows
		'arrowClass'		: '', // class to be assigned all arrows, if any
		'arrowNClass'		: '', // class to be assigned N arrow, if any
		'arrowNEClass'		: '', // class to be assigned NE arrow, if any
		'arrowEClass'		: '', // class to be assigned E arrow, if any
		'arrowSEClass'		: '', // class to be assigned SE arrow, if any
		'arrowSClass'		: '', // class to be assigned S arrow, if any
		'arrowSWClass'		: '', // class to be assigned SW arrow, if any
		'arrowWClass'		: '', // class to be assigned W arrow, if any
		'arrowNWClass'		: '' // class to be assigned NW arrow, if any
	};
	// Run through the options passed in and replace any missing options with the default values
	if (!options){ options = default_options; }
	for (var options_iii in default_options){
		if (typeof options[options_iii] == 'undefined'){ options[options_iii] = default_options[options_iii]; }
	}
	
	// if we have starting selections or restrictions on size, we need to update our options.
	if (options.minWidth != 0 || options.minHeight != 0){
		options.startingSelection = true;
		if (options.minWidth != 0){options.startingWidth = options.minWidth;}
		if (options.minHeight != 0){options.startingHeight = options.minHeight;}
	}
	if (options.fixedWidth != 0){
		options.startingSelection = true;
		options.startingWidth = options.fixedWidth;
	}
	if (options.fixedHeight != 0){
		options.startingSelection = true;
		options.startingHeight = options.fixedHeight;
	}
	if (options.startingAll){
		options.startingSelection = true;
		options.startingWidth = 'full';
		options.startingHeight = 'full';
	}
	
	// initialize our global variables
	var mouseX, mouseY; // these are the mouse position coordinates when hovering over the shadowbox
	var startX = 0, startY = 0; // these are the top left corner coordinates when making a selection
	var clickX = 0, clickY = 0; // these are the coordinates of the mouse when clicking and dragging the crop area/resizing
	var cropLeft = 0, cropTop = 0; // these are the left and top values at the moment the mouse clicks to drag the crop area
	var cropWidth = 0, cropHeight = 0; // these are the width and height values at the moment the mouse clicks to resize
	var origWidth, origHeight; // these are the original height and width, for zooming in and out
	var resizeDir; // this variable will store which direction we need to resize when resizing
	var zoomSet = 1, curZoom = 1; // default zoom - autoscale overwrites it / curZoom tracks what the current zoom is
	var firstClick = true; // boolean switch to keep IE from repopulating hidden fields.
	var clear_button, zoom_in_btn, zoom_out_btn; // declare these now in case we create these later
	var ignoreRecrop = false; // if true, then an area is being moved, so don't create a new crop area
	var ignoreMove = false; // if true, then an area is being resized, so don't move it.
	var image_div = document.getElementById(options.id); // grab the div that holds the cropping image
	var image = image_div.getElementsByTagName('img')[0]; // grab the image itself
	var cropped_img_div_id = options.id + '_cropped_div'; // save the id of the cropping area div
	var cropped_img_id = options.id + '_cropped_img'; // save the id of the cropping area image
	var shadowbox, coord_form, shadowBoxOffset; // elements we will create later
	var image_info = new Image(); // create an instance of the image so we can track when it loads ...
	image_info.src = image.src;
	image_info.onload = init; // ... and off we go!
	
	// function to initiate everything once the image loads
	function init(){
		image_div.style.margin = '0px';
		image_div.style.padding = '0px';
		image_div.style.border = 'none';
		image.style.margin = '0px';
		image.style.padding = '0px';
		image.style.border = 'none';
		
		// set these to the width and height of the image as it is displayed
		origWidth = image.clientWidth;
		origHeight = image.clientHeight;
		
		// create shadowbox over image
		shadowbox = document.createElement('div');
		shadowbox.style.position = 'absolute';
		shadowbox.style.backgroundColor = options.shadowBoxColor;
		shadowbox.style.filter = 'alpha(opacity=' + (100*options.shadowBoxOpacity) + ')'; // opacity for IE
		shadowbox.style.opacity = options.shadowBoxOpacity; // opacity for everything else
		shadowbox.style.margin = '0px';
		shadowbox.style.padding = '0px';
		shadowbox.style.border = 'none';
		shadowbox.style.top = "0px";
		shadowbox.style.left = "0px";
		shadowbox.style.width = origWidth + "px";
		shadowbox.style.height = origHeight + "px";
		shadowbox.style.cursor = 'pointer';
		shadowbox.setAttribute('id', options.id+"_shadowbox");
		if (options.shadowBoxClass != ''){
			shadowbox.setAttribute('class', options.shadowBoxClass);
		}
		image_div.style.position = "relative";
		image_div.appendChild(shadowbox); // add shadowbox over image
		shadowBoxOffset = find_offset(image_div); // store the offsets for the shadowbox
		
		init_coord_form(); // create our form of hidden inputs and add it
		
		// add our extra buttons, if we need them
		if (options.clearBtn == 'clear' || options.clearBtn == 'full'){ add_clearBtn(); }
		if (options.zoomBtn){ add_zoomBtn(); }
		
		// add our listeners
		if (shadowbox.addEventListener){ // non-IE event handlers
			shadowbox.addEventListener('touchmove', track_mouse, false); // touch device handlers
			shadowbox.addEventListener('touchend', stop_track_mouse, false);
			shadowbox.addEventListener('touchstart', start_selection, false);
			
			shadowbox.addEventListener('mousemove', track_mouse, false); // non-touch handlers
			shadowbox.addEventListener('mouseout', stop_track_mouse, false);
			shadowbox.addEventListener('mousedown', start_selection, false);
		} else { // IE event handlers
			shadowbox.attachEvent('onmousemove', track_mouse);
			shadowbox.attachEvent('onmouseout', stop_track_mouse);
			shadowbox.attachEvent('onmousedown', start_selection);
		}
		
		// if we need to autoscale the image...
		if (options.autoScale == 'scaledown' || options.autoScale == 'fit'){
			autoscale();
		} 
		// we check if we should go ahead and highlight a selection ...
		if (options.startingSelection){
			start_selection();
			set_selection();
			save_selection();
		}
		
		// if we have a callback to do, call that function with an object with the coordinates
		if (options.initCallbackFn !== '' && typeof(window[options.initCallbackFn]) === 'function'){
			window[options.initCallbackFn]();
		}
	}
	
	// function that creates form that will hold and send our hidden inputs
	function init_coord_form(){ 
		coord_form = document.createElement('form');
		coord_form.setAttribute('method', 'POST');
		coord_form.setAttribute('action', options.action);
		
		var zoom_input = document.createElement('input');
		zoom_input.setAttribute('name', 'zoom');
		zoom_input.setAttribute('id', options.id + '_zoom');
		zoom_input.setAttribute('type', 'hidden');
		coord_form.appendChild(zoom_input);
		
		var x1_input = document.createElement('input');
		x1_input.setAttribute('name', 'x1');
		x1_input.setAttribute('id', options.id + '_x1');
		x1_input.setAttribute('type', 'hidden'); 
		coord_form.appendChild(x1_input);
		
		var y1_input = document.createElement('input');
		y1_input.setAttribute('name', 'y1');
		y1_input.setAttribute('id', options.id + '_y1');
		y1_input.setAttribute('type', 'hidden');
		coord_form.appendChild(y1_input);
		
		var width_input = document.createElement('input');
		width_input.setAttribute('name', 'width');
		width_input.setAttribute('id', options.id + '_width');
		width_input.setAttribute('type', 'hidden'); 
		coord_form.appendChild(width_input);
		
		var height_input = document.createElement('input');
		height_input.setAttribute('name', 'height');
		height_input.setAttribute('id', options.id + '_height');
		height_input.setAttribute('type', 'hidden');
		coord_form.appendChild(height_input);
		
		if (options.submitBtn){ // if we need to include a submit button
			var submit_input = document.createElement('input');
			if (options.submitClass !== ''){ submit_input.setAttribute('class', options.submitClass); }
			submit_input.setAttribute('type', 'submit');
			coord_form.appendChild(submit_input);
			submit_input.value = options.submitValue;
		}
		
		// add our form and hidden inputs
		image_div.appendChild(coord_form);
		set_hidden_values(); // set all of our values as needed
	}
	
	// function to set hidden values - only called at initiation of plugin, or if needs to be reset
	function set_hidden_values(){
		document.getElementById(options.id+"_zoom").value = curZoom;
		document.getElementById(options.id+"_x1").value = 0;
		document.getElementById(options.id+"_y1").value = 0;
		if (options.fixedRatio == '' || options.fixedRatio >= 1){
			document.getElementById(options.id+"_width").value = origWidth;
		} else { // if the fixedRatio is set, and the area is taller, we set width in terms of height
			document.getElementById(options.id+"_width").value = (origWidth * options.fixedRatio);
		}
		if (options.fixedRatio == '' || options.fixedRatio <= 1){
			document.getElementById(options.id+"_height").value = origHeight;
		} else { // if the fixedRatio is set, and the area is wider, we set height in terms of width
			document.getElementById(options.id+"_height").value = (origHeight / options.fixedRatio);
		}
	}
	
	// if we need to add a clear button
	function add_clearBtn(){
		clear_button = document.createElement('input');
		clear_button.setAttribute('type', 'button');
		clear_button.setAttribute('class', options.clearBtnClass);
		clear_button.setAttribute('value', options.clearBtnValue);
		if (options.clearBtn == 'clear'){ // if they want clear button to clear all, attach clear_selection function
			if (clear_button.addEventListener){ // non-IE
				clear_button.addEventListener('click', clear_selection, false);
			} else { // IE
				clear_button.attachEvent('onclick', clear_selection);
			}
		} else if (options.clearBtn == 'full'){ // if they want clear button to select all, attach full_selection function
			if (clear_button.addEventListener){ // non-IE
				clear_button.addEventListener('click', full_selection, false);
			} else { // IE
				clear_button.attachEvent('onclick', full_selection);
			}
		}
		image_div.appendChild(clear_button);
	} 
	
	// Function to clear crop area entirely and zero out all of the inputs
	function clear_selection(){
		if (document.getElementById(cropped_img_div_id)){ // remove crop area and image in crop area from DOM
			document.getElementById(cropped_img_div_id).removeChild(document.getElementById(cropped_img_id));
			shadowbox.removeChild(document.getElementById(cropped_img_div_id));
		}
		// zero out all of the selections (except zoom)
		if (document.getElementById(options.id+'_x1')){
			document.getElementById(options.id+'_x1').value = '';
		}
		if (document.getElementById(options.id+'_y1')){
			document.getElementById(options.id+'_y1').value = '';
		}
		if (document.getElementById(options.id+'_width')){
			document.getElementById(options.id+'_width').value = '';
		}
		if (document.getElementById(options.id+'_height')){
			document.getElementById(options.id+'_height').value = '';
		}
		
		// if we have a callback to do, call that function with an object with the coordinates
		if (options.callbackFn !== '' && typeof(window[options.callbackFn]) === 'function'){
			window[options.callbackFn]({
				'x1' 		: '',
				'y1' 		: '',
				'width'		: '',
				'height'	: ''
			});
		}
	}
	
	// Function to set crop area to entire image
	function full_selection(){
		if (document.getElementById(cropped_img_div_id)){ // remove current crop area and image in crop area
			document.getElementById(cropped_img_div_id).removeChild(document.getElementById(cropped_img_id));
			shadowbox.removeChild(document.getElementById(cropped_img_div_id));
		}
		// set our options to select all
		options.startingSelection = true;
		options.startingLeft = 0;
		options.startingTop = 0;
		options.startingWidth = 'full';
		options.startingHeight = 'full';
		// and select the full area
		start_selection();
		set_selection();
		save_selection();
	}
	
	// if we need to add zoom buttons
	function add_zoomBtn(){
		// create the buttons
		zoom_in_btn = document.createElement('input');
		zoom_in_btn.setAttribute('type', 'button');
		zoom_in_btn.setAttribute('class', options.zoomInClass);
		zoom_in_btn.setAttribute('value', options.zoomInValue);
		
		zoom_out_btn = document.createElement('input');
		zoom_out_btn.setAttribute('type', 'button');
		zoom_out_btn.setAttribute('class', options.zoomOutClass);
		zoom_out_btn.setAttribute('value', options.zoomOutValue);
		
		if (zoom_in_btn.addEventListener){ // attach listeners for non-IE
			zoom_in_btn.addEventListener('click', zoom_in, false);
			zoom_out_btn.addEventListener('click', zoom_out, false);
		} else { // attach listeners for IE
			zoom_in_btn.attachEvent('onclick', zoom_in);
			zoom_out_btn.attachEvent('onclick', zoom_out);
		}
		
		image_div.appendChild(zoom_out_btn);
		image_div.appendChild(zoom_in_btn);
	}
	
	// function to zoom in
	function zoom_in(){
		// find our old zoom amount, our new zoom, and the difference between them
		var old_zoom = parseFloat(document.getElementById(options.id+'_zoom').value);
		var zoom = old_zoom + (old_zoom * (options.zoomInAmount / 100));
		curZoom = zoom;
		var zoom_ratio = zoom / old_zoom;
		
		// update the zoom and the image, image div, and shadowbox
		document.getElementById(options.id+'_zoom').value = zoom;
		image.style.width = origWidth * zoom + "px";
		image.style.height = origHeight * zoom + "px";
		image_div.style.width = origWidth * zoom + "px";
		image_div.style.height = origHeight * zoom + "px";
		shadowbox.style.width = origWidth * zoom + "px";
		shadowbox.style.height = origHeight * zoom + "px";
		if (document.getElementById(cropped_img_id)){ // if there is currently a selection, update that too
			var cropped_img = document.getElementById(cropped_img_id);
			var cropped_img_div = document.getElementById(cropped_img_div_id);
			cropped_img_div.style.left = parseFloat(cropped_img_div.style.left) * zoom_ratio + "px";
			cropped_img_div.style.top = parseFloat(cropped_img_div.style.top) * zoom_ratio + "px";
			cropped_img_div.style.width = parseFloat(cropped_img_div.style.width) * zoom_ratio + "px";
			cropped_img_div.style.height = parseFloat(cropped_img_div.style.height) * zoom_ratio + "px";
			cropped_img.style.width = (zoom * origWidth) + "px";
			cropped_img.style.height = (zoom * origHeight) + "px";
			cropped_img.style.left = (-1 * parseFloat(cropped_img_div.style.left)) + "px";
			cropped_img.style.top = (-1*parseFloat(cropped_img_div.style.top)) + "px";
			move_pointers();
		}
	}
	
	// function to zoom out
	function zoom_out(){
		// find our old zoom amount, our new zoom, and the difference between them
		var old_zoom = parseFloat(document.getElementById(options.id+'_zoom').value);
		var zoom = old_zoom - (old_zoom * (options.zoomOutAmount / 100));
		curZoom = zoom;
		var zoom_ratio = zoom / old_zoom;
		
		// update the zoom and the image, image div, and shadowbox
		document.getElementById(options.id+'_zoom').value = zoom;
		image.style.width = origWidth * zoom + "px";
		image.style.height = origHeight * zoom + "px";
		image_div.style.width = origWidth * zoom + "px";
		image_div.style.height = origHeight * zoom + "px";
		shadowbox.style.width = origWidth * zoom + "px";
		shadowbox.style.height = origHeight * zoom + "px";
		if (document.getElementById(cropped_img_id)){ // if there is currently a selection, update that too
			var cropped_img = document.getElementById(cropped_img_id);
			var cropped_img_div = document.getElementById(cropped_img_div_id);
			cropped_img_div.style.left = parseFloat(cropped_img_div.style.left) * zoom_ratio + "px";
			cropped_img_div.style.top = parseFloat(cropped_img_div.style.top) * zoom_ratio + "px";
			cropped_img_div.style.width = parseFloat(cropped_img_div.style.width) * zoom_ratio + "px";
			cropped_img_div.style.height = parseFloat(cropped_img_div.style.height) * zoom_ratio + "px";
			cropped_img.style.width = (zoom * origWidth) + "px";
			cropped_img.style.height = (zoom * origHeight) + "px";
			cropped_img.style.left = (-1 * parseFloat(cropped_img_div.style.left)) + "px";
			cropped_img.style.top = (-1*parseFloat(cropped_img_div.style.top)) + "px";
			move_pointers();
		}
	}
	
	// function that is called if we are looking to autoscale the image up or down
	function autoscale(){
		// find our parentHeight and parentWidth to compare to
		var el = image_div.parentNode;
		var parentWidth = '';
		var parentHeight = '';
		while(el !== null && parentWidth === '' && parentHeight === ''){
			if (typeof el.style !== 'undefined'){
				parentWidth = parseInt(el.style.width);
				parentHeight = parseInt(el.style.height);
			}
			el = el.parentNode;
		} 
		// if width or height isn't specified, grab the current window width or height
		if (parentWidth === '' || isNaN(parseFloat(parentWidth))){
			parentWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
		}
		if (parentHeight === '' || isNaN(parseFloat(parentHeight))){
			parentHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
		}
		
		// find how our image compares to the screen ...
		var widthComparison = origWidth / parentWidth;
		var heightComparison = origHeight / parentHeight;
		
		// test to see if we need to scale
		if (options.autoScale == 'fit' || (options.autoScale == 'scaledown' && (widthComparison > 1 || heightComparison > 1))){
			var old_zoom = parseFloat(document.getElementById(options.id+'_zoom').value);
			if (widthComparison > heightComparison){
				var zoom = 1 / widthComparison;
			} else {
				var zoom = 1 / heightComparison;
			}
			zoomSet = zoom;
			curZoom = zoom;
			var zoom_ratio = zoom / old_zoom;
			
			// Finally we update our zoom, image, image div, and shadowbox
			document.getElementById(options.id+'_zoom').value = zoom;
			image.style.width = origWidth * zoom + "px";
			image.style.height = origHeight * zoom + "px";
			image_div.style.width = origWidth * zoom + "px";
			image_div.style.height = origHeight * zoom + "px";
			shadowbox.style.width = origWidth * zoom + "px";
			shadowbox.style.height = origHeight * zoom + "px";
		}
	}
	
	// handy function for finding the offset of a given element, like the shadowbox
	// Taken from Vishal Astik's blog @
	// http://vishalsays.wordpress.com/2007/12/21/finding-elements-top-and-left-using-javascript
	function find_offset (el){
		x = el.offsetLeft;
		y = el.offsetTop;
		el = el.offsetParent;
		while(el !== null) { // loop through parent elements, adding the accumulative offsets
		    x = parseInt(x) + parseInt(el.offsetLeft);
		    y = parseInt(y) + parseInt(el.offsetTop);
		    el = el.offsetParent;
		  }
		  return {xpos: x, ypos: y};
	}
	
	// function to track the mouse as it moves over the shadowbox
	function track_mouse(e){
		if (e.touches){ // if this is a touch device
			e.preventDefault(); // prevent normal touch behavior
			if ((e.touches[0].pageX > shadowBoxOffset.xpos) 
			&& (e.touches[0].pageX < (shadowBoxOffset.xpos + shadowbox.offsetWidth))
			&& (e.touches[0].pageY > shadowBoxOffset.ypos)
			&& (e.touches[0].pageY < (shadowBoxOffset.ypos + shadowbox.offsetHeight))){
				//if the touch is inside the shadowbox, set our mouse position to the touch position minus shadowbox offset
				mouseX = e.touches[0].pageX - shadowBoxOffset.xpos; 
				mouseY = e.touches[0].pageY - shadowBoxOffset.ypos;
			} else { // if it is outside the shadowbox, stop tracking
				stop_track_mouse();
			}
		} else { // if this is not a touch device
			// cross-browser method to find mouseX and mouseY from http://www.quirksmode.org/js/events_properties.html
			var posX = 0, posY = 0;
			if (!e){ var e = window.event; }
			if (e.pageX) {
				posX = e.pageX;
				posY = e.pageY;
			} else if (e.clientX) {
				posX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				posY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}
			mouseX = posX - shadowBoxOffset.xpos;
			mouseY = posY - shadowBoxOffset.ypos;
		}
	}
	
	// detach the mousemove listener when we leave the box
	function stop_track_mouse(){
		if (shadowbox.removeEventListener){ // non-IE
			// don't need to turn off listener for touch events, since track_mouse in touch events tests if in shadowbox
			shadowbox.removeEventListener('mouseover', track_mouse, false);
		} else { // IE
			shadowbox.detachEvent('onmouseover', track_mouse);
		}
	}
	
	// function to start the selection once we mouse down
	function start_selection(e){
		if (firstClick){ // hack for IE... 
			// ... if this is the first time an area is selected, we need to make sure that the hidden inputs are refreshed
			set_hidden_values();
			firstClick = false;
		}
		
		if (!ignoreRecrop){ // only start a new crop area if we are not in the middle of moving the current crop area
			// set up our starting variables and create a new div...
			if (options.startingSelection){ // we have been assigned a starting selection
				startX = options.startingLeft;
				startY = options.startingTop;
			} else if (e.touches) { // grab startX for touch devices
				e.preventDefault();
				startX = e.touches[0].pageX - shadowBoxOffset.xpos; 
				startY = e.touches[0].pageY - shadowBoxOffset.ypos;
			} else { // for non-touch devices, grab the mouse position
				startX = mouseX;
				startY = mouseY;
			}
			
			var cropped_img_div = document.createElement('div'); // create the selection area div
			var cropped_img = new Image(); // create a second image from the first image
			cropped_img.src = image.src;
			console.log(document.getElementById(options.id+'_zoom').value);
			if (document.getElementById(options.id+'_zoom').value != 1){
				console.log('check!');
				var init_zoom = parseFloat(document.getElementById(options.id+'_zoom').value);
				cropped_img.style.width = (parseInt(cropped_img.style.width) * init_zoom) + 'px';
				cropped_img.style.height = (parseInt(cropped_img.style.height) * init_zoom) + 'px';
			}
			
			// check if there was another selected area, clear it
			if (document.getElementById(cropped_img_div_id)){
				document.getElementById(cropped_img_div_id).removeChild(document.getElementById(cropped_img_id))
				shadowbox.removeChild(document.getElementById(cropped_img_div_id));
			}
			var zoom = parseFloat(document.getElementById(options.id+'_zoom').value); // grab our current zoom
			
			// set up our cropping area
			cropped_img_div.style.position = 'absolute';
			cropped_img_div.style.margin = '0px';
			cropped_img_div.style.padding = '0px';
			cropped_img_div.style.border = 'none';
			cropped_img_div.style.left = startX + "px";
			cropped_img_div.style.top = startY + "px";
			if (options.minWidth != 0){ // if we have a minimun width, set that
				cropped_img_div.style.width = options.minWidth + "px";
				if (startX + options.minWidth > parseInt(shadowbox.style.width)){ 
					// if minimum width takes us past the edge, move back
					cropped_img_div.style.left = parseInt(shadowbox.style.width) - options.minWidth + "px";
					startX = parseInt(shadowbox.style.width) - options.minWidth;
				} 
			} else { // if no minimum width, start the width at 1px
				cropped_img_div.style.width = "1px";
			}
			if (options.minHeight != 0){ // if we have a minimum height, set that
				cropped_img_div.style.height = options.minHeight + "px";
				if (startY + options.minHeight > parseInt(shadowbox.style.height)){
					// if minimum height takes us past the edge, move back
					cropped_img_div.style.top = parseInt(shadowbox.style.height) - options.minHeight + "px";
					startY = (parseInt(shadowbox.style.height) - options.minHeight);
				} 
			} else { // if no minimum height, start the height at 1px
				cropped_img_div.style.height = "1px";
			}
			cropped_img_div.style.cursor = 'move';
			cropped_img_div.style.overflow = 'hidden';
			cropped_img_div.setAttribute('id',cropped_img_div_id); // set the ID to this variable, so we can always find it
			if (options.selectionClass !== ''){
				cropped_img_div.setAttribute('class', options.selectionClass);
			}
			
			// set our new image within the crop area with the right size
			cropped_img.style.width = (zoom*origWidth) + "px";
			cropped_img.style.height = (zoom*origHeight) + "px";
			cropped_img.style.position = 'absolute';
			cropped_img.style.margin = '0px';
			cropped_img.style.padding = '0px';
			cropped_img.style.border = 'none';
			cropped_img.style.left = (-1 * startX) + "px"; // set the offset
			cropped_img.style.top = (-1 * startY) + "px";
			cropped_img.style.maxWidth = 'none';
			cropped_img.style.maxHeight = 'none';
			cropped_img.setAttribute('id',cropped_img_id); // set the ID to this variable, so we can always find it
			
			// turn off dragging for image
			cropped_img.draggable = false;
 			cropped_img.onmousedown = function(e) {
 				e.preventDefault();
                return false;
              };
			
			// add our second image and selection area to the shadowbox
			cropped_img_div.appendChild(cropped_img);
			shadowbox.appendChild(cropped_img_div);
			
			// if we have general classes to add to the arrows...
			var arrowClassPrefix = (options.arrowClass === '') ? '' : options.arrowClass + ' ';
			
			// create pointers to drag box around
			if (options.fixedHeight == 0 && options.fixedRatio == 0){ 
				// Only add up & down arrows if we don't have fixed height or fixed ratio
				if (options.swapArrows){ // if specified, we make div's instead of spans
					var up_pointer = document.createElement('div');
				} else { // otherwise we create a span with an up arrow
					var up_pointer = document.createElement('span');
					up_pointer.style.fontSize = '14px';
					up_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					up_pointer.innerHTML = "&#9650;";
				}
				up_pointer.style.position = 'absolute';
				up_pointer.style.top = '0px';
				up_pointer.style.cursor = 'n-resize';
				up_pointer.setAttribute('id',options.id+'_up_pointer');
				if (options.arrowNClass !== '' || options.arrowClass !== ''){ // add classes
					up_pointer.setAttribute('class', arrowClassPrefix + options.arrowNClass);
				}
				cropped_img_div.appendChild(up_pointer); // and add our up arrow element
				
				if (options.swapArrows){ // down arrow
					var down_pointer = document.createElement('div');
				} else {
					var down_pointer = document.createElement('span');
					down_pointer.style.fontSize = '14px';
					down_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					down_pointer.innerHTML = "&#9660;";
				}
				down_pointer.style.position = 'absolute';
				down_pointer.style.left = '0px';
				down_pointer.style.cursor = 's-resize';
				down_pointer.setAttribute('id',options.id+'_down_pointer');
				if (options.arrowSClass !== '' || options.arrowClass !== ''){
					down_pointer.setAttribute('class', arrowClassPrefix + options.arrowSClass);
				}
				cropped_img_div.appendChild(down_pointer);
			}
			
			if (options.fixedWidth == 0 && options.fixedRatio == 0){
				// Only add left & right arrows if we don't have fixed width or fixed ratio
				if (options.swapArrows){ // right arrow
					var right_pointer = document.createElement('div');
				} else {
					var right_pointer = document.createElement('span');
					right_pointer.style.fontSize = '14px';
					right_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					right_pointer.innerHTML = "&#9654;";
				}
				right_pointer.style.position = 'absolute';
				right_pointer.style.left = '0px';
				right_pointer.style.cursor = 'e-resize';
				right_pointer.setAttribute('id',options.id+'_right_pointer');
				if (options.arrowEClass !== '' || options.arrowClass !== ''){
					right_pointer.setAttribute('class', arrowClassPrefix + options.arrowEClass);
				}
				cropped_img_div.appendChild(right_pointer);
				
				if (options.swapArrows){ // left arrow
					var left_pointer = document.createElement('div');
				} else {
					var left_pointer = document.createElement('span');
					left_pointer.style.fontSize = '14px';
					left_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					left_pointer.innerHTML = "&#9668;";
				}
				left_pointer.style.position = 'absolute';
				left_pointer.style.top = '0px';
				left_pointer.style.cursor = 'w-resize';
				left_pointer.setAttribute('id',options.id+'_left_pointer');
				if (options.arrowWClass !== '' || options.arrowClass !== ''){
					left_pointer.setAttribute('class', arrowClassPrefix + options.arrowWClass);
				}
				cropped_img_div.appendChild(left_pointer);
			}
			
			if (options.fixedHeight == 0 && options.fixedWidth == 0){
				// only add corner arrows if we don't have fixed height or fixed width
				if (options.swapArrows){ // right down arrow
					var rdown_pointer = document.createElement('div');
				} else {
					var rdown_pointer = document.createElement('span');
					rdown_pointer.style.fontSize = '14px';
					rdown_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					rdown_pointer.innerHTML = "&#9698;";
				}
				rdown_pointer.style.position = 'absolute';
				rdown_pointer.style.left = '0px';
				rdown_pointer.style.cursor = 'se-resize';
				rdown_pointer.setAttribute('id',options.id+'_rdown_pointer');
				if (options.arrowSEClass !== '' || options.arrowClass !== ''){
					rdown_pointer.setAttribute('class', arrowClassPrefix + options.arrowSEClass);
				}
				cropped_img_div.appendChild(rdown_pointer);
				
				if (options.swapArrows){ // left down arrow
					var ldown_pointer = document.createElement('div');
				} else {
					var ldown_pointer = document.createElement('span');
					ldown_pointer.style.fontSize = '14px';
					ldown_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					ldown_pointer.innerHTML = "&#9699;";
				}
				
				ldown_pointer.style.position = 'absolute';
				ldown_pointer.style.left = '5px';
				ldown_pointer.style.cursor = 'sw-resize';
				ldown_pointer.setAttribute('id',options.id+'_ldown_pointer');
				if (options.arrowSWClass !== '' || options.arrowClass !== ''){
					ldown_pointer.setAttribute('class', arrowClassPrefix + options.arrowSWClass);
				}
				cropped_img_div.appendChild(ldown_pointer);
				
				if (options.swapArrows){ // right up arrow
					var rup_pointer = document.createElement('div');
				} else {
					var rup_pointer = document.createElement('span');
					rup_pointer.style.fontSize = '14px';
					rup_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					rup_pointer.innerHTML = "&#9701;";
				}
				rup_pointer.style.position = 'absolute';
				rup_pointer.style.top = '0px';
				rup_pointer.style.cursor = 'ne-resize';
				rup_pointer.setAttribute('id',options.id+'_rup_pointer');
				if (options.arrowNEClass !== '' || options.arrowClass !== ''){
					rup_pointer.setAttribute('class', arrowClassPrefix + options.arrowNEClass);
				}
				cropped_img_div.appendChild(rup_pointer);
				
				if (options.swapArrows){ // left up arrow
					var lup_pointer = document.createElement('div');
				} else {
					var lup_pointer = document.createElement('span');
					lup_pointer.style.fontSize = '14px';
					lup_pointer.style.fontFamily = 'Lucida Sans Unicode, Arial Unicode MS, sans-serif';
					lup_pointer.innerHTML = "&#9700;";
				}
				lup_pointer.style.position = 'absolute';
				lup_pointer.style.left = '5px';
				lup_pointer.style.cursor = 'nw-resize';
				lup_pointer.setAttribute('id',options.id+'_lup_pointer');
				if (options.arrowNWClass !== '' || options.arrowClass !== ''){
					lup_pointer.setAttribute('class', arrowClassPrefix + options.arrowNWClass);
				}
				cropped_img_div.appendChild(lup_pointer);
			}
			
			// Attach all of our event listeners:
			// Listeners for the shadowbox to drag the initial selection (removed when mouse up)
			// Listeners for cropped area div to move it when click on
			// Listeners for each arrow to set the direction and start resizing when clicked on
			// Separate listeners are set for IE, non-IE, and touch devices
			if (shadowbox.addEventListener){
				shadowbox.addEventListener('touchmove', set_selection, false);
				document.addEventListener('touchend', save_selection, false);
				cropped_img_div.addEventListener('touchstart', move_selection, false);
				
				shadowbox.addEventListener('mousemove', set_selection, false);
				document.addEventListener('mouseup', save_selection, false);
				cropped_img_div.addEventListener('mousedown', move_selection, false);
				if (options.fixedHeight == 0 && options.fixedRatio == 0){
					up_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'n';
						start_resize(e);
					}, false);
					down_pointer.addEventListener('touchstart', function(e){
						resizeDir = 's';
						start_resize(e);
					}, false);
					
					up_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'n';
						start_resize(e);
					}, false);
					down_pointer.addEventListener('mousedown', function(e){
						resizeDir = 's';
						start_resize(e);
					}, false);
				}
				if (options.fixedWidth == 0 && options.fixedRatio == 0){
					right_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'e';
						start_resize(e);
					}, false);
					left_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'w';
						start_resize(e);
					}, false);
					
					right_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'e';
						start_resize(e);
					}, false);
					left_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'w';
						start_resize(e);
					}, false);
				}
				if (options.fixedHeight == 0 && options.fixedWidth == 0){
					rup_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'ne';
						start_resize(e);
					}, false);
					
					rdown_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'se';
						start_resize(e);
					}, false);
					
					ldown_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'sw';
						start_resize(e);
					}, false);
					
					lup_pointer.addEventListener('touchstart', function(e){
						resizeDir = 'nw';
						start_resize(e);
					}, false);
					
					rup_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'ne';
						start_resize(e);
					}, false);
					
					rdown_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'se';
						start_resize(e);
					}, false);
					
					ldown_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'sw';
						start_resize(e);
					}, false);
					
					lup_pointer.addEventListener('mousedown', function(e){
						resizeDir = 'nw';
						start_resize(e);
					}, false);
				}
				
			} else {
				shadowbox.attachEvent('onmousemove', set_selection);
				document.attachEvent('onmouseup', save_selection);
				cropped_img_div.attachEvent('onmousedown', move_selection);
				if (options.fixedHeight == 0 && options.fixedRatio == 0){
					up_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'n';
						start_resize(e);
					});
					down_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 's';
						start_resize(e);
					});
				}
				if (options.fixedWidth == 0 && options.fixedRatio == 0){
					right_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'e';
						start_resize(e);
					});
					left_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'w';
						start_resize(e);
					});
				}
				
				if (options.fixedHeight == 0 && options.fixedWidth == 0){
					rup_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'ne';
						start_resize(e);
					});
					
					rdown_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'se';
						start_resize(e);
					});
					
					ldown_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'sw';
						start_resize(e);
					});
					
					lup_pointer.attachEvent('onmousedown', function(e){
						resizeDir = 'nw';
						start_resize(e);
					});
				}
				
			}	
		}
		move_pointers(); // and we make sure that we move the pointers to the correct position as well
	}
	
	// Function while mouse is moving to expand and set a selection after first clicked
	function set_selection(){
		
		// set boolean values for if we are withing minimum and maximum widths and heights (if specified)
		var widthLimits = (options.maxWidth != 0) ? (Math.abs(startX - mouseX) <= options.maxWidth) : true;
		var heightLimits = (options.maxHeight != 0) ? (Math.abs(startY - mouseY) <= options.maxHeight) : true;
		var minWidthLimits = (options.minWidth != 0) ? (Math.abs(startX - mouseX) >= options.minWidth) : true;
		var minHeightLimits = (options.minHeight != 0) ? (Math.abs(startY - mouseY) >= options.minHeight) : true;
		
		if (options.startingSelection){ // if there is a starting selection we should be making
			if (options.startingWidth == 'full' || options.startingWidth > parseInt(shadowbox.style.width) - startX){
				// if it should be full, or selection is big enough to go to right edge ... 
				document.getElementById(cropped_img_div_id).style.width = (parseInt(shadowbox.style.width) - startX) + "px";
			} else {
				document.getElementById(cropped_img_div_id).style.width = options.startingWidth + "px";
			}
			
			if (options.startingHeight == 'full' || options.startingHeight > parseInt(shadowbox.style.height) - startY){
				// if it should be full, or selection is big enough to go to bottom edge...
				document.getElementById(cropped_img_div_id).style.height = (parseInt(shadowbox.style.height) - startY) + "px";
			} else {
				document.getElementById(cropped_img_div_id).style.height = options.startingHeight + "px";
			}
		} else if (options.fixedRatio != 0){ // if we have a fixed ratio
			// more booleans for staying within specified minimum and maximum heights and widths (if specified)
			// these are in terms of the opposite axis, since both are moving at once and connected
			var widthLimitsY = (options.maxWidth != 0) ? (Math.abs((mouseY-startY)*options.fixedRatio) <= options.maxWidth) : true;
			var heightLimitsX = (options.maxHeight != 0) ? (Math.abs((startX - mouseX)/options.fixedRatio) <= options.maxHeight) : true;
			var minWidthLimitsY = (options.minWidth != 0) ? (Math.abs((mouseY-startY)*options.fixedRatio) >= options.minWidth) : true;
			var minHeightLimitsX = (options.minHeight != 0) ? (Math.abs((startX - mouseX)/options.fixedRatio) >= options.minHeight) : true;
			
			if (mouseX - startX > mouseY - startY){ // if X axis is moved more...
				if (mouseX <= parseInt(shadowbox.style.width) && 
				((mouseX-startX)/options.fixedRatio) + startY <= parseInt(shadowbox.style.height) &&
				widthLimits && heightLimitsX && minWidthLimits && minHeightLimitsX){ // if within bounds...
					document.getElementById(cropped_img_div_id).style.width = (mouseX - startX) + "px";
					document.getElementById(cropped_img_div_id).style.height = ((mouseX-startX)/options.fixedRatio) + "px";
				}
			} else { // if Y axis is moved more ...
				if (mouseY <= parseInt(shadowbox.style.height) && 
				((mouseY-startY)*options.fixedRatio) + startX <= parseInt(shadowbox.style.width) &&
				widthLimitsY && heightLimits && minWidthLimitsY && minHeightLimits){ // if within bounds ...
					document.getElementById(cropped_img_div_id).style.height = (mouseY - startY) + "px";
					document.getElementById(cropped_img_div_id).style.width = ((mouseY-startY)*options.fixedRatio) + "px";
				}
			}
		} else { // if not fixed ratio, and not pre-selected, we just make sure it is on the image and not too big or small
			if (mouseX <= parseInt(shadowbox.style.width) && widthLimits && minWidthLimits){
				document.getElementById(cropped_img_div_id).style.width = (mouseX - startX) + "px";
			}
			if (mouseY <= parseInt(shadowbox.style.height) && heightLimits && minHeightLimits){
				document.getElementById(cropped_img_div_id).style.height = (mouseY - startY) + "px";
			}
		}
		
		move_pointers(); // move the pointers too
	}
	
	// Function to move pointers within cropped area to correct place
	function move_pointers(){
		// find our current width and height of cropped area
		var crop_width = parseInt(document.getElementById(cropped_img_div_id).style.width);
		var crop_height = parseInt(document.getElementById(cropped_img_div_id).style.height);
		if (document.getElementById(options.id+"_up_pointer")){ // move up pointer
			document.getElementById(options.id+"_up_pointer").style.left = Math.floor(crop_width/2) - 7 + 'px';
		}
		if (document.getElementById(options.id+"_down_pointer")){ // move down pointer
			document.getElementById(options.id+"_down_pointer").style.left = Math.floor(crop_width/2) - 7 + 'px';
			document.getElementById(options.id+"_down_pointer").style.top = crop_height - 17 + 'px';
		}
		if (document.getElementById(options.id+"_left_pointer")){ // move left pointer
			document.getElementById(options.id+"_left_pointer").style.top = Math.floor(crop_height/2) - 7 + 'px';
		}
		if (document.getElementById(options.id+"_right_pointer")){ // move right pointer
			document.getElementById(options.id+"_right_pointer").style.top = Math.floor(crop_height/2) - 7 + 'px';
			document.getElementById(options.id+"_right_pointer").style.left = crop_width - 17 + 'px';
		}
		if (document.getElementById(options.id+"_rup_pointer")){ // move upper right pointer
			document.getElementById(options.id+'_rup_pointer').style.left = crop_width - 14 + 'px';
		}
		if (document.getElementById(options.id+"_ldown_pointer")){ // move lower left pointer
			document.getElementById(options.id+'_ldown_pointer').style.top = crop_height - 17 + 'px';
		}
		if (document.getElementById(options.id+"_rdown_pointer")){ // move lower right pointer
			document.getElementById(options.id+'_rdown_pointer').style.left = crop_width - 14 + 'px';
			document.getElementById(options.id+'_rdown_pointer').style.top = crop_height - 17 + 'px';
		}
		// upper left pointer doesn't need to be moved, it stays at 0px 0px
		
		// deselect everything if accidentally highlighted
		if (document.selection){
			document.selection.empty();
		} else if (window.getSelection()){
			window.getSelection().removeAllRanges();
		}
	}
	
	// function that fires when you are setting the selection and mouse up
	// removes the set_selection handler and saves the coordinates
	function save_selection(){
		if (shadowbox.addEventListener){ // remove all our handlers
			shadowbox.removeEventListener('touchmove', set_selection, false);
			shadowbox.removeEventListener('touchmove', drag_selection, false);
			shadowbox.removeEventListener('touchmove', selection_resize, false);
			shadowbox.removeEventListener('touchmove', selection_resize_fixed, false);
			
			shadowbox.removeEventListener('mousemove', set_selection, false);
			shadowbox.removeEventListener('mousemove', drag_selection, false);
			shadowbox.removeEventListener('mousemove', selection_resize, false);
			shadowbox.removeEventListener('mousemove', selection_resize_fixed, false);
		} else {
			shadowbox.detachEvent('onmousemove', set_selection);
			shadowbox.detachEvent('onmousemove', drag_selection);
			shadowbox.detachEvent('onmousemove', selection_resize);
			shadowbox.detachEvent('onmousemove', selection_resize_fixed);
		}
		
		// reset our coordinates
		clickX = 0;
		clickY = 0;
		clickWidth = 0;
		clickHeight = 0;
		
		// if there is currently a cropped area, then save those coordinates to our hidden inputs
		var cropped_img_div = document.getElementById(cropped_img_div_id);
		if (cropped_img_div != null){
			var zoom = parseFloat(document.getElementById(options.id + '_zoom').value);
			document.getElementById(options.id+'_x1').value = parseInt(cropped_img_div.style.left) / zoom;
			document.getElementById(options.id+'_y1').value = parseInt(cropped_img_div.style.top) / zoom;
			document.getElementById(options.id+'_width').value = parseInt(cropped_img_div.style.width) / zoom;
			document.getElementById(options.id+'_height').value = parseInt(cropped_img_div.style.height) / zoom;
		}
		
		// if we have a callback to do, call that function with an object with the coordinates
		if (options.callbackFn !== '' && typeof(window[options.callbackFn]) === 'function'){
			window[options.callbackFn]({
				'x1' 		: parseInt(cropped_img_div.style.left) / zoom,
				'y1' 		: parseInt(cropped_img_div.style.top) / zoom,
				'width'		: parseInt(cropped_img_div.style.width) / zoom,
				'height'	: parseInt(cropped_img_div.style.height) / zoom
			});
		}
		
		// Allow us to select new areas (if not a fixed width or height)
		if (options.fixedWidth == 0 && options.fixedHeight == 0){
			ignoreRecrop = false;
		}
		
		ignoreMove = false; // allow us to move selection again
		options.startingSelection = false; // no longer have to make a starting selection
	}
	
	// function that fires when the user clicks inside the crop area to move the box
	function move_selection(e){
		if (!ignoreMove){ // only if we are able to move
			ignoreRecrop = true; // do not allow selecting another area while moving this one
			
			if (e.touches){ // grab clickX for touch devices
				e.preventDefault();
				clickX = e.touches[0].pageX - shadowBoxOffset.xpos; 
				clickY = e.touches[0].pageY - shadowBoxOffset.ypos;
			} else { // for non-touch
				clickX = mouseX;
				clickY = mouseY;
			}
			
			// get current left and top coordinates for crop area
			cropLeft = parseInt(document.getElementById(cropped_img_div_id).style.left);
			cropTop = parseInt(document.getElementById(cropped_img_div_id).style.top);
			
			// attach our listeners to move the selection. on mouse up, we save the selection
			if (shadowbox.addEventListener){
				shadowbox.addEventListener('touchmove', drag_selection, false);
				document.addEventListener('touchend', save_selection, false);
				
				shadowbox.addEventListener('mousemove', drag_selection, false);
				document.addEventListener('mouseup', save_selection, false);
			} else {
				shadowbox.attachEvent('onmousemove', drag_selection);
				document.attachEvent('onmouseup', save_selection);
			}
		}
	}
	
	// function to drag the crop area selection when the user clicks inside it
	function drag_selection(){
		// grab the current difference in coordinates
		var diffX = mouseX - clickX;
		var diffY = mouseY - clickY;
		
		// our cropped area and the image inside it
		var cropped_img_div = document.getElementById(cropped_img_div_id);
		var cropped_img = document.getElementById(cropped_img_id);
		
		if ((cropLeft + diffX) >= 0 && (cropLeft + diffX + parseInt(cropped_img_div.style.width)) <= parseInt(shadowbox.style.width)){
			// if still in bounds horizontally, move
			var newLeft = cropLeft + diffX;
		} else if ((cropLeft + diffX) < 0){ // if past the left edge, set to 0
			var newLeft = 0;
		} else { // if past the right edge, set to right edge
			var newLeft = parseInt(shadowbox.style.width) - parseInt(cropped_img_div.style.width);
		}
		
		if ((cropTop + diffY) >= 0 && (cropTop + diffY + parseInt(cropped_img_div.style.height)) <= parseInt(shadowbox.style.height)){
			// if still in bounds vertically, move
			var newTop = cropTop + diffY
		} else if ((cropTop + diffY) < 0){ // if past the top edge, set to 0
			var newTop = 0;
		} else { // past the bottom edge, set to bottom edge
			var newTop = parseInt(shadowbox.style.height) - parseInt(cropped_img_div.style.height);
		}
		// move our crop area and our crop image offset accordingly
		cropped_img_div.style.left = newLeft + "px";
		cropped_img_div.style.top = newTop + "px"; 
		cropped_img.style.left = (-1 * newLeft) + "px";
		cropped_img.style.top = (-1 * newTop) + "px";
	}
	
	// Function to start resizing (after clicking on an arrow)
	function start_resize(e){
		
		// set these to true so we don't accidentally try to start a new cropping area or move the existing area
		ignoreRecrop = true;
		ignoreMove = true;
		
		if (e.touches){ // grab clickX for touch devices
			e.preventDefault();
			clickX = e.touches[0].pageX - shadowBoxOffset.xpos; 
			clickY = e.touches[0].pageY - shadowBoxOffset.ypos;
		} else { // for non-touch
			clickX = mouseX;
			clickY = mouseY;
		}
		
		// current left, top, width, and height values for crop area
		cropLeft = parseInt(document.getElementById(cropped_img_div_id).style.left);
		cropTop = parseInt(document.getElementById(cropped_img_div_id).style.top);
		cropWidth = parseInt(document.getElementById(cropped_img_div_id).style.width);
		cropHeight = parseInt(document.getElementById(cropped_img_div_id).style.height);
		
		// add event handlers for dragging corners, and for saving the selection on mouse up
		if (shadowbox.addEventListener){
			if (options.fixedRatio != 0){ // different function for dragging corners when fixed ratio is turned on
				shadowbox.addEventListener('touchmove', selection_resize_fixed, false);
				shadowbox.addEventListener('mousemove', selection_resize_fixed, false);
			} else {
				shadowbox.addEventListener('touchmove', selection_resize, false);
				shadowbox.addEventListener('mousemove', selection_resize, false);
			}
			document.addEventListener('touchend', save_selection, false);
			document.addEventListener('mouseup', save_selection, false);
		} else {
			if (options.fixedRatio != 0){
				shadowbox.attachEvent('onmousemove', selection_resize_fixed);
			} else {
				shadowbox.attachEvent('onmousemove', selection_resize);
			}
			document.attachEvent('onmouseup', save_selection);
		}
	}
	
	// Function to resize selection (used for resizing when fixed ratio is not turned on)
	function selection_resize(){
		// get difference in coordinates
		var diffX = mouseX - clickX;
		var diffY = mouseY - clickY;
		
		// grab our crop area and our image inside
		var cropped_img = document.getElementById(cropped_img_id);
		var cropped_img_div = document.getElementById(cropped_img_div_id);
		
		// booleans to make sure we stay within minimum and maximum boundaries on all four sides
		var widthLimitsE = (options.maxWidth != 0) ? (cropWidth + diffX <= options.maxWidth) : true;
		var widthLimitsW = (options.maxWidth != 0) ? (cropWidth - diffX <= options.maxWidth) : true;
		var heightLimitsS = (options.maxHeight != 0) ? (cropHeight + diffY <= options.maxHeight) : true;
		var heightLimitsN = (options.maxHeight != 0) ? (cropHeight - diffY <= options.maxHeight) : true;
		var minWidthLimitsE = (options.minWidth != 0) ? (cropWidth + diffX >= options.minWidth) : true;
		var minWidthLimitsW = (options.minWidth != 0) ? (cropWidth - diffX >= options.minWidth) : true;
		var minHeightLimitsS = (options.minHeight != 0) ? (cropHeight + diffY >= options.minHeight) : true;
		var minHeightLimitsN = (options.minHeight != 0) ? (cropHeight - diffY >= options.minHeight) : true;
		
		if (resizeDir == 'e' || resizeDir == 'ne' || resizeDir == 'se'){ // testing movement to the right
			if ((cropLeft + cropWidth + diffX) <= parseInt(shadowbox.style.width) && widthLimitsE && minWidthLimitsE){
				cropped_img_div.style.width = cropWidth + diffX + "px";
			}
		}
		if (resizeDir == 's' || resizeDir == 'sw' || resizeDir == 'se'){ // testing movement downward
			if ((cropTop + cropHeight + diffY) <= parseInt(shadowbox.style.height) && heightLimitsS && minHeightLimitsS){
				cropped_img_div.style.height = cropHeight + diffY + "px";
			}
		}
		if (resizeDir == 'w' || resizeDir == 'sw' || resizeDir == 'nw'){ // testing movement to the left
			if ((cropLeft + diffX) >= 0 && diffX <= cropWidth && widthLimitsW && minWidthLimitsW){
				cropped_img_div.style.width = cropWidth - diffX + "px";
				cropped_img_div.style.left = cropLeft + diffX + "px";
				cropped_img.style.left = -1 * (cropLeft + diffX) + "px";
				backgroundPosX = -1 * (cropLeft + diffX);
			} 
		}
		if (resizeDir == 'n' || resizeDir == 'nw' || resizeDir == 'ne'){ // testing movement upward
			if ((cropTop + diffY) >= 0 && diffY <= cropHeight && heightLimitsN && minHeightLimitsN){
				cropped_img_div.style.height = cropHeight - diffY + "px";
				cropped_img_div.style.top = cropTop + diffY + "px";
				cropped_img.style.top = -1 * (cropTop + diffY) + "px";
				backgroundPosY = -1 * (cropTop + diffY);
			} 
		}
		
		move_pointers(); // move pointers
		
		// deselect everything
		if (document.selection){
			document.selection.empty();
		} else if (window.getSelection()){
			window.getSelection().removeAllRanges();
		}
	}
	
	// resize function if the aspect ratio is fixed
	function selection_resize_fixed(){
		// get our difference in coordinates
		var diffX = mouseX - clickX;
		var diffY = mouseY - clickY;
		
		// get our cropped area and our image inside
		var cropped_img = document.getElementById(cropped_img_id);
		var cropped_img_div = document.getElementById(cropped_img_div_id);
		
		// booleans for maximum and minimum limits. A test for each edge, both maximum and minimum, 
		// and in terms of x and y (since they are linked together by a fixed ratio) 
		var widthLimitsX = (options.maxWidth != 0) ? (cropWidth + diffX <= options.maxWidth) : true;
		var widthLimitsY = (options.maxWidth != 0) ? (cropWidth + (diffY*options.fixedRatio) <= options.maxWidth) : true;
		var heightLimitsX = (options.maxHeight != 0) ? (cropHeight + (diffX/options.fixedRatio) <= options.maxHeight) : true;
		var heightLimitsY = (options.maxHeight != 0) ? (cropHeight + diffY <= options.maxHeight) : true;
		var widthLimitsX2 = (options.maxWidth != 0) ? (cropWidth - diffX <= options.maxWidth) : true;
		var widthLimitsY2 = (options.maxWidth != 0) ? (cropWidth - (diffY*options.fixedRatio) <= options.maxWidth) : true;
		var heightLimitsX2 = (options.maxHeight != 0) ? (cropHeight - (diffX/options.fixedRatio) <= options.maxHeight) : true;
		var heightLimitsY2 = (options.maxHeight != 0) ? (cropHeight - diffY <= options.maxHeight) : true;
		
		var minWidthLimitsX = (options.minWidth != 0) ? (cropWidth + diffX >= options.minWidth) : true;
		var minWidthLimitsY = (options.minWidth != 0) ? (cropWidth + (diffY*options.fixedRatio) >= options.minWidth) : true;
		var minHeightLimitsX = (options.minHeight != 0) ? (cropHeight + (diffX/options.fixedRatio) >= options.minHeight) : true;
		var minHeightLimitsY = (options.minHeight != 0) ? (cropHeight + diffY >= options.minHeight) : true;
		var minWidthLimitsX2 = (options.minWidth != 0) ? (cropWidth - diffX >= options.minWidth) : true;
		var minWidthLimitsY2 = (options.minWidth != 0) ? (cropWidth - (diffY*options.fixedRatio) >= options.minWidth) : true;
		var minHeightLimitsX2 = (options.minHeight != 0) ? (cropHeight - (diffX/options.fixedRatio) >= options.minHeight) : true;
		var minHeightLimitsY2 = (options.minHeight != 0) ? (cropHeight - diffY >= options.minHeight) : true;
		
		if (resizeDir == 'se'){ // testing the southeast corner ...
			if (Math.abs(diffX) > Math.abs(diffY)){ // if x moved further, test in terms of x
				if ((cropLeft + cropWidth + diffX) <= parseInt(shadowbox.style.width) && 
				(diffX/options.fixedRatio) + cropTop + cropHeight <= parseInt(shadowbox.style.height)){	 // within bounds
					if (((diffX>0)==(diffY>0)) && minWidthLimitsX && widthLimitsX && minHeightLimitsX && heightLimitsX){
						// test to make sure going the right direction and within max and min	
						cropped_img_div.style.width = cropWidth + diffX + "px";
						cropped_img_div.style.height = (diffX/options.fixedRatio) + cropHeight + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			} else { // if y moved further, test in terms of y
				if ((cropTop + cropHeight + diffY) <= parseInt(shadowbox.style.height) && 
				(diffY*options.fixedRatio) + cropLeft + cropWidth <= parseInt(shadowbox.style.width)){	// within bounds
					if (((diffX>0)==(diffY>0)) && minHeightLimitsY && heightLimitsY && minWidthLimitsY && widthLimitsY){
						// test to make sure going the right direction and within max and min	
						cropped_img_div.style.height = diffY + cropHeight + "px";
						cropped_img_div.style.width = (diffY*options.fixedRatio) + cropWidth + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			}
		} else if (resizeDir == 'sw'){ // testing southwest corner
			if (Math.abs(diffX) > Math.abs(diffY)){ // if x moved further, test in terms of x
				if ((cropLeft - (-1*diffX)) >= 0 && 
				((-1*diffX)/options.fixedRatio) + cropTop + cropHeight <= parseInt(shadowbox.style.height)){ // within bounds
					if (((diffX>0)!=(diffY>0)) && minWidthLimitsX2 && widthLimitsX2 && minHeightLimitsX2 && heightLimitsX2){
						// test to make sure going the right direction and within max and min	
						cropped_img_div.style.width = cropWidth + (-1*diffX) + "px";
						cropped_img_div.style.left = cropLeft - (-1*diffX) + "px";
						cropped_img_div.style.height = ((-1*diffX)/options.fixedRatio) + cropHeight + "px";
						cropped_img.style.left = (-1 * (cropLeft + diffX)) + "px";
						cropped_img.style.top = (cropTop * -1) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			} else { // if y moved further, test in terms of y
				if ((cropTop + cropHeight + diffY) <= parseInt(shadowbox.style.height) && 
				cropLeft - (diffY*options.fixedRatio) >= 0){ // within bounds
					if (((diffX>0)!=(diffY>0)) && minHeightLimitsY && heightLimitsY && minWidthLimitsY && widthLimitsY){
						// test to make sure going the right direction and within max and min		
						cropped_img_div.style.height = diffY + cropHeight + "px";
						cropped_img_div.style.width = (diffY*options.fixedRatio) + cropWidth + "px";
						cropped_img_div.style.left = cropLeft - (diffY*options.fixedRatio) + "px";
						cropped_img.style.left = (-1 * (cropLeft + (-1*diffY*options.fixedRatio))) + "px";
						cropped_img.style.top = (cropTop * -1) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			}
		} else if (resizeDir == 'ne'){ // testing northeast corner
			if (Math.abs(diffX) > Math.abs(diffY)){ // if x moved further, test in terms of x
				if ((cropLeft + cropWidth + diffX) <= parseInt(shadowbox.style.width) && 
				cropTop - (diffX/options.fixedRatio) >= 0){ // within bounds
					if (((diffX>0)!=(diffY>0)) && minWidthLimitsX && widthLimitsX && minHeightLimitsX && heightLimitsX){
						// test to make sure going the right direction and within max and min		
						cropped_img_div.style.width = diffX + cropWidth + "px";
						cropped_img_div.style.height = (diffX/options.fixedRatio) + cropHeight + "px";
						cropped_img_div.style.top = cropTop - (diffX/options.fixedRatio) + "px";
						cropped_img.style.left = (cropLeft *-1) + "px";
						cropped_img.style.top = (-1*(cropTop - (diffX/options.fixedRatio))) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			} else { // if y moved further, test in terms of y
				if ((cropTop - (-1*diffY)) >= 0 && 
				(-1*diffY*options.fixedRatio) + cropLeft + cropWidth <= parseInt(shadowbox.style.width)){ // within bounds
					if (((diffX>0)!=(diffY>0)) && minHeightLimitsY2 && heightLimitsY2 && minWidthLimitsY2 && widthLimitsY2){
						// test to make sure going the right direction and within max and min		
						cropped_img_div.style.height = cropHeight + (-1*diffY) + "px";
						cropped_img_div.style.top = cropTop - (-1*diffY) + "px";
						cropped_img_div.style.width = (-1*diffY*options.fixedRatio) + cropWidth + "px";
						cropped_img.style.left = (cropLeft * -1) + "px";
						cropped_img.style.top = (-1*(cropTop - (-1*diffY))) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			}
		} else if (resizeDir == 'nw'){ // testing northwest corner
			if (Math.abs(diffX) > Math.abs(diffY)){ // if x moved further, test in terms of x
				if ((cropLeft - (-1*diffX)) >= 0 && cropTop - ((-1*diffX)/options.fixedRatio) >= 0){ // within bounds
					if (((diffX>0)==(diffY>0)) && minWidthLimitsX2 && widthLimitsX2 && minHeightLimitsX2 && heightLimitsX2){
						// test to make sure going the right direction and within max and min	
						cropped_img_div.style.width = cropWidth + (-1*diffX) + "px";
						cropped_img_div.style.left = cropLeft - (-1*diffX) + "px";
						cropped_img_div.style.height = ((-1*diffX)/options.fixedRatio) + cropHeight + "px";
						cropped_img_div.style.top = cropTop - ((-1*diffX)/options.fixedRatio) + "px";
						cropped_img.style.left = (-1 * (cropLeft + diffX)) + "px";
						cropped_img.style.top = (-1*(cropTop - (-1*diffX/options.fixedRatio))) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			} else { // if y moved further, test in terms of y
				if ((cropTop - (-1*diffY)) >= 0 && cropLeft - (-1*diffY*options.fixedRatio) >= 0){	// within bounds	
					if (((diffX>0)==(diffY>0)) && minHeightLimitsY2 && heightLimitsY2 && minWidthLimitsY2 && widthLimitsY2){
						// test to make sure going the right direction and within max and min
						cropped_img_div.style.height = cropHeight + (-1*diffY) + "px";
						cropped_img_div.style.top = cropTop - (-1*diffY) + "px";
						cropped_img_div.style.width = (-1*diffY*options.fixedRatio) + cropWidth + "px";
						cropped_img_div.style.left = cropLeft - (-1*diffY*options.fixedRatio) + "px";
						cropped_img.style.left = (-1 * (cropLeft - (-1*diffY*options.fixedRatio))) + "px";
						cropped_img.style.top = (-1*(cropTop - (-1*diffY))) + "px";
					} else { // if we hit some kind of limit, we need to make sure the aspect ratio remains okay
						cropped_img_div.style.width = parseFloat(cropped_img_div.style.height) * options.fixedRatio + "px"; 
					}
				}
			}
		}
		move_pointers(); // move the pointers
		
		// deselect everything
		if (document.selection){
			document.selection.empty();
		} else if (window.getSelection()){
			window.getSelection().removeAllRanges();
		}
	}
	
	//function to add a custom hidden field into the autogenerated submission field
	function add_field(name, value){
		if (document.getElementById(options.id+'_custom_input_'+name)){
			document.getElementById(options.id+'_custom_input_'+name).value = value;
		} else {
			var custom_input = document.createElement('input');
			custom_input.setAttribute('name', name);
			custom_input.setAttribute('type', 'hidden');
			custom_input.setAttribute('id', options.id+'_custom_input_'+name);
			coord_form.appendChild(custom_input);
			custom_input.value = value;
		}
	}
	
	// here we have a few methods for users to play with...
	return {
		add_field : function(name, value){ // adds a custom field to the autogenerated submission field
			add_field(name, value);
		},
		clear : function(){ // clears the current selection
			clear_selection();
		},
		full : function(){ // selects entire area
			full_selection();
		},
		returnX : function(){ // returns current X value
			return parseFloat(document.getElementById(options.id+'_x1').value);
		},
		returnY : function(){ // returns current Y value
			return parseFloat(document.getElementById(options.id+'_y1').value);
		},
		returnWidth : function(){ // returns current width value
			return parseFloat(document.getElementById(options.id+'_width').value);
		},
		returnHeight : function(){ // returns current height value
			return parseFloat(document.getElementById(options.id+'_height').value);
		},
		returnZoom : function(){ // returns current zoom value
			return parseFloat(document.getElementById(options.id+'_zoom').value);
		},
		set : function(x, y, w, h){ // allows user to set the x, y, width, and height of the area manually
			options.startingSelection = true;
			if (x < 0){x = 0;}
			if (x > origWidth){x = origWidth;}
			if (y < 0){y = 0;}
			if (y > origHeight){y = origHeight;}
			if (w < 0){w = 0;}
			if (w > origWidth){w = origWidth;}
			if (h < 0){h = 0;}
			if (h > origHeight){h = origHeight;}
			options.startingLeft = x;
			options.startingTop = y;
			options.startingWidth = w;
			options.startingHeight = h;
			start_selection();
			set_selection();
			save_selection();
		},
		zoom_in : function(num){ // zoom in by the given percentage
			options.zoomInAmount = num;
			zoom_in();
		},
		zoom_out : function(num){ // zoom out by the given percentage
			options.zoomOutAmount = num;
			zoom_out();
		},
		destroy : function(return_size){ // clear out all of the created elements, and return image to normal
			image_div.removeChild(coord_form);
			if (options.clearBtn == 'clear' || options.clearBtn == 'full'){ image_div.removeChild(clear_button); }
			if (options.zoomBtn){ image_div.removeChild(zoom_in_btn); image_div.removeChild(zoom_out_btn); }
			image_div.removeChild(shadowbox);
			
			if(typeof(return_size) !== 'undefined' && return_size){ // if return_size is true, we also return to original size
				image.style.width = origWidth + 'px';
				image.style.height = origHeight + 'px';
				image_div.style.width = origWidth + 'px';
				image_div.style.height = origHeight + 'px';
			}
		}
	}
}