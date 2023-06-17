
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
  const green = "rgb(85,199,83)";
  const red = "rgb(255,139,127)";
  const yellow = "rgb(189,172,44)";
  const blue = "rgb(143,161,255)";
  const yellowDark = "rgb(52,40,0)";
  const blueDark = "rgb(19,31,127)";
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, c.width, c.height);
  // draw text
  ctx.fillStyle = green;
  ctx.font = "6pt arial";
  fillString(ctx, "Title: ", 8, 8);
  fillString(ctx, "Artist: ", 8, 32);
  fillString(ctx, "Copyright: ", 8, 56);
  fillString(ctx, player.tags.name, 8, 16);
  fillString(ctx, player.tags.artist, 8, 40);
  fillString(ctx, player.tags.copyright, 8, 64);
  let songNumStr = "Song " + currentSong + " of " + player.totalSongs;
  fillString(ctx, songNumStr, 8, 80);
  let xPos = 16;
  // pulse 1
  ctx.fillStyle = yellowDark;
  ctx.fillRect(xPos, 96, 16, 120);
  ctx.fillStyle = blueDark;
  ctx.fillRect(xPos + 16, 96, 16, 120);
  ctx.fillStyle = yellow;
  let scale = player.apu.p1ConstantVolume ? player.apu.p1Volume : player.apu.p1Decay;
  scale = player.apu.p1Counter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(xPos, 216 - scale, 16, scale);
  ctx.fillStyle = blue;
  let logVal = Math.log2(player.apu.p1Timer + 1);
  scale = logVal * 112 / 11;
  ctx.fillRect(xPos + 16, Math.floor(96 + scale), 16, 8);
  ctx.fillStyle = red;
  fillWaveVis(ctx, player.apu.p1Duty, xPos + 8, 224);
  xPos += 48;
  // pulse 2
  ctx.fillStyle = yellowDark;
  ctx.fillRect(xPos, 96, 16, 120);
  ctx.fillStyle = blueDark;
  ctx.fillRect(xPos + 16, 96, 16, 120);
  ctx.fillStyle = yellow;
  scale = player.apu.p2ConstantVolume ? player.apu.p2Volume : player.apu.p2Decay;
  scale = player.apu.p2Counter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(xPos, 216 - scale, 16, scale);
  ctx.fillStyle = blue;
  logVal = Math.log2(player.apu.p2Timer + 1);
  scale = logVal * 112 / 11;
  ctx.fillRect(xPos + 16, Math.floor(96 + scale), 16, 8);
  ctx.fillStyle = red;
  fillWaveVis(ctx, player.apu.p2Duty, xPos + 8, 224);
  xPos += 48;
  // triangle
  ctx.fillStyle = yellowDark;
  ctx.fillRect(xPos, 96, 16, 120);
  ctx.fillStyle = blueDark;
  ctx.fillRect(xPos + 16, 96, 16, 120);
  ctx.fillStyle = yellow;
  scale = player.apu.triCounter === 0 || player.apu.triLinearCounter === 0 ? 0 : 1;
  scale = scale * 120;
  ctx.fillRect(xPos, 216 - scale, 16, scale);
  ctx.fillStyle = blue;
  logVal = Math.log2(player.apu.triTimer + 1);
  scale = logVal * 112 / 11;
  ctx.fillRect(xPos + 16, Math.floor(96 + scale), 16, 8);
  ctx.fillStyle = red;
  fillWaveVis(ctx, 4, xPos + 8, 224);
  xPos += 48;
  // noise
  ctx.fillStyle = yellowDark;
  ctx.fillRect(xPos, 96, 16, 120);
  ctx.fillStyle = blueDark;
  ctx.fillRect(xPos + 16, 96, 16, 120);
  ctx.fillStyle = yellow;
  scale = player.apu.noiseConstantVolume ? player.apu.noiseVolume : player.apu.noiseDecay;
  scale = player.apu.noiseCounter === 0 ? 0 : scale;
  scale = scale * 120 / 0xf;
  ctx.fillRect(xPos, 216 - scale, 16, scale);
  ctx.fillStyle = blue;
  logVal = Math.log2(player.apu.noiseTimer + 1);
  scale = logVal * 112 / 12;
  ctx.fillRect(xPos + 16, Math.floor(96 + scale), 16, 8);
  ctx.fillStyle = red;
  fillWaveVis(ctx, player.apu.noiseTonal ? 6 : 5, xPos + 8, 224);
  xPos += 48;
  // dmc
  ctx.fillStyle = yellowDark;
  ctx.fillRect(xPos, 96, 16, 120);
  ctx.fillStyle = blueDark;
  ctx.fillRect(xPos + 16, 96, 16, 120);
  ctx.fillStyle = yellow;
  scale = player.apu.dmcBytesLeft === 0 ? 0 : 1;
  scale = scale * 120;
  ctx.fillRect(xPos, 216 - scale, 16, scale);
  ctx.fillStyle = blue;
  logVal = Math.log2(player.apu.dmcTimer + 1);
  scale = logVal * 112 / 9;
  ctx.fillRect(xPos + 16, Math.floor(96 + scale), 16, 8);
  ctx.fillStyle = red;
  fillWaveVis(ctx, 7, xPos + 8, 224);
}

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function el(id) {
  return document.getElementById(id);
}
