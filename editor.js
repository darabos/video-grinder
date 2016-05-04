'use strict';

var selected;
var data = [];

function addVideos(videos) {
  var outside = $('#videos');
  var existing = data.length;
  for (var i = 0; i < videos.length; ++i) {
    var file = videos[i];
    var url = window.URL.createObjectURL(file);
    var inside = $('<div class="video"></div>');
    var video = $('<video preload="auto" src="' + url + '"></video>');
    var meta = $('<div class="meta"></div>');
    var name = $('<span class="name">' + file.name + '</span>');
    var spans = $('<span class="start">?</span>&ndash;<span class="end">?</span>');
    meta.append(name);
    meta.append(spans);
    inside.append(video);
    inside.append(meta);
    outside.append(inside);
    var v = video[0];
    v.dataset.index = existing + i;
    data.push({ file: file.name });

    video.click(function(e) {
      setSelected(e.target);
      toggle(selected);
    });

    video.mousemove(function(e) {
      setSelected(e.target);
      var frame = Math.floor(10 * selected.duration * e.offsetX / selected.offsetWidth);
      selected.currentTime = frame / 10;
    });
  }
}

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

function setSelected(v) {
  if (selected !== undefined) {
    $(selected).parent().removeClass('selected');
  }
  selected = v;
  $(selected).parent().addClass('selected');
}

$(function() {
  $('body').keydown(function(e) {
    var k = e.which;
    if (k == 39) { // Right.
      selected.currentTime += 0.1;
    } else if (k == 37) { // Left.
      selected.currentTime -= 0.1;
    } else if (k == 40) { // Down.
      selected.currentTime = 0;
    } else if (k == 38) { // Up.
      selected.currentTime = selected.duration;
    } else if (k == 32) { // Space.
      toggle(selected);
      e.preventDefault();
    } else if (k == 13) { // Enter.
      selected.currentTime = d(selected).start || 0;
    } else if (k == 'S'.charCodeAt(0)) {
      d(selected).start = selected.currentTime;
      $(selected).parent().find('.start').html(timestr(selected.currentTime));
    } else if (k == 'E'.charCodeAt(0)) {
      d(selected).end = selected.currentTime;
      $(selected).parent().find('.end').html(timestr(selected.currentTime));
    } else if (k == 'J'.charCodeAt(0)) {
      var next = $('#videos video')[index(selected) + 1];
      if (next !== undefined) { setSelected(next); }
    } else if (k == 'K'.charCodeAt(0)) {
      var prev = $('#videos video')[index(selected) - 1];
      if (prev !== undefined) { setSelected(prev); }
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
