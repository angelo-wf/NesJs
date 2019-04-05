
function Apu(nes) {

  // TODO: triange, noise, dmc, sweep units, volume enevlope,
  // length counters, apu frames, enable flags
  
  // memory handler
  this.nes = nes;

  this.cycles = 0;

  // pulse 1
  this.p1TimerLoad = 0;
  this.p1Duty = 0;
  this.p1Timer = 0;
  this.p1DutyIndex = 0;
  this.p1Output = 0;
  this.p1Volume = 0;

  // pulse 2
  this.p2TimerLoad = 0;
  this.p2Duty = 0;
  this.p2Timer = 0;
  this.p2DutyIndex = 0;
  this.p2Output = 0;
  this.p2Volume = 0;

  // duty cycles
  this.dutyCycles = [
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0],
    [1, 0, 0, 1, 1, 1, 1, 1]
  ]

  // channel outputs
  this.output = new Uint8Array(29781);
  this.outputOffset = 0;

  this.reset = function() {
    this.p1Timer = 0;
    this.p1Duty = 0;
    this.p1TimerLoad = 0;
    this.p1DutyIndex = 0;
    this.p1Output = 0;
    this.p1Volume = 0;

    this.p2TimerLoad = 0;
    this.p2Duty = 0;
    this.p2Timer = 0;
    this.p2DutyIndex = 0;
    this.p2Output = 0;
    this.p2Volume = 0;

    for(let i = 0; i < this.output.length; i++) {
      this.output[i] = 0;
    }
    this.outputOffset = 0;
  }

  this.cycle = function() {

    let p1out = 0;
    let p2out = 0;

    // cpu cycle

    if((this.cycles & 1) === 0) {
      // apu cycle
      p1out = this.cyclePulse1();
      p2out = this.cyclePulse2();
    }
    this.cycles++;

    this.output[this.outputOffset++] = (p1out + p2out) / 2;
    if(this.outputOffset === 29781) {
      // if we are going past the buffer (too many apu cycles per frame)
      this.outputOffset = 29780;
    }
  }

  this.cyclePulse1 = function() {
    if(this.p1Timer === 0) {
      this.p1Timer = this.p1TimerLoad;
    } else {
      this.p1Timer--;
    }
    if(this.p1Timer === 0) {
      this.p1Output = this.dutyCycles[this.p1Duty][this.p1DutyIndex++];
      this.p1DutyIndex &= 0x7;
    }
    if(this.p1Output === 0 || this.p1Timer < 8) {
      return 0;
    }
    return this.p1Volume;
  }

  this.cyclePulse2 = function() {
    if(this.p2Timer === 0) {
      this.p2Timer = this.p2TimerLoad;
    } else {
      this.p2Timer--;
    }
    if(this.p2Timer === 0) {
      this.p2Output = this.dutyCycles[this.p2Duty][this.p2DutyIndex++];
      this.p2DutyIndex &= 0x7;
    }
    if(this.p2Output === 0 || this.p2Timer < 8) {
      return 0;
    }
    return this.p2Volume;
  }

  this.getOutput = function() {
    let ret = [this.outputOffset, this.output];
    this.outputOffset = 0;
    return ret;
  }

  this.read = function(adr) {
    return 0;
  }

  this.write = function(adr, value) {
    switch(adr) {
      case 0x4000: {
        this.p1Duty = (value & 0xc0) >> 6;
        this.p1Volume = value & 0xf;
        break;
      }
      case 0x4002: {
        this.p1TimerLoad &= 0x700;
        this.p1TimerLoad |= value;
        break;
      }
      case 0x4003: {
        this.p1TimerLoad &= 0xff;
        this.p1TimerLoad |= (value & 0x7) << 8;
        break;
      }
      case 0x4004: {
        this.p2Duty = (value & 0xc0) >> 6;
        this.p2Volume = value & 0xf;
        break;
      }
      case 0x4006: {
        this.p2TimerLoad &= 0x700;
        this.p2TimerLoad |= value;
        break;
      }
      case 0x4007: {
        this.p2TimerLoad &= 0xff;
        this.p2TimerLoad |= (value & 0x7) << 8;
        break;
      }
      default: {
        break;
      }
    }
  }
}
