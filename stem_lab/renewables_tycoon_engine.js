/* Renewables Tycoon: a deterministic, deliberately simplified teaching campaign.
 * Money is fictional game dollars. Equipment and weather are illustrative, not
 * engineering or investment forecasts. All power values are kW; each step is 1 h.
 */
(function (root, factory) {
  'use strict';
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) {
    root.StemLab = root.StemLab || {};
    root.StemLab.renewablesTycoonEngine = engine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = 1;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var CATALOG = {
    solar: { name: 'Solar array', capacity: 40, power: 40, cost: 18000, serviceCost: 450, monthlyCost: 140, wear: 2.2 },
    wind: { name: 'Wind turbine', capacity: 30, power: 30, cost: 31000, serviceCost: 650, monthlyCost: 230, wear: 5.5 },
    battery: { name: 'Battery store', capacity: 100, power: 25, cost: 14000, serviceCost: 350, monthlyCost: 100, wear: 2.4 }
  };
  var SITES = [
    { id: 'harbor-roofs', name: 'Harbor roofs', type: 'solar', x: 20, y: 25, resource: 1, landCost: 0 },
    { id: 'north-bluff', name: 'North bluff', type: 'wind', x: 75, y: 20, resource: 1, landCost: 0 },
    { id: 'harbor-store', name: 'Harbor store', type: 'battery', x: 72, y: 70, resource: 1, landCost: 0 },
    { id: 'school-roofs', name: 'School roofs', type: 'solar', x: 37, y: 14, resource: 1.04, landCost: 2000 },
    { id: 'south-meadow', name: 'South meadow', type: 'solar', x: 18, y: 66, resource: 1.12, landCost: 3500 },
    { id: 'ridge-wind', name: 'Ridge wind', type: 'wind', x: 87, y: 43, resource: 1.1, landCost: 5000 },
    { id: 'breakwater-wind', name: 'Breakwater wind', type: 'wind', x: 57, y: 8, resource: 1.04, landCost: 3500 },
    { id: 'civic-store', name: 'Civic store', type: 'battery', x: 41, y: 76, resource: 1, landCost: 1000 },
    { id: 'ferry-store', name: 'Ferry store', type: 'battery', x: 89, y: 84, resource: 1, landCost: 1500 }
  ];
  var GOALS = { coverage: 0.9, trust: 50, cash: 0 };
  var CHARGE_EFFICIENCY = 0.95;
  var DISCHARGE_EFFICIENCY = 0.95;
  var SERVICE_HOURS = 48;
  var TARIFF = 0.48;
  var INITIAL_TRUST = 68;

  function choice(id, label, description, cost, trust, effects) {
    return { id: id, label: label, description: description, cost: cost, trust: trust, effects: effects || {} };
  }
  var EVENTS = {
    cold: {
      id: 'cold', title: 'A cold front approaches',
      description: 'Heating demand rises by 15% this month. The cooperative can help households reduce the extra load.',
      effects: { demand: 1.15 },
      choices: [
        choice('insulation', 'Fund draft-proofing kits', 'Spend $250; reduce this month\'s demand by 6% and gain 3 trust.', 250, 3, { demand: 0.94 }),
        choice('schedule', 'Coordinate flexible heating', 'Spend $100; shift more evening demand into daytime hours and gain 1 trust.', 100, 1, { shift: 0.18 }),
        choice('normal', 'Use existing resources', 'Keep cash available and serve the higher demand with your current fleet.', 0, 0)
      ]
    },
    storm: {
      id: 'storm', title: 'Storm watch',
      description: 'Stronger winds bring energy and occasional turbine cut-out. Equipment fault risk increases this month.',
      effects: { wind: 1.16, storm: true, risk: 1.8 },
      choices: [
        choice('standby', 'Put technicians on standby', 'Spend $700; reduce storm fault risk by 70%. Scheduled maintenance still uses the regular crew.', 700, 1, { risk: 0.3 }),
        choice('flex', 'Organize flexible demand', 'Spend $150; shift extra evening demand into daytime hours and gain 2 trust.', 150, 2, { shift: 0.2 }),
        choice('normal', 'Keep the normal operating plan', 'Retain cash and accept the elevated equipment risk.', 0, 0)
      ]
    },
    grant: {
      id: 'grant', title: 'A cooperative support fund opens',
      description: 'A local fund offers two forms of support. Choose where the benefit goes.',
      effects: {},
      choices: [
        choice('capital', 'Take the capital award', 'Receive $4,000 for the cooperative\'s operating and expansion budget.', -4000, 0),
        choice('community', 'Share the community award', 'Receive $1,500 for the cooperative and gain 8 trust through household support.', -1500, 8)
      ]
    },
    cloud: {
      id: 'cloud', title: 'A persistent cloud band',
      description: 'Solar resource falls by 30% this month. Wind and stored energy become more valuable.',
      effects: { solar: 0.7 },
      choices: [
        choice('workshop', 'Run an efficiency workshop', 'Spend $250; reduce demand by 5% for the month and gain 2 trust.', 250, 2, { demand: 0.95 }),
        choice('normal', 'Work with the current fleet', 'Keep cash available and rely on the system you have built.', 0, 0)
      ]
    },
    training: {
      id: 'training', title: 'Technician training places',
      description: 'A visiting engineering team offers a month of supervised operation and component checks.',
      effects: {},
      choices: [
        choice('train', 'Enroll the team', 'Spend $800; halve this month\'s wear and fault risk, and gain 2 trust.', 800, 2, { wear: 0.5, risk: 0.5 }),
        choice('normal', 'Keep the existing routine', 'Preserve cash and continue normal maintenance practices.', 0, 0)
      ]
    },
    festival: {
      id: 'festival', title: 'Harbor festival contract',
      description: 'The festival adds 12% to this month\'s demand. Extra revenue is earned only for electricity actually delivered.',
      effects: { demand: 1.12 },
      choices: [
        choice('schedule', 'Schedule daytime activities', 'Spend $250; shift extra evening demand into solar hours and gain 3 trust.', 250, 3, { shift: 0.25 }),
        choice('normal', 'Support the full evening program', 'Use existing resources and gain 1 trust for participating.', 0, 1)
      ]
    },
    sun: {
      id: 'sun', title: 'A bright summer outlook',
      description: 'Solar resource rises by 15% this month. Extra energy may fill batteries or be curtailed when there is no demand.',
      effects: { solar: 1.15 },
      choices: [
        choice('customer', 'Offer a daytime workshop contract', 'Serve 8% more demand this month; all added consumption takes place during daylight hours.', 0, 1, { daytimeLoad: 0.08 }),
        choice('normal', 'Keep spare generation available', 'Use the extra sun for existing customers and battery charging.', 0, 0)
      ]
    },
    visitors: {
      id: 'visitors', title: 'The school wants an energy tour',
      description: 'Students want to see the cooperative\'s equipment and discuss how a renewable microgrid works.',
      effects: {},
      choices: [
        choice('tour', 'Host an equipment tour', 'Spend $200 on staff time and gain 6 trust.', 200, 6),
        choice('guide', 'Send a classroom guide', 'Share a simple guide for free and gain 1 trust.', 0, 1)
      ]
    },
    rebate: {
      id: 'rebate', title: 'A regional resilience rebate',
      description: 'The cooperative qualifies for a one-time payment. Decide how much to share with members.',
      effects: {},
      choices: [
        choice('capital', 'Retain the rebate', 'Receive $2,500 for repairs or new equipment.', -2500, 0),
        choice('members', 'Share most of it with members', 'Receive $750 for the cooperative and gain 7 trust.', -750, 7)
      ]
    },
    breeze: {
      id: 'breeze', title: 'A favorable coastal breeze',
      description: 'The wind resource improves by 12% this month, increasing generation when turbine limits allow.',
      effects: { wind: 1.12 },
      choices: [
        choice('tour', 'Invite a community inspection', 'Spend $150 and gain 4 trust through a guided public visit.', 150, 4),
        choice('normal', 'Concentrate on operations', 'Keep the budget available for equipment and service.', 0, 0)
      ]
    },
    bearings: {
      id: 'bearings', title: 'An industry bearing advisory',
      description: 'A supplier recommends extra checks. Fault risk is higher this month, especially on worn equipment.',
      effects: { risk: 2.2 },
      choices: [
        choice('inspect', 'Commission extra inspections', 'Spend $550; reduce this month\'s fault risk by 80%. This does not replace a worn component.', 550, 1, { risk: 0.2 }),
        choice('normal', 'Follow the regular schedule', 'Retain cash and accept the higher risk.', 0, 0)
      ]
    },
    parts: {
      id: 'parts', title: 'Spare parts are available locally',
      description: 'A supplier offers a temporary support package before its seasonal shipping break.',
      effects: {},
      choices: [
        choice('support', 'Reserve the support package', 'Spend $400; reduce this month\'s fault risk by 60%.', 400, 0, { risk: 0.4 }),
        choice('normal', 'Keep the current arrangements', 'Retain cash and use the normal maintenance plan.', 0, 0)
      ]
    }
  };
  var SEASON_EVENTS = [
    ['cold', 'storm', 'grant'], ['cloud', 'training', 'festival'],
    ['sun', 'visitors', 'rebate'], ['breeze', 'bearings', 'parts']
  ];

  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function finite(value, low, high) { return typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high; }
  function integer(value, low, high) { return finite(value, low, high) && Math.floor(value) === value; }
  function freeze(value) {
    Object.keys(value).forEach(function (key) { if (value[key] && typeof value[key] === 'object') freeze(value[key]); });
    return Object.freeze(value);
  }
  function random(seed, key) {
    var text = seed + '|' + key;
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296;
  }
  function siteById(id) { return SITES.find(function (site) { return site.id === id; }); }
  function eventFor(seed, month) {
    var season = Math.floor(month / 3);
    var deck = SEASON_EVENTS[season].slice().sort(function (a, b) {
      return random(seed, 'event:' + season + ':' + a) - random(seed, 'event:' + season + ':' + b) || (a < b ? -1 : 1);
    });
    return EVENTS[deck[month % 3]];
  }
  function selectedChoice(state, event) {
    return event.choices.find(function (item) { return item.id === state.eventChoice; }) || null;
  }
  function effectsFor(event, selected) {
    var effects = { demand: 1, solar: 1, wind: 1, risk: 1, wear: 1, shift: 0, daytimeLoad: 0, storm: false };
    [event.effects, selected ? selected.effects : {}].forEach(function (source) {
      Object.keys(source).forEach(function (key) {
        if (key === 'storm') effects[key] = source[key];
        else if (key === 'shift' || key === 'daytimeLoad') effects[key] += source[key];
        else effects[key] *= source[key];
      });
    });
    return effects;
  }
  function create(seed) {
    var normalized = seed == null ? 'NORTH-HARBOR' : String(seed).trim().slice(0, 64);
    if (!normalized) normalized = 'NORTH-HARBOR';
    return {
      version: VERSION, seed: normalized, month: 0, phase: 'planning', cash: 68000, trust: INITIAL_TRUST,
      assets: SITES.slice(0, 3).map(function (site) {
        return { id: 'asset-' + site.id, type: site.type, siteId: site.id, condition: 100,
          readyMonth: 0, serviceMonth: null, fault: false, stored: 0 };
      }),
      policy: { reserve: 0.15, flex: false }, eventChoice: null, history: [], lastRun: null, outcome: null
    };
  }
  function annualCoverage(state) {
    var served = 0, demand = 0;
    state.history.forEach(function (entry) { served += entry.totals.served; demand += entry.totals.demand; });
    return demand ? served / demand : 0;
  }
  function outlook(state) {
    var active = state.phase === 'planning';
    var event = active ? eventFor(state.seed, state.month) : null;
    return {
      month: state.month, monthName: active ? MONTHS[state.month] : 'Campaign ended', days: active ? DAYS[state.month] : 0,
      event: event ? copy(event) : null,
      sites: SITES.map(function (site) {
        var asset = state.assets.find(function (item) { return item.siteId === site.id; });
        return Object.assign({}, site, { owned: !!asset, available: active && !asset && state.month < 11,
          cost: CATALOG[site.type].cost + site.landCost });
      }),
      goals: copy(GOALS), crewAvailable: active && !state.assets.some(function (asset) { return asset.serviceMonth === state.month; }),
      annualCoverage: annualCoverage(state)
    };
  }
  function weather(state, day, hour, effects) {
    var month = state.month;
    var dayLength = [8.8, 9.8, 11.7, 13.5, 14.8, 15.5, 15.1, 13.9, 12.4, 10.7, 9.2, 8.4][month];
    var sunrise = 12 - dayLength / 2;
    var solarHeight = Math.max(0, Math.sin(Math.PI * (hour + 0.5 - sunrise) / dayLength));
    if (hour + 0.5 < sunrise || hour + 0.5 > sunrise + dayLength) solarHeight = 0;
    var front = random(state.seed, 'front:' + month + ':' + Math.floor(day / 3));
    var cloud = 0.38 + 0.57 * random(state.seed, 'cloud:' + month + ':' + day);
    var seasonalSun = [0.58, 0.68, 0.82, 0.94, 1, 1.04, 1.02, 0.96, 0.84, 0.71, 0.6, 0.54][month];
    var irradiance = clamp(solarHeight * seasonalSun * cloud * effects.solar, 0, 1.05);
    var seasonalWind = [1.14, 1.1, 1.07, 0.99, 0.93, 0.88, 0.86, 0.91, 0.98, 1.06, 1.13, 1.17][month];
    var windSpeed = (4.1 + front * 5.1 + Math.sin((hour + day * 3.2) * 0.37) * 1.25
      + (random(state.seed, 'gust:' + month + ':' + day + ':' + hour) - 0.5) * 1.8) * seasonalWind * effects.wind;
    if (effects.storm && day === 6 && hour >= 8 && hour <= 16) windSpeed += 16;
    return { irradiance: irradiance, sunHeight: solarHeight, windSpeed: clamp(windSpeed, 0, 30) };
  }
  function dailyDemand(state, day, effects) {
    var seasonal = [1.22, 1.17, 1.08, 1, 0.96, 0.97, 1.02, 1.01, 0.98, 1.04, 1.13, 1.21][state.month];
    var daily = 0.96 + 0.08 * random(state.seed, 'demand:' + state.month + ':' + day);
    var hours = [];
    for (var hour = 0; hour < 24; hour += 1) {
      var profile = 0.73 + (hour >= 7 && hour <= 9 ? 0.43 : 0)
        + (hour >= 10 && hour <= 16 ? 0.24 : 0) + (hour >= 17 && hour <= 21 ? 0.72 : 0);
      hours.push(14.5 * seasonal * daily * profile * effects.demand);
    }
    var shift = clamp((state.policy.flex ? 0.22 : 0) + effects.shift, 0, 0.45);
    var shifted = 0;
    for (var evening = 17; evening <= 21; evening += 1) {
      var amount = hours[evening] * shift;
      hours[evening] -= amount;
      shifted += amount;
    }
    for (var noon = 11; noon <= 15; noon += 1) hours[noon] += shifted / 5;
    if (effects.daytimeLoad) {
      var total = hours.reduce(function (sum, value) { return sum + value; }, 0);
      for (var work = 10; work <= 16; work += 1) hours[work] += total * effects.daytimeLoad / 7;
    }
    return hours;
  }
  function windOutput(speed) {
    if (speed < 3 || speed >= 25) return 0;
    if (speed >= 11) return 1;
    return (speed * speed * speed - 27) / (1331 - 27);
  }
  function monthlyFaultRisk(asset, effects) {
    var wear = 1 - asset.condition / 100;
    return clamp((0.008 + 0.72 * wear * wear + (asset.condition < 35 ? 0.1 : 0)) * effects.risk, 0, 0.8);
  }
  function faultSchedule(state, effects, realize) {
    var faults = [];
    state.assets.forEach(function (asset) {
      if (asset.readyMonth > state.month || asset.serviceMonth === state.month) return;
      if (asset.fault) { faults.push({ assetId: asset.id, hour: 0, existing: true }); return; }
      if (!realize) return;
      var chance = monthlyFaultRisk(asset, effects);
      if (random(state.seed, 'fault:' + state.month + ':' + asset.id) < chance) {
        faults.push({ assetId: asset.id, hour: 48 + Math.floor(random(state.seed, 'fault-hour:' + state.month + ':' + asset.id) * (DAYS[state.month] * 24 - 48)), existing: false });
      }
    });
    return faults;
  }
  function dispatchStorage(batteries, stored, throughput, surplus, deficit, essentialGap, reserve) {
    var spec = CATALOG.battery;
    var charge = 0, discharge = 0, loss = 0;
    function deliver(asset, output) {
      stored[asset.id] -= output / DISCHARGE_EFFICIENCY;
      deficit -= output;
      discharge += output;
      loss += output / DISCHARGE_EFFICIENCY - output;
      asset.power += output;
      throughput[asset.id] += output;
    }
    batteries.forEach(function (asset) { asset.power = 0; });
    if (surplus > 0) {
      batteries.forEach(function (asset) {
        var input = Math.min(surplus, spec.power, Math.max(0, spec.capacity - stored[asset.id]) / CHARGE_EFFICIENCY);
        stored[asset.id] += input * CHARGE_EFFICIENCY;
        surplus -= input;
        charge += input;
        loss += input * (1 - CHARGE_EFFICIENCY);
        asset.power = -input;
        throughput[asset.id] += input;
      });
    } else if (deficit > 0) {
      // Exhaust ordinary energy across the whole fleet before releasing any
      // protected reserve. Array order must not bypass another pack's supply.
      batteries.forEach(function (asset) {
        var available = Math.max(0, stored[asset.id] - spec.capacity * reserve) * DISCHARGE_EFFICIENCY;
        deliver(asset, Math.min(deficit, spec.power, available));
      });
      batteries.forEach(function (asset) {
        var remainingEssential = Math.max(0, essentialGap - discharge);
        var headroom = Math.max(0, spec.power - asset.power);
        deliver(asset, Math.min(remainingEssential, headroom, Math.max(0, stored[asset.id]) * DISCHARGE_EFFICIENCY));
      });
    }
    batteries.forEach(function (asset) {
      stored[asset.id] = clamp(stored[asset.id], 0, spec.capacity);
      asset.stored = stored[asset.id];
      asset.status = Math.abs(asset.power) > 0.001 ? 'operating' : 'idle';
    });
    return { charge: charge, discharge: discharge, loss: loss, surplus: surplus, deficit: deficit };
  }
  function simulate(state, realize) {
    var event = eventFor(state.seed, state.month);
    var selected = selectedChoice(state, event);
    var effects = effectsFor(event, selected);
    var faults = faultSchedule(state, effects, realize);
    var stored = {}, throughput = {}, hours = [];
    var totals = { demand: 0, served: 0, unserved: 0, generation: 0, solar: 0, wind: 0,
      charge: 0, discharge: 0, curtailed: 0, storageLoss: 0, initialStored: 0, endStored: 0,
      essentialDemand: 0, essentialServed: 0, coverage: 0, revenue: 0, operatingCost: 0, profit: 0, endingCash: 0 };
    state.assets.forEach(function (asset) {
      stored[asset.id] = asset.stored;
      throughput[asset.id] = 0;
      totals.initialStored += asset.stored;
    });
    for (var day = 0; day < DAYS[state.month]; day += 1) {
      var demandProfile = dailyDemand(state, day, effects);
      for (var hour = 0; hour < 24; hour += 1) {
        var index = day * 24 + hour;
        var resource = weather(state, day, hour, effects);
        var generation = 0, solar = 0, wind = 0, capacity = 0;
        var rows = state.assets.map(function (asset) {
          var spec = CATALOG[asset.type], site = siteById(asset.siteId);
          var building = asset.readyMonth > state.month;
          var service = asset.serviceMonth === state.month && index < SERVICE_HOURS;
          var fault = faults.some(function (item) { return item.assetId === asset.id && index >= item.hour; });
          var condition = asset.serviceMonth === state.month && index >= SERVICE_HOURS ? 100 : asset.condition;
          var available = !building && !service && !fault;
          var output = 0;
          if (available && asset.type === 'solar') output = spec.power * Math.min(1, resource.irradiance * site.resource) * (0.7 + condition * 0.003);
          if (available && asset.type === 'wind') output = spec.power * windOutput(resource.windSpeed * site.resource) * (0.7 + condition * 0.003);
          if (asset.type === 'solar') solar += output;
          if (asset.type === 'wind') wind += output;
          generation += output;
          if (asset.type === 'battery' && !building) capacity += spec.capacity;
          return { id: asset.id, type: asset.type, siteId: asset.siteId, power: output, available: available,
            status: building ? 'building' : service ? 'service' : fault ? 'fault' : output > 0.001 ? 'operating' : 'idle',
            condition: condition, stored: stored[asset.id], capacity: spec.capacity };
        });
        var demand = demandProfile[hour];
        var essential = demand * 0.55;
        var direct = Math.min(generation, demand);
        var deficit = demand - direct, surplus = generation - direct;
        var batteries = rows.filter(function (asset) { return asset.type === 'battery' && asset.available; });
        var dispatch = dispatchStorage(batteries, stored, throughput, surplus, deficit, Math.max(0, essential - direct), state.policy.reserve);
        var charge = dispatch.charge, discharge = dispatch.discharge, loss = dispatch.loss;
        surplus = dispatch.surplus;
        deficit = dispatch.deficit;
        var storedTotal = rows.reduce(function (sum, asset) { return sum + stored[asset.id]; }, 0);
        var served = demand - Math.max(0, deficit);
        var row = { hour: index, day: day + 1, hourOfDay: hour, solar: solar, wind: wind, generation: generation,
          demand: demand, served: served, unserved: Math.max(0, deficit), charge: charge, discharge: discharge,
          curtailed: Math.max(0, surplus), stored: storedTotal, capacity: capacity, storageLoss: loss,
          essentialDemand: essential, essentialServed: Math.min(essential, served), windSpeed: resource.windSpeed,
          irradiance: resource.irradiance, sunHeight: resource.sunHeight, assets: rows };
        ['demand', 'served', 'unserved', 'generation', 'solar', 'wind', 'charge', 'discharge', 'curtailed', 'storageLoss', 'essentialDemand', 'essentialServed'].forEach(function (key) { totals[key] += row[key]; });
        hours.push(row);
      }
    }
    totals.endStored = hours[hours.length - 1].stored;
    totals.coverage = totals.demand ? totals.served / totals.demand : 1;
    totals.revenue = totals.served * TARIFF;
    totals.operatingCost = 300 + (state.policy.flex ? 130 : 0) + totals.unserved * 0.08 + state.assets.reduce(function (sum, asset) {
      return sum + CATALOG[asset.type].monthlyCost * (asset.readyMonth > state.month ? 0.2 : 1);
    }, 0);
    totals.profit = totals.revenue - totals.operatingCost;
    totals.endingCash = state.cash + totals.profit;
    return { hours: hours, totals: totals, faults: faults, month: state.month, monthName: MONTHS[state.month], event: copy(event),
      choice: selected ? copy(selected) : null, forecast: !realize, weatherSummary: 'Seasonal coastal weather; ' + DAYS[state.month] + ' days at hourly resolution.',
      storedByAsset: stored, throughputByAsset: throughput, effects: effects };
  }
  function preview(state) {
    if (state.phase !== 'planning') {
      if (state.lastRun) {
        var replay = simulate(Object.assign({ seed: state.seed }, state.lastRun), true);
        replay.weatherSummary = 'Recorded final month: ' + replay.monthName + '. Campaign ended.';
        return replay;
      }
      var last = state.history[state.history.length - 1];
      return { hours: [], totals: last ? copy(last.totals) : null, faults: [], month: last ? last.month : 0,
        monthName: last ? last.monthName : 'Campaign ended', event: null, choice: null, forecast: false, weatherSummary: 'Campaign ended.' };
    }
    return simulate(state, false);
  }
  // Explain an existing run without simulating again or rolling hidden faults.
  // Hour fields are absolute, zero-based indices in that run. Display thresholds
  // suppress floating-point noise; the underlying energy sums remain unchanged.
  function analyze(run) {
    var summary = { days: [], gapHours: 0, gapHourIndices: [], peakGapHour: null, peakCurtailmentHour: null };
    if (!run || !Array.isArray(run.hours) || !run.hours.length) return summary;
    var energyKeys = ['demand', 'served', 'unserved', 'generation', 'solar', 'wind',
      'charge', 'discharge', 'curtailed', 'storageLoss'];
    var priorStored = run.totals && finite(run.totals.initialStored, 0, 1000000) ? run.totals.initialStored : 0;
    var peakGap = 0.001, peakCurtailment = 0.001;
    var day = null, dayPeakGap = 0.001, dayPeakCurtailment = 0.001;
    run.hours.forEach(function (row) {
      if (!day || day.day !== row.day) {
        day = { day: row.day, hours: 0, initialStored: priorStored, endStored: priorStored,
          coverage: 1, gapHours: 0, peakGapHour: null, peakCurtailmentHour: null };
        energyKeys.forEach(function (key) { day[key] = 0; });
        summary.days.push(day);
        dayPeakGap = 0.001;
        dayPeakCurtailment = 0.001;
      }
      day.hours += 1;
      energyKeys.forEach(function (key) { day[key] += row[key]; });
      day.endStored = row.stored;
      day.coverage = day.demand ? day.served / day.demand : 1;
      priorStored = row.stored;
      if (row.unserved > 0.001) {
        day.gapHours += 1;
        summary.gapHours += 1;
        summary.gapHourIndices.push(row.hour);
      }
      if (row.unserved > dayPeakGap) { dayPeakGap = row.unserved; day.peakGapHour = row.hour; }
      if (row.unserved > peakGap) { peakGap = row.unserved; summary.peakGapHour = row.hour; }
      if (row.curtailed > dayPeakCurtailment) { dayPeakCurtailment = row.curtailed; day.peakCurtailmentHour = row.hour; }
      if (row.curtailed > peakCurtailment) { peakCurtailment = row.curtailed; summary.peakCurtailmentHour = row.hour; }
    });
    return summary;
  }
  // Advice uses only the current plan and its publicly known event. The 78%
  // condition threshold is a planning cue, not an additional simulation rule.
  // In particular, this never asks whether a seeded future fault will occur.
  function fleet(state) {
    if (!state || !Array.isArray(state.assets) || !integer(state.month, 0, 12)
      || !finite(state.cash, -1000000, 10000000) || state.assets.some(function (asset) {
        return !asset || !siteById(asset.siteId) || !CATALOG[asset.type] || !finite(asset.condition, 0, 100);
      })) return { active: false, crewAvailable: false, crewAssetId: null, serviceHours: SERVICE_HOURS,
        serviceThreshold: 78, eventId: null, choiceId: null, riskMultiplier: null, assets: [] };
    var active = state.phase === 'planning';
    var event = active ? eventFor(state.seed, state.month) : null;
    var selected = event ? selectedChoice(state, event) : null;
    var effects = event ? effectsFor(event, selected) : null;
    var crew = active ? state.assets.find(function (asset) { return asset.serviceMonth === state.month; }) : null;
    var priorities = { fault: 0, worn: 1, service: 2, building: 3, ready: 4 };
    return { active: active, crewAvailable: active && !crew, crewAssetId: crew ? crew.id : null,
      serviceHours: SERVICE_HOURS, serviceThreshold: 78, eventId: event ? event.id : null,
      choiceId: selected ? selected.id : null, riskMultiplier: effects ? effects.risk : null,
      assets: state.assets.map(function (asset) {
        var building = asset.readyMonth > state.month;
        var scheduled = active && asset.serviceMonth === state.month;
        var spec = CATALOG[asset.type], site = siteById(asset.siteId);
        var status = building ? 'building' : scheduled ? 'service' : asset.fault ? 'fault' : asset.condition < 78 ? 'worn' : 'ready';
        var block = !active ? 'ended' : building ? 'building' : scheduled ? 'scheduled' : crew ? 'booked' : state.cash < spec.serviceCost ? 'cash' : null;
        return { id: asset.id, siteId: asset.siteId, name: site.name, type: asset.type,
          status: status, priority: priorities[status], condition: asset.condition, readyMonth: asset.readyMonth,
          serviceCost: spec.serviceCost, canService: block === null, serviceBlock: block,
          outputFactor: asset.type === 'battery' ? null : 0.7 + asset.condition * 0.003,
          faultRisk: active && !building && !scheduled && !asset.fault ? monthlyFaultRisk(asset, effects) : null };
      }).sort(function (a, b) {
        return a.priority - b.priority || a.condition - b.condition || (a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0);
      }) };
  }
  // Compare a service booking with the current plan before spending any cash.
  // Both runs are forecasts: known faults are included, hidden new faults are
  // never realized. The proposed ending cash includes the service fee once.
  function servicePlan(state, assetId) {
    var advice = fleet(state);
    var row = advice.assets.find(function (asset) { return asset.id === assetId; });
    var asset = row ? state.assets.find(function (item) { return item.id === assetId; }) : null;
    var plan = { assetId: typeof assetId === 'string' ? assetId : null,
      siteId: row ? row.siteId : null, name: row ? row.name : null, type: row ? row.type : null,
      eligible: !!row && row.canService, serviceBlock: row ? row.serviceBlock : 'unknown',
      serviceCost: row ? row.serviceCost : null, serviceHours: SERVICE_HOURS, returnHour: SERVICE_HOURS,
      conditionBefore: row ? row.condition : null, conditionAfterService: row ? 100 : null,
      repairsFault: !!asset && asset.fault, faultRiskBefore: row ? row.faultRisk : null,
      faultRiskAfter: row && row.canService ? 0 : null,
      current: null, proposed: null, delta: null, outage: null };
    if (!plan.eligible) return plan;
    var current = preview(state);
    var proposed = preview(apply(state, { type: 'service', assetId: assetId }));
    var keys = ['coverage', 'served', 'unserved', 'generation', 'endingCash'];
    plan.current = {};
    plan.proposed = {};
    plan.delta = {};
    keys.forEach(function (key) {
      plan.current[key] = current.totals[key];
      plan.proposed[key] = proposed.totals[key];
      plan.delta[key] = proposed.totals[key] - current.totals[key];
    });
    function firstHours(run) {
      var summary = { demand: 0, served: 0, unserved: 0, generation: 0, coverage: 1 };
      run.hours.slice(0, SERVICE_HOURS).forEach(function (hour) {
        ['demand', 'served', 'unserved', 'generation'].forEach(function (key) { summary[key] += hour[key]; });
      });
      summary.coverage = summary.demand ? summary.served / summary.demand : 1;
      return summary;
    }
    var currentOutage = firstHours(current), proposedOutage = firstHours(proposed), outageDelta = {};
    Object.keys(currentOutage).forEach(function (key) { outageDelta[key] = proposedOutage[key] - currentOutage[key]; });
    plan.outage = { hours: SERVICE_HOURS, current: currentOutage, proposed: proposedOutage, delta: outageDelta };
    return plan;
  }
  // Compare a real construction booking and a separate commissioned-now study.
  // The study reuses only this month's known conditions; it is not a forecast
  // of next month's event, weather, faults, or cash balance.
  function acquisitionPlan(state, siteId) {
    var site = siteById(siteId), spec = site && CATALOG[site.type];
    var valid = !!state && Array.isArray(state.assets) && integer(state.month, 0, 12)
      && finite(state.cash, -1000000, 10000000);
    var owned = valid && site && state.assets.some(function (asset) { return asset && asset.siteId === site.id; });
    var totalCost = spec ? spec.cost + site.landCost : null;
    var block = !site || !valid ? 'unknown' : owned ? 'owned' : state.phase !== 'planning' ? 'ended'
      : state.month >= 11 ? 'late' : state.cash < totalCost ? 'cash' : null;
    var readyMonth = valid && state.month < 11 ? state.month + 1 : null;
    var plan = { siteId: site ? site.id : typeof siteId === 'string' ? siteId : null,
      name: site ? site.name : null, type: site ? site.type : null, eligible: block === null, acquisitionBlock: block,
      equipmentCost: spec ? spec.cost : null, landCost: site ? site.landCost : null, totalCost: totalCost,
      monthlyCost: spec ? spec.monthlyCost : null, constructionCost: spec ? spec.monthlyCost * 0.2 : null,
      readyMonth: site && readyMonth !== null ? readyMonth : null,
      readyMonthName: site && readyMonth !== null ? MONTHS[readyMonth] : null,
      cashAfterPurchase: site && valid ? state.cash - totalCost : null, currentMonth: null, study: null };
    if (!plan.eligible) return plan;
    var current = preview(state);
    var purchased = apply(state, { type: 'buy', siteId: site.id });
    var construction = preview(purchased);
    function compare(first, second, keys) {
      var comparison = { current: {}, proposed: {}, delta: {} };
      keys.forEach(function (key) {
        comparison.current[key] = first.totals[key];
        comparison.proposed[key] = second.totals[key];
        comparison.delta[key] = second.totals[key] - first.totals[key];
      });
      return comparison;
    }
    plan.currentMonth = compare(current, construction, ['coverage', 'unserved', 'generation', 'endingCash', 'operatingCost', 'revenue']);
    // apply() returned a detached copy. Only the new candidate is commissioned
    // early in this temporary study; all other bookings retain their timing.
    var candidate = purchased.assets.find(function (asset) { return asset.siteId === site.id; });
    candidate.readyMonth = state.month;
    var commissioned = preview(purchased);
    plan.study = compare(current, commissioned, ['coverage', 'served', 'unserved', 'generation', 'charge', 'discharge', 'curtailed', 'revenue', 'operatingCost', 'profit']);
    plan.study.candidate = { generation: 0, charge: 0, discharge: 0 };
    commissioned.hours.forEach(function (hour) {
      var row = hour.assets.find(function (asset) { return asset.id === candidate.id; });
      if (candidate.type === 'battery') {
        if (row.power < 0) plan.study.candidate.charge -= row.power;
        else plan.study.candidate.discharge += row.power;
      } else plan.study.candidate.generation += row.power;
    });
    return plan;
  }
  var OPERATING_TITLES = { building: 'Under construction', service: 'Service outage', fault: 'Fault isolation',
    darkness: 'No daylight', 'solar-output': 'Solar generation', 'wind-calm': 'Below cut-in speed',
    'wind-cutout': 'High-wind shutdown', 'wind-output': 'Wind in operating range',
    charging: 'Charging from the network', discharging: 'Supplying the network', empty: 'Store empty',
    reserve: 'Holding protected reserve', full: 'Store full', standby: 'Available on standby' };
  function equipmentPolicy(state, run) {
    return !run.forecast && state.lastRun && state.lastRun.month === run.month ? state.lastRun.policy : state.policy;
  }
  function operatingReason(at, equipment, site, reserve) {
    var epsilon = 0.001;
    if (equipment.status === 'building' || equipment.status === 'service' || equipment.status === 'fault') return equipment.status;
    if (equipment.type === 'solar') return at.irradiance <= 0 && !(at.sunHeight > 0) ? 'darkness' : 'solar-output';
    if (equipment.type === 'wind') {
      var speed = at.windSpeed * site.resource;
      return speed < 3 ? 'wind-calm' : speed >= 25 ? 'wind-cutout' : 'wind-output';
    }
    if (equipment.power < -epsilon) return 'charging';
    if (equipment.power > epsilon) return 'discharging';
    if (equipment.stored <= epsilon) return 'empty';
    if (equipment.stored >= equipment.capacity - epsilon) return 'full';
    // The reserve explains this idle pack only when a nonessential gap is
    // actually left. Another pack meeting demand is ordinary standby here.
    if (reserve > 0 && equipment.stored <= equipment.capacity * reserve + epsilon
      && at.unserved > epsilon && at.essentialServed >= at.essentialDemand - epsilon) return 'reserve';
    return 'standby';
  }
  function operatingFlow(reason, power) {
    return reason === 'building' || reason === 'service' || reason === 'fault' ? 'isolated'
      : power < -0.001 ? 'charge' : power > 0.001 ? 'export' : 'idle';
  }
  // Inspect already-computed hourly frames. This never runs the simulation or
  // samples a fault; recorded frame status outranks the campaign's ending state.
  function inspect(state, run, assetId, hour) {
    if (!state || !run || !Array.isArray(run.hours) || typeof run.forecast !== 'boolean'
      || typeof assetId !== 'string' || !integer(hour, 0, 1000000)) return null;
    var frame = run.hours.find(function (item) { return item && item.hour === hour; });
    var asset = frame && Array.isArray(frame.assets) && frame.assets.find(function (item) { return item && item.id === assetId; });
    var site = asset && siteById(asset.siteId);
    if (!asset || !site || !CATALOG[asset.type] || asset.type !== site.type
      || !finite(asset.power, -1000000, 1000000) || !finite(asset.condition, 0, 100)) return null;
    var policy = equipmentPolicy(state, run);
    if (!policy || !finite(policy.reserve, 0, 0.5)) return null;
    var reserve = policy.reserve;
    var reason = operatingReason(frame, asset, site, reserve);
    var details = {
      building: 'Construction isolates this equipment from the network. It cannot generate or exchange electricity at this hour.',
      service: 'The crew keeps this equipment offline for the first 48 hours. It returns at 00:00 on day 3 with restored condition.',
      fault: run.forecast ? 'A known fault isolates this equipment, so electrical output is zero. A service booking is needed to repair it.'
        : 'A fault disconnected this equipment at the selected replay hour. Electrical output is zero in the recorded result.',
      darkness: 'The sun is below the horizon. The panels cannot generate electricity without daylight.',
      'solar-output': 'Sunlight, cloud cover, site resource, and equipment condition determine this array\'s generation.',
      'wind-calm': 'Wind at this turbine is below the 3 m/s cut-in speed, so it produces no electricity.',
      'wind-cutout': 'Wind at this turbine has reached the 25 m/s cut-out threshold. The turbine shuts down to protect its equipment.',
      'wind-output': 'Wind is within the operating range. Generation follows the turbine power curve and equipment condition; rated output is reached at 11 m/s before condition losses.',
      charging: 'This pack absorbs surplus renewable generation. Stored energy is shown after this hour\'s charging losses.',
      discharging: 'This pack supplies the network within its power and energy limits. Protected reserve can also supply remaining essential demand.',
      empty: 'No usable energy remains at the end of this hour. This pack must charge before it can supply more electricity.',
      reserve: 'This idle pack retains protected energy while some nonessential demand is unserved. Reserve can still be released for remaining essential demand.',
      full: 'This pack is full at the end of the hour. It remains available to discharge when the operating plan needs its energy.',
      standby: 'This pack is available but is not exchanging electricity at this hour. Dispatch depends on generation, demand, and energy available across the battery fleet.'
    };
    var readings;
    if (asset.type === 'solar') readings = [
      { id: 'irradiance', label: 'Sunlight at site', value: frame.irradiance * site.resource * 100, unit: '% reference' },
      { id: 'rated-power', label: 'Rated power', value: CATALOG.solar.power, unit: 'kW' },
      { id: 'output-factor', label: 'Condition output factor', value: (0.7 + asset.condition * 0.003) * 100, unit: '%' }
    ];
    else if (asset.type === 'wind') readings = [
      { id: 'wind-speed', label: 'Wind at turbine', value: frame.windSpeed * site.resource, unit: 'm/s' },
      { id: 'cut-in', label: 'Cut-in speed', value: 3, unit: 'm/s' },
      { id: 'cut-out', label: 'Cut-out speed', value: 25, unit: 'm/s' }
    ];
    else readings = [
      { id: 'stored', label: 'Stored energy (end of hour)', value: asset.stored, unit: 'kWh' },
      { id: 'reserve', label: 'Protected reserve floor', value: asset.capacity * reserve, unit: 'kWh' },
      { id: 'power-limit', label: 'Charge/discharge limit', value: CATALOG.battery.power, unit: 'kW' }
    ];
    if (readings.some(function (reading) { return !Number.isFinite(reading.value); })) return null;
    var next = null, nextReason = null;
    run.hours.forEach(function (later) {
      if (!later || later.hour <= hour || next !== null && later.hour >= next || !Array.isArray(later.assets)) return;
      var laterAsset = later.assets.find(function (item) { return item && item.id === assetId; });
      if (!laterAsset) return;
      var laterReason = operatingReason(later, laterAsset, site, reserve);
      if (laterReason !== reason) { next = later.hour; nextReason = laterReason; }
    });
    var nextLabels = { building: 'Next construction hour', service: 'Next service hour', fault: 'Next fault hour',
      darkness: 'Next dark hour', 'solar-output': 'Next solar-generation hour', 'wind-calm': 'Next calm hour',
      'wind-cutout': 'Next high-wind shutdown', 'wind-output': 'Next wind-generation hour', charging: 'Next charging hour',
      discharging: 'Next discharging hour', empty: 'Next empty-storage hour', reserve: 'Next reserve-holding hour',
      full: 'Next full-storage hour', standby: 'Next standby hour' };
    return { assetId: asset.id, siteId: asset.siteId, type: asset.type, hour: frame.hour,
      context: run.forecast ? 'forecast' : 'replay', status: asset.status, available: !!asset.available,
      reason: reason, title: OPERATING_TITLES[reason], detail: details[reason], power: asset.power, condition: asset.condition,
      flow: operatingFlow(reason, asset.power),
      readings: readings, nextChangeHour: next,
      nextChangeLabel: nextReason ? reason === 'service' ? 'Inspect return to service' : nextLabels[nextReason] : null };
  }
  // Read one complete calendar day from the supplied forecast or replay. Power
  // and hourly energy come directly from its frames; this never reruns dispatch.
  function equipmentDay(state, run, assetId, hour) {
    if (!state || !Array.isArray(state.assets) || !run || !integer(run.month, 0, 11)
      || typeof run.forecast !== 'boolean' || !Array.isArray(run.hours) || typeof assetId !== 'string'
      || !integer(hour, 0, DAYS[run.month] * 24 - 1)) return null;
    var owned = state.assets.filter(function (item) { return item && item.id === assetId; });
    var original = owned[0], site = original && siteById(original.siteId), spec = original && CATALOG[original.type];
    var policy = equipmentPolicy(state, run);
    if (owned.length !== 1 || !site || !spec || original.type !== site.type
      || !policy || !finite(policy.reserve, 0, 0.5)) return null;
    var start = Math.floor(hour / 24) * 24, end = start + 23;
    var frames = run.hours.filter(function (frame) { return frame && frame.hour >= start && frame.hour <= end; });
    if (frames.length !== 24) return null;
    var result = { assetId: assetId, siteId: site.id, type: original.type, context: run.forecast ? 'forecast' : 'replay',
      month: run.month, day: start / 24 + 1, startHour: start, endHour: end, ratedPower: spec.power, rows: [],
      totals: { generation: 0, charge: 0, discharge: 0, idleHours: 0, isolatedHours: 0 } };
    for (var index = 0; index < 24; index += 1) {
      var frame = frames[index];
      if (frame.hour !== start + index || frame.hourOfDay !== index || frame.day !== result.day
        || !Array.isArray(frame.assets)) return null;
      var matches = frame.assets.filter(function (item) { return item && item.id === assetId; });
      var equipment = matches[0];
      if (matches.length !== 1 || equipment.siteId !== site.id || equipment.type !== original.type
        || typeof equipment.available !== 'boolean' || !finite(equipment.condition, 0, 100)
        || !finite(equipment.power, original.type === 'battery' ? -spec.power : 0, spec.power)) return null;
      if (equipment.available) {
        if (equipment.status !== (Math.abs(equipment.power) > 0.001 ? 'operating' : 'idle')) return null;
      } else if (!['building', 'service', 'fault'].includes(equipment.status) || equipment.power !== 0) return null;
      if (original.type === 'solar' && (!finite(frame.irradiance, 0, 1.05) || !finite(frame.sunHeight, 0, 1))) return null;
      if (original.type === 'wind' && !finite(frame.windSpeed, 0, 30)) return null;
      if (original.type === 'battery' && (equipment.capacity !== spec.capacity || !finite(equipment.stored, 0, spec.capacity)
        || !finite(frame.unserved, 0, 1000000) || !finite(frame.essentialDemand, 0, 1000000)
        || !finite(frame.essentialServed, 0, frame.essentialDemand))) return null;
      var reason = operatingReason(frame, equipment, site, policy.reserve);
      var flow = operatingFlow(reason, equipment.power);
      var row = { hour: frame.hour, hourOfDay: frame.hourOfDay, power: equipment.power, status: equipment.status,
        available: equipment.available, reason: reason, title: OPERATING_TITLES[reason], flow: flow };
      if (original.type === 'battery') {
        row.stored = equipment.stored; row.capacity = equipment.capacity;
        if (equipment.power < 0) result.totals.charge -= equipment.power;
        else result.totals.discharge += equipment.power;
      } else result.totals.generation += equipment.power;
      if (flow === 'idle') result.totals.idleHours += 1;
      if (flow === 'isolated') result.totals.isolatedHours += 1;
      result.rows.push(row);
    }
    return result;
  }
  // Summarize one piece of equipment from the supplied hourly record. This is
  // deliberately independent of simulation and includes available idle hours.
  function equipmentRecord(state, run, assetId) {
    if (!state || !Array.isArray(state.assets) || !Array.isArray(state.history)
      || !integer(state.month, 0, 12) || !run || !integer(run.month, 0, 11)
      || typeof run.forecast !== 'boolean' || !Array.isArray(run.hours) || run.hours.length !== DAYS[run.month] * 24
      || typeof assetId !== 'string') return null;
    var asset = state.assets.find(function (item) { return item && item.id === assetId; });
    var site = asset && siteById(asset.siteId);
    if (!site || asset.type !== site.type || !finite(asset.condition, 0, 100)
      || !integer(asset.readyMonth, 0, 11)) return null;
    var record = { assetId: asset.id, siteId: asset.siteId, name: site.name, type: asset.type,
      context: run.forecast ? 'forecast' : 'replay', month: run.month, monthName: MONTHS[run.month],
      hours: run.hours.length, availableHours: 0, serviceHours: 0, faultHours: 0, constructionHours: 0,
      generation: 0, charge: 0, discharge: 0, segments: [], conditionHistory: [], currentCondition: asset.condition };
    for (var i = 0; i < run.hours.length; i += 1) {
      var frame = run.hours[i];
      if (!frame || frame.hour !== i || !Array.isArray(frame.assets)) return null;
      var rows = frame.assets.filter(function (item) { return item && item.id === assetId; });
      if (rows.length !== 1) return null;
      var row = rows[0];
      if (row.siteId !== asset.siteId || row.type !== asset.type || typeof row.available !== 'boolean'
        || !finite(row.power, -CATALOG[asset.type].power, CATALOG[asset.type].power)) return null;
      var status;
      if (row.available && (row.status === 'operating' || row.status === 'idle')) status = 'available';
      else if (!row.available && ['service', 'fault', 'building'].includes(row.status) && row.power === 0) status = row.status;
      else return null;
      var count = { available: 'availableHours', service: 'serviceHours', fault: 'faultHours', building: 'constructionHours' }[status];
      record[count] += 1;
      if (asset.type === 'battery') {
        if (row.power < 0) record.charge -= row.power;
        else record.discharge += row.power;
      } else {
        if (row.power < 0) return null;
        record.generation += row.power;
      }
      var segment = record.segments[record.segments.length - 1];
      if (segment && segment.status === status) segment.endHour = frame.hour + 1;
      else record.segments.push({ startHour: frame.hour, endHour: frame.hour + 1, status: status });
    }
    for (var h = 0; h < state.history.length; h += 1) {
      var entry = state.history[h];
      if (!entry || !integer(entry.month, 0, 11)) return null;
      // Construction and any later/current unsolved month are not condition
      // observations. Missing older asset records remain missing, not inferred.
      if (entry.month < asset.readyMonth || entry.month >= state.month || entry.month > run.month) continue;
      if (!Array.isArray(entry.conditionByAsset)) continue;
      var observations = entry.conditionByAsset.filter(function (item) { return item && item.id === assetId; });
      if (!observations.length) continue;
      if (observations.length !== 1 || !finite(observations[0].condition, 0, 100) || typeof observations[0].fault !== 'boolean') return null;
      record.conditionHistory.push({ month: entry.month, monthName: MONTHS[entry.month],
        condition: observations[0].condition, fault: observations[0].fault });
    }
    return record;
  }
  // Explain the existing one-hour dispatch without simulating or resampling it.
  // Each battery's opening energy comes from its own preceding frame (or the
  // original planning/replay input at hour zero), never from a fleet average.
  function dispatchBalance(state, run, hour) {
    if (!state || !run || !integer(run.month, 0, 11) || typeof run.forecast !== 'boolean'
      || !integer(hour, 0, DAYS[run.month] * 24 - 1) || !Array.isArray(run.hours)
      || run.hours.length !== DAYS[run.month] * 24) return null;
    var source = run.forecast ? state : state.lastRun;
    if (!source || source.month !== run.month || !Array.isArray(source.assets) || !source.policy
      || !finite(source.policy.reserve, 0, 0.5)) return null;
    var frame = run.hours[hour], prior = hour ? run.hours[hour - 1] : null;
    if (!frame || frame.hour !== hour || !Array.isArray(frame.assets) || frame.assets.length !== source.assets.length
      || hour && (!prior || prior.hour !== hour - 1 || !Array.isArray(prior.assets))) return null;
    var keys = ['generation', 'charge', 'discharge', 'served', 'unserved', 'curtailed', 'demand', 'essentialDemand', 'essentialServed'];
    if (keys.some(function (key) { return !finite(frame[key], 0, 1000000); }) || !finite(frame.storageLoss, 0, 1000000)
      || !finite(frame.stored, 0, 1000000)) return null;
    var grid = { directToLoad: Math.min(frame.generation, frame.demand) };
    keys.forEach(function (key) { grid[key] = frame[key]; });
    var storage = { start: 0, end: 0, loss: frame.storageLoss }, batteries = [], seen = {};
    var tolerance = 0.000001, totalCharge = 0, totalDischarge = 0, totalLoss = 0, totalGeneration = 0;
    for (var i = 0; i < frame.assets.length; i += 1) {
      var row = frame.assets[i], original = row && source.assets.find(function (item) { return item && item.id === row.id; });
      var site = original && siteById(original.siteId);
      if (!row || !original || !site || seen[row.id] || row.type !== original.type || row.siteId !== original.siteId
        || row.type !== site.type || typeof row.available !== 'boolean'
        || !finite(row.power, -CATALOG[row.type].power, CATALOG[row.type].power)) return null;
      seen[row.id] = true;
      if (row.available ? !['operating', 'idle'].includes(row.status)
        : !['building', 'service', 'fault'].includes(row.status) || row.power !== 0) return null;
      if (row.type !== 'battery') {
        if (row.power < 0) return null;
        totalGeneration += row.power;
        continue;
      }
      var preceding = prior ? prior.assets.filter(function (item) { return item && item.id === row.id; }) : [original];
      if (preceding.length !== 1 || !finite(row.capacity, 0, CATALOG.battery.capacity) || row.capacity !== CATALOG.battery.capacity
        || !finite(preceding[0].stored, 0, row.capacity) || !finite(row.stored, 0, row.capacity)) return null;
      var start = preceding[0].stored, end = row.stored;
      var charge = Math.max(0, -row.power), discharge = Math.max(0, row.power);
      var loss = charge * (1 - CHARGE_EFFICIENCY) + discharge / DISCHARGE_EFFICIENCY - discharge;
      // Only ordinary energy that this pack actually delivered counts here.
      // The remainder is delivered from protected reserve for essential needs.
      var floor = row.capacity * source.policy.reserve;
      var ordinary = Math.min(discharge, Math.max(0, start - floor) * DISCHARGE_EFFICIENCY);
      if (Math.abs(start + charge - discharge - loss - end) > tolerance) return null;
      batteries.push({ assetId: row.id, siteId: row.siteId, name: site.name, available: row.available, status: row.status,
        startStored: start, endStored: end, capacity: row.capacity, charge: charge, discharge: discharge,
        loss: loss, reserveFloor: floor, ordinaryDischarge: ordinary, reserveDischarge: Math.max(0, discharge - ordinary) });
      storage.start += start; storage.end += end;
      totalCharge += charge; totalDischarge += discharge; totalLoss += loss;
    }
    if (Math.abs(totalGeneration - grid.generation) > tolerance || Math.abs(totalCharge - grid.charge) > tolerance
      || Math.abs(totalDischarge - grid.discharge) > tolerance || Math.abs(totalLoss - storage.loss) > tolerance
      || Math.abs(storage.end - frame.stored) > tolerance
      || Math.abs(grid.generation + grid.discharge - grid.served - grid.charge - grid.curtailed) > tolerance
      || Math.abs(grid.served + grid.unserved - grid.demand) > tolerance
      || Math.abs(storage.start + grid.charge - grid.discharge - storage.loss - storage.end) > tolerance) return null;
    return { hour: hour, context: run.forecast ? 'forecast' : 'replay', grid: grid, storage: storage, batteries: batteries };
  }
  // Identify limits in the supplied dispatch record. Opening energy determines
  // each storage ceiling; a limit is called binding only while the network has
  // a remaining shortage or surplus. No alternative dispatch is simulated.
  function equipmentLimits(state, run, assetId, hour) {
    if (typeof assetId !== 'string') return null;
    var epsilon = 0.000001;
    function at(index) {
      var balance = dispatchBalance(state, run, index);
      if (!balance) return null;
      var frame = run.hours[index];
      var row = frame.assets.find(function (item) { return item.id === assetId; });
      var site = row && siteById(row.siteId), spec = row && CATALOG[row.type];
      if (!row || !site || !spec || !finite(row.condition, 0, 100)) return null;
      var pressure = balance.grid.unserved > epsilon ? 'shortage' : balance.grid.curtailed > epsilon ? 'surplus' : 'balanced';
      var result = { assetId: row.id, siteId: row.siteId, type: row.type, hour: index,
        context: balance.context, status: row.status, available: row.available, pressure: pressure,
        binding: [], actualPower: row.power, ratedPower: spec.power, generation: null, storage: null, nextConstrainedHour: null };
      if (row.type === 'battery') {
        var pack = balance.batteries.find(function (item) { return item.assetId === assetId; });
        if (!pack) return null;
        // With one-hour frames, these energy-derived ceilings are average grid
        // kW. They are physical bounds, not a promise of dispatch under reserve.
        result.storage = { startStored: pack.startStored, endStored: pack.endStored, capacity: pack.capacity,
          reserveFloor: pack.reserveFloor, chargePowerLimit: spec.power,
          chargeEnergyLimit: Math.max(0, pack.capacity - pack.startStored) / CHARGE_EFFICIENCY,
          dischargePowerLimit: spec.power, dischargeEnergyLimit: pack.startStored * DISCHARGE_EFFICIENCY,
          ordinaryEnergyLimit: Math.max(0, pack.startStored - pack.reserveFloor) * DISCHARGE_EFFICIENCY,
          actualCharge: pack.charge, actualDischarge: pack.discharge };
        if (pressure !== 'balanced' && !row.available) result.binding.push(row.status);
        else if (pressure === 'shortage') {
          if (pack.discharge >= spec.power - epsilon) result.binding.push('converter');
          if (pack.endStored <= epsilon) result.binding.push('empty');
          else if (pack.reserveFloor > epsilon && pack.endStored <= pack.reserveFloor + epsilon
            && balance.grid.essentialServed >= balance.grid.essentialDemand - epsilon) result.binding.push('reserve');
        } else if (pressure === 'surplus') {
          if (pack.charge >= spec.power - epsilon) result.binding.push('converter');
          if (pack.endStored >= pack.capacity - epsilon) result.binding.push('full');
        }
      } else {
        if (!finite(frame.irradiance, 0, 1.05) || !finite(frame.windSpeed, 0, 30)) return null;
        var local = (row.type === 'solar' ? frame.irradiance : frame.windSpeed) * site.resource;
        var resource = spec.power * (row.type === 'solar' ? Math.min(1, local) : windOutput(local));
        var conditionLoss = resource * (1 - (0.7 + row.condition * 0.003));
        var isolationLoss = row.available ? 0 : resource - conditionLoss;
        if (Math.abs(resource - conditionLoss - isolationLoss - row.power) > epsilon) return null;
        result.generation = { resourcePower: resource, conditionLoss: conditionLoss, isolationLoss: isolationLoss,
          actualPower: row.power, resourceKind: row.type === 'solar' ? 'irradiance' : 'wind-speed', localResource: local };
        if (pressure === 'shortage') {
          if (resource < spec.power - epsilon) result.binding.push('resource');
          if (conditionLoss > epsilon) result.binding.push('condition');
          if (!row.available) result.binding.push(row.status);
        }
      }
      return result;
    }
    var result = at(hour);
    if (!result) return null;
    for (var later = hour + 1; later < run.hours.length; later += 1) {
      var candidate = at(later);
      if (!candidate) return null;
      if (candidate.binding.length) { result.nextConstrainedHour = later; break; }
    }
    return result;
  }
  // Explain only recorded consequences. Current-month purchases, event choices,
  // service bookings, or trust changes must not rewrite last month's account.
  function recap(state) {
    if (!state || !Array.isArray(state.history) || !Array.isArray(state.assets)) return null;
    var entry = state.history[state.history.length - 1], snapshot = state.lastRun;
    if (!entry || !snapshot || snapshot.month !== entry.month || !integer(entry.month, 0, 11)
      || !Array.isArray(entry.faults) || !Array.isArray(entry.conditionByAsset) || !entry.totals
      || !Array.isArray(snapshot.assets) || !snapshot.policy || !finite(snapshot.trust, 0, 100)
      || !finite(entry.trust, 0, 100) || entry.month && !state.history[entry.month - 1]) return null;
    function detail(asset) {
      var site = siteById(asset.siteId);
      return { id: asset.id, siteId: asset.siteId, name: site ? site.name : 'Unknown equipment', type: asset.type || (site ? site.type : null) };
    }
    function faultDetail(fault) {
      var asset = snapshot.assets.find(function (item) { return item.id === fault.assetId; })
        || state.assets.find(function (item) { return item.id === fault.assetId; })
        || { id: fault.assetId, siteId: String(fault.assetId).replace(/^asset-/, '') };
      return Object.assign(detail(asset), { hour: fault.hour, day: Math.floor(fault.hour / 24) + 1, hourOfDay: fault.hour % 24 });
    }
    var startTrust = entry.month ? state.history[entry.month - 1].trust : INITIAL_TRUST;
    var reliability = reliabilityTrust(entry.totals.coverage);
    var flex = snapshot.policy.flex ? 1 : 0;
    var event = eventFor(state.seed, entry.month);
    var selected = event.choices.find(function (item) { return item.id === entry.choiceId; });
    return { month: entry.month, monthName: entry.monthName, choiceLabel: selected ? selected.label : null,
      newFaults: entry.faults.filter(function (fault) { return !fault.existing; }).map(faultDetail).sort(function (a, b) { return a.hour - b.hour; }),
      existingFaults: entry.faults.filter(function (fault) { return fault.existing; }).map(faultDetail).sort(function (a, b) { return a.hour - b.hour; }),
      serviced: snapshot.assets.filter(function (asset) { return asset.serviceMonth === entry.month; }).map(function (asset) {
        var after = entry.conditionByAsset.find(function (item) { return item.id === asset.id; });
        return Object.assign(detail(asset), { beforeCondition: asset.condition, afterCondition: after ? after.condition : null,
          repaired: asset.fault, serviceHours: SERVICE_HOURS, cost: CATALOG[asset.type].serviceCost });
      }),
      commissioned: snapshot.assets.filter(function (asset) { return asset.readyMonth === entry.month + 1; }).map(function (asset) {
        return Object.assign(detail(asset), { readyMonth: asset.readyMonth, monthName: MONTHS[asset.readyMonth] });
      }),
      trust: { start: startTrust, event: snapshot.trust - startTrust,
        operation: entry.trust - snapshot.trust, end: entry.trust, total: entry.trust - startTrust,
        reliability: reliability, flex: flex,
        clamped: Math.abs(entry.trust - snapshot.trust - reliability - flex) > 0.000001
          || !!selected && Math.abs(snapshot.trust - startTrust - selected.trust) > 0.000001 } };
  }
  function reliabilityTrust(coverage) {
    return coverage >= 0.97 ? 3 : coverage >= 0.9 ? 1 : coverage >= 0.8 ? -3 : -8;
  }
  function outcome(state) {
    var coverage = annualCoverage(state);
    var won = state.month === 12 && state.cash >= GOALS.cash && state.trust >= GOALS.trust && coverage >= GOALS.coverage;
    var reasons = [];
    if (state.cash < GOALS.cash) reasons.push('The cooperative ran out of operating cash.');
    if (coverage < GOALS.coverage) reasons.push('Annual delivered electricity was below the 90% reliability target.');
    if (state.trust < GOALS.trust) reasons.push('Community trust ended below 50.');
    if (won) reasons.push('You met the reliability, community trust, and cash targets across all twelve months.');
    return { won: won, title: won ? 'A resilient renewable cooperative' : state.phase === 'insolvent' ? 'The cooperative needs a fresh start' : 'A year of lessons for North Harbor',
      reasons: reasons, score: Math.round(clamp(coverage * 65 + state.trust * 0.25 + Math.min(10, Math.max(0, state.cash) / 10000), 0, 100)),
      coverage: coverage, trust: state.trust, cash: state.cash };
  }
  function apply(state, action) {
    if (!state || state.phase !== 'planning') throw new Error('This campaign has ended. Start a new campaign to make decisions.');
    if (!action || typeof action.type !== 'string') throw new Error('Choose a valid campaign action.');
    var next = copy(state);
    if (action.type === 'buy') {
      var site = siteById(action.siteId);
      if (!site) throw new Error('Choose an available site.');
      if (next.assets.some(function (asset) { return asset.siteId === site.id; })) throw new Error('The cooperative already owns this site.');
      if (next.month >= 11) throw new Error('Construction takes one month; this site cannot open before the campaign ends.');
      var price = CATALOG[site.type].cost + site.landCost;
      if (next.cash < price) throw new Error('There is not enough cash to acquire and build this site.');
      next.cash -= price;
      next.assets.push({ id: 'asset-' + site.id, type: site.type, siteId: site.id, condition: 100,
        readyMonth: next.month + 1, serviceMonth: null, fault: false, stored: 0 });
    } else if (action.type === 'service') {
      var asset = next.assets.find(function (item) { return item.id === action.assetId; });
      if (!asset) throw new Error('Choose an owned piece of equipment.');
      if (asset.readyMonth > next.month) throw new Error('Equipment under construction cannot be serviced yet.');
      if (next.assets.some(function (item) { return item.serviceMonth === next.month; })) throw new Error('The maintenance crew is already booked this month.');
      var cost = CATALOG[asset.type].serviceCost;
      if (next.cash < cost) throw new Error('There is not enough cash for this service.');
      next.cash -= cost;
      asset.serviceMonth = next.month;
    } else if (action.type === 'policy') {
      if (!finite(action.reserve, 0, 0.5) || typeof action.flex !== 'boolean') throw new Error('Reserve must be between 0% and 50%; flexible demand must be on or off.');
      next.policy = { reserve: action.reserve, flex: action.flex };
    } else if (action.type === 'event') {
      var event = eventFor(next.seed, next.month);
      var selected = event.choices.find(function (item) { return item.id === action.choiceId; });
      if (!selected) throw new Error('Choose one of this month\'s event responses.');
      if (next.eventChoice === selected.id) return next;
      if (next.eventChoice !== null) throw new Error('This month\'s event response is already committed.');
      if (next.cash < selected.cost) throw new Error('There is not enough cash for this event response.');
      next.cash -= selected.cost;
      next.trust = clamp(next.trust + selected.trust, 0, 100);
      next.eventChoice = selected.id;
    } else if (action.type === 'advance') {
      if (next.eventChoice === null) throw new Error('Choose a response to this month\'s event before operating the microgrid.');
      next.lastRun = { month: next.month, cash: next.cash, trust: next.trust, assets: copy(next.assets), policy: copy(next.policy), eventChoice: next.eventChoice };
      var result = simulate(next, true);
      next.cash = result.totals.endingCash;
      var trustChange = reliabilityTrust(result.totals.coverage);
      next.trust = clamp(next.trust + trustChange + (next.policy.flex ? 1 : 0), 0, 100);
      next.assets.forEach(function (item) {
        var serviced = item.serviceMonth === next.month;
        var built = item.readyMonth <= next.month;
        if (built) {
          var base = serviced ? 100 : item.condition;
          var batteryWear = item.type === 'battery' ? result.throughputByAsset[item.id] / (CATALOG.battery.capacity * 100) : 0;
          var wear = (CATALOG[item.type].wear + batteryWear) * result.effects.wear * (serviced ? 1 - SERVICE_HOURS / (DAYS[next.month] * 24) : 1);
          item.condition = clamp(base - wear, 0, 100);
          item.fault = !serviced && result.faults.some(function (fault) { return fault.assetId === item.id; });
        }
        item.stored = result.storedByAsset[item.id];
        item.serviceMonth = null;
      });
      next.history.push({ month: next.month, monthName: MONTHS[next.month], eventId: result.event.id, choiceId: next.eventChoice,
        totals: copy(result.totals), faults: copy(result.faults), trust: next.trust,
        conditionByAsset: next.assets.map(function (item) { return { id: item.id, condition: item.condition, fault: item.fault }; }) });
      next.month += 1;
      next.eventChoice = null;
      if (next.cash < 0) next.phase = 'insolvent';
      else if (next.month === 12) next.phase = 'complete';
      if (next.phase !== 'planning') next.outcome = outcome(next);
    } else {
      throw new Error('Unknown campaign action.');
    }
    return next;
  }

  // Saves are bounded data, not executable instructions. Reject structural or
  // accounting corruption rather than trying to repair it into a different game.
  function restore(raw) {
    try {
      if (typeof raw === 'string') {
        if (raw.length > 120000) return null;
        raw = JSON.parse(raw);
      }
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      if (JSON.stringify(raw).length > 120000) return null;
      if (raw.version !== VERSION || typeof raw.seed !== 'string' || raw.seed.length < 1 || raw.seed.length > 64) return null;
      if (!integer(raw.month, 0, 12) || !['planning', 'complete', 'insolvent'].includes(raw.phase)) return null;
      if (!finite(raw.cash, -1000000, 10000000) || !finite(raw.trust, 0, 100)) return null;
      if (raw.phase === 'planning' && (raw.month >= 12 || raw.cash < 0)) return null;
      if (raw.phase === 'complete' && (raw.month !== 12 || raw.cash < 0)) return null;
      if (raw.phase === 'insolvent' && (raw.month < 1 || raw.cash >= 0)) return null;
      if (!raw.policy || !finite(raw.policy.reserve, 0, 0.5) || typeof raw.policy.flex !== 'boolean') return null;
      if (!Array.isArray(raw.assets) || raw.assets.length < 3 || raw.assets.length > SITES.length) return null;
      var seen = {};
      for (var i = 0; i < raw.assets.length; i += 1) {
        var asset = raw.assets[i], site = siteById(asset.siteId);
        if (!site || seen[site.id] || asset.id !== 'asset-' + site.id || asset.type !== site.type) return null;
        seen[site.id] = true;
        if (!finite(asset.condition, 0, 100) || !integer(asset.readyMonth, 0, Math.min(11, raw.month + 1))) return null;
        if (asset.serviceMonth !== null && (asset.serviceMonth !== raw.month || raw.phase !== 'planning' || asset.readyMonth > raw.month)) return null;
        if (typeof asset.fault !== 'boolean' || !finite(asset.stored, 0, asset.type === 'battery' ? CATALOG.battery.capacity : 0)) return null;
        if (asset.readyMonth > raw.month && (asset.stored !== 0 || asset.fault || asset.condition !== 100)) return null;
      }
      if (SITES.slice(0, 3).some(function (site) { return !seen[site.id]; })) return null;
      if (raw.assets.filter(function (asset) { return asset.serviceMonth === raw.month; }).length > 1) return null;
      if (raw.eventChoice !== null) {
        if (raw.phase !== 'planning' || !eventFor(raw.seed, raw.month).choices.some(function (item) { return item.id === raw.eventChoice; })) return null;
      }
      if (!Array.isArray(raw.history) || raw.history.length !== raw.month) return null;
      for (var h = 0; h < raw.history.length; h += 1) {
        var entry = raw.history[h], expectedEvent = eventFor(raw.seed, h);
        if (!entry || entry.month !== h || entry.monthName !== MONTHS[h] || entry.eventId !== expectedEvent.id) return null;
        if (!expectedEvent.choices.some(function (item) { return item.id === entry.choiceId; })) return null;
        if (!entry.totals || !finite(entry.trust, 0, 100) || !Array.isArray(entry.faults) || entry.faults.length > SITES.length) return null;
        var nonnegative = ['demand', 'served', 'unserved', 'generation', 'solar', 'wind', 'charge', 'discharge', 'curtailed', 'storageLoss', 'initialStored', 'endStored', 'essentialDemand', 'essentialServed', 'revenue', 'operatingCost'];
        if (nonnegative.some(function (key) { return !finite(entry.totals[key], 0, 1000000); })) return null;
        if (!finite(entry.totals.profit, -1000000, 1000000) || !finite(entry.totals.endingCash, -1000000, 10000000) || !finite(entry.totals.coverage, 0, 1)) return null;
        var totals = entry.totals;
        if (Math.abs(totals.served + totals.unserved - totals.demand) > 0.001) return null;
        if (Math.abs(totals.generation + totals.discharge - totals.served - totals.charge - totals.curtailed) > 0.001) return null;
        if (Math.abs(totals.initialStored + totals.charge - totals.discharge - totals.storageLoss - totals.endStored) > 0.001) return null;
        if (Math.abs(totals.served / totals.demand - totals.coverage) > 0.000001) return null;
        if (Math.abs(totals.revenue - totals.served * TARIFF) > 0.001 || Math.abs(totals.profit - totals.revenue + totals.operatingCost) > 0.001) return null;
        if (entry.faults.some(function (fault) { return !fault || !seen[fault.assetId && fault.assetId.replace(/^asset-/, '')] || !integer(fault.hour, 0, DAYS[h] * 24 - 1) || typeof fault.existing !== 'boolean'; })) return null;
        if (!Array.isArray(entry.conditionByAsset) || entry.conditionByAsset.length < 3 || entry.conditionByAsset.length > SITES.length || entry.conditionByAsset.some(function (item) {
          return !item || !seen[item.id && item.id.replace(/^asset-/, '')] || !finite(item.condition, 0, 100) || typeof item.fault !== 'boolean';
        })) return null;
      }
      if (raw.phase === 'planning' && raw.outcome !== null) return null;
      var clean = { version: VERSION, seed: raw.seed, month: raw.month, phase: raw.phase, cash: raw.cash, trust: raw.trust,
        assets: raw.assets.map(function (asset) { return { id: asset.id, type: asset.type, siteId: asset.siteId, condition: asset.condition,
          readyMonth: asset.readyMonth, serviceMonth: asset.serviceMonth, fault: asset.fault, stored: asset.stored }; }),
        policy: { reserve: raw.policy.reserve, flex: raw.policy.flex }, eventChoice: raw.eventChoice,
        history: raw.history.map(function (entry) {
          var totals = {};
          ['demand', 'served', 'unserved', 'generation', 'solar', 'wind', 'charge', 'discharge', 'curtailed', 'storageLoss', 'initialStored', 'endStored', 'essentialDemand', 'essentialServed', 'coverage', 'revenue', 'operatingCost', 'profit', 'endingCash'].forEach(function (key) { totals[key] = entry.totals[key]; });
          return { month: entry.month, monthName: entry.monthName, eventId: entry.eventId, choiceId: entry.choiceId, totals: totals, trust: entry.trust,
            faults: entry.faults.map(function (fault) { return { assetId: fault.assetId, hour: fault.hour, existing: fault.existing }; }),
            conditionByAsset: entry.conditionByAsset.map(function (item) { return { id: item.id, condition: item.condition, fault: item.fault }; }) };
        }), lastRun: null, outcome: null };
      var storedTotal = clean.assets.reduce(function (sum, asset) { return sum + asset.stored; }, 0);
      var expectedStored = clean.month ? clean.history[clean.month - 1].totals.endStored : 0;
      if (Math.abs(storedTotal - expectedStored) > 0.001) return null;
      for (var j = 0; j < clean.history.length; j += 1) {
        var priorStored = j ? clean.history[j - 1].totals.endStored : 0;
        if (Math.abs(clean.history[j].totals.initialStored - priorStored) > 0.001) return null;
      }
      if (clean.month === 0) {
        if (raw.lastRun !== null) return null;
      } else {
        var snapshot = raw.lastRun;
        if (!snapshot || snapshot.month !== clean.month - 1 || !finite(snapshot.cash, 0, 10000000) || !finite(snapshot.trust, 0, 100)) return null;
        if (!snapshot.policy || !finite(snapshot.policy.reserve, 0, 0.5) || typeof snapshot.policy.flex !== 'boolean') return null;
        if (!Array.isArray(snapshot.assets) || snapshot.assets.length < 3 || snapshot.assets.length > clean.assets.length) return null;
        var snapshotSites = {};
        var snapshotAssets = [];
        for (var k = 0; k < snapshot.assets.length; k += 1) {
          var prior = snapshot.assets[k], priorSite = siteById(prior.siteId);
          if (!priorSite || !seen[prior.siteId] || snapshotSites[prior.siteId] || prior.id !== 'asset-' + prior.siteId || prior.type !== priorSite.type) return null;
          snapshotSites[prior.siteId] = true;
          if (!finite(prior.condition, 0, 100) || !integer(prior.readyMonth, 0, Math.min(11, snapshot.month + 1)) || typeof prior.fault !== 'boolean') return null;
          if (!finite(prior.stored, 0, prior.type === 'battery' ? CATALOG.battery.capacity : 0)) return null;
          if (prior.serviceMonth !== null && (prior.serviceMonth !== snapshot.month || prior.readyMonth > snapshot.month)) return null;
          if (prior.readyMonth > snapshot.month && (prior.condition !== 100 || prior.stored !== 0 || prior.fault)) return null;
          snapshotAssets.push({ id: prior.id, type: prior.type, siteId: prior.siteId, condition: prior.condition,
            readyMonth: prior.readyMonth, serviceMonth: prior.serviceMonth, fault: prior.fault, stored: prior.stored });
        }
        if (SITES.slice(0, 3).some(function (site) { return !snapshotSites[site.id]; })) return null;
        if (snapshotAssets.filter(function (asset) { return asset.serviceMonth === snapshot.month; }).length > 1) return null;
        if (!eventFor(clean.seed, snapshot.month).choices.some(function (item) { return item.id === snapshot.eventChoice; })) return null;
        clean.lastRun = { month: snapshot.month, cash: snapshot.cash, trust: snapshot.trust, assets: snapshotAssets,
          policy: { reserve: snapshot.policy.reserve, flex: snapshot.policy.flex }, eventChoice: snapshot.eventChoice };
        var replay = simulate(Object.assign({ seed: clean.seed }, clean.lastRun), true);
        var finalTotals = clean.history[clean.month - 1].totals;
        if (Object.keys(replay.totals).some(function (key) { return Math.abs(replay.totals[key] - finalTotals[key]) > 0.001; })) return null;
      }
      if (clean.phase !== 'planning') clean.outcome = outcome(clean);
      return clean;
    } catch (_) { return null; }
  }

  return Object.freeze({ version: VERSION, create: create, restore: restore, outlook: outlook, apply: apply, preview: preview, analyze: analyze, fleet: fleet, servicePlan: servicePlan, acquisitionPlan: acquisitionPlan, inspect: inspect, equipmentDay: equipmentDay, equipmentRecord: equipmentRecord, dispatchBalance: dispatchBalance, equipmentLimits: equipmentLimits, recap: recap,
    catalog: freeze(CATALOG), sites: freeze(SITES), months: freeze(MONTHS), goals: freeze(GOALS),
    assumptions: freeze({ chargeEfficiency: CHARGE_EFFICIENCY, dischargeEfficiency: DISCHARGE_EFFICIENCY,
      serviceHours: SERVICE_HOURS, tariff: TARIFF, hoursPerStep: 1, constructionMonths: 1, money: 'Fictional game dollars' }) });
});
