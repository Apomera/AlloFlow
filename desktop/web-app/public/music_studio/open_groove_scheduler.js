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

  var MAX_LOOP_SPANS = 256;
  var MAX_ARRANGEMENT_REPEATS = 1024;
  var MAX_LOOKAHEAD_TICKS = 1000000;
  var MAX_TICK_VALUE = 1000000000;
  var MAX_PLAN_EVENTS = 16384;

  function clampTick(value, fallback) {
    return Math.max(0, Math.min(MAX_TICK_VALUE, Math.round(finiteOr(value, fallback == null ? 0 : fallback))));
  }

  function patternHasAutomation(pattern) {
    var events = pattern && Array.isArray(pattern.events) ? pattern.events : [];
    for (var i = 0; i < events.length; i++) {
      if (events[i] && events[i].type === 'automationPoint') return true;
    }
    return false;
  }

  function finiteOr(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeClone(value) {
    if (!value || typeof value !== 'object') return null;
    try {
      return JSON.parse(JSON.stringify(value), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) {
      return null;
    }
  }

  function ogTicksToSeconds(ticks, bpm, ppq) {
    var safeBpm = Math.max(1, Math.min(1000, finiteOr(bpm, 120)));
    var safePpq = Math.max(1, Math.min(96000, finiteOr(ppq, 960)));
    return finiteOr(ticks, 0) * 60 / (safeBpm * safePpq);
  }

  function ogSecondsToTicks(seconds, bpm, ppq) {
    var safeBpm = Math.max(1, Math.min(1000, finiteOr(bpm, 120)));
    var safePpq = Math.max(1, Math.min(96000, finiteOr(ppq, 960)));
    return Math.round(finiteOr(seconds, 0) * safeBpm * safePpq / 60);
  }

  function ogStepTicks(project, stepsPerBar) {
    var C = requireCore();
    var steps = Math.max(1, Math.min(1024, Math.round(finiteOr(stepsPerBar, 16))));
    var measureTicks = Math.max(1, finiteOr(C.ogTicksPerMeasure(project), 3840));
    return Math.max(1, Math.round(measureTicks / steps));
  }

  function ogStepIndexAtTick(project, tick, stepsPerBar) {
    return Math.floor(Math.max(0, finiteOr(tick, 0)) / ogStepTicks(project, stepsPerBar));
  }

  function ogSwingOffsetTicks(project, event, stepsPerBar) {
    if (!project || !event || (event.type !== 'drumHit' && event.type !== 'note')) return 0;
    var swing = Math.max(0, Math.min(0.75, finiteOr(project.swing, 0)));
    if (!swing) return 0;
    var stepTicks = ogStepTicks(project, stepsPerBar || 16);
    var rawStep = finiteOr(event.startTick, 0) / stepTicks;
    var step = Math.round(rawStep);
    if (Math.abs(rawStep - step) > 0.01) return 0;
    return step % 2 === 1 ? Math.round(stepTicks * swing * 0.5) : 0;
  }

  function ogEventPlaybackTick(event, project, options) {
    options = options || {};
    var base = Math.max(0, Math.min(MAX_TICK_VALUE, finiteOr(event && event.startTick, 0)));
    var maxNudge = options.maxNudgeTicks != null ? Math.max(1, finiteOr(options.maxNudgeTicks, 3840)) : MAX_LOOKAHEAD_TICKS;
    var rawNudge = event && event.type === 'drumHit' ? finiteOr(event.microtimingTicks, 0) : 0;
    var nudge = Math.max(-maxNudge, Math.min(maxNudge, rawNudge));
    return Math.max(0, Math.min(MAX_TICK_VALUE, base + nudge + ogSwingOffsetTicks(project, event, options.stepsPerBar)));
  }

  function ogPlanMixerState(C, project, trackId, patternId, tick, hasAutomation) {
    if (C.ogTrackIsAudible && !C.ogTrackIsAudible(project, trackId)) return null;
    var channel = hasAutomation && C.ogResolveMixerChannelAtTick
      ? C.ogResolveMixerChannelAtTick(project, patternId, trackId, tick)
      : C.ogGetMixerChannel ? C.ogGetMixerChannel(project, trackId) : { gain: 1 };
    var master = C.ogGetMixerChannel ? C.ogGetMixerChannel(project, 'master') : { gain: 1 };
    var channelGain = Math.max(0, Math.min(1.5, finiteOr(channel && channel.gain, 0)));
    var masterGain = Math.max(0, Math.min(1.5, finiteOr(master && master.gain, 0)));
    return {
      channelGain: channelGain,
      masterGain: masterGain,
      outputGain: channelGain * masterGain,
      muted: channel && channel.mute || false,
      solo: channel && channel.solo || false
    };
  }

  function ogScaledVelocity(value, outputGain) {
    var velocity = Math.max(0, Math.min(1, value == null ? 0.8 : finiteOr(value, 0.8)));
    var gain = Math.max(0, Math.min(2.25, finiteOr(outputGain, 0)));
    return Math.max(0, Math.min(1, velocity * gain));
  }

  function ogBuildPlaybackPlan(project, options) {
    var C = requireCore();
    options = options || {};
    var pattern = C.ogFindPattern(project, options.patternId || project && project.patterns && project.patterns[0] && project.patterns[0].id);
    if (!pattern) return [];
    var bpm = Math.max(1, Math.min(1000, finiteOr(options.bpm, finiteOr(project && project.bpm, 120))));
    var ppq = Math.max(1, Math.min(96000, finiteOr(project && project.ppq, C.OG_DEFAULT_PPQ || 960)));
    var fromTick = clampTick(options.fromTick, 0);
    var defaultLength = Math.max(1, Math.min(MAX_TICK_VALUE, finiteOr(C.ogPatternLengthTicks(project, pattern), 3840)));
    var toTick = options.toTick == null ? defaultLength : Math.max(fromTick, clampTick(options.toTick, fromTick));
    var originTick = options.originTick == null ? fromTick : clampTick(options.originTick, fromTick);
    var originTime = finiteOr(options.originTime, 0);
    var hasAuto = patternHasAutomation(pattern);
    var plan = [];
    var events = Array.isArray(pattern.events) ? pattern.events : [];

    for (var idx = 0; idx < events.length; idx++) {
      if (plan.length >= MAX_PLAN_EVENTS) break;
      var event = events[idx];
      if (!event || typeof event !== 'object') continue;
      if (event.type === 'rest' || event.type === 'chord') continue;
      var playTick = ogEventPlaybackTick(event, project, { stepsPerBar: options.stepsPerBar || 16, maxNudgeTicks: defaultLength });
      if (playTick < fromTick || playTick >= toTick) continue;
      if (event.type === 'automationPoint') {
        plan.push({
          id: event.id,
          type: event.type,
          trackId: event.trackId,
          target: event.target,
          value: event.value,
          curve: event.curve || 'linear',
          patternTick: event.startTick,
          playTick: playTick,
          scheduledTick: playTick,
          time: originTime + ogTicksToSeconds(playTick - originTick, bpm, ppq),
          event: event
        });
        continue;
      }
      var durationTicks = Math.max(1, Math.min(MAX_TICK_VALUE, finiteOr(event.durationTicks, 1)));
      var track = C.ogFindTrack(project, event.trackId);
      var pad = null;
      if (track && Array.isArray(track.pads) && event.padId) {
        for (var i = 0; i < track.pads.length; i++) {
          if (track.pads[i] && track.pads[i].id === event.padId) {
            pad = track.pads[i];
            break;
          }
        }
      }
      var mix = ogPlanMixerState(C, project, event.trackId, pattern.id, playTick, hasAuto);
      if (!mix || !mix.outputGain) continue;
      var eventVelocity = event.velocity == null ? 0.8 : Math.max(0, Math.min(1, finiteOr(event.velocity, 0.8)));
      var effects = hasAuto && C.ogResolveTrackEffectsAtTick
        ? C.ogResolveTrackEffectsAtTick(project, pattern.id, event.trackId, playTick)
        : C.ogGetTrackEffects ? C.ogGetTrackEffects(project, event.trackId) : [];
      plan.push({
        id: event.id,
        type: event.type,
        trackId: event.trackId,
        padId: event.padId || null,
        padEngine: pad && pad.engine || null,
        assetId: event.assetId || pad && pad.assetId || null,
        sampleRegion: pad && pad.sampleRegion ? safeClone(pad.sampleRegion) : null,
        drumVoice: pad && pad.proceduralVoice ? safeClone(pad.proceduralVoice) : null,
        instrument: event.type === 'note' && track && track.instrument ? safeClone(track.instrument) : null,
        pitch: event.pitch || null,
        midi: event.midi == null ? null : event.midi,
        patternTick: event.startTick,
        playTick: playTick,
        scheduledTick: playTick,
        time: originTime + ogTicksToSeconds(playTick - originTick, bpm, ppq),
        durationSec: ogTicksToSeconds(durationTicks, bpm, ppq),
        eventVelocity: eventVelocity,
        velocity: ogScaledVelocity(eventVelocity, mix.outputGain),
        channelGain: mix.channelGain,
        masterGain: mix.masterGain,
        outputGain: mix.outputGain,
        effects: effects,
        muted: mix.muted,
        solo: mix.solo,
        probability: event.probability == null ? 1 : Math.max(0, Math.min(1, finiteOr(event.probability, 1))),
        repeat: event.repeat || 1,
        event: event
      });
    }

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
    var bpm = Math.max(1, Math.min(1000, finiteOr(options.bpm, finiteOr(project && project.bpm, 120))));
    var ppq = Math.max(1, Math.min(96000, finiteOr(project && project.ppq, C.OG_DEFAULT_PPQ || 960)));
    var length = Math.max(1, Math.min(MAX_TICK_VALUE, finiteOr(C.ogPatternLengthTicks(project, pattern), 3840)));
    var startTick = clampTick(options.transportTick, 0);
    var defaultLookahead = Math.max(1, finiteOr(C.ogTicksPerBeat(project), 960));
    var maxLookahead = Math.max(length * 16, MAX_LOOKAHEAD_TICKS);
    var lookaheadTicks = Math.max(1, Math.min(maxLookahead, Math.round(finiteOr(options.lookaheadTicks, defaultLookahead))));
    var endTick = Math.min(MAX_TICK_VALUE, startTick + lookaheadTicks);
    var originTime = finiteOr(options.originTime, 0);
    var firstLoop = Math.floor(startTick / length);
    var scanStartLoop = Math.max(0, firstLoop - 1);
    var lastLoop = Math.min(firstLoop + MAX_LOOP_SPANS, Math.floor((endTick - 1) / length));
    var hasAuto = patternHasAutomation(pattern);
    var plan = [];
    var events = Array.isArray(pattern.events) ? pattern.events : [];

    for (var loop = scanStartLoop; loop <= lastLoop && plan.length < MAX_PLAN_EVENTS; loop++) {
      var loopStart = loop * length;
      for (var idx = 0; idx < events.length; idx++) {
        if (plan.length >= MAX_PLAN_EVENTS) break;
        var event = events[idx];
        if (!event || typeof event !== 'object') continue;
        if (event.type === 'rest' || event.type === 'chord') continue;
        var patternTick = ogEventPlaybackTick(event, project, { stepsPerBar: options.stepsPerBar || 16, maxNudgeTicks: length });
        var absoluteTick = loopStart + patternTick;
        if (absoluteTick < startTick || absoluteTick >= endTick) continue;
        if (event.type === 'automationPoint') {
          plan.push({
            id: event.id + '@' + loop,
            sourceId: event.id,
            type: event.type,
            trackId: event.trackId,
            target: event.target,
            value: event.value,
            curve: event.curve || 'linear',
            patternTick: event.startTick,
            playTick: patternTick,
            scheduledTick: absoluteTick,
            loopIndex: loop,
            time: originTime + ogTicksToSeconds(absoluteTick - startTick, bpm, ppq),
            event: event
          });
          continue;
        }
        var durationTicks = Math.max(1, Math.min(MAX_TICK_VALUE, finiteOr(event.durationTicks, 1)));
        var track = C.ogFindTrack(project, event.trackId);
        var pad = null;
        if (track && Array.isArray(track.pads) && event.padId) {
          for (var i = 0; i < track.pads.length; i++) {
            if (track.pads[i] && track.pads[i].id === event.padId) {
              pad = track.pads[i];
              break;
            }
          }
        }
        var mix = ogPlanMixerState(C, project, event.trackId, pattern.id, patternTick, hasAuto);
        if (!mix || !mix.outputGain) continue;
        var eventVelocity = event.velocity == null ? 0.8 : Math.max(0, Math.min(1, finiteOr(event.velocity, 0.8)));
        var effects = hasAuto && C.ogResolveTrackEffectsAtTick
          ? C.ogResolveTrackEffectsAtTick(project, pattern.id, event.trackId, patternTick)
          : C.ogGetTrackEffects ? C.ogGetTrackEffects(project, event.trackId) : [];
        plan.push({
          id: event.id + '@' + loop,
          sourceId: event.id,
          type: event.type,
          trackId: event.trackId,
          padId: event.padId || null,
          padEngine: pad && pad.engine || null,
          assetId: event.assetId || pad && pad.assetId || null,
          sampleRegion: pad && pad.sampleRegion ? safeClone(pad.sampleRegion) : null,
          drumVoice: pad && pad.proceduralVoice ? safeClone(pad.proceduralVoice) : null,
          instrument: event.type === 'note' && track && track.instrument ? safeClone(track.instrument) : null,
          pitch: event.pitch || null,
          midi: event.midi == null ? null : event.midi,
          patternTick: event.startTick,
          playTick: patternTick,
          scheduledTick: absoluteTick,
          loopIndex: loop,
          time: originTime + ogTicksToSeconds(absoluteTick - startTick, bpm, ppq),
          durationSec: ogTicksToSeconds(durationTicks, bpm, ppq),
          eventVelocity: eventVelocity,
          velocity: ogScaledVelocity(eventVelocity, mix.outputGain),
          channelGain: mix.channelGain,
          masterGain: mix.masterGain,
          outputGain: mix.outputGain,
          effects: effects,
          muted: mix.muted,
          solo: mix.solo,
          probability: event.probability == null ? 1 : Math.max(0, Math.min(1, finiteOr(event.probability, 1))),
          repeat: event.repeat || 1,
          event: event
        });
      }
    }

    plan.sort(function (a, b) {
      return (a.time - b.time) || String(a.id).localeCompare(String(b.id));
    });
    return plan;
  }

  function ogBuildArrangementPlaybackPlan(project, options) {
    var C = requireCore();
    options = options || {};
    var bpm = Math.max(1, Math.min(1000, finiteOr(options.bpm, finiteOr(project && project.bpm, 120))));
    var ppq = Math.max(1, Math.min(96000, finiteOr(project && project.ppq, C.OG_DEFAULT_PPQ || 960)));
    var originTick = clampTick(options.originTick, 0);
    var originTime = finiteOr(options.originTime, 0);
    var maxTick = options.toTick != null
      ? Math.max(originTick, clampTick(options.toTick, originTick))
      : (options.lookaheadTicks != null
        ? Math.min(MAX_TICK_VALUE, originTick + Math.max(1, Math.min(MAX_LOOKAHEAD_TICKS, Math.round(finiteOr(options.lookaheadTicks, 960)))))
        : Infinity);
    var timeline = C.ogBuildArrangementTimeline ? C.ogBuildArrangementTimeline(project) : [];
    var plan = [];

    var sections = Array.isArray(timeline) ? timeline : [];
    for (var sIdx = 0; sIdx < sections.length && plan.length < MAX_PLAN_EVENTS; sIdx++) {
      var section = sections[sIdx];
      if (!section || typeof section !== 'object') continue;
      var sectionStart = clampTick(section.startTick, 0);
      var sectionEnd = clampTick(section.endTick, sectionStart + 1);
      if (sectionEnd <= originTick || sectionStart >= maxTick) continue;
      var sectionLengthTicks = Math.max(1, sectionEnd - sectionStart);
      if (!Number.isFinite(sectionLengthTicks)) continue;
      var patIds = Array.isArray(section.patternIds) ? section.patternIds : [];
      for (var pIdx = 0; pIdx < patIds.length && plan.length < MAX_PLAN_EVENTS; pIdx++) {
        var pattern = C.ogFindPattern(project, patIds[pIdx]);
        if (!pattern) continue;
        var patternLength = Math.max(1, Math.min(MAX_TICK_VALUE, finiteOr(C.ogPatternLengthTicks(project, pattern), 3840)));
        for (var sectionOffsetTick = 0, repeatIndex = 0; sectionOffsetTick < sectionLengthTicks && repeatIndex < MAX_ARRANGEMENT_REPEATS && plan.length < MAX_PLAN_EVENTS; sectionOffsetTick += patternLength, repeatIndex += 1) {
          var repeatStartAbs = sectionStart + sectionOffsetTick;
          if (repeatStartAbs >= maxTick) break;
          var repeatLength = Math.min(patternLength, sectionLengthTicks - sectionOffsetTick);
          if (repeatStartAbs + repeatLength <= originTick) continue;
          var items = ogBuildPlaybackPlan(project, {
            patternId: pattern.id,
            fromTick: 0,
            toTick: repeatLength,
            originTick: 0,
            originTime: 0,
            bpm: bpm,
            stepsPerBar: options.stepsPerBar || 16
          });
          for (var iIdx = 0; iIdx < items.length && plan.length < MAX_PLAN_EVENTS; iIdx++) {
            var item = items[iIdx];
            var arrangementTick = repeatStartAbs + item.playTick;
            if (arrangementTick < originTick || arrangementTick >= maxTick) continue;
            var next = Object.assign({}, item, {
              id: section.sceneId + ':' + pattern.id + ':' + item.id + ':' + section.index + ':' + repeatIndex,
              sourceId: item.id,
              sceneId: section.sceneId,
              sceneName: section.sceneName,
              sectionIndex: section.index,
              sectionOffsetTick: sectionOffsetTick,
              patternRepeatIndex: repeatIndex,
              patternId: pattern.id,
              patternTick: item.patternTick,
              playTick: sectionOffsetTick + item.playTick,
              scheduledTick: arrangementTick,
              arrangementTick: arrangementTick,
              time: originTime + ogTicksToSeconds(arrangementTick - originTick, bpm, ppq)
            });
            plan.push(next);
          }
        }
      }
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
    ogSwingOffsetTicks: ogSwingOffsetTicks,
    ogEventPlaybackTick: ogEventPlaybackTick,
    ogBuildPlaybackPlan: ogBuildPlaybackPlan,
    ogBuildLoopPlaybackPlan: ogBuildLoopPlaybackPlan,
    ogBuildArrangementPlaybackPlan: ogBuildArrangementPlaybackPlan
  };

  root.OpenGrooveScheduler = api;
  root.AlloModules = root.AlloModules || {};
  root.AlloModules.OpenGrooveScheduler = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
