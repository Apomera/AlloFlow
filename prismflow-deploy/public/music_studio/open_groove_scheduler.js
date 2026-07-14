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

  function ogSwingOffsetTicks(project, event, stepsPerBar) {
    if (!project || !event || (event.type !== 'drumHit' && event.type !== 'note')) return 0;
    var swing = Math.max(0, Math.min(0.75, Number(project.swing) || 0));
    if (!swing) return 0;
    var stepTicks = ogStepTicks(project, stepsPerBar || 16);
    var rawStep = (Number(event.startTick) || 0) / stepTicks;
    var step = Math.round(rawStep);
    if (Math.abs(rawStep - step) > 0.01) return 0;
    return step % 2 === 1 ? Math.round(stepTicks * swing * 0.5) : 0;
  }

  function ogEventPlaybackTick(event, project, options) {
    options = options || {};
    var base = Number(event && event.startTick) || 0;
    var nudge = event && event.type === 'drumHit' ? Number(event.microtimingTicks) || 0 : 0;
    return Math.max(0, base + nudge + ogSwingOffsetTicks(project, event, options.stepsPerBar));
  }

  function ogPlanMixerState(C, project, trackId, patternId, tick) {
    if (C.ogTrackIsAudible && !C.ogTrackIsAudible(project, trackId)) return null;
    var channel = C.ogResolveMixerChannelAtTick
      ? C.ogResolveMixerChannelAtTick(project, patternId, trackId, tick)
      : C.ogGetMixerChannel ? C.ogGetMixerChannel(project, trackId) : { gain: 1 };
    var master = C.ogGetMixerChannel ? C.ogGetMixerChannel(project, 'master') : { gain: 1 };
    var channelGain = Math.max(0, Math.min(1.5, Number(channel && channel.gain) || 0));
    var masterGain = Math.max(0, Math.min(1.5, Number(master && master.gain) || 0));
    return {
      channelGain: channelGain,
      masterGain: masterGain,
      outputGain: channelGain * masterGain,
      muted: channel && channel.mute || false,
      solo: channel && channel.solo || false
    };
  }

  function ogScaledVelocity(value, outputGain) {
    var velocity = value == null ? 0.8 : Number(value);
    return Math.max(0, Math.min(1, velocity * Math.max(0, Number(outputGain) || 0)));
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
      var playTick = ogEventPlaybackTick(event, project, { stepsPerBar: options.stepsPerBar || 16 });
      if (playTick < fromTick || playTick >= toTick) return;
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
        return;
      }
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
      var mix = ogPlanMixerState(C, project, event.trackId, pattern.id, playTick);
      if (!mix || !mix.outputGain) return;
      var eventVelocity = event.velocity == null ? 0.8 : event.velocity;
      var effects = C.ogResolveTrackEffectsAtTick
        ? C.ogResolveTrackEffectsAtTick(project, pattern.id, event.trackId, playTick)
        : C.ogGetTrackEffects ? C.ogGetTrackEffects(project, event.trackId) : [];
      plan.push({
        id: event.id,
        type: event.type,
        trackId: event.trackId,
        padId: event.padId || null,
        padEngine: pad && pad.engine || null,
        assetId: event.assetId || pad && pad.assetId || null,
        sampleRegion: pad && pad.sampleRegion ? JSON.parse(JSON.stringify(pad.sampleRegion)) : null,
        drumVoice: pad && pad.proceduralVoice ? JSON.parse(JSON.stringify(pad.proceduralVoice)) : null,
        instrument: event.type === 'note' && track && track.instrument ? JSON.parse(JSON.stringify(track.instrument)) : null,
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
        var patternTick = ogEventPlaybackTick(event, project, { stepsPerBar: options.stepsPerBar || 16 });
        var absoluteTick = loopStart + patternTick;
        if (absoluteTick < startTick || absoluteTick >= endTick) return;
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
          return;
        }
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
        var mix = ogPlanMixerState(C, project, event.trackId, pattern.id, patternTick);
        if (!mix || !mix.outputGain) return;
        var eventVelocity = event.velocity == null ? 0.8 : event.velocity;
        var effects = C.ogResolveTrackEffectsAtTick
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
          sampleRegion: pad && pad.sampleRegion ? JSON.parse(JSON.stringify(pad.sampleRegion)) : null,
          instrument: event.type === 'note' && track && track.instrument ? JSON.parse(JSON.stringify(track.instrument)) : null,
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

  function ogBuildArrangementPlaybackPlan(project, options) {
    var C = requireCore();
    options = options || {};
    var bpm = Number(options.bpm) || Number(project && project.bpm) || 120;
    var ppq = Number(project && project.ppq) || C.OG_DEFAULT_PPQ || 960;
    var originTick = Math.max(0, Math.round(Number(options.originTick) || 0));
    var originTime = Number(options.originTime) || 0;
    var timeline = C.ogBuildArrangementTimeline ? C.ogBuildArrangementTimeline(project) : [];
    var plan = [];

    timeline.forEach(function (section) {
      var sectionLengthTicks = Math.max(1, section.endTick - section.startTick);
      (section.patternIds || []).forEach(function (patternId) {
        var pattern = C.ogFindPattern(project, patternId);
        if (!pattern) return;
        var patternLength = Math.max(1, C.ogPatternLengthTicks(project, pattern));
        for (var sectionOffsetTick = 0, repeatIndex = 0; sectionOffsetTick < sectionLengthTicks; sectionOffsetTick += patternLength, repeatIndex += 1) {
          var repeatLength = Math.min(patternLength, sectionLengthTicks - sectionOffsetTick);
          var items = ogBuildPlaybackPlan(project, {
            patternId: pattern.id,
            fromTick: 0,
            toTick: repeatLength,
            originTick: 0,
            originTime: 0,
            bpm: bpm,
            stepsPerBar: options.stepsPerBar || 16
          });
          items.forEach(function (item) {
            var arrangementTick = section.startTick + sectionOffsetTick + item.playTick;
            if (arrangementTick < originTick) return;
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
          });
        }
      });
    });

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
