
function Debugger(nes, ctx) {
  this.nes = nes;
  this.ctx = ctx;

  this.breakpoints = [];
  this.bpFired = false;

  this.frames = 0;

  this.updateLine = 120;
  this.updateAnd = 3;

  this.selectedView = 0;
  this.ramScroll = 0;
  this.disScroll = 0;

  this.nes.onread = (a, v) => this.onread(a, v);
  this.nes.onwrite = (a, v) => this.onwrite(a, v);

  this.ramCdl = new Uint8Array(0x8000); // addresses $0-$7fff
  this.romCdl = undefined; // gets created by loadrom, addresses $8000-$ffff

  // load rom, do reset, set up cdl
  this.loadRom = function(rom) {
    if(this.nes.loadRom(rom)) {
      this.nes.reset(true);
      // reset breakpoints
      this.breakpoints = [];
      this.updateBreakpointList();
      // clear ram cdl
      for(let i = 0; i < 0x8000; i++) {
        this.ramCdl[i] = 0;
      }
      // set up rom cdl
      let prgSize = this.nes.mapper.h.banks * 0x4000;
      this.romCdl = new Uint8Array(prgSize);
      for(let i = 0; i < prgSize; i++) {
        this.romCdl[i] = 0;
      }
      return true;
    } else {
      return false;
    }
  }

  this.cycle = function() {
    this.nes.cycle();
    if(this.nes.cpu.cyclesLeft === 0 && !this.nes.inDma && (this.nes.cycles % 3) === 0) {
      // we are about to execute a new instruction, mark in CDL and handle execute-breakpoints
      let adr = this.nes.cpu.br[0];
      for(let breakpoint of this.breakpoints) {
        if(breakpoint.adr === adr && breakpoint.t === 2) {
          log(`Hit breakpoint: executed at ${this.nes.getWordRep(adr)}`);
          this.bpFired = true;
        }
      }
      // adr < $8000: set ram cdl, else set rom cdl
      if(adr < 0x8000) {
        this.ramCdl[adr] = 1;
      } else {
        // get the address in rom that is mapped here
        let prgAdr = this.nes.mapper.getRomAdr(adr);
        this.romCdl[prgAdr] = 1;
      }
    }
    let b = this.bpFired;
    this.bpFired = false;
    return b;
  }

  // runs a single instruction
  this.runInstruction = function() {
    do {
      this.cycle();
    } while(!(this.nes.cpu.cyclesLeft === 0 && !this.nes.inDma && (this.nes.cycles % 3) === 0));
    this.updateDebugView();
    // log(`${this.nes.getWordRep(this.nes.cpu.br[0])}: ${this.instrStr(this.nes.cpu.br[0])}`);
  }

  // returns false if we ran the whole frame, true if we broke at a breakpoint
  // in which case the emulator should pause itself
  this.runFrame = function() {
    this.frames++;
    let b;
    do {
      b = this.cycle();
      if(b) {
        // breakpoint hit
        this.updateDebugView();
        return true;
      }
      if(this.nes.ppu.line === this.updateLine && this.nes.ppu.dot === 0 && (this.frames & this.updateAnd) === 0) {
        this.updateDebugView();
      }
    } while(!(this.nes.ppu.dot === 0 && this.nes.ppu.line === 240));
    return false;
  }

  this.addBreakpoint = function(adr, type) {
    this.breakpoints.push({adr: adr, t: type});
    this.updateBreakpointList();
  }

  this.setView = function(view) {
    this.selectedView = view;
    if(view === 2 || view === 3) {
      // ramview, disassembly
      el("dtextoutput").style.display = "block";
      el("doutput").style.display = "none";
    } else {
      el("dtextoutput").style.display = "none";
      el("doutput").style.display = "block";
    }
    if(view === 3) {
      // set scroll to be around PC
      this.disScroll = this.nes.cpu.br[0] - 16;
    }
    this.updateDebugView();
  }

  this.changeScrollPos = function(add) {
    if(this.selectedView === 2) {
      let old = this.ramScroll;
      let r = this.ramScroll + add;
      r = r < 0 ? 0 : r;
      r = r > 0xfe0 ? 0xfe0 : r;
      this.ramScroll = r;
      if(r !== old) {
        this.updateDebugView();
      }
    } else {
      let old = this.disScroll;
      let r = this.disScroll + add;
      r = r < 0 ? 0 : r;
      this.disScroll = r;
      if(r !== old) {
        this.updateDebugView();
      }
    }
  }

  this.onread = function(adr, val) {
    for(let breakpoint of this.breakpoints) {
      if(breakpoint.adr === adr && breakpoint.t === 0) {
        log(`Hit breakpoint: read ${this.nes.getByteRep(val)} at ${this.nes.getWordRep(adr)}`);
        this.bpFired = true;
      }
    }
  }

  this.onwrite = function(adr, val) {
    for(let breakpoint of this.breakpoints) {
      if(breakpoint.adr === adr && breakpoint.t === 1) {
        log(`Hit breakpoint: wrote ${this.nes.getByteRep(val)} to ${this.nes.getWordRep(adr)}`);
        this.bpFired = true;
      }
    }
    // a write to a sub $8000 address invalidates any cdl there
    if(adr < 0x8000) {
      this.ramCdl[adr] = 0;
    }
  }

  this.updateBreakpointList = function() {
    // clear list
    let bl = el("breakpoints");
    while(bl.firstChild) {
      bl.removeChild(bl.firstChild);
    }

    let i = 0;
    for(let bp of this.breakpoints) {
      let index = i;
      i++;
      let str = "read    ";
      if(bp.t === 1) {
        str = "write   ";
      } else if(bp.t === 2) {
        str = "execute ";
      }
      tNode = document.createTextNode(`${str}: ${this.nes.getWordRep(bp.adr)}\n`);
      bl.appendChild(tNode);
      let button = document.createElement("button");
      button.textContent = "Remove";
      button.onclick = () => {
        this.breakpoints.splice(index, 1);
        this.updateBreakpointList();
      };
      bl.appendChild(button);
      bl.appendChild(document.createElement("br"));
    }
  }

  this.updateDebugView = function() {
    if(this.selectedView === 0) {
      this.drawPatternsPals();
    } else if(this.selectedView === 1) {
      this.drawNametables();
    } else if(this.selectedView === 2) {
      this.drawRam();
    } else {
      this.drawDissasembly();
    }
    // update cpu/ppu state
    let flagStr = `${this.nes.cpu.n ? "N" : "n"}${this.nes.cpu.v ? "V" : "v"}--${this.nes.cpu.d ? "D" : "d"}${this.nes.cpu.i ? "I" : "i"}${this.nes.cpu.z ? "Z" : "z"}${this.nes.cpu.c ? "C" : "c"}`;
    let cpuStr = `A: ${this.nes.getByteRep(this.nes.cpu.r[0])}; X: ${this.nes.getByteRep(this.nes.cpu.r[1])}, Y: ${this.nes.getByteRep(this.nes.cpu.r[2])}, PC: ${this.nes.getWordRep(this.nes.cpu.br[0])}, SP: ${this.nes.getByteRep(this.nes.cpu.r[3])}, ${flagStr}`;
    el("cpustate").textContent = cpuStr;
    let line = ("00" + this.nes.ppu.line).slice(-3);
    let dot = ("00" + this.nes.ppu.dot).slice(-3);
    let ppuStr = `line: ${line}, dot: ${dot}, v: ${this.nes.getWordRep(this.nes.ppu.v)}, t: ${this.nes.getWordRep(this.nes.ppu.t)}, x: ${this.nes.ppu.x}, w: ${this.nes.ppu.w}`;
    el("ppustate").textContent = ppuStr;
  }

  this.drawRam = function() {
    let ev = el("dtextoutput");
    ev.textContent = "";
    let ramBasePos = this.ramScroll;
    for(let r = ramBasePos; r < ramBasePos + 0x20; r++) {
      let str = `${this.nes.getWordRep(r * 16)}: `;
      for(let c = 0; c < 16; c++) {
        str += `${this.nes.getByteRep(this.nes.peak(r * 16 + c))} `;
      }
      ev.textContent += str + "\n";
    }
  }

  this.drawDissasembly = function() {
    let ev = el("dtextoutput");
    ev.textContent = "";
    let adr = this.disScroll;
    let lines = 0;
    let firstData = true;
    while(adr < 0x10000) {
      let op = this.nes.peak(adr);
      let length = this.opLengths[this.nes.cpu.addressingModes[op]];
      let isOpcode;
      if(adr < 0x8000) {
        isOpcode = this.ramCdl[adr];
      } else {
        let prgAdr = this.nes.mapper.getRomAdr(adr);
        isOpcode = this.romCdl[prgAdr];
      }
      let pcP = adr === this.nes.cpu.br[0] ? ">" : " ";
      if(isOpcode) {
        ev.textContent += `${pcP} ${this.nes.getWordRep(adr)}: ${this.instrStr(adr)}\n`;
        adr += length;
        firstData = true;
        lines++;
      } else {
        // ev.textContent += `${pcP} ${this.nes.getWordRep(adr)}: .db $${this.nes.getByteRep(op)}\n`;
        // adr++;
        if(firstData) {
          ev.textContent += `  ${this.nes.getWordRep(adr)}: -- UNIDENTIFIED BLOCK --\n`;
          firstData = false;
          lines++;
        }
        adr++;
      }
      if(lines === 32) {
        break;
      }
    }
    for(let i = lines; i < 32; i++) {
      ev.textContent += "\n";
    }
  }

  this.drawNametables = function() {
    let imgData = this.ctx.createImageData(512, 480);
    for(let x = 0; x < 64; x++) {
      for(let y = 0; y < 60; y++) {
        ry = y + (y >= 30 ? 2 : 0);
        let tileNumAdr = 0x2000 + (ry > 31 ? 0x800 : 0) + (x > 31 ? 0x400 : 0);
        tileNumAdr += ((ry & 0x1f) << 5) + (x & 0x1f);
        let tileNum = this.nes.mapper.ppuPeak(tileNumAdr);
        let attAdr = 0x23c0 + (ry > 31 ? 0x800 : 0) + (x > 31 ? 0x400 : 0);
        attAdr += ((ry & 0x1c) << 1) + ((x & 0x1c) >> 2);
        let atr = this.nes.mapper.ppuPeak(attAdr);

        if((ry & 0x2) > 0) {
          // bottom half
          atr >>= 4;
        }
        atr &= 0xf;
        if((x & 0x2) > 0) {
          // right half
          atr >>= 2;
        }
        atr &= 0x3;

        this.drawTile(imgData, x * 8, y * 8, tileNum + (this.nes.ppu.bgPatternBase === 0 ? 0 : 256), atr);
      }
    }
    this.ctx.putImageData(imgData, 0, 0);
  }

  this.drawPatternsPals = function() {
    let imgData = this.ctx.createImageData(512, 480);
    // left table
    for(let x = 0; x < 16; x++) {
      for(let y = 0; y < 16; y++) {
        this.drawTile(imgData, x * 8, y * 8, y * 16 + x, 0);
      }
    }
    // right table
    for(let x = 0; x < 16; x++) {
      for(let y = 0; y < 16; y++) {
        this.drawTile(imgData, 128 + (x * 8), y * 8, 256 + (y * 16 + x), 0);
      }
    }
    this.ctx.putImageData(imgData, 0, 0);
    // draw palette
    for(let i = 0; i < 16; i++) {
      let col = this.nes.ppu.nesPal[this.nes.ppu.readPalette(i) & 0x3f];
      ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, 1)`;
      ctx.fillRect(i * 16, 128, 16, 16);
      col = this.nes.ppu.nesPal[this.nes.ppu.readPalette(i + 16) & 0x3f];
      ctx.fillStyle = `rgba(${col[0]}, ${col[1]}, ${col[2]}, 1)`;
      ctx.fillRect(i * 16, 144, 16, 16);
    }
  }

  this.drawTile = function(imgData, x, y, num, col) {
    for(let i = 0; i < 8; i++) {
      // for each row
      let lp = this.nes.mapper.ppuPeak(num * 16 + i);
      let hp = this.nes.mapper.ppuPeak(num * 16 + i + 8);
      for(let j = 0; j < 8; j++) {
        // for each pixel of the row
        // extract the pixel
        let shift = 7 - j;
        let pixel = (lp >> shift) & 1;
        pixel |= ((hp >> shift) & 1) << 1;
        // get the palette index
        let pind = pixel === 0 ? 0 : col * 4 + pixel;
        let color = this.nes.ppu.nesPal[this.nes.ppu.readPalette(pind) & 0x3f];
        // put in in the imgData
        let index = ((y + i) * imgData.width + (x + j)) * 4;
        imgData.data[index] = color[0]; // r
        imgData.data[index + 1] = color[1]; // g
        imgData.data[index + 2] = color[2]; // b
        imgData.data[index + 3] = 255; // a
      }
    }
  }

  this.instrStr = function(adr) {
    let pc = adr;
    let opcode = this.nes.peak(pc);
    let i1 = this.nes.peak((pc + 1) & 0xffff);
    let i2 = i1 | (this.nes.peak((pc + 2) & 0xffff) << 8);
    let adrMode = this.nes.cpu.addressingModes[opcode];
    let opName = this.opNames[opcode];
    let relVal = i1 > 0x7f ? i1 - 0x100 : i1;
    relVal += pc + 2;
    switch(adrMode) {
      case 0: return `${opName}`;
      case 1: return `${opName} #$${this.nes.getByteRep(i1)}`;
      case 2: return `${opName} $${this.nes.getByteRep(i1)}`;
      case 3: return `${opName} $${this.nes.getByteRep(i1)},x`;
      case 4: return `${opName} $${this.nes.getByteRep(i1)},y`;
      case 5: return `${opName} ($${this.nes.getByteRep(i1)},x)`;
      case 6: return `${opName} ($${this.nes.getByteRep(i1)}),y`;
      case 7: return `${opName} $${this.nes.getWordRep(i2)}`;
      case 8: return `${opName} $${this.nes.getWordRep(i2)},x`;
      case 9: return `${opName} $${this.nes.getWordRep(i2)},y`;
      case 10: return `?`; // apparently this ended up being skipped?
      case 11: return `${opName} ($${this.nes.getWordRep(i2)})`;
      case 12: return `${opName} $${this.nes.getWordRep(relVal)}`;
      case 13: return `${opName} ($${this.nes.getByteRep(i1)}),y`;
      case 14: return `${opName} $${this.nes.getWordRep(i2)},x`;
      case 15: return `${opName} $${this.nes.getWordRep(i2)},y`;
    }
  }

  this.opLengths = [1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 0, 3, 2, 2, 3, 3];

  this.opNames = [
    "brk", "ora", "kil", "slo", "nop", "ora", "asl", "slo", "php", "ora", "asl", "anc", "nop", "ora", "asl", "slo", //0x
    "bpl", "ora", "kil", "slo", "nop", "ora", "asl", "slo", "clc", "ora", "nop", "slo", "nop", "ora", "asl", "slo", //1x
    "jsr", "and", "kil", "rla", "bit", "and", "rol", "rla", "plp", "and", "rol", "anc", "bit", "and", "rol", "rla", //2x
    "bmi", "and", "kil", "rla", "nop", "and", "rol", "rla", "sec", "and", "nop", "rla", "nop", "and", "rol", "rla", //3x
    "rti", "eor", "kil", "sre", "nop", "eor", "lsr", "sre", "pha", "eor", "lsr", "alr", "jmp", "eor", "lsr", "sre", //4x
    "bvc", "eor", "kil", "sre", "nop", "eor", "lsr", "sre", "cli", "eor", "nop", "sre", "nop", "eor", "lsr", "sre", //5x
    "rts", "adc", "kil", "rra", "nop", "adc", "ror", "rra", "pla", "adc", "ror", "arr", "jmp", "adc", "ror", "rra", //6x
    "bvs", "adc", "kil", "rra", "nop", "adc", "ror", "rra", "sei", "adc", "nop", "rra", "nop", "adc", "ror", "rra", //7x
    "nop", "sta", "nop", "sax", "sty", "sta", "stx", "sax", "dey", "nop", "txa", "uni", "sty", "sta", "stx", "sax", //8x
    "bcc", "sta", "kil", "uni", "sty", "sta", "stx", "sax", "tya", "sta", "txs", "uni", "uni", "sta", "uni", "uni", //9x
    "ldy", "lda", "ldx", "lax", "ldy", "lda", "ldx", "lax", "tay", "lda", "tax", "uni", "ldy", "lda", "ldx", "lax", //ax
    "bcs", "lda", "kil", "lax", "ldy", "lda", "ldx", "lax", "clv", "lda", "tsx", "uni", "ldy", "lda", "ldx", "lax", //bx
    "cpy", "cmp", "nop", "dcp", "cpy", "cmp", "dec", "dcp", "iny", "cmp", "dex", "axs", "cpy", "cmp", "dec", "dcp", //cx
    "bne", "cmp", "kil", "dcp", "nop", "cmp", "dec", "dcp", "cld", "cmp", "nop", "dcp", "nop", "cmp", "dec", "dcp", //dx
    "cpx", "sbc", "nop", "isc", "cpx", "sbc", "inc", "isc", "inx", "sbc", "nop", "sbc", "cpx", "sbc", "inc", "isc", //ex
    "beq", "sbc", "kil", "isc", "nop", "sbc", "inc", "isc", "sed", "sbc", "nop", "isc", "nop", "sbc", "inc", "isc", //fx
  ];
}
