$(function() {



	$('.sdInput input').keyup(function(e) {
		if(e.keyCode == 13) {//Enter
			var value = encodeURIComponent($(this).val()); 
			window.location.href = value; 
			return false;
		}
	});

	$('#shareDesk').click(function() {
		$('div.info').animate({left:'1000px', opacity:0}, 500, function() {
			$('.start').css('display','block');
			$('.start').animate({left:0, opacity:1}, 500);
			$('.sdInput').animate({left:0, opacity:1}, 500);
			$(this).css('display', 'none');	
		});

		return false;

	});

	$('a.about').click(function() {
		
		$('.sdInput').animate({left:'-1000px', opacity:0}, 500);
		$('.start').delay(100).animate({left:'-1000px', opacity:0}, 500, function() {
			$('div.info').css('display','block');
			$('div.info').animate({left:0, opacity:1}, 500);
			$(this).css('display', 'none');	
		});

		return false;
		
	});

	//Input help
	$('.sdInput input').attr('title', $('.sdInput input').val());
	$('.sdInput input').focus(function() {
		$(this).val('');
		$('.sdInput .back').animate({
			opacity: 0.8
		}, 200);	
	}).focusout(function() {
		$(this).val($(this).attr('title'));
		$('.sdInput .back').animate({
			opacity: 0.6
		}, 500);		
	});


	//Start rotation of illumeBack
	var div = $(".illum")[0];
	var property = getTransformProperty(div);
	if (property) {
		var d = 0;
		setInterval(
			function () {
				div.style[property] = 'rotate(' + (d % 360) + 'deg)';
				d += 1;
			},
			50
		);
	}

});


/* Checks transform properties for the current browser
 * @returns the browser specific transform property
 * from: http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
 * */
function getTransformProperty(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
        }
    }
    return false;
}

