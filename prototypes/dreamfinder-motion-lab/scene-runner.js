/* DreamFinder Motion Lab — scene runner.
 * PROTOTYPE ONLY — DO NOT MERGE. Never imported by the production application.
 *
 * A minimal interruptible, replayable scene state machine:
 *   states: idle -> running -> done, plus done -> idle (reset) and
 *   running -> idle (cancel). Everything async is epoch-guarded so a reset
 *   mid-flight can never paint a stale frame (same contract as the production
 *   sessionFrame()/_sessionEpoch primitive at index.html:17879-17932).
 *
 * Skip uses Animation.finish() (jump to END state); cancel uses
 * Animation.cancel() (revert to initial state). The durable visual truth is
 * always a class set applied by the machine, never an animation's last
 * keyframe — so reduced motion reaches the identical end state by applying
 * the same classes with zero animations created.
 *
 * Environment is injected so the Node check can execute this file headlessly
 * with a fake clock and fake animations. No DOM access at module top level.
 */
(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { global.SceneRunner = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STATES = { IDLE: 'idle', RUNNING: 'running', DONE: 'done' };
  var EDGES = {
    idle: { running: true },
    running: { done: true, idle: true },
    done: { idle: true }
  };
  var WATCHDOG_GRACE_MS = 250;

  function defaultEnv() {
    return {
      setTimeout: function (fn, ms) { return setTimeout(fn, ms); },
      clearTimeout: function (id) { clearTimeout(id); },
      animate: function (el, keyframes, options) {
        var anim = el.animate(keyframes, options);
        return anim;
      },
      prefersReducedMotion: function () { return false; },
      strict: false,
      onIllegalEdge: function () {}
    };
  }

  /* def: {
   *   name        string
   *   duration    number (ms, full-motion timeline length)
   *   reducedDuration  number (ms, reduced branch; default 0 = instant)
   *   steps       [{at: ms, run: function(ctx)}]  scheduled from start()
   *   applyInitial function()   set the idle class state
   *   applyFinal   function()   set the done class state
   *   reducedRun   function(ctx) optional, e.g. a short crossfade
   *   onState      function(state, scene) optional UI hook
   * }
   */
  function Scene(def, env) {
    this.def = def;
    this.env = env || defaultEnv();
    this.name = def.name;
    this.state = STATES.IDLE;
    this.epoch = 0;
    this.animations = [];
    this.timers = [];
    this.watchdogFired = false;
    this.reducedLastRun = false;
    this.animationsCreatedLastRun = 0;
  }

  Scene.prototype._setState = function (next) {
    if (this.state === next) { return true; }
    if (!EDGES[this.state] || !EDGES[this.state][next]) {
      this.env.onIllegalEdge(this.name, this.state, next);
      if (this.env.strict) {
        throw new Error('SceneRunner[' + this.name + ']: illegal edge ' + this.state + ' -> ' + next);
      }
      return false;
    }
    this.state = next;
    if (this.def.onState) { this.def.onState(next, this); }
    return true;
  };

  Scene.prototype._schedule = function (fn, ms) {
    var self = this;
    var epoch = this.epoch;
    var id = this.env.setTimeout(function () {
      var i = self.timers.indexOf(id);
      if (i !== -1) { self.timers.splice(i, 1); }
      if (epoch !== self.epoch) { return; }
      fn();
    }, ms);
    this.timers.push(id);
    return id;
  };

  Scene.prototype._clearTimers = function () {
    for (var i = 0; i < this.timers.length; i++) { this.env.clearTimeout(this.timers[i]); }
    this.timers = [];
  };

  /* ctx handed to steps: registers every animation so skip/cancel own them all. */
  Scene.prototype._ctx = function () {
    var self = this;
    var epoch = this.epoch;
    return {
      scene: self,
      live: function () { return epoch === self.epoch; },
      animate: function (el, keyframes, options) {
        if (epoch !== self.epoch) { return null; }
        var anim = self.env.animate(el, keyframes, options);
        if (anim) {
          self.animationsCreatedLastRun += 1;
          if (anim.finished && typeof anim.finished.catch === 'function') {
            anim.finished.catch(function () {});
          }
          self.animations.push(anim);
        }
        return anim;
      },
      at: function (ms, fn) { self._schedule(fn, ms); }
    };
  };

  Scene.prototype.start = function () {
    if (this.state !== STATES.IDLE) { return false; } /* replay spam: no-op */
    this.epoch += 1;
    this.animations = [];
    this.watchdogFired = false;
    this.animationsCreatedLastRun = 0;
    var reduced = !!this.env.prefersReducedMotion();
    this.reducedLastRun = reduced;
    if (!this._setState(STATES.RUNNING)) { return false; }

    var self = this;
    var ctx = this._ctx();

    if (reduced) {
      /* Reduced motion collapses the TIMELINE, not just the tweens: the
       * end-state classes are applied now and done is reached almost
       * immediately. Never leave a silent full-length wait. */
      if (this.def.reducedRun) { this.def.reducedRun(ctx); }
      this.def.applyFinal();
      var rd = this.def.reducedDuration || 0;
      if (rd <= 0) { this._complete(); }
      else { this._schedule(function () { self._complete(); }, rd); }
    } else {
      var steps = this.def.steps || [];
      for (var i = 0; i < steps.length; i++) {
        (function (step) {
          self._schedule(function () { step.run(ctx); }, step.at);
        })(steps[i]);
      }
      this._schedule(function () { self._finishAnimations(); self._complete(); }, this.def.duration);
    }

    /* Watchdog: force-complete if the timeline stalls. Its absence costs a
     * frozen kiosk; its presence costs nothing. */
    var wdDelay = (reduced ? (this.def.reducedDuration || 0) : this.def.duration) + WATCHDOG_GRACE_MS;
    this._schedule(function () {
      if (self.state === STATES.RUNNING) {
        self.watchdogFired = true;
        self.skip();
      }
    }, wdDelay);
    return true;
  };

  Scene.prototype._finishAnimations = function () {
    for (var i = 0; i < this.animations.length; i++) {
      var a = this.animations[i];
      try { if (a.playState !== 'finished') { a.finish(); } } catch (e) { try { a.cancel(); } catch (e2) {} }
    }
    this.animations = [];
  };

  Scene.prototype._cancelAnimations = function () {
    for (var i = 0; i < this.animations.length; i++) {
      try { this.animations[i].cancel(); } catch (e) {}
    }
    this.animations = [];
  };

  Scene.prototype._complete = function () {
    if (this.state !== STATES.RUNNING) { return; }
    this.epoch += 1; /* orphan any still-scheduled steps */
    this._clearTimers();
    this.def.applyFinal();
    this._setState(STATES.DONE);
  };

  /* Skip: the user advanced. Land on the finished state instantly. */
  Scene.prototype.skip = function () {
    if (this.state !== STATES.RUNNING) { return false; }
    this.epoch += 1;
    this._clearTimers();
    this._finishAnimations();
    this.def.applyFinal();
    this._setState(STATES.DONE);
    return true;
  };

  /* Reset: back to idle from done (replay prep) or running (abandon). */
  Scene.prototype.reset = function () {
    if (this.state === STATES.IDLE) { return false; }
    this.epoch += 1;
    this._clearTimers();
    this._cancelAnimations();
    this.def.applyInitial();
    this._setState(STATES.IDLE);
    return true;
  };

  /* Replay: the only sanctioned restart — explicit, never implicit. */
  Scene.prototype.replay = function () {
    this.reset();
    return this.start();
  };

  return {
    STATES: STATES,
    WATCHDOG_GRACE_MS: WATCHDOG_GRACE_MS,
    createScene: function (def, env) { return new Scene(def, env); },
    defaultEnv: defaultEnv
  };
});
