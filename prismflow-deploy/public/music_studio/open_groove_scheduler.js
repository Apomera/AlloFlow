// Open Groove Studio scheduler.
// Pure timing helpers that turn project events into AudioContext-ready play plans.
(function (root) {
  'use strict';

  var core = root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore || null;

  function requireCore() {
    if (!core) {
      core = root.OpenGrooveCore || root.AlloModules && root.AlloModules.OpenGrooveCore || null;
      if (!core) throw new Error('OpenGrooveScheduler: OpenGrooveCore must load first');
    }
    return core;
  }

  function ogTicksToSeconds(ticks, bpm, ppq) {
    var safeBpm = Math.max(1, Number(bpm) || 120);
    var safePpq = Math.max(1, Number(ppq) || 960);
    return (Number(ticks) || 0) * 60 / (safeBpm * safePpq);
  }

  function ogSecondsToTicks(seconds, bpm, ppq) {
    var safeBpm = Math.max(1, Number(bpm) || 120);
    var safePpq = Math.max(1, Number(ppq) || 960);
    return Math.round((Number(seconds) || 0) * safeBpm * safePpq / 60);
  }

  function ogStepTicks(project, stepsPerBar) {
    var C = requireCore();
    return Math.round(C.ogTicksPerMeasure(project) / Math.max(1, Math.round(Number(stepsPerBar) || 16)));
  }

  function ogStepIndexAtTick(project, tick, stepsPerBar) {
    return Math.floor(Math.max(0, Number(tick) || 0) / ogStepTicks(project, stepsPerBar));
  }

  function ogEventPlaybackTick(event) {
    var base = Number(event && event.startTick) || 0;
    var nudge = event && event.type === 'drumHit' ? Number(event.microtimingTicks) || 0 : 0;
    return Math.max(0, base + nudge);
  }

  function ogBuildPlaybackPlan(project, options) {
    var C = requireCore();
    options = options || {};
    var pattern = C.ogFindPattern(project, options.patternId || project && project.patterns && project.patterns[0] && project.patterns[0].id);
    if (!pattern) return [];
    var bpm = Number(options.bpm) || Number(project.bpm) || 120;
    var ppq = Number(project.ppq) || C.OG_DEFAULT_PPQ || 960;
    var fromTick = Math.max(0, Math.round(Number(options.fromTick) || 0));
    var toTick = options.toTick == null ? C.ogPatternLengthTicks(project, pattern) : Math.max(fromTick, Math.round(Number(options.toTick) || 0));
    var originTick = options.originTick == null ? fromTick : Math.round(Number(options.originTick) || 0);
    var originTime = Number(options.originTime) || 0;
    var plan = [];

    (pattern.events || []).forEach(function (event) {
      var playTick = ogEventPlaybackTick(event);
      if (playTick < fromTick || playTick >= toTick) return;
      var durationTicks = Math.max(1, Number(event.durationTicks) || 1);
      var track = C.ogFindTrack(project, event.trackId);
      var pad = null;
      if (track && track.pads && event.padId) {
        for (var i = 0; i < track.pads.length; i++) {
          if (track.pads[i].id === event.padId) {
            pad = track.pads[i];
            break;
          }
        }
      }
      plan.push({
        id: event.id,
        type: event.type,
        trackId: event.trackId,
        padId: event.padId || null,
        padEngine: pad && pad.engine || null,
        assetId: event.assetId || pad && pad.assetId || null,
        pitch: event.pitch || null,
        midi: event.midi == null ? null : event.midi,
        patternTick: event.startTick,
        playTick: playTick,
        scheduledTick: playTick,
        time: originTime + ogTicksToSeconds(playTick - originTick, bpm, ppq),
        durationSec: ogTicksToSeconds(durationTicks, bpm, ppq),
        velocity: event.velocity == null ? 0.8 : event.velocity,
        probability: event.probability == null ? 1 : event.probability,
        repeat: event.repeat || 1,
        event: event
      });
    });

    plan.sort(function (a, b) {
      return (a.time - b.time) || String(a.id).localeCompare(String(b.id));
    });
    return plan;
  }

  function ogBuildLoopPlaybackPlan(project, options) {
    var C = requireCore();
    options = options || {};
    var pattern = C.ogFindPattern(project, options.patternId || project && project.patterns && project.patterns[0] && project.patterns[0].id);
    if (!pattern) return [];
    var bpm = Number(options.bpm) || Number(project.bpm) || 120;
    var ppq = Number(project.ppq) || C.OG_DEFAULT_PPQ || 960;
    var length = Math.max(1, C.ogPatternLengthTicks(project, pattern));
    var startTick = Math.max(0, Math.round(Number(options.transportTick) || 0));
    var lookaheadTicks = Math.max(1, Math.round(Number(options.lookaheadTicks) || C.ogTicksPerBeat(project)));
    var endTick = startTick + lookaheadTicks;
    var originTime = Number(options.originTime) || 0;
    var firstLoop = Math.floor(startTick / length);
    var lastLoop = Math.floor((endTick - 1) / length);
    var plan = [];

    for (var loop = firstLoop; loop <= lastLoop; loop++) {
      var loopStart = loop * length;
      (pattern.events || []).forEach(function (event) {
        var patternTick = ogEventPlaybackTick(event);
        var absoluteTick = loopStart + patternTick;
        if (absoluteTick < startTick || absoluteTick >= endTick) return;
        var durationTicks = Math.max(1, Number(event.durationTicks) || 1);
        var track = C.ogFindTrack(project, event.trackId);
        var pad = null;
        if (track && track.pads && event.padId) {
          for (var i = 0; i < track.pads.length; i++) {
            if (track.pads[i].id === event.padId) {
              pad = track.pads[i];
              break;
            }
          }
        }
        plan.push({
          id: event.id + '@' + loop,
          sourceId: event.id,
          type: event.type,
          trackId: event.trackId,
          padId: event.padId || null,
          padEngine: pad && pad.engine || null,
          assetId: event.assetId || pad && pad.assetId || null,
          pitch: event.pitch || null,
          midi: event.midi == null ? null : event.midi,
          patternTick: event.startTick,
          playTick: patternTick,
          scheduledTick: absoluteTick,
          loopIndex: loop,
          time: originTime + ogTicksToSeconds(absoluteTick - startTick, bpm, ppq),
          durationSec: ogTicksToSeconds(durationTicks, bpm, ppq),
          velocity: event.velocity == null ? 0.8 : event.velocity,
          probability: event.probability == null ? 1 : event.probability,
          repeat: event.repeat || 1,
          event: event
        });
      });
    }

    plan.sort(function (a, b) {
      return (a.time - b.time) || String(a.id).localeCompare(String(b.id));
    });
    return plan;
  }

  var api = {
    ogTicksToSeconds: ogTicksToSeconds,
    ogSecondsToTicks: ogSecondsToTicks,
    ogStepTicks: ogStepTicks,
    ogStepIndexAtTick: ogStepIndexAtTick,
    ogEventPlaybackTick: ogEventPlaybackTick,
    ogBuildPlaybackPlan: ogBuildPlaybackPlan,
    ogBuildLoopPlaybackPlan: ogBuildLoopPlaybackPlan
  };

  root.OpenGrooveScheduler = api;
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.OpenGrooveScheduler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
