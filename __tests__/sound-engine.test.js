/**
 * sound-engine.test.js
 *
 * Unit tests for the Web Audio API SoundEngine introduced in:
 *   feat: add Web Audio API SoundEngine with mute toggle
 *
 * Tests cover:
 *  1. SoundEngine initial state
 *  2. enable() / _isEnabled()
 *  3. setMuted() / isMuted()
 *  4. _reset() helper
 *  5. _getContext() — returns null under various conditions
 *  6. _getAudioContext() helper
 *  7. playPlace / playWin / playDraw / playNewGame — do not throw; call AudioContext APIs
 *  8. Sound methods are no-ops when muted
 *  9. Sound methods are no-ops before user gesture
 * 10. AudioContext lazy creation and reuse
 * 11. AudioContext resume on suspended state
 */

'use strict';

const { SoundEngine } = require('../game.js');

/* ---------------------------------------------------------------------------
   Mock AudioContext
   The Web Audio API is not available in jsdom.  We supply a realistic mock
   that records calls and exposes helpers for test assertions.
   --------------------------------------------------------------------------- */

/**
 * Factory for a mock OscillatorNode.
 */
function makeMockOscillator(ctx) {
  const osc = {
    type: 'sine',
    frequency: {
      _values: [],
      setValueAtTime(v, t) { this._values.push({ fn: 'setValueAtTime', v, t }); },
      exponentialRampToValueAtTime(v, t) { this._values.push({ fn: 'expRamp', v, t }); },
    },
    connect: jest.fn(),
    start:   jest.fn(),
    stop:    jest.fn(),
  };
  return osc;
}

/**
 * Factory for a mock GainNode.
 */
function makeMockGain(ctx) {
  const gain = {
    gain: {
      _values: [],
      setValueAtTime(v, t) { this._values.push({ fn: 'setValueAtTime', v, t }); },
      linearRampToValueAtTime(v, t) { this._values.push({ fn: 'linearRamp', v, t }); },
      exponentialRampToValueAtTime(v, t) { this._values.push({ fn: 'expRamp', v, t }); },
    },
    connect: jest.fn(),
  };
  return gain;
}

/**
 * Create a fresh mock AudioContext.
 */
function makeMockAudioContext() {
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    _oscillators: [],
    _gains: [],
    resume: jest.fn().mockResolvedValue(undefined),
    createOscillator() {
      const osc = makeMockOscillator(this);
      this._oscillators.push(osc);
      return osc;
    },
    createGain() {
      const gain = makeMockGain(this);
      this._gains.push(gain);
      return gain;
    },
  };
  return ctx;
}

/* ---------------------------------------------------------------------------
   Test helpers
   --------------------------------------------------------------------------- */

/**
 * Install a mock AudioContext constructor on `window` and return a function
 * that retrieves the most-recently created context instance.
 */
function installMockAudioContext() {
  let lastInstance = null;
  const MockAudioContext = jest.fn().mockImplementation(() => {
    lastInstance = makeMockAudioContext();
    return lastInstance;
  });
  window.AudioContext = MockAudioContext;
  delete window.webkitAudioContext;
  return {
    MockAudioContext,
    getInstance: () => lastInstance,
  };
}

/** Remove mock AudioContext from window. */
function removeMockAudioContext() {
  delete window.AudioContext;
  delete window.webkitAudioContext;
}

/* ---------------------------------------------------------------------------
   Before / after hooks
   --------------------------------------------------------------------------- */

beforeEach(() => {
  SoundEngine._reset();
});

afterEach(() => {
  removeMockAudioContext();
  SoundEngine._reset();
});

/* ---------------------------------------------------------------------------
   1. Initial state
   --------------------------------------------------------------------------- */
describe('SoundEngine — initial state', () => {
  test('is not enabled (no user gesture) initially', () => {
    expect(SoundEngine._isEnabled()).toBe(false);
  });

  test('is not muted initially', () => {
    expect(SoundEngine.isMuted()).toBe(false);
  });

  test('has no AudioContext initially', () => {
    expect(SoundEngine._getAudioContext()).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
   2. enable()
   --------------------------------------------------------------------------- */
describe('SoundEngine.enable()', () => {
  test('marks a user gesture as having occurred', () => {
    expect(SoundEngine._isEnabled()).toBe(false);
    SoundEngine.enable();
    expect(SoundEngine._isEnabled()).toBe(true);
  });

  test('calling enable() multiple times is idempotent', () => {
    SoundEngine.enable();
    SoundEngine.enable();
    expect(SoundEngine._isEnabled()).toBe(true);
  });
});

/* ---------------------------------------------------------------------------
   3. setMuted() / isMuted()
   --------------------------------------------------------------------------- */
describe('SoundEngine.setMuted() / isMuted()', () => {
  test('setMuted(true) mutes', () => {
    SoundEngine.setMuted(true);
    expect(SoundEngine.isMuted()).toBe(true);
  });

  test('setMuted(false) unmutes', () => {
    SoundEngine.setMuted(true);
    SoundEngine.setMuted(false);
    expect(SoundEngine.isMuted()).toBe(false);
  });

  test('setMuted coerces truthy values to boolean', () => {
    SoundEngine.setMuted(1);
    expect(SoundEngine.isMuted()).toBe(true);
    SoundEngine.setMuted(0);
    expect(SoundEngine.isMuted()).toBe(false);
  });

  test('toggles correctly across multiple calls', () => {
    const states = [];
    for (let i = 0; i < 4; i++) {
      SoundEngine.setMuted(!SoundEngine.isMuted());
      states.push(SoundEngine.isMuted());
    }
    expect(states).toEqual([true, false, true, false]);
  });
});

/* ---------------------------------------------------------------------------
   4. _reset()
   --------------------------------------------------------------------------- */
describe('SoundEngine._reset()', () => {
  test('resets _gestureOccurred', () => {
    SoundEngine.enable();
    SoundEngine._reset();
    expect(SoundEngine._isEnabled()).toBe(false);
  });

  test('resets _muted', () => {
    SoundEngine.setMuted(true);
    SoundEngine._reset();
    expect(SoundEngine.isMuted()).toBe(false);
  });

  test('resets _audioContext to null', () => {
    installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace(); // triggers context creation
    SoundEngine._reset();
    expect(SoundEngine._getAudioContext()).toBeNull();
  });
});

/* ---------------------------------------------------------------------------
   5. _getContext() guards — no sound before gesture
   --------------------------------------------------------------------------- */
describe('SoundEngine — no sound before user gesture', () => {
  test('playPlace() does not create an AudioContext before gesture', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.playPlace();
    expect(MockAudioContext).not.toHaveBeenCalled();
    expect(SoundEngine._getAudioContext()).toBeNull();
  });

  test('playWin() does not create an AudioContext before gesture', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.playWin();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  test('playDraw() does not create an AudioContext before gesture', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.playDraw();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  test('playNewGame() does not create an AudioContext before gesture', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.playNewGame();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------
   6. _getContext() guards — no sound when muted
   --------------------------------------------------------------------------- */
describe('SoundEngine — no sound when muted', () => {
  test('playPlace() does not create an AudioContext when muted', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.setMuted(true);
    SoundEngine.playPlace();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  test('playWin() is silent when muted', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.setMuted(true);
    SoundEngine.playWin();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  test('playDraw() is silent when muted', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.setMuted(true);
    SoundEngine.playDraw();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });

  test('playNewGame() is silent when muted', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.setMuted(true);
    SoundEngine.playNewGame();
    expect(MockAudioContext).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------
   7. _getContext() guards — no AudioContext API available
   --------------------------------------------------------------------------- */
describe('SoundEngine — no AudioContext in environment', () => {
  test('playPlace() does not throw when AudioContext is unavailable', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    SoundEngine.enable();
    expect(() => SoundEngine.playPlace()).not.toThrow();
  });

  test('playWin() does not throw when AudioContext is unavailable', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    SoundEngine.enable();
    expect(() => SoundEngine.playWin()).not.toThrow();
  });

  test('playDraw() does not throw when AudioContext is unavailable', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    SoundEngine.enable();
    expect(() => SoundEngine.playDraw()).not.toThrow();
  });

  test('playNewGame() does not throw when AudioContext is unavailable', () => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    SoundEngine.enable();
    expect(() => SoundEngine.playNewGame()).not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
   8. AudioContext lazy creation and reuse
   --------------------------------------------------------------------------- */
describe('SoundEngine — AudioContext lazy creation', () => {
  test('AudioContext is created on first playPlace() after gesture', () => {
    const { MockAudioContext, getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace();
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
    expect(SoundEngine._getAudioContext()).toBe(getInstance());
  });

  test('AudioContext is NOT created again on second play call', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace();
    SoundEngine.playPlace();
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
  });

  test('AudioContext is shared across different play methods', () => {
    const { MockAudioContext } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace();
    SoundEngine.playWin();
    SoundEngine.playDraw();
    SoundEngine.playNewGame();
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
  });
});

/* ---------------------------------------------------------------------------
   9. AudioContext resume when suspended
   --------------------------------------------------------------------------- */
describe('SoundEngine — AudioContext resume on suspend', () => {
  test('calls resume() when context state is "suspended"', () => {
    const { MockAudioContext, getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace(); // creates context in 'running' state

    // Now simulate context becoming suspended
    const ctx = getInstance();
    ctx.state = 'suspended';

    SoundEngine.playPlace(); // should call resume()
    expect(ctx.resume).toHaveBeenCalled();
  });

  test('does NOT call resume() when context is already running', () => {
    const { getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace();
    SoundEngine.playPlace();
    expect(getInstance().resume).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------
   10. playPlace() — Web Audio API calls
   --------------------------------------------------------------------------- */
describe('SoundEngine.playPlace()', () => {
  function setup() {
    const { getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playPlace();
    return getInstance();
  }

  test('creates exactly one oscillator', () => {
    const ctx = setup();
    expect(ctx._oscillators).toHaveLength(1);
  });

  test('creates exactly one gain node', () => {
    const ctx = setup();
    expect(ctx._gains).toHaveLength(1);
  });

  test('oscillator type is "triangle"', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].type).toBe('triangle');
  });

  test('oscillator connects to gain node', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].connect).toHaveBeenCalledWith(ctx._gains[0]);
  });

  test('gain node connects to destination', () => {
    const ctx = setup();
    expect(ctx._gains[0].connect).toHaveBeenCalledWith(ctx.destination);
  });

  test('oscillator start() is called', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].start).toHaveBeenCalled();
  });

  test('oscillator stop() is called', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].stop).toHaveBeenCalled();
  });

  test('frequency starts at 800 Hz', () => {
    const ctx = setup();
    const freqCalls = ctx._oscillators[0].frequency._values;
    expect(freqCalls[0]).toMatchObject({ fn: 'setValueAtTime', v: 800 });
  });

  test('frequency ramps down to 200 Hz', () => {
    const ctx = setup();
    const freqCalls = ctx._oscillators[0].frequency._values;
    expect(freqCalls[1]).toMatchObject({ fn: 'expRamp', v: 200 });
  });
});

/* ---------------------------------------------------------------------------
   11. playWin() — Web Audio API calls
   --------------------------------------------------------------------------- */
describe('SoundEngine.playWin()', () => {
  function setup() {
    const { getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playWin();
    return getInstance();
  }

  test('creates 4 oscillators (one per note)', () => {
    const ctx = setup();
    expect(ctx._oscillators).toHaveLength(4);
  });

  test('creates 4 gain nodes (one per note)', () => {
    const ctx = setup();
    expect(ctx._gains).toHaveLength(4);
  });

  test('all oscillators are sine-type', () => {
    const ctx = setup();
    ctx._oscillators.forEach((osc) => {
      expect(osc.type).toBe('sine');
    });
  });

  test('all oscillators connect to their corresponding gain node', () => {
    const ctx = setup();
    ctx._oscillators.forEach((osc, i) => {
      expect(osc.connect).toHaveBeenCalledWith(ctx._gains[i]);
    });
  });

  test('all oscillators are started and stopped', () => {
    const ctx = setup();
    ctx._oscillators.forEach((osc) => {
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });
  });

  test('uses ascending frequencies (C5→E5→G5→C6)', () => {
    const ctx = setup();
    const freqs = ctx._oscillators.map((osc) => osc.frequency._values[0].v);
    // Each frequency should be higher than the previous
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
    }
  });

  test('first note is C5 (~523 Hz)', () => {
    const ctx = setup();
    const firstFreq = ctx._oscillators[0].frequency._values[0].v;
    expect(firstFreq).toBeCloseTo(523.25, 0);
  });

  test('last note is C6 (~1046 Hz)', () => {
    const ctx = setup();
    const lastFreq = ctx._oscillators[3].frequency._values[0].v;
    expect(lastFreq).toBeCloseTo(1046.50, 0);
  });
});

/* ---------------------------------------------------------------------------
   12. playDraw() — Web Audio API calls
   --------------------------------------------------------------------------- */
describe('SoundEngine.playDraw()', () => {
  function setup() {
    const { getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playDraw();
    return getInstance();
  }

  test('creates 3 oscillators (one per note)', () => {
    const ctx = setup();
    expect(ctx._oscillators).toHaveLength(3);
  });

  test('creates 3 gain nodes', () => {
    const ctx = setup();
    expect(ctx._gains).toHaveLength(3);
  });

  test('all oscillators are sawtooth-type', () => {
    const ctx = setup();
    ctx._oscillators.forEach((osc) => {
      expect(osc.type).toBe('sawtooth');
    });
  });

  test('all oscillators are started and stopped', () => {
    const ctx = setup();
    ctx._oscillators.forEach((osc) => {
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });
  });

  test('uses descending frequencies (A4→F4→D4)', () => {
    const ctx = setup();
    const freqs = ctx._oscillators.map((osc) => osc.frequency._values[0].v);
    // Each frequency should be lower than the previous
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeLessThan(freqs[i - 1]);
    }
  });

  test('first note is A4 (~440 Hz)', () => {
    const ctx = setup();
    const firstFreq = ctx._oscillators[0].frequency._values[0].v;
    expect(firstFreq).toBeCloseTo(440, 0);
  });

  test('last note is D4 (~293 Hz)', () => {
    const ctx = setup();
    const lastFreq = ctx._oscillators[2].frequency._values[0].v;
    expect(lastFreq).toBeCloseTo(293.66, 0);
  });
});

/* ---------------------------------------------------------------------------
   13. playNewGame() — Web Audio API calls
   --------------------------------------------------------------------------- */
describe('SoundEngine.playNewGame()', () => {
  function setup() {
    const { getInstance } = installMockAudioContext();
    SoundEngine.enable();
    SoundEngine.playNewGame();
    return getInstance();
  }

  test('creates exactly one oscillator', () => {
    const ctx = setup();
    expect(ctx._oscillators).toHaveLength(1);
  });

  test('creates exactly one gain node', () => {
    const ctx = setup();
    expect(ctx._gains).toHaveLength(1);
  });

  test('oscillator type is "sine"', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].type).toBe('sine');
  });

  test('oscillator is started and stopped', () => {
    const ctx = setup();
    expect(ctx._oscillators[0].start).toHaveBeenCalled();
    expect(ctx._oscillators[0].stop).toHaveBeenCalled();
  });

  test('frequency starts at 1200 Hz', () => {
    const ctx = setup();
    const freqCalls = ctx._oscillators[0].frequency._values;
    expect(freqCalls[0]).toMatchObject({ fn: 'setValueAtTime', v: 1200 });
  });

  test('frequency sweeps down to 200 Hz', () => {
    const ctx = setup();
    const freqCalls = ctx._oscillators[0].frequency._values;
    expect(freqCalls[1]).toMatchObject({ fn: 'expRamp', v: 200 });
  });
});

/* ---------------------------------------------------------------------------
   14. webkitAudioContext fallback
   --------------------------------------------------------------------------- */
describe('SoundEngine — webkitAudioContext fallback', () => {
  test('uses webkitAudioContext when AudioContext is not available', () => {
    delete window.AudioContext;
    const MockWebkitAudioContext = jest.fn().mockImplementation(() => makeMockAudioContext());
    window.webkitAudioContext = MockWebkitAudioContext;

    SoundEngine.enable();
    SoundEngine.playPlace();

    expect(MockWebkitAudioContext).toHaveBeenCalledTimes(1);
    delete window.webkitAudioContext;
  });
});

/* ---------------------------------------------------------------------------
   15. AudioContext constructor error handling
   --------------------------------------------------------------------------- */
describe('SoundEngine — AudioContext constructor throws', () => {
  test('playPlace() does not throw if AudioContext constructor throws', () => {
    window.AudioContext = jest.fn().mockImplementation(() => {
      throw new Error('AudioContext not allowed');
    });
    SoundEngine.enable();
    expect(() => SoundEngine.playPlace()).not.toThrow();
  });
});

/* ---------------------------------------------------------------------------
   16. Public API surface
   --------------------------------------------------------------------------- */
describe('SoundEngine public API', () => {
  const publicMethods = [
    'enable',
    'playPlace',
    'playWin',
    'playDraw',
    'playNewGame',
    'setMuted',
    'isMuted',
  ];

  publicMethods.forEach((method) => {
    test(`exposes ${method}()`, () => {
      expect(typeof SoundEngine[method]).toBe('function');
    });
  });

  const testHelpers = ['_reset', '_isEnabled', '_getAudioContext'];
  testHelpers.forEach((helper) => {
    test(`exposes testing helper ${helper}()`, () => {
      expect(typeof SoundEngine[helper]).toBe('function');
    });
  });
});
