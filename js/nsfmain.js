
let player = new NsfPlayer();
let audioHandler = new AudioHandler();
let paused = false;
let loaded = false;
let pausedInBg = false;
let loopId = 0;

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");

let currentSong = 1;

zip.workerScriptsPath = "lib/";
zip.useWebWorkers = false;

el("rom").onchange = function(e) {
  audioHandler.resume();
  let freader = new FileReader();
  freader.onload = function() {
    let buf = freader.result;
    if(e.target.files[0].name.slice(-4) === ".zip") {
      // use zip.js to read the zip
      let blob = new Blob([buf]);
      zip.createReader(new zip.BlobReader(blob), function(reader) {
        reader.getEntries(function(entries) {
          if(entries.length) {
            let found = false;
            for(let i = 0; i < entries.length; i++) {
              let name = entries[i].filename;
              if(name.slice(-4) !== ".nsf" && name.slice(-4) !== ".NSF") {
                continue;
              }
              found = true;
              log("Loaded \"" + name + "\" from zip");
              entries[i].getData(new zip.BlobWriter(), function(blob) {
                let breader = new FileReader();
                breader.onload = function() {
                  let rbuf = breader.result;
                  let arr = new Uint8Array(rbuf);
                  loadRom(arr);
                  reader.close(function() {});
                }
                breader.readAsArrayBuffer(blob);
              }, function(curr, total) {});
              break;
            }
            if(!found) {
              log("No .nsf file found in zip");
            }
          } else {
            log("Zip file was empty");
          }
        });
      }, function(err) {
        log("Failed to read zip: " + err);
      });
    } else {
      // load rom normally
      let arr = new Uint8Array(buf);
      loadRom(arr);
    }
  }
  freader.readAsArrayBuffer(e.target.files[0]);
}

el("pause").onclick = function(e) {
  if(paused && loaded) {
    loopId = requestAnimationFrame(update);
    audioHandler.start();
    paused = false;
    el("pause").innerText = "Pause";
  } else {
    cancelAnimationFrame(loopId);
    audioHandler.stop();
    paused = true;
    el("pause").innerText = "Unpause";
  }
}

el("reset").onclick = function(e) {
  if(loaded) {
    player.playSong(currentSong);
    drawVisual();
  }
}

el("nextsong").onclick = function(e) {
  if(loaded) {
    currentSong++;
    currentSong = currentSong > player.totalSongs ? player.totalSongs : currentSong;
    player.playSong(currentSong);
    drawVisual();
  }
}

el("prevsong").onclick = function(e) {
  if(loaded) {
    currentSong--;
    currentSong = currentSong < 1 ? 1 : currentSong;
    player.playSong(currentSong);
    drawVisual();
  }
}

document.onvisibilitychange = function(e) {
  if(document.hidden) {
    pausedInBg = false;
    if(!paused && loaded) {
      el("pause").click();
      pausedInBg = true;
    }
  } else {
    if(pausedInBg && loaded) {
      el("pause").click();
      pausedInBg = false;
    }
  }
}

function loadRom(rom) {
  if(player.loadNsf(rom)) {
    if(!loaded && !paused) {
      loopId = requestAnimationFrame(update);
      audioHandler.start();
    }
    loaded = true;
    currentSong = player.startSong;
  }
}

function update() {
  runFrame();
  loopId = requestAnimationFrame(update);
}

function runFrame() {
  player.runFrame();
  player.getSamples(audioHandler.sampleBuffer, audioHandler.samplesPerFrame);
  audioHandler.nextBuffer();
  drawVisual();
}

function drawVisual() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, c.width, c.height);
  // draw text
  ctx.fillStyle = "#7fff7f";
  ctx.font = "10pt arial";
  ctx.fillText("Title:", 20, 25);
  ctx.fillText("Artist:", 20, 40);
  ctx.fillText("Copyright:", 20, 55);
  ctx.fillText(player.tags.name, 90, 25);
  ctx.fillText(player.tags.artist, 90, 40);
  ctx.fillText(player.tags.copyright, 90, 55);
  ctx.fillText("Song " + currentSong + " of " + player.totalSongs, 20, 70);
  // pulse 1
  ctx.fillStyle = "#3f3f1f";
  ctx.fillRect(20, 100, 15, 120);
  ctx.fillStyle = "#1f1f3f";
  ctx.fillRect(35, 100, 15, 120);
  ctx.fillStyle = "#ffff7f";
  let scale = player.apu.p1ConstantVolume ? player.apu.p1Volume : player.apu.p1Decay;
  scale = player.apu.p1Counter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(20, 220 - scale, 15, scale);
  ctx.fillStyle = "#7f7fff";
  scale = player.apu.p1Timer * 110 / 0x7ff;
  ctx.fillRect(35, 100 + scale, 15, 10);
  // pulse 2
  ctx.fillStyle = "#3f3f1f";
  ctx.fillRect(65, 100, 15, 120);
  ctx.fillStyle = "#1f1f3f";
  ctx.fillRect(80, 100, 15, 120);
  ctx.fillStyle = "#ffff7f";
  scale = player.apu.p2ConstantVolume ? player.apu.p2Volume : player.apu.p2Decay;
  scale = player.apu.p2Counter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(65, 220 - scale, 15, scale);
  ctx.fillStyle = "#7f7fff";
  scale = player.apu.p2Timer * 110 / 0x7ff;
  ctx.fillRect(80, 100 + scale, 15, 10);
  // triangle
  ctx.fillStyle = "#3f3f1f";
  ctx.fillRect(110, 100, 15, 120);
  ctx.fillStyle = "#1f1f3f";
  ctx.fillRect(125, 100, 15, 120);
  ctx.fillStyle = "#ffff7f";
  scale = player.apu.triCounter === 0 || player.apu.triLinearCounter === 0 ? 0 : 1;
  scale = scale * 120;
  ctx.fillRect(110, 220 - scale, 15, scale);
  ctx.fillStyle = "#7f7fff";
  scale = player.apu.triTimer * 110 / 0x7ff;
  ctx.fillRect(125, 100 + scale, 15, 10);
  // noise
  ctx.fillStyle = "#3f3f1f";
  ctx.fillRect(155, 100, 15, 120);
  ctx.fillStyle = "#1f1f3f";
  ctx.fillRect(170, 100, 15, 120);
  ctx.fillStyle = "#ffff7f";
  scale = player.apu.noiseConstantVolume ? player.apu.noiseVolume : player.apu.noiseDecay;
  scale = player.apu.noiseCounter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(155, 220 - scale, 15, scale);
  ctx.fillStyle = "#7f7fff";
  scale = player.apu.noiseTimer * 110 / 4068;
  ctx.fillRect(170, 100 + scale, 15, 10);
  // dmc
  ctx.fillStyle = "#3f3f1f";
  ctx.fillRect(200, 100, 15, 120);
  ctx.fillStyle = "#1f1f3f";
  ctx.fillRect(215, 100, 15, 120);
  ctx.fillStyle = "#ffff7f";
  scale = player.apu.dmcBytesLeft === 0 ? 0 : 1;
  scale = scale * 120;
  ctx.fillRect(200, 220 - scale, 15, scale);
  ctx.fillStyle = "#7f7fff";
  scale = player.apu.dmcTimer * 110 / 428;
  ctx.fillRect(215, 100 + scale, 15, 10);
}

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function el(id) {
  return document.getElementById(id);
}
