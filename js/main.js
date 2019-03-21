
let nes = new Nes();
let loopId
let paused = false;
let loaded = false;

let c = el("output");
c.width = 256;
c.height = 240;
let ctx = c.getContext("2d");
let imgData = ctx.createImageData(256, 240);

// let c2 = el("nametables");
// c2.width = 8 * 32;
// c2.height = 8 * 64;
// let ctx2 = c2.getContext("2d");

el("rom").onchange = function(e) {
  let reader = new FileReader();
  reader.onload = function() {
    let buf = reader.result;
    let arr = new Uint8Array(buf);
    if(nes.loadRom(arr)) {
      nes.hardReset();
      if(!loaded && !paused) {
        loopId = setInterval(update, 1000 / 60);
      }
      loaded = true;
    }
  }
  reader.readAsArrayBuffer(e.target.files[0]);
}

el("pause").onclick = function(e) {
  if(paused && loaded) {
    loopId = setInterval(update, 1000 / 60);
    paused = false;
    el("pause").innerText = "Pause";
  } else {
    clearInterval(loopId);
    paused = true;
    el("pause").innerText = "Continue";
  }
}

el("reset").onclick = function(e) {
  nes.reset();
}

el("hardreset").onclick = function(e) {
  nes.hardReset();
}

el("runframe").onclick = function(e) {
  update();
}

function update() {
  nes.runFrame();
  drawPixels();
  //visualizeNametable(nes.ppu.ppuRam);
  //visualizeSrites(nes.ppu.oamRam);
}

function visualizeNametable(tbl) {
  for(let i = 0; i < tbl.length; i++) {
    let x = i % 32;
    let y = i >> 5;
    let r = (tbl[i] >> 5) << 5;
    let g = ((tbl[i] & 0x1c) >> 2) << 5;
    let b = (tbl[i] & 0x3) << 6;
    let str = "rgba(" + r + "," + g + "," + b + ",1)";
    ctx2.fillStyle = str;
    ctx2.fillRect(x * 8, y * 8, 8, 8);
  }
}

function visualizeSrites(spr) {
  ctx.strokeStyle = "#ff0000";
  for(let i = 0; i < 64; i++) {
    let y = spr[i * 4];
    let x = spr[i * 4 + 3];
    ctx.strokeRect(x + 0.5, y + 0.5, 7, 7);
  }
}

function drawPixels() {
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
  switch(e.key) {
    case "ArrowRight": {
      nes.currentControlState |= 0x80;
      e.preventDefault();
      break;
    }
    case "ArrowLeft": {
      nes.currentControlState |= 0x40;
      e.preventDefault();
      break;
    }
    case "ArrowDown": {
      nes.currentControlState |= 0x20;
      e.preventDefault();
      break;
    }
    case "ArrowUp": {
      nes.currentControlState |= 0x10;
      e.preventDefault();
      break;
    }
    case "Enter": {
      nes.currentControlState |= 0x08;
      e.preventDefault();
      break;
    }
    case "Shift": {
      nes.currentControlState |= 0x04;
      e.preventDefault();
      break;
    }
    case "a":
    case "A": {
      nes.currentControlState |= 0x02;
      e.preventDefault();
      break;
    }
    case "z":
    case "Z": {
      nes.currentControlState |= 0x01;
      e.preventDefault();
      break;
    }
  }
}

window.onkeyup = function(e) {
  switch(e.key) {
    case "ArrowRight": {
      nes.currentControlState &= 0x7f;
      e.preventDefault();
      break;
    }
    case "ArrowLeft": {
      nes.currentControlState &= 0xbf;
      e.preventDefault();
      break;
    }
    case "ArrowDown": {
      nes.currentControlState &= 0xdf;
      e.preventDefault();
      break;
    }
    case "ArrowUp": {
      nes.currentControlState &= 0xef;
      e.preventDefault();
      break;
    }
    case "Enter": {
      nes.currentControlState &= 0xf7;
      e.preventDefault();
      break;
    }
    case "Shift": {
      nes.currentControlState &= 0xfb;
      e.preventDefault();
      break;
    }
    case "a":
    case "A": {
      nes.currentControlState &= 0xfd;
      e.preventDefault();
      break;
    }
    case "z":
    case "Z": {
      nes.currentControlState &= 0xfe;
      e.preventDefault();
      break;
    }
  }
}
