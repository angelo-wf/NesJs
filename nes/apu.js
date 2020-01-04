
function Apu(nes) {

  // memory handler
  this.nes = nes;

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
  // noise timer values
  this.noiseLoadValues = [
    4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068
  ];
  // dmc timer value
  this.dmcLoadValues = [
    428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54
  ]

  // channel outputs
  this.output = new Float64Array(29781);

  this.reset = function() {
    for(let i = 0; i < this.output.length; i++) {
      this.output[i] = 0;
    }

    this.outputOffset = 0;

    this.frameCounter = 0;

    this.interruptInhibit = false;
    this.step5Mode = false;

    this.enableNoise = false;
    this.enableTriangle = false;
    this.enablePulse2 = false;
    this.enablePulse1 = false;

    // pulse 1
    this.p1Timer = 0;
    this.p1TimerValue = 0;
    this.p1Duty = 0;
    this.p1DutyIndex = 0;
    this.p1Output = 0;
    this.p1CounterHalt = false;
    this.p1Counter = 0;
    this.p1Volume = 0;
    this.p1ConstantVolume = false;
    this.p1Decay = 0;
    this.p1EnvelopeCounter = 0;
    this.p1EnvelopeStart = false;
    this.p1SweepEnabled = false;
    this.p1SweepPeriod = 0;
    this.p1SweepNegate = false;
    this.p1SweepShift = 0;
    this.p1SweepTimer = 0;
    this.p1SweepTarget = 0;
    this.p1SweepMuting = true;
    this.p1SweepReload = false;

    // pulse 2
    this.p2Timer = 0;
    this.p2TimerValue = 0;
    this.p2Duty = 0;
    this.p2DutyIndex = 0;
    this.p2Output = 0;
    this.p2CounterHalt = false;
    this.p2Counter = 0;
    this.p2Volume = 0;
    this.p2ConstantVolume = false;
    this.p2Decay = 0;
    this.p2EnvelopeCounter = 0;
    this.p2EnvelopeStart = false;
    this.p2SweepEnabled = false;
    this.p2SweepPeriod = 0;
    this.p2SweepNegate = false;
    this.p2SweepShift = 0;
    this.p2SweepTimer = 0;
    this.p2SweepTarget = 0;
    this.p2SweepMuting = true;
    this.p2SweepReload = false;

    // triangle
    this.triTimer = 0;
    this.triTimerValue = 0;
    this.triStepIndex = 0;
    this.triOutput = 0;
    this.triCounterHalt = false;
    this.triCounter = 0;
    this.triLinearCounter = 0;
    this.triReloadLinear = false;
    this.triLinearReload = 0;

    // noise
    this.noiseTimer = 0;
    this.noiseTimerValue = 0;
    this.noiseShift = 1;
    this.noiseTonal = false;
    this.noiseOutput = 0;
    this.noiseCounterHalt = false;
    this.noiseCounter = 0;
    this.noiseVolume = 0;
    this.noiseConstantVolume = false;
    this.noiseDecay = 0;
    this.noiseEnvelopeCounter = 0;
    this.noiseEnvelopeStart = false;

    // dmc
    this.dmcInterrupt = false;
    this.dmcLoop = false;
    this.dmcTimer = 0;
    this.dmcTimerValue = 0;
    this.dmcOutput = 0;
    this.dmcSampleAddress = 0xc000;
    this.dmcAddress = 0xc000;
    this.dmcSample = 0;
    this.dmcSampleLength = 0;
    this.dmcSampleEmpty = true;
    this.dmcBytesLeft = 0;
    this.dmcShifter = 0;
    this.dmcBitsLeft = 8;
    this.dmcSilent = true;

  }
  this.reset();
  this.saveVars = [
    "frameCounter", "interruptInhibit", "step5Mode", "enableNoise",
    "enableTriangle", "enablePulse2", "enablePulse1", "p1Timer", "p1TimerValue",
    "p1Duty", "p1DutyIndex", "p1Output", "p1CounterHalt", "p1Counter",
    "p1Volume", "p1ConstantVolume", "p1Decay", "p1EnvelopeCounter",
    "p1EnvelopeStart", "p1SweepEnabled", "p1SweepPeriod", "p1SweepNegate",
    "p1SweepShift", "p1SweepTimer", "p1SweepTarget", "p1SweepMuting",
    "p1SweepReload", "p2Timer", "p2TimerValue", "p2Duty", "p2DutyIndex",
    "p2Output", "p2CounterHalt", "p2Counter", "p2Volume", "p2ConstantVolume",
    "p2Decay", "p2EnvelopeCounter", "p2EnvelopeStart", "p2SweepEnabled",
    "p2SweepPeriod", "p2SweepNegate", "p2SweepShift", "p2SweepTimer",
    "p2SweepTarget", "p2SweepMuting", "p2SweepReload", "triTimer",
    "triTimerValue", "triStepIndex", "triOutput", "triCounterHalt",
    "triCounter", "triLinearCounter", "triReloadLinear", "triLinearReload",
    "noiseTimer", "noiseTimerValue", "noiseShift", "noiseTonal", "noiseOutput",
    "noiseCounterHalt", "noiseCounter", "noiseVolume", "noiseConstantVolume",
    "noiseDecay", "noiseEnvelopeCounter", "noiseEnvelopeStart", "dmcInterrupt",
    "dmcLoop", "dmcTimer", "dmcTimerValue", "dmcOutput", "dmcSampleAddress",
    "dmcAddress", "dmcSample", "dmcSampleLength", "dmcSampleEmpty",
    "dmcBytesLeft", "dmcShifter", "dmcBitsLeft", "dmcSilent"
  ];

  this.cycle = function() {
    if(
      (this.frameCounter === 29830 && !this.step5Mode) ||
      this.frameCounter === 37282
    ) {
      this.frameCounter = 0;
    }
    this.frameCounter++;

    this.handleFrameCounter();

    this.cycleTriangle();
    this.cyclePulse1();
    this.cyclePulse2();
    this.cycleNoise();
    this.cycleDmc();

    this.output[this.outputOffset++] = this.mix();
    if(this.outputOffset === 29781) {
      // if we are going past the buffer (too many apu cycles per frame)
      this.outputOffset = 29780;
    }
  }

  this.cyclePulse1 = function() {
    if(this.p1TimerValue !== 0) {
      this.p1TimerValue--;
    } else {
      this.p1TimerValue = (this.p1Timer * 2) + 1;
      this.p1DutyIndex++;
      this.p1DutyIndex &= 0x7;
    }
    let output = this.dutyCycles[this.p1Duty][this.p1DutyIndex];
    if(output === 0 || this.p1SweepMuting || this.p1Counter === 0) {
      this.p1Output = 0;
    } else {
      this.p1Output = this.p1ConstantVolume ? this.p1Volume : this.p1Decay;
    }
  }

  this.cyclePulse2 = function() {
    if(this.p2TimerValue !== 0) {
      this.p2TimerValue--;
    } else {
      this.p2TimerValue = (this.p2Timer * 2) + 1;
      this.p2DutyIndex++;
      this.p2DutyIndex &= 0x7;
    }
    let output = this.dutyCycles[this.p2Duty][this.p2DutyIndex];
    if(output === 0 || this.p2SweepMuting || this.p2Counter === 0) {
      this.p2Output = 0;
    } else {
      this.p2Output = this.p2ConstantVolume ? this.p2Volume : this.p2Decay;
    }
  }

  this.cycleTriangle = function() {
    if(this.triTimerValue !== 0) {
      this.triTimerValue--;
    } else {
      this.triTimerValue = this.triTimer;
      if(this.triCounter !== 0 && this.triLinearCounter !== 0) {
        this.triOutput = this.triangleSteps[this.triStepIndex++];
        if(this.triTimer < 2) {
          // ultrasonic
          this.triOutput = 7.5;
        }
        this.triStepIndex &= 0x1f;
      }
    }
  }

  this.cycleNoise = function() {
    if(this.noiseTimerValue !== 0) {
      this.noiseTimerValue--;
    } else {
      this.noiseTimerValue = this.noiseTimer;
      let feedback = this.noiseShift & 0x1;
      if(this.noiseTonal) {
        feedback ^= (this.noiseShift & 0x40) >> 6;
      } else {
        feedback ^= (this.noiseShift & 0x2) >> 1;
      }
      this.noiseShift >>= 1;
      this.noiseShift |= feedback << 14;
    }
    if(this.noiseCounter === 0 || (this.noiseShift & 0x1) === 1) {
      this.noiseOutput = 0;
    } else {
      this.noiseOutput = (
        this.noiseConstantVolume ? this.noiseVolume : this.noiseDecay
      );
    }
  }

  this.cycleDmc = function() {
    if(this.dmcTimerValue !== 0) {
      this.dmcTimerValue--;
    } else {
      this.dmcTimerValue = this.dmcTimer;
      if(!this.dmcSilent) {
        if((this.dmcShifter & 0x1) === 0) {
          if(this.dmcOutput >= 2) {
            this.dmcOutput -= 2;
          }
        } else {
          if(this.dmcOutput <= 125) {
            this.dmcOutput += 2;
          }
        }
      }
      this.dmcShifter >>= 1;
      this.dmcBitsLeft--;
      if(this.dmcBitsLeft === 0) {
        this.dmcBitsLeft = 8;
        if(this.dmcSampleEmpty) {
          this.dmcSilent = true;
        } else {
          this.dmcSilent = false;
          this.dmcShifter = this.dmcSample;
          this.dmcSampleEmpty = true;
        }
      }
    }
    if(this.dmcBytesLeft > 0 && this.dmcSampleEmpty) {
      this.dmcSampleEmpty = false;
      this.dmcSample = this.nes.read(this.dmcAddress);
      this.dmcAddress++;
      if(this.dmcAddress === 0x10000) {
        this.dmcAddress = 0x8000;
      }
      this.dmcBytesLeft--;
      if(this.dmcBytesLeft === 0 && this.dmcLoop) {
        this.dmcBytesLeft = this.dmcSampleLength;
        this.dmcAddress = this.dmcSampleAddress;
      } else if(this.dmcBytesLeft === 0 && this.dmcInterrupt) {
        this.nes.dmcIrqWanted = true;
      }
    }
  }

  this.updateSweepP1 = function() {
    let change = this.p1Timer >> this.p1SweepShift;
    if(this.p1SweepNegate) {
      change = (-change) - 1;
    }
    this.p1SweepTarget = this.p1Timer + change;
    if(this.p1SweepTarget > 0x7ff || this.p1Timer < 8) {
      this.p1SweepMuting = true;
    } else {
      this.p1SweepMuting = false;
    }
  }

  this.updateSweepP2 = function() {
    let change = this.p2Timer >> this.p2SweepShift;
    if(this.p2SweepNegate) {
      change = (-change);
    }
    this.p2SweepTarget = this.p2Timer + change;
    if(this.p2SweepTarget > 0x7ff || this.p2Timer < 8) {
      this.p2SweepMuting = true;
    } else {
      this.p2SweepMuting = false;
    }
  }

  this.clockQuarter = function() {
    // handle triangle linear counter
    if(this.triReloadLinear) {
      this.triLinearCounter = this.triLinearReload;
    } else if(this.triLinearCounter !== 0) {
      this.triLinearCounter--;
    }
    if(!this.triCounterHalt) {
      this.triReloadLinear = false;
    }
    // handle envelopes
    if(!this.p1EnvelopeStart) {
      if(this.p1EnvelopeCounter !== 0) {
        this.p1EnvelopeCounter--;
      } else {
        this.p1EnvelopeCounter = this.p1Volume;
        if(this.p1Decay !== 0) {
          this.p1Decay--;
        } else {
          if(this.p1CounterHalt) {
            this.p1Decay = 15;
          }
        }
      }
    } else {
      this.p1EnvelopeStart = false;
      this.p1Decay = 15;
      this.p1EnvelopeCounter = this.p1Volume;
    }

    if(!this.p2EnvelopeStart) {
      if(this.p2EnvelopeCounter !== 0) {
        this.p2EnvelopeCounter--;
      } else {
        this.p2EnvelopeCounter = this.p2Volume;
        if(this.p2Decay !== 0) {
          this.p2Decay--;
        } else {
          if(this.p2CounterHalt) {
            this.p2Decay = 15;
          }
        }
      }
    } else {
      this.p2EnvelopeStart = false;
      this.p2Decay = 15;
      this.p2EnvelopeCounter = this.p2Volume;
    }

    if(!this.noiseEnvelopeStart) {
      if(this.noiseEnvelopeCounter !== 0) {
        this.noiseEnvelopeCounter--;
      } else {
        this.noiseEnvelopeCounter = this.noiseVolume;
        if(this.noiseDecay !== 0) {
          this.noiseDecay--;
        } else {
          if(this.noiseCounterHalt) {
            this.noiseDecay = 15;
          }
        }
      }
    } else {
      this.noiseEnvelopeStart = false;
      this.noiseDecay = 15;
      this.noiseEnvelopeCounter = this.noiseVolume;
    }
  }

  this.clockHalf = function() {
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
    if(!this.noiseCounterHalt && this.noiseCounter !== 0) {
      this.noiseCounter--;
    }
    // handle sweeps
    if(
      this.p1SweepTimer === 0 && this.p1SweepEnabled &&
      !this.p1SweepMuting && this.p1SweepShift > 0
    ) {
      this.p1Timer = this.p1SweepTarget;
      this.updateSweepP1();
    }
    if(this.p1SweepTimer === 0 || this.p1SweepReload) {
      this.p1SweepTimer = this.p1SweepPeriod;
      this.p1SweepReload = false;
    } else {
      this.p1SweepTimer--;
    }

    if(
      this.p2SweepTimer === 0 && this.p2SweepEnabled &&
      !this.p2SweepMuting && this.p2SweepShift > 0
    ) {
      this.p2Timer = this.p2SweepTarget;
      this.updateSweepP2();
    }
    if(this.p2SweepTimer === 0 || this.p2SweepReload) {
      this.p2SweepTimer = this.p2SweepPeriod;
      this.p2SweepReload = false;
    } else {
      this.p2SweepTimer--;
    }
  }

  this.mix = function() {
    // from https://wiki.nesdev.com/w/index.php/APU_Mixer
    let tnd = (
      0.00851 * this.triOutput +
      0.00494 * this.noiseOutput +
      0.00335 * this.dmcOutput
    );
    let pulse = 0.00752 * (this.p1Output + this.p2Output);
    return tnd + pulse;
  }

  this.handleFrameCounter = function() {
    if(this.frameCounter === 7457) {
      this.clockQuarter();
    } else if(this.frameCounter === 14913) {
      this.clockQuarter();
      this.clockHalf();
    } else if(this.frameCounter === 22371) {
      this.clockQuarter();
    } else if(this.frameCounter === 29829 && !this.step5Mode) {
      this.clockQuarter();
      this.clockHalf();
      if(!this.interruptInhibit) {
        this.nes.frameIrqWanted = true;
      }
    } else if(this.frameCounter === 37281) {
      this.clockQuarter();
      this.clockHalf();
    }
  }

  this.getOutput = function() {
    let ret = [this.outputOffset, this.output];
    this.outputOffset = 0;
    return ret;
  }

  this.peak = function(adr) {
    if(adr === 0x4015) {
      let ret = 0;
      ret |= (this.p1Counter > 0) ? 0x1 : 0;
      ret |= (this.p2Counter > 0) ? 0x2 : 0;
      ret |= (this.triCounter > 0) ? 0x4 : 0;
      ret |= (this.noiseCounter > 0) ? 0x8 : 0;
      ret |= (this.dmcBytesLeft > 0) ? 0x10 : 0;
      ret |= this.nes.frameIrqWanted ? 0x40 : 0;
      ret |= this.nes.dmcIrqWanted ? 0x80 : 0;
      return ret;
    }
    return 0;
  }

  this.read = function(adr) {
    if(adr === 0x4015) {
      let ret = 0;
      ret |= (this.p1Counter > 0) ? 0x1 : 0;
      ret |= (this.p2Counter > 0) ? 0x2 : 0;
      ret |= (this.triCounter > 0) ? 0x4 : 0;
      ret |= (this.noiseCounter > 0) ? 0x8 : 0;
      ret |= (this.dmcBytesLeft > 0) ? 0x10 : 0;
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
        this.p1ConstantVolume = (value & 0x10) > 0;
        break;
      }
      case 0x4001: {
        this.p1SweepEnabled = (value & 0x80) > 0;
        this.p1SweepPeriod = (value & 0x70) >> 4;
        this.p1SweepNegate = (value & 0x08) > 0;
        this.p1SweepShift = value & 0x7;
        this.p1SweepReload = true;
        this.updateSweepP1();
        break;
      }
      case 0x4002: {
        this.p1Timer &= 0x700;
        this.p1Timer |= value;
        this.updateSweepP1();
        break;
      }
      case 0x4003: {
        this.p1Timer &= 0xff;
        this.p1Timer |= (value & 0x7) << 8;
        this.p1DutyIndex = 0;
        if(this.enablePulse1) {
          this.p1Counter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        this.p1EnvelopeStart = true;
        this.updateSweepP1();
        break;
      }
      case 0x4004: {
        this.p2Duty = (value & 0xc0) >> 6;
        this.p2Volume = value & 0xf;
        this.p2CounterHalt = (value & 0x20) > 0;
        this.p2ConstantVolume = (value & 0x10) > 0;
        break;
      }
      case 0x4005: {
        this.p2SweepEnabled = (value & 0x80) > 0;
        this.p2SweepPeriod = (value & 0x70) >> 4;
        this.p2SweepNegate = (value & 0x08) > 0;
        this.p2SweepShift = value & 0x7;
        this.p2SweepReload = true;
        this.updateSweepP2();
        break;
      }
      case 0x4006: {
        this.p2Timer &= 0x700;
        this.p2Timer |= value;
        this.updateSweepP2();
        break;
      }
      case 0x4007: {
        this.p2Timer &= 0xff;
        this.p2Timer |= (value & 0x7) << 8;
        this.p2DutyIndex = 0;
        if(this.enablePulse2) {
          this.p2Counter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        this.p2EnvelopeStart = true;
        this.updateSweepP2();
        break;
      }
      case 0x4008: {
        this.triCounterHalt = (value & 0x80) > 0;
        this.triLinearReload = value & 0x7f;

        // looks like this is a mistake in the nesdev wiki?
        // http://forums.nesdev.com/viewtopic.php?f=3&t=13767#p163155
        // doesn't do this, neither does Mesen,
        // and doing it breaks Super Mario Bros. 2's triangle between notes

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
      case 0x400c: {
        this.noiseCounterHalt = (value & 0x20) > 0;
        this.noiseConstantVolume = (value & 0x10) > 0;
        this.noiseVolume = value & 0xf;
        break;
      }
      case 0x400e: {
        this.noiseTonal = (value & 0x80) > 0;
        this.noiseTimer = this.noiseLoadValues[value & 0xf] - 1;
        break;
      }
      case 0x400f: {
        if(this.enableNoise) {
          this.noiseCounter = this.lengthLoadValues[(value & 0xf8) >> 3];
        }
        this.noiseEnvelopeStart = true;
        break;
      }
      case 0x4010: {
        this.dmcInterrupt = (value & 0x80) > 0;
        this.dmcLoop = (value & 0x40) > 0;
        this.dmcTimer = this.dmcLoadValues[value & 0xf] - 1;
        if(!this.dmcInterrupt) {
          this.nes.dmcIrqWanted = false;
        }
        break;
      }
      case 0x4011: {
        this.dmcOutput = value & 0x7f;
        break;
      }
      case 0x4012: {
        this.dmcSampleAddress = 0xc000 | (value << 6);
        break;
      }
      case 0x4013: {
        this.dmcSampleLength = (value << 4) + 1;
        break;
      }
      case 0x4015: {
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
        if(!this.enableNoise) {
          this.noiseCounter = 0;
        }
        if((value & 0x10) > 0) {
          if(this.dmcBytesLeft === 0) {
            this.dmcBytesLeft = this.dmcSampleLength;
            this.dmcAddress = this.dmcSampleAddress;
          }
        } else {
          this.dmcBytesLeft = 0;
        }
        this.nes.dmcIrqWanted = false;
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
          this.clockQuarter();
          this.clockHalf();
        }
        break;
      }
      default: {
        break;
      }
    }
  }
}
