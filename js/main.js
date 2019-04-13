
let nes = new Nes();
let audioHandler = new AudioHandler();
let paused = false;
let loaded = false;

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");
let imgData = ctx.createImageData(256, 240);

let controlsP1 = {
  arrowright: 0x80, // right
  arrowleft: 0x40, // left
  arrowdown: 0x20, // down
  arrowup: 0x10, // up
  enter: 0x08, // start
  shift: 0x04, // select
  a: 0x02, // b
  z: 0x01 // a
}
let controlsP2 = {
  l: 0x80, // right
  j: 0x40, // left
  k: 0x20, // down
  i: 0x10, // up
  p: 0x08, // start
  o: 0x04, // select
  t: 0x02, // b
  g: 0x01 // a
}

zip.workerScriptsPath = "lib/";
zip.useWebWorkers = false;

// let c2 = el("nametables");
// c2.width = 8 * 32;
// c2.height = 8 * 64;
// let ctx2 = c2.getContext("2d");

el("rom").onchange = function(e) {
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
              if(name.slice(-4) !== ".nes" && name.slice(-4) !== ".NES") {
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
              log("No .nes file found in zip");
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
    requestAnimationFrame(update);
    audioHandler.start();
    paused = false;
    el("pause").innerText = "Pause";
  } else {
    audioHandler.stop();
    paused = true;
    el("pause").innerText = "Continue";
  }
}

el("reset").onclick = function(e) {
  nes.reset(false);
}

el("hardreset").onclick = function(e) {
  nes.reset(true);
}

el("runframe").onclick = function(e) {
  if(loaded) {
    runFrame();
  }
}

function loadRom(rom) {
  if(nes.loadRom(rom)) {
    nes.reset(true);
    if(!loaded && !paused) {
      requestAnimationFrame(update);
      audioHandler.start();
    }
    loaded = true;
  }
}

function update() {
  runFrame();
  if(!paused) {
    requestAnimationFrame(update);
  }
}

function runFrame() {
  nes.runFrame();
  nes.getSamples(audioHandler.sampleBuffer);
  audioHandler.nextBuffer();
  nes.getPixels(imgData.data);
  ctx.putImageData(imgData, 0, 0);
}

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function getByteRep(val) {
  return ("0" + val.toString(16)).slice(-2).toUpperCase();
}

function getWordRep(val) {
  return ("000" + val.toString(16)).slice(-4).toUpperCase();
}

function el(id) {
  return document.getElementById(id);
}

window.onkeydown = function(e) {
  if(controlsP1[e.key.toLowerCase()]) {
    nes.currentControl1State |= controlsP1[e.key.toLowerCase()];
    e.preventDefault();
  }
  if(controlsP2[e.key.toLowerCase()]) {
    nes.currentControl2State |= controlsP2[e.key.toLowerCase()];
    e.preventDefault();
  }
}

window.onkeyup = function(e) {
  if(controlsP1[e.key.toLowerCase()]) {
    nes.currentControl1State &= (~controlsP1[e.key.toLowerCase()]) & 0xff;
    e.preventDefault();
  }
  if(controlsP2[e.key.toLowerCase()]) {
    nes.currentControl2State &= (~controlsP2[e.key.toLowerCase()]) & 0xff;
    e.preventDefault();
  }
}
