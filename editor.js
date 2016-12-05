'use strict'

let selected
let data
const $ = require('./node_modules/jquery/dist/jquery.min.js')
const assert = require('assert');
const fs = require('fs')
const path = require('path')
const DATA_FILE_NAME = 'video-grinder-data'

function loadData(dir, cb) {
  let dataFile = path.join(dir.path, DATA_FILE_NAME)
  fs.exists(dataFile, exists => {
    if (exists) {
      fs.readFile(dataFile, (err, contents) => {
        let data = JSON.parse(contents)
        cb(data)
      })
    } else {
      cb()
    }
  })
}

function saveData(button) {
  let dataFile = path.join(data.dir, DATA_FILE_NAME)
  button.disabled = true
  fs.writeFile(dataFile, JSON.stringify(data), err => {
    if (err) throw err
    button.disabled = false
  })
}

function getFiles(dir, cb) {
  fs.readdir(dir, (err, files) => {
    if (err) throw err
    let data = { dir: dir, clips: [] }
    files.forEach(file => {
      if (file !== DATA_FILE_NAME) {
        data.clips.push({
          file: file,
          url: 'file://' + dir + '/' + file,
        })
      }
    })
    cb(data)
  })
}

function openDir(dir) {
  loadData(dir, data => {
    console.log(data)
    if (data) {
      setData(data)
    } else {
      getFiles(dir.path, data => setData(data))
    }
  })
}

function setData(newData) {
  data = newData
  let outside = $('#videos')
  outside.empty()
  for (let i = 0; i < data.clips.length; ++i) {
    let d = data.clips[i]
    let inside = $('<div class="video"></div>')
    let video = $(`<video preload="auto" src="${ d.url }"></video>`)
    let meta = $('<div class="meta"></div>')
    let name = $(`<span class="name">${ d.file }</span>`)
    let spans = $(`<span class="start">${ d.start || '?'}</span>
                   &ndash;<span class="end">${ d.end || '?'}</span>`)
    meta.append(name)
    meta.append(spans)
    inside.append(video)
    inside.append(meta)
    outside.append(inside)
    let v = video[0]
    v.dataset.index = i

    video.click(function(e) {
      setSelected(e.target)
      toggle(selected)
    })

    video.mousemove(function(e) {
      setSelected(e.target)
      let frame = Math.floor(10 * selected.duration * e.offsetX / selected.offsetWidth)
      selected.currentTime = frame / 10
    })
  }
}

function index(v) {
  return parseInt(v.dataset.index)
}

function d(v) {
  return data.clips[index(v)]
}

function toggle(v) {
  if (v.paused) {
    v.play()
    let end = d(v).end
    if (end !== undefined) {
      v.addEventListener('timeupdate', function() {
        if(this.currentTime >= end) {
          this.pause()
        }
      })
    }
  } else {
    v.pause()
  }
}

function timestr(t) {
  let min = Math.floor(t / 60)
  let sec = Math.floor(t - 60 * min)
  if (sec < 10) {
    return min.toString() + ':0' + sec.toString()
  } else {
    return min.toString() + ':' + sec.toString()
  }
}

function setSelected(v) {
  if (selected !== undefined) {
    $(selected).parent().removeClass('selected')
  }
  selected = v
  $(selected).parent().addClass('selected')
}

$(function() {
  $('body').keydown(function(e) {
    let k = e.which
    if (k == 39) { // Right.
      selected.currentTime += 0.1
    } else if (k == 37) { // Left.
      selected.currentTime -= 0.1
    } else if (k == 40) { // Down.
      selected.currentTime = 0
    } else if (k == 38) { // Up.
      selected.currentTime = selected.duration
    } else if (k == 32) { // Space.
      toggle(selected)
      e.preventDefault()
    } else if (k == 13) { // Enter.
      selected.currentTime = d(selected).start || 0
    } else if (k == 'S'.charCodeAt(0)) {
      d(selected).start = selected.currentTime
      $(selected).parent().find('.start').html(timestr(selected.currentTime))
    } else if (k == 'E'.charCodeAt(0)) {
      d(selected).end = selected.currentTime
      $(selected).parent().find('.end').html(timestr(selected.currentTime))
    } else if (k == 'J'.charCodeAt(0)) {
      let next = $('#videos video')[index(selected) + 1]
      if (next !== undefined) { setSelected(next) }
    } else if (k == 'K'.charCodeAt(0)) {
      let prev = $('#videos video')[index(selected) - 1]
      if (prev !== undefined) { setSelected(prev) }
    }
  })

  $('textarea').click(function(e) {
    let code = []
    code.push('from moviepy.editor import *')
    code.push('clips = []')
    for (let i = 0; i < data.clips.length; ++i) {
      let d = data.clips[i]
      if (d.start && d.end) {
        code.push('clips.append(VideoFileClip("' + d.file + '").subclip(' + d.start + ', ' + d.end + '))')
      }
    }
    code.push('final = concatenate_videoclips(clips)')
    code.push('final.write_videofile("output.mp4", fps=30, audio_bitrate="1000k", bitrate="4000k")')
    $(this).val(code.join('\n'))
  })
})
