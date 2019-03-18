
function log(text) {
  //console.log(text);
  el("log").innerHTML += text + "<br>";
}

// el("rom").onchange = function(e) {
//   let reader = new FileReader();
//   reader.onload = function() {
//     let buf = reader.result;
//     test(buf);
//   }
//   reader.readAsArrayBuffer(e.target.files[0]);
// }

// testing

let cpu, cycles, line, lines;
let intervalId;

function test(buffer) {
  let mem = new MemHandler(nesTestRom);
  cpu = new Cpu(mem);
  cpu.hardReset();
  cpu.br[PC] = 0xc000;
  cycles = 0;
  line = 0;
  lines = nesTestLog.split("\n");

  intervalId = setInterval(loop1k, 500);

  // for(let i = 0; i < 3000; i++) {
  //   if(cpu.cyclesLeft <= 0) {
  //     let str = getWordRep(cpu.br[PC]) +
  //       "                                            " +
  //       cpu.getStateRep() + "            CYC:" + cycles;
  //     log(str);
  //   }
  //   cpu.cycle();
  //   cycles++;
  // }
}

test();

function loop1k() {
  let str = "";
  for(let i = 0; i < 1000; i++) {
    if(cpu.cyclesLeft <= 0) {
      let lstr = getWordRep(cpu.br[PC]) +
        "                                            " +
        cpu.getStateRep() + "            CYC:" + cycles;
      //log(str);
      if(!checkLogStr(lines[line + 1], lstr)) {
        str += "FAULT DETECTED AT THIS LINE: <br>";
        str += lstr + "<br>";
        clearInterval(intervalId);
        break;
      }
      str += lstr + "<br>";
      line++;
    }
    try {
      cpu.cycle();
    } catch(e) {
      console.log(getWordRep(cpu.br[PC]) + "," + cpu.getStateRep());
      console.log(e);
      clearInterval(intervalId);
      break;
    }
    cycles++;
  }
  log(str)
  el("spot").innerHTML = cycles;
}

function checkLogStr(fullLine, partLine) {
  if(fullLine.slice(0, 4) !== partLine.slice(0, 4)) {
    return false;
  }
  if(fullLine.slice(48, 73) !== partLine.slice(48, 73)) {
    return false;
  }
  if(fullLine.slice(86) !== partLine.slice(86)) {
    return false;
  }
  return true;
}

function MemHandler(rom) {
  this.ram = new Uint8Array(0x800);

  this.rom = rom;

  this.read = function(adr) {
    adr &= 0xffff;
    if(adr < 0x2000) {
      // ram
      return this.ram[adr & 0x7ff];
    }
    if(adr >= 0x8000) {
      // rom, 0x4000 bytes in size
      return this.rom[adr & 0x3fff];
    }
  }

  this.write = function(adr, value) {
    adr &= 0xffff;
    if(adr < 0x2000) {
      // ram
      this.ram[adr & 0x7ff] = value;
    }
    if(adr >= 0x8000) {
      // rom
      // not writable
    }
  }
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
