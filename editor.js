'use strict'

let selected
let data
const $ = require('./node_modules/jquery/dist/jquery.min.js')
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const DATA_FILE_NAME = 'video-grinder-data'
const PYTHON_FILE_NAME = 'video-grinder.py'
const OUTPUT_FILE_NAME = 'ground-video.mp4'

function loadData(dir, cb) {
  let dataFile = path.join(dir, DATA_FILE_NAME)
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

function saveData() {
  let dataFile = path.join(data.dir, DATA_FILE_NAME)
  fs.writeFile(dataFile, JSON.stringify(data), err => { if (err) throw err })
  let pythonFile = path.join(data.dir, PYTHON_FILE_NAME)
  fs.writeFile(pythonFile, getPython(), err => { if (err) throw err })
}

function getFiles(dir, cb) {
  fs.readdir(dir, (err, files) => {
    if (err) throw err
    let data = { dir: dir, clips: [] }
    files.forEach(file => {
      if (file !== DATA_FILE_NAME && file !== PYTHON_FILE_NAME && file !== OUTPUT_FILE_NAME) {
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
  localStorage.setItem('lastDir', dir)
  loadData(dir, data => {
    if (data) {
      setData(data)
    } else {
      getFiles(dir, data => setData(data))
    }
  })
}

function getPython() {
  let code = []
  code.push('import moviepy.editor as mpy')
  code.push('clips = []')
  for (let i = 0; i < data.clips.length; ++i) {
    let d = data.clips[i]
    if (d.start && d.end) {
      code.push('clips.append(mpy.VideoFileClip("' + d.file + '").subclip(' + d.start + ', ' + d.end + '))')
    }
  }
  code.push('final = mpy.concatenate_videoclips(clips, method="compose")')
  code.push('final.write_videofile("output.mp4")')
  return code.join('\n')
}

function setData(newData) {
  data = newData
  let outside = $('#videos')
  outside.empty()
  for (let i = 0; i < data.clips.length; ++i) {
    let d = data.clips[i]
    let inside = $('<div class="video"></div>')
    let video = $(`<video preload="none" src="${ d.url }"></video>`)
    let meta = $('<div class="meta"></div>')
    let name = $(`<span class="name">${ d.file }</span>`)
    let spans = $(`<span class="start">${ timestr(d.start) }</span>
                   &ndash;<span class="end">${ timestr(d.end) }</span>`)
    meta.append(name)
    meta.append(spans)
    inside.append(video)
    inside.append(meta)
    outside.append(inside)
    let v = video[0]
    v.dataset.index = i

    video.click(function(e) {
      e.target.load()
    })

    video.mousemove(function(e) {
      setSelected(e.target)
      if (!selected.duration) return
      let frame = Math.floor(10 * selected.duration * e.offsetX / selected.offsetWidth)
      seek(frame / 10)
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
  if (!v.duration) return
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

function stop(v) {
  if (v.duration && !v.paused) {
    v.pause()
  }
}

function seek(t) {
  if (selected.readyState === 4) {
    selected.currentTime = t
  }
}

function timestr(t) {
  if (t === undefined) {
    return ''
  }
  let min = Math.floor(t / 60)
  let sec = Math.floor(t - 60 * min)
  if (sec < 10) {
    return min.toString() + ':0' + sec.toString()
  } else {
    return min.toString() + ':' + sec.toString()
  }
}

let loading = {}

function setSelected(v) {
  if (v === selected) return
  if (selected !== undefined) {
    $(selected).parent().removeClass('selected')
    stop(selected)
  }
  selected = v
  $(selected).parent().addClass('selected')
  selected.scrollIntoViewIfNeeded()
  if (!selected.readyState && !loading[selected.src]) {
    loading[selected.src] = true
    selected.load()
  }
}

$(function() {
  $('body').keydown(function(e) {
    let k = e.which
    if (k == 39) { // Right.
      seek(selected.currentTime + 0.1)
    } else if (k == 37) { // Left.
      seek(selected.currentTime - 0.1)
    } else if (k == 40) { // Down.
      seek(0)
    } else if (k == 38) { // Up.
      seek(selected.duration)
    } else if (k == 32) { // Space.
      toggle(selected)
      e.preventDefault()
    } else if (k == 13) { // Enter.
      seek(d(selected).start || 0)
    } else if (k == 'S'.charCodeAt(0)) {
      d(selected).start = selected.currentTime
      $(selected).parent().find('.start').html(timestr(selected.currentTime))
      saveData()
    } else if (k == 'E'.charCodeAt(0)) {
      d(selected).end = selected.currentTime
      $(selected).parent().find('.end').html(timestr(selected.currentTime))
      saveData()
    } else if (k == 'X'.charCodeAt(0)) {
      d(selected).start = undefined
      d(selected).end = undefined
      $(selected).parent().find('.start').html('')
      $(selected).parent().find('.end').html('')
      saveData()
    } else if (k == 'J'.charCodeAt(0)) {
      let next = $('#videos video')[index(selected) + 1]
      if (next !== undefined) { setSelected(next) }
    } else if (k == 'K'.charCodeAt(0)) {
      let prev = $('#videos video')[index(selected) - 1]
      if (prev !== undefined) { setSelected(prev) }
    } else if (k == 'L'.charCodeAt(0)) {
      selected.load()
    }
  })

  let lastDir = localStorage.getItem('lastDir')
  if (lastDir) {
    console.log('Opening last location:', lastDir)
    openDir(lastDir)
  }
})
