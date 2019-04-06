
function Apu(nes) {

  // TODO: noise, dmc, sweep units, volume enevlope
  // TODO: some song's pulse channels (eg. SMB2) sound wierd between notes

  // memory handler
  this.nes = nes;

  this.cycles = 0;
  this.frameCounter = 0;

  this.interruptInhibit = false;
  this.step5Mode = false;

  this.enablePcm = false;
  this.enableNoise = false;
  this.enableTriangle = false;
  this.enablePulse2 = false;
  this.enablePulse1 = false;

  // pulse 1
  this.p1Timer = 0;
  this.p1Duty = 0;
  this.p1TimerValue = 0;
  this.p1DutyIndex = 0;
  this.p1DutyOutput = 0;
  this.p1Volume = 0;
  this.p1Output = 0;
  this.p1Length = 0;
  this.p1CounterHalt = false;
  this.p1Counter = 0;

  // pulse 2
  this.p2Timer = 0;
  this.p2Duty = 0;
  this.p2TimerValue = 0;
  this.p2DutyIndex = 0;
  this.p2DutyOutput = 0;
  this.p2Volume = 0;
  this.p2Output = 0;
  this.p2Length = 0;
  this.p2CounterHalt = false;
  this.p2Counter = 0;

  // triangle
  this.triTimer = 0;
  this.triTimerValue = 0;
  this.triStepIndex = 0;
  this.triCounterHalt = false;
  this.triLinearCounter = 0;
  this.triCounter = 0;
  this.triOutput = 0;
  this.triReloadLinear = false;
  this.triLinearReload = 0;

  // duty cycles
  this.dutyCycles = [
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0],
    [1, 0, 0, 1, 1, 1, 1, 1]
  ];
  // legth counter load values
  this.lengthLoadValues = [
    10, 254, 20, 2,  40, 4,  80, 6,  160, 8,  60, 10, 14, 12, 26, 14,
    12, 16,  24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
  ];
  // tiangle steps
  this.triangleSteps = [
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5,  4,  3,  2,  1,  0,
    0,  1,  2,  3,  4,  5,  6, 7, 8, 9, 10, 11, 12, 13, 14, 15
  ];

  // channel outputs
  this.output = new Float64Array(29781);
  this.outputOffset = 0;

  this.reset = function() {
    this.cycles = 0;
    this.frameCounter = 0;

    this.interruptInhibit = false;
    this.step5Mode = false;

    this.enablePcm = false;
    this.enableNoise = false;
    this.enableTriangle = false;
    this.enablePulse2 = false;
    this.enablePulse1 = false;

    // pulse 1
    this.p1Timer = 0;
    this.p1Duty = 0;
    this.p1TimerValue = 0;
    this.p1DutyIndex = 0;
    this.p1DutyOutput = 0;
    this.p1Volume = 0;
    this.p1Output = 0;
    this.p1Length = 0;
    this.p1CounterHalt = false;
    this.p1Counter = 0;

    // pulse 2
    this.p2Timer = 0;
    this.p2Duty = 0;
    this.p2TimerValue = 0;
    this.p2DutyIndex = 0;
    this.p2DutyOutput = 0;
    this.p2Volume = 0;
    this.p2Output = 0;
    this.p2Length = 0;
    this.p2CounterHalt = false;
    this.p2Counter = 0;

    // triangle
    this.triTimer = 0;
    this.triTimerValue = 0;
    this.triStepIndex = 0;
    this.triCounterHalt = false;
    this.triLinearCounter = 0;
    this.triCounter = 0;
    this.triOutput = 0;
    this.triReloadLinear = false;
    this.triLinearReload = 0;

    for(let i = 0; i < this.output.length; i++) {
      this.output[i] = 0;
    }
    this.outputOffset = 0;
  }

  this.cycle = function() {
    // cpu cycle
    if(
      (this.frameCounter === 29830 && !this.step5Mode) ||
      this.frameCounter === 37282
    ) {
      this.frameCounter = 0;
    } else {
      this.frameCounter++;
    }
    this.handleFrameCounter();

    this.cycleTriangle();

    if((this.cycles & 1) === 0) {
      // apu cycle
      this.cyclePulse1();
      this.cyclePulse2();
    }
    this.cycles++;

    this.output[this.outputOffset++] = this.mix();
    if(this.outputOffset === 29781) {
      // if we are going past the buffer (too many apu cycles per frame)
      this.outputOffset = 29780;
    }
  }

  this.cyclePulse1 = function() {
    if(this.p1TimerValue === 0) {
      this.p1TimerValue = this.p1Timer;
    } else {
      this.p1TimerValue--;
    }
    if(this.p1TimerValue === 0) {
      this.p1DutyOutput = this.dutyCycles[this.p1Duty][this.p1DutyIndex++];
      this.p1DutyIndex &= 0x7;
    }
    if(this.p1DutyOutput === 0 || this.p1Timer < 8 || this.p1Counter === 0) {
      this.p1Output = 0;
    } else {
      this.p1Output = this.p1Volume;
    }
  }

  this.cyclePulse2 = function() {
    if(this.p2TimerValue === 0) {
      this.p2TimerValue = this.p2Timer;
    } else {
      this.p2TimerValue--;
    }
    if(this.p2TimerValue === 0) {
      this.p2DutyOutput = this.dutyCycles[this.p2Duty][this.p2DutyIndex++];
      this.p2DutyIndex &= 0x7;
    }
    if(this.p2DutyOutput === 0 || this.p2Timer < 8 || this.p2Counter === 0) {
      this.p2Output = 0;
    } else {
      this.p2Output = this.p2Volume;
    }
  }

  this.cycleTriangle = function() {
    if(this.triTimerValue === 0) {
      this.triTimerValue = this.triTimer;
    } else {
      this.triTimerValue--;
    }
    if(
      this.triTimerValue === 0 &&
      this.triCounter !== 0 && this.triLinearCounter !== 0
    ) {
      this.triOutput = this.triangleSteps[this.triStepIndex++];
      if(this.triTimer < 2) {
        // ultrasonic
        this.triOutput = 7.5;
      }
      this.triStepIndex &= 0x1f;
    }
  }

  this.clockEnvelopes = function() {
    // handle triangle linear counter
    if(this.triReloadLinear) {
      this.triLinearCounter = this.triLinearReload;
    } else if(this.triLinearCounter !== 0) {
      this.triLinearCounter--;
    }
    if(!this.triCounterHalt) {
      this.triReloadLinear = false;
    }
  }

  this.clockSweeps = function() {
    // decrement length counters
    if(!this.p1CounterHalt && this.p1Counter !== 0) {
      this.p1Counter--;
    }
    if(!this.p2CounterHalt && this.p2Counter !== 0) {
      this.p2Counter--;
    }
    if(!this.triCounterHalt && this.triCounter !== 0) {
      this.triCounter--;
    }
  }

  this.mix = function() {
    let tnd = 0.00851 * this.triOutput + 0.00494 * 0 + 0.00335 * 0;
    let pulse = 0.00752 * (this.p1Output + this.p2Output);
    return tnd + pulse;
  }

  this.handleFrameCounter = function() {
    if(this.frameCounter === 7457) {
      this.clockEnvelopes();
    } else if(this.frameCounter === 14913) {
      this.clockEnvelopes();
      this.clockSweeps();
    } else if(this.frameCounter === 22371) {
      this.clockEnvelopes();
    } else if(this.frameCounter === 29829 && !this.step5Mode) {
      this.clockEnvelopes();
      this.clockSweeps();
      if(!this.interruptInhibit) {
        this.nes.frameIrqWanted = true;
      }
    } else if(this.frameCounter === 37281) {
      this.clockEnvelopes();
      this.clockSweeps();
    }
  }

  this.getOutput = function() {
    let ret = [this.outputOffset, this.output];
    this.outputOffset = 0;
    return ret;
  }

  this.read = function(adr) {
    if(adr === 0x4015) {
      let ret = 0;
      ret |= (this.p1Counter > 0) ? 0x1 : 0;
      ret |= (this.p2Counter > 0) ? 0x2 : 0;
      ret |= (this.triCounter > 0) ? 0x4 : 0;
      ret |= this.nes.frameIrqWanted ? 0x40 : 0;
      ret |= this.nes.dmcIrqWanted ? 0x80 : 0;
      this.nes.frameIrqWanted = false;
      return ret;
    }
    return 0;
  }

  this.write = function(adr, value) {
    switch(adr) {
      case 0x4000: {
        this.p1Duty = (value & 0xc0) >> 6;
        this.p1Volume = value & 0xf;
        this.p1CounterHalt = (value & 0x20) > 0;
        break;
      }
      case 0x4002: {
        this.p1Timer &= 0x700;
        this.p1Timer |= value;
        break;
      }
      case 0x4003: {
        this.p1Timer &= 0xff;
        this.p1Timer |= (value & 0x7) << 8;
        this.p1DutyIndex = 0;
        if(this.enablePulse1) {
          this.p1Counter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        break;
      }
      case 0x4004: {
        this.p2Duty = (value & 0xc0) >> 6;
        this.p2Volume = value & 0xf;
        this.p2CounterHalt = (value & 0x20) > 0;
        break;
      }
      case 0x4006: {
        this.p2Timer &= 0x700;
        this.p2Timer |= value;
        break;
      }
      case 0x4007: {
        this.p2Timer &= 0xff;
        this.p2Timer |= (value & 0x7) << 8;
        this.p2DutyIndex = 0;
        if(this.enablePulse2) {
          this.p2Counter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        break;
      }
      case 0x4008: {
        this.triCounterHalt = (value & 0x80) > 0;
        this.triLinearReload = value & 0x7f;

        // TODO: is this a mistake in the nesdev wiki?
        // http://forums.nesdev.com/viewtopic.php?f=3&t=13767#p163155
        // doesn't do this, neither does Mesen, and doing it breaks SMB2
        // this.triReloadLinear = true;
        break;
      }
      case 0x400a: {
        this.triTimer &= 0x700;
        this.triTimer |= value;
        break;
      }
      case 0x400b: {
        this.triTimer &= 0xff;
        this.triTimer |= (value & 0x7) << 8;
        if(this.enableTriangle) {
          this.triCounter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        this.triReloadLinear = true;
        break;
      }
      case 0x4015: {
        this.enablePcm = (value & 0x10) > 0;
        this.enableNoise = (value & 0x08) > 0;
        this.enableTriangle = (value & 0x04) > 0;
        this.enablePulse2 = (value & 0x02) > 0;
        this.enablePulse1 = (value & 0x01) > 0;
        if(!this.enablePulse1) {
          this.p1Counter = 0;
        }
        if(!this.enablePulse2) {
          this.p2Counter = 0;
        }
        if(!this.enableTriangle) {
          this.triCounter = 0;
        }
        break;
      }
      case 0x4017: {
        this.step5Mode = (value & 0x80) > 0;
        this.interruptInhibit = (value & 0x40) > 0;
        if(this.interruptInhibit) {
          this.nes.frameIrqWanted = false;
        }
        this.frameCounter = 0;
        if(this.step5Mode) {
          this.clockEnvelopes();
          this.clockSweeps();
        }
        break;
      }
      default: {
        break;
      }
    }
  }
}
