
let nes = new Nes();
let audioHandler = new AudioHandler();
let paused = false;
let loaded = false;
let pausedInBg = false;
let loopId = 0;
let loadedName = "";

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");
let imgData = ctx.createImageData(256, 240);
let dc = el("doutput");
dc.width = 512;
dc.height = 480;
let dctx = dc.getContext("2d");

let db = new Debugger(nes, dctx);

let controlsP1 = {
  arrowright: nes.INPUT.RIGHT,
  arrowleft: nes.INPUT.LEFT,
  arrowdown: nes.INPUT.DOWN,
  arrowup: nes.INPUT.UP,
  enter: nes.INPUT.START,
  shift: nes.INPUT.SELECT,
  a: nes.INPUT.B,
  z: nes.INPUT.A
}
let controlsP2 = {
  l: nes.INPUT.RIGHT,
  j: nes.INPUT.LEFT,
  k: nes.INPUT.DOWN,
  i: nes.INPUT.UP,
  p: nes.INPUT.START,
  o: nes.INPUT.SELECT,
  t: nes.INPUT.B,
  g: nes.INPUT.A
}

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
                  loadRom(arr, name);
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
      let parts = e.target.value.split("\\");
      let name = parts[parts.length - 1];
      let arr = new Uint8Array(buf);
      loadRom(arr, name);
    }
  }
  freader.readAsArrayBuffer(e.target.files[0]);
}

el("pause").onclick = function(e) {
  if(paused && loaded) {
    unpause();
  } else {
    pause();
  }
}

el("reset").onclick = function(e) {
  db.nes.reset(false);
  db.updateDebugView();
}

el("hardreset").onclick = function(e) {
  db.nes.reset(true);
  db.updateDebugView();
}

// el("runframe").onclick = function(e) {
//   if(loaded) {
//     runFrame();
//   }
// }

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

window.onpagehide = function(e) {
  saveBatteryForRom();
}

function loadRom(rom, name) {
  saveBatteryForRom();
  if(db.loadRom(rom)) {
    // load the roms battery data
    let data = localStorage.getItem(name + "_battery");
    if(data) {
      let obj = JSON.parse(data);
      db.nes.setBattery(obj);
      log("Loaded battery");
    }
    if(!loaded && !paused) {
      loopId = requestAnimationFrame(update);
      audioHandler.start();
    }
    loaded = true;
    loadedName = name;
    db.updateDebugView();
  }
}

function saveBatteryForRom() {
  // save the loadedName's battery data
  if(loaded) {
    let data = db.nes.getBattery();
    if(data) {
      try {
        localStorage.setItem(loadedName + "_battery", JSON.stringify(data));
        log("Saved battery");
      } catch(e) {
        log("Failed to save battery: " + e);
      }
    }
  }
}

function pause() {
  if(!paused) {
    cancelAnimationFrame(loopId);
    audioHandler.stop();
    paused = true;
    el("pause").innerText = "Unpause";
    if(loaded) {
      db.updateDebugView();
    }
  }
}

function unpause() {
  if(paused) {
    loopId = requestAnimationFrame(update);
    audioHandler.start();
    paused = false;
    el("pause").innerText = "Pause";
  }
}

function update() {
  let r = runFrame();
  if(r) {
    pause();
    return;
  }
  loopId = requestAnimationFrame(update);
}

function runFrame() {
  let bpHit = db.runFrame();
  draw();
  if(bpHit) {
    return true;
  }
  return false;
}

function draw() {
  db.nes.getSamples(audioHandler.sampleBuffer, audioHandler.samplesPerFrame);
  audioHandler.nextBuffer();
  db.nes.getPixels(imgData.data);
  ctx.putImageData(imgData, 0, 0);
}

function log(text) {
  el("log").innerHTML += text + "<br>";
  el("log").scrollTop = el("log").scrollHeight;
}

function el(id) {
  return document.getElementById(id);
}

window.onkeydown = function(e) {
  if(controlsP1[e.key.toLowerCase()] !== undefined) {
    db.nes.setButtonPressed(1, controlsP1[e.key.toLowerCase()]);
    if(el("bpaddress") !== document.activeElement) {
      e.preventDefault();
    }
  }
  if(controlsP2[e.key.toLowerCase()] !== undefined) {
    db.nes.setButtonPressed(2, controlsP2[e.key.toLowerCase()]);
    if(el("bpaddress") !== document.activeElement) {
      e.preventDefault();
    }
  }
}

window.onkeyup = function(e) {
  if(controlsP1[e.key.toLowerCase()] !== undefined) {
    db.nes.setButtonReleased(1, controlsP1[e.key.toLowerCase()]);
    if(el("bpaddress") !== document.activeElement) {
      e.preventDefault();
    }
  }
  if(controlsP2[e.key.toLowerCase()] !== undefined) {
    db.nes.setButtonReleased(2, controlsP2[e.key.toLowerCase()]);
    if(el("bpaddress") !== document.activeElement) {
      e.preventDefault();
    }
  }
  if(e.key.toLowerCase() === "m" && loaded) {
    let saveState = db.nes.getState();
    try {
      localStorage.setItem(loadedName + "_savestate", JSON.stringify(saveState));
      log("Saved state");
    } catch(e) {
      log("Failed to save state: " + e);
    }
  }
  if(e.key.toLowerCase() === "n" && loaded) {
    let data = localStorage.getItem(loadedName + "_savestate");
    if(data) {
      let obj = JSON.parse(data);
      if(db.nes.setState(obj)) {
        log("Loaded state");
      } else {
        log("Failed to load state");
      }
    } else {
      log("No state saved yet");
    }
  }
}

// debugger buttons

el("bpatterns").onclick = function() {
  if(!loaded) return;
  db.setView(0);
}

el("bnametables").onclick = function() {
  if(!loaded) return;
  db.setView(1);
}

el("bram").onclick = function() {
  if(!loaded) return;
  db.setView(2);
}

el("bdis").onclick = function() {
  if(!loaded) return;
  db.setView(3);
}

el("dtextoutput").onwheel = function(e) {
  if(!loaded) return;
  db.changeScrollPos(Math.floor(e.deltaY * 0.3));
  e.preventDefault();
}

el("stepinstr").onclick = function() {
  if(!loaded) return;
  db.runInstruction();
  draw();
}

el("runframe").onclick = function() {
  if(!loaded) return;
  runFrame();
  db.updateDebugView();
}

el("bpadd").onclick = function() {
  if(!loaded) return;
  let adr = parseInt(el("bpaddress").value, 16);
  if(isNaN(adr) || adr < 0 || adr >= 0x10000) {
    log("Invalid address for breakpoint");
    return;
  }
  let type = +el("bptype").value;
  db.addBreakpoint(adr, type);
}
