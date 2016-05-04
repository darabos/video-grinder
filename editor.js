$(function() {
  var vobj = $('video');
  var v = vobj[0];
  var data = [];

  vobj.each(function(i, v) {
    v.dataset.index = i;
    var file = v.currentSrc.split('/').slice(-1)[0];
    data.push({ file: file });
    $(v).after($('<span class="start">?</span>&ndash;<span class="end">?</span>'));
  });

  vobj.mousemove(function(e) {
    v = e.target;
    var frame = Math.floor(10 * v.duration * e.offsetX / v.offsetWidth);
    v.currentTime = frame / 10;
  });

  function index(v) {
    return parseInt(v.dataset.index);
  }

  function d(v) {
    return data[index(v)];
  }

  function toggle(v) {
    if (v.paused) {
      v.play();
      var end = d(v).end;
      if (end !== undefined) {
        v.addEventListener('timeupdate', function() {
          if(this.currentTime >= end) {
            this.pause();
          }
        });
      }
    } else {
      v.pause();
    }
  }

  function timestr(t) {
    var min = Math.floor(t / 60);
    var sec = t - 60 * min;
    if (sec < 10) {
      return min.toFixed(0) + ':0' + sec.toFixed(0);
    } else {
      return min.toFixed(0) + ':' + sec.toFixed(0);
    }
  }

  vobj.click(function(e) {
    v = e.target;
    toggle(v);
  });

  $('body').keydown(function(e) {
    var k = e.which;
    if (k == 39) { // Right.
      v.currentTime += 0.1;
    } else if (k == 37) { // Left.
      v.currentTime -= 0.1;
    } else if (k == 40) { // Down.
      v.currentTime = 0;
    } else if (k == 38) { // Up.
      v.currentTime = v.duration;
    } else if (k == 32) { // Space.
      toggle(v);
    } else if (k == 13) { // Enter.
      v.currentTime = d(v).start || 0;
    } else if (k == 'S'.charCodeAt(0)) {
      d(v).start = v.currentTime;
      $(v).siblings('.start').html(timestr(v.currentTime));
    } else if (k == 'E'.charCodeAt(0)) {
      d(v).end = v.currentTime;
      $(v).siblings('.end').html(timestr(v.currentTime));
    } else if (k == 'J'.charCodeAt(0)) {
      var next = vobj[index(v) + 1];
      if (next !== undefined) { v = next; }
    } else if (k == 'K'.charCodeAt(0)) {
      var prev = vobj[index(v) - 1];
      if (prev !== undefined) { v = prev; }
    }
  });

  $('textarea').click(function(e) {
    var code = [];
    code.push('from moviepy.editor import *');
    code.push('clips = []');
    for (var i = 0; i < data.length; ++i) {
      var d = data[i];
      if (d.start && d.end) {
        code.push('clips.append(VideoFileClip("' + d.file + '").subclip(' + d.start + ', ' + d.end + '))');
      }
    }
    code.push('final = concatenate_videoclips(clips)');
    code.push('final.write_videofile("output.mp4", fps=30, audio_bitrate="1000k", bitrate="4000k")');
    $(this).val(code.join('\n'));
  });
});
