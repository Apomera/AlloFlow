// stem_tool_openbim.js - accessible OpenBIM planning and Bonsai companion
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      return this._registry[id] && this._registry[id].render ? this._registry[id].render(ctx) : null;
    }
  };

  var RECIPE_SCHEMA = 'org.alloflow.openbim-project';
  var RECIPE_VERSION = 1;
  var MAX_ARCHITECTURE_BLOCKS = 500;
  var BONSAI_DOCS = 'https://docs.bonsaibim.org/';
  var BONSAI_INSTALL = 'https://docs.bonsaibim.org/quickstart/installation.html';
  var IFCOS_REPO = 'https://github.com/IfcOpenShell/IfcOpenShell';
  var IFCOS_API = 'https://docs.ifcopenshell.org/autoapi/ifcopenshell/api/index.html';
  var ALLOWED_CLASSES = {
    IfcWall: 'Wall', IfcSlab: 'Floor or slab', IfcDoor: 'Door', IfcWindow: 'Window',
    IfcRoof: 'Roof', IfcColumn: 'Column', IfcBeam: 'Beam', IfcStair: 'Stair',
    IfcRailing: 'Railing', IfcBuildingElementProxy: 'Unclassified element'
  };
  var ALLOWED_ARCHITECTURE_SHAPES = {
    block: true, slab: true, door: true, window: true, roof: true,
    column: true, arch: true, pyramid: true, ramp: true, cylinder: true
  };
  var SAMPLE_BRIEFS = [
    'Plan an accessible one-storey science classroom with two exits, daylight, flexible work areas, and quiet space.',
    'Create a small two-storey community library with a reading room, makerspace, welcome desk, and inclusive circulation.',
    'Design a compact art studio with washable work surfaces, storage, natural light, and room for group instruction.'
  ];

  function clamp(value, min, max) {
    value = Number(value);
    return Math.max(min, Math.min(max, isFinite(value) ? value : min));
  }

  function plain(value, max) {
    return String(value == null ? '' : value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max || 180);
  }

  function slug(value, fallback) {
    var result = plain(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return result || fallback || 'openbim-project';
  }

  function uniqueStrings(values, fallback, limit) {
    var seen = {};
    var output = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var clean = plain(value, 180);
      var key = clean.toLowerCase();
      if (!clean || seen[key] || output.length >= (limit || 10)) return;
      seen[key] = true;
      output.push(clean);
    });
    if (!output.length && fallback) output.push(fallback);
    return output;
  }

  function sanitizeArchitectureBlocks(blocks) {
    var list = [];
    (Array.isArray(blocks) ? blocks : []).slice(0, MAX_ARCHITECTURE_BLOCKS).forEach(function (block) {
      if (!block || !isFinite(Number(block.x)) || !isFinite(Number(block.y)) || !isFinite(Number(block.z))) return;
      var shape = plain(block.shape || 'block', 24).toLowerCase();
      list.push({
        x: clamp(block.x, -100, 100),
        y: clamp(block.y, -100, 100),
        z: clamp(block.z, -100, 100),
        shape: ALLOWED_ARCHITECTURE_SHAPES[shape] ? shape : 'block',
        material: plain(block.material || 'unclassified', 40) || 'unclassified',
        rotation: clamp(block.rotation || 0, 0, 3)
      });
    });
    return list;
  }

  function architectureSummary(blocks) {
    var list = sanitizeArchitectureBlocks(blocks);
    if (!list.length) return null;
    var xs = list.map(function (b) { return Number(b.x); });
    var ys = list.map(function (b) { return Number(b.y); });
    var zs = list.map(function (b) { return Number(b.z); });
    var materials = {};
    list.forEach(function (block) { materials[plain(block.material || 'unclassified', 40)] = true; });
    return {
      blockCount: list.length,
      widthUnits: Math.max.apply(null, xs) - Math.min.apply(null, xs) + 1,
      depthUnits: Math.max.apply(null, zs) - Math.min.apply(null, zs) + 1,
      heightUnits: Math.max.apply(null, ys) - Math.min.apply(null, ys) + 1,
      materials: Object.keys(materials).slice(0, 12),
      unitMetres: 1,
      geometryStatus: 'approximate-unit-box-proxies',
      blocks: list
    };
  }

  function normalizeArchitecturePayload(value) {
    if (!value) return null;
    return architectureSummary(Array.isArray(value) ? value : value.blocks);
  }

  function inferName(brief) {
    var lower = brief.toLowerCase();
    if (lower.indexOf('library') !== -1) return 'Community Library Study';
    if (lower.indexOf('classroom') !== -1 || lower.indexOf('school') !== -1) return 'Inclusive Learning Space';
    if (lower.indexOf('art studio') !== -1) return 'Art Studio Study';
    if (lower.indexOf('home') !== -1 || lower.indexOf('house') !== -1) return 'Home Design Study';
    if (lower.indexOf('clinic') !== -1) return 'Community Clinic Study';
    return 'OpenBIM Design Study';
  }

  function inferSpaces(brief) {
    var lower = brief.toLowerCase();
    var spaces = [];
    var rules = [
      ['classroom', 'Classroom'], ['science', 'Science Work Area'], ['library', 'Reading Room'],
      ['maker', 'Makerspace'], ['art', 'Art Studio'], ['quiet', 'Quiet Space'],
      ['storage', 'Storage'], ['welcome', 'Welcome Area'], ['office', 'Office'],
      ['kitchen', 'Kitchen'], ['bedroom', 'Bedroom'], ['clinic', 'Consultation Room'],
      ['lab', 'Laboratory'], ['meeting', 'Meeting Room']
    ];
    rules.forEach(function (rule) { if (lower.indexOf(rule[0]) !== -1) spaces.push(rule[1]); });
    spaces = uniqueStrings(spaces, 'Flexible Learning Space', 8);
    if (spaces.indexOf('Entry and Circulation') === -1) spaces.unshift('Entry and Circulation');
    return spaces.slice(0, 8);
  }

  function inferStoreyCount(brief, requested) {
    var lower = brief.toLowerCase();
    if (/\b(three|3)[ -]?store(y|ys|ies)\b/.test(lower)) return 3;
    if (/\b(two|2)[ -]?store(y|ys|ies)\b/.test(lower)) return 2;
    if (/\b(one|1|single)[ -]?store(y|ys|ies)\b/.test(lower)) return 1;
    return clamp(requested || 1, 1, 3);
  }

  function buildFallbackPlan(brief, options) {
    var cleanBrief = plain(brief, 1200) || SAMPLE_BRIEFS[0];
    var opts = options || {};
    var storeyCount = inferStoreyCount(cleanBrief, opts.storeys);
    var allSpaces = inferSpaces(cleanBrief);
    var storeys = [];
    for (var i = 0; i < storeyCount; i += 1) {
      storeys.push({
        id: 'storey-' + (i + 1),
        name: i === 0 ? 'Ground Floor' : 'Level ' + (i + 1),
        elevationMetres: i * 3.4,
        spaces: allSpaces.filter(function (_, index) { return index % storeyCount === i; })
      });
    }
    storeys.forEach(function (storey) {
      if (!storey.spaces.length) storey.spaces = ['Flexible Space'];
    });

    var lower = cleanBrief.toLowerCase();
    var spaceCount = allSpaces.length;
    var elements = [
      { ifcClass: 'IfcWall', name: 'Exterior and interior walls', count: Math.min(20, 4 + spaceCount * 2), storey: 'All storeys', reason: 'Define the planned rooms and building envelope.' },
      { ifcClass: 'IfcSlab', name: 'Floor slabs', count: storeyCount, storey: 'All storeys', reason: 'Provide one schematic floor plate per level.' },
      { ifcClass: 'IfcDoor', name: 'Doors', count: Math.min(12, Math.max(spaceCount, lower.indexOf('two exits') !== -1 ? 2 : 1)), storey: 'All storeys', reason: 'Connect the planned spaces; placement remains to be designed.' },
      { ifcClass: 'IfcWindow', name: 'Windows', count: lower.indexOf('daylight') !== -1 || lower.indexOf('natural light') !== -1 ? 8 : 4, storey: 'All storeys', reason: 'Represent daylight openings for later placement and analysis.' },
      { ifcClass: 'IfcRoof', name: 'Roof', count: 1, storey: storeys[storeys.length - 1].name, reason: 'Close the schematic building envelope.' }
    ];
    if (storeyCount > 1) {
      elements.push({ ifcClass: 'IfcStair', name: 'Vertical circulation', count: 1, storey: 'All storeys', reason: 'Connect levels; an accessible route must be resolved separately.' });
    }

    var goals = [
      'Use clear dimensions and names so another person can understand the model.',
      'Keep circulation legible and provide more than one way to understand important information.',
      'Review the proposal with the people who will use the space.'
    ];
    if (/access|inclusive|wheelchair|universal design/.test(lower)) {
      goals.unshift('Plan an inclusive route, usable clearances, and equivalent participation throughout the project.');
    }
    if (/daylight|natural light|energy|sustain/.test(lower)) {
      goals.push('Record daylight or sustainability intentions as testable design goals, not as unverified performance claims.');
    }

    var assumptions = [
      'This is an educational concept model, not a construction document or code-compliance certification.',
      'Element counts are a starting inventory. Geometry, dimensions, assemblies, and placement still require review.',
      'AlloFlow uses metres and IFC4 for this starter recipe.'
    ];
    if (opts.architecture) assumptions.push('The linked Architecture Studio blocks will export only as approximate one-metre IfcBuildingElementProxy boxes; they are not automatically classified as walls, doors, or other BIM objects.');

    return {
      schema: RECIPE_SCHEMA,
      version: RECIPE_VERSION,
      status: 'proposal',
      name: inferName(cleanBrief),
      brief: cleanBrief,
      ifcSchema: 'IFC4',
      units: 'METRE',
      siteName: 'Learning Site',
      storeys: storeys,
      elements: elements,
      goals: goals,
      assumptions: assumptions,
      architectureStudio: opts.architecture || null,
      createdBy: 'AlloFlow OpenBIM Companion',
      proposalSource: 'AlloFlow rules-based planner'
    };
  }

  function parseAiObject(raw) {
    var value = raw;
    if (value && typeof value === 'object' && value.text != null) value = value.text;
    if (value && typeof value === 'object' && value.output_text != null) value = value.output_text;
    if (typeof value !== 'string') return value && typeof value === 'object' ? value : null;
    var clean = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    var start = clean.indexOf('{');
    var end = clean.lastIndexOf('}');
    if (start !== -1 && end > start) clean = clean.slice(start, end + 1);
    try { return JSON.parse(clean); } catch (_) { return null; }
  }

  function normalizeAiPlan(raw, brief, options) {
    var fallback = buildFallbackPlan(brief, options);
    var parsed = parseAiObject(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;

    var storeys = (Array.isArray(parsed.storeys) ? parsed.storeys : []).slice(0, 3).map(function (storey, index) {
      return {
        id: 'storey-' + (index + 1),
        name: plain(storey && storey.name, 80) || (index === 0 ? 'Ground Floor' : 'Level ' + (index + 1)),
        elevationMetres: clamp(storey && storey.elevationMetres, 0, 30),
        spaces: uniqueStrings(storey && storey.spaces, 'Flexible Space', 10)
      };
    });
    if (!storeys.length) storeys = fallback.storeys;

    var storeyNames = storeys.map(function (storey) { return storey.name; });
    var elements = (Array.isArray(parsed.elements) ? parsed.elements : []).slice(0, 20).map(function (item) {
      var ifcClass = plain(item && item.ifcClass, 60);
      if (!ALLOWED_CLASSES[ifcClass]) return null;
      var requestedStorey = plain(item && item.storey, 80);
      return {
        ifcClass: ifcClass,
        name: plain(item && item.name, 100) || ALLOWED_CLASSES[ifcClass],
        count: clamp(item && item.count, 1, 40),
        storey: requestedStorey === 'All storeys' || storeyNames.indexOf(requestedStorey) !== -1 ? requestedStorey : storeyNames[0],
        reason: plain(item && item.reason, 220) || 'Included in the proposed semantic model.'
      };
    }).filter(Boolean);
    if (!elements.length) elements = fallback.elements;

    fallback.name = plain(parsed.name, 100) || fallback.name;
    fallback.storeys = storeys;
    fallback.elements = elements;
    fallback.goals = uniqueStrings(parsed.goals, fallback.goals[0], 10);
    fallback.assumptions = uniqueStrings(parsed.assumptions, fallback.assumptions[0], 10).concat([
      'This is an educational concept model, not a construction document or code-compliance certification.'
    ]).filter(function (value, index, list) { return list.indexOf(value) === index; });
    fallback.proposalSource = 'Gemini proposal normalized through the AlloFlow IFC allowlist';
    return fallback;
  }

  function validatePlan(plan) {
    var issues = [];
    if (!plan || plan.schema !== RECIPE_SCHEMA || plan.version !== RECIPE_VERSION) issues.push('The recipe schema is missing or unsupported.');
    if (!plan || !Array.isArray(plan.storeys) || !plan.storeys.length) issues.push('At least one storey is required.');
    if (!plan || !Array.isArray(plan.elements) || !plan.elements.length) issues.push('At least one building element is required.');
    (plan && Array.isArray(plan.elements) ? plan.elements : []).forEach(function (item) {
      if (!ALLOWED_CLASSES[item.ifcClass]) issues.push('Unsupported IFC class: ' + plain(item.ifcClass, 60));
      if (Number(item.count) < 1 || Number(item.count) > 40) issues.push('Element counts must be between 1 and 40.');
    });
    return issues;
  }

  function analyzePlan(plan) {
    var issues = validatePlan(plan);
    var questions = [];
    var checks = [];
    var brief = plain(plan && plan.brief, 1200).toLowerCase();
    var storeys = plan && Array.isArray(plan.storeys) ? plan.storeys : [];
    var elements = plan && Array.isArray(plan.elements) ? plan.elements : [];
    var totals = {};
    elements.forEach(function (item) { totals[item.ifcClass] = (totals[item.ifcClass] || 0) + Number(item.count || 0); });
    if (!issues.length) checks.push('The recipe has a supported schema, spatial tree, and allowlisted semantic inventory.');
    if (plan && plan.architectureStudio && plan.architectureStudio.blockCount) {
      checks.push(plan.architectureStudio.blockCount + ' Architecture Studio ' + (plan.architectureStudio.blockCount === 1 ? 'block can' : 'blocks can') + ' export as approximate, unclassified proxy geometry.');
      questions.push('Do the one-metre proxy boxes match the intended grid scale and orientation before they are remodeled?');
    }
    if (storeys.length > 1) {
      questions.push('What verified accessible route will connect every occupied level? A stair inventory row does not answer this.');
    }
    if (/access|inclusive|wheelchair|universal design/.test(brief)) {
      questions.push('Have intended users and an accessibility specialist reviewed routes, clearances, controls, and equivalent participation?');
    }
    if (brief.indexOf('two exits') !== -1 && (totals.IfcDoor || 0) < 2) {
      questions.push('The brief asks for two exits, but the inventory contains fewer than two doors; resolve exit design and code review.');
    }
    if (/daylight|natural light/.test(brief) && !(totals.IfcWindow > 0)) {
      questions.push('The brief names daylight, but the inventory has no windows; define openings and verify performance later.');
    }
    questions.push('Which architect, engineer, building official, accessibility reviewer, and community members need to review the next model?');
    return { readyForConceptExport: !issues.length, issues: issues, checks: checks, questions: uniqueStrings(questions, '', 10) };
  }

  function normalizeImportedRecipe(raw) {
    var parsed = raw;
    var warnings = [];
    if (typeof raw === 'string') {
      try { parsed = JSON.parse(raw); } catch (_) { return { plan: null, warnings: [], errors: ['The selected file is not valid JSON.'] }; }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { plan: null, warnings: [], errors: ['The selected file does not contain an OpenBIM recipe object.'] };
    if (parsed.schema !== RECIPE_SCHEMA || parsed.version !== RECIPE_VERSION) return { plan: null, warnings: [], errors: ['Only AlloFlow OpenBIM recipe version 1 can be imported.'] };
    if (!Array.isArray(parsed.storeys) || !parsed.storeys.length) return { plan: null, warnings: [], errors: ['The imported recipe needs at least one storey.'] };
    var supportedElements = (Array.isArray(parsed.elements) ? parsed.elements : []).filter(function (item) {
      return item && ALLOWED_CLASSES[plain(item.ifcClass, 60)];
    });
    if (!supportedElements.length) return { plan: null, warnings: [], errors: ['The imported recipe has no supported IFC building elements.'] };
    if (supportedElements.length !== (Array.isArray(parsed.elements) ? parsed.elements.length : 0)) warnings.push('Unsupported IFC classes were removed.');
    var architecture = normalizeArchitecturePayload(parsed.architectureStudio);
    if (parsed.architectureStudio && !architecture) warnings.push('Invalid Architecture Studio geometry was removed.');
    if (parsed.architectureStudio && parsed.architectureStudio.blocks && parsed.architectureStudio.blocks.length > MAX_ARCHITECTURE_BLOCKS) warnings.push('Architecture Studio geometry was limited to ' + MAX_ARCHITECTURE_BLOCKS + ' proxy blocks.');
    var brief = plain(parsed.brief, 1200) || 'Imported OpenBIM concept for review.';
    var normalized = normalizeAiPlan({
      name: parsed.name,
      storeys: parsed.storeys,
      elements: supportedElements,
      goals: parsed.goals,
      assumptions: parsed.assumptions
    }, brief, { storeys: parsed.storeys.length, architecture: architecture });
    normalized.status = 'proposal';
    normalized.siteName = plain(parsed.siteName, 100) || 'Learning Site';
    normalized.proposalSource = 'Imported recipe normalized locally through the AlloFlow IFC allowlist';
    normalized.architectureStudio = architecture;
    warnings.push('Imported approval was cleared; review and approve this proposal again.');
    return { plan: normalized, warnings: uniqueStrings(warnings, '', 10), errors: [] };
  }

  function buildRecipe(plan) {
    var recipe = JSON.parse(JSON.stringify(plan || {}));
    recipe.schema = RECIPE_SCHEMA;
    recipe.version = RECIPE_VERSION;
    recipe.status = 'approved-concept';
    recipe.approvedAt = new Date().toISOString();
    recipe.reviewQuestions = analyzePlan(recipe).questions;
    recipe.interoperability = {
      intendedFormat: 'IFC4',
      nextStep: 'Run the generated IfcOpenShell starter script, then open the resulting IFC file in Bonsai.',
      limitations: 'This recipe carries semantic structure, an element inventory, and—when linked—approximate unclassified proxy geometry. It does not certify dimensions, accessibility, structure, energy performance, or building-code compliance.'
    };
    return recipe;
  }

  function pyString(value) {
    return JSON.stringify(plain(value, 180) || 'Unnamed');
  }

  function buildIfcPython(plan) {
    var recipe = buildRecipe(plan);
    var architecture = normalizeArchitecturePayload(recipe.architectureStudio);
    var lines = [
      '# Generated by AlloFlow OpenBIM Companion',
      '# Requires: pip install ifcopenshell',
      '# This creates a semantic IFC4 starter model with optional approximate proxy geometry.',
      'import ifcopenshell.api.aggregate',
      'import ifcopenshell.api.context',
      'import ifcopenshell.api.geometry',
      'import ifcopenshell.api.project',
      'import ifcopenshell.api.pset',
      'import ifcopenshell.api.root',
      'import ifcopenshell.api.spatial',
      'import ifcopenshell.api.unit',
      '',
      'model = ifcopenshell.api.project.create_file(version="IFC4")',
      'project = ifcopenshell.api.root.create_entity(model, ifc_class="IfcProject", name=' + pyString(recipe.name) + ')',
      'length_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="LENGTHUNIT")',
      'area_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="AREAUNIT")',
      'volume_unit = ifcopenshell.api.unit.add_si_unit(model, unit_type="VOLUMEUNIT")',
      'ifcopenshell.api.unit.assign_unit(model, units=[length_unit, area_unit, volume_unit])',
      'model_context = ifcopenshell.api.context.add_context(model, context_type="Model")',
      'body_context = ifcopenshell.api.context.add_context(model, context_type="Model", context_identifier="Body", target_view="MODEL_VIEW", parent=model_context)',
      'site = ifcopenshell.api.root.create_entity(model, ifc_class="IfcSite", name=' + pyString(recipe.siteName) + ')',
      'building = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuilding", name=' + pyString(recipe.name) + ')',
      'ifcopenshell.api.aggregate.assign_object(model, relating_object=project, products=[site])',
      'ifcopenshell.api.aggregate.assign_object(model, relating_object=site, products=[building])',
      'storeys = {}'
    ];
    recipe.storeys.forEach(function (storey, storeyIndex) {
      var variable = 'storey_' + (storeyIndex + 1);
      lines.push(variable + ' = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuildingStorey", name=' + pyString(storey.name) + ')');
      lines.push(variable + '.Elevation = ' + clamp(storey.elevationMetres, 0, 30));
      lines.push('ifcopenshell.api.aggregate.assign_object(model, relating_object=building, products=[' + variable + '])');
      lines.push('storeys[' + pyString(storey.name) + '] = ' + variable);
      storey.spaces.forEach(function (space, spaceIndex) {
        var spaceVar = 'space_' + (storeyIndex + 1) + '_' + (spaceIndex + 1);
        lines.push(spaceVar + ' = ifcopenshell.api.root.create_entity(model, ifc_class="IfcSpace", name=' + pyString(space) + ')');
        lines.push('ifcopenshell.api.aggregate.assign_object(model, relating_object=' + variable + ', products=[' + spaceVar + '])');
      });
    });
    lines.push('');
    lines.push('# Add the approved semantic element inventory. Geometry and placement come next in Bonsai.');
    recipe.elements.forEach(function (item, itemIndex) {
      var count = clamp(item.count, 1, 40);
      var target = item.storey === 'All storeys' ? recipe.storeys[0].name : item.storey;
      lines.push('for index in range(' + count + '):');
      lines.push('    element = ifcopenshell.api.root.create_entity(model, ifc_class=' + pyString(item.ifcClass) + ', name=' + pyString(item.name) + ' + " " + str(index + 1))');
      lines.push('    ifcopenshell.api.spatial.assign_container(model, relating_structure=storeys[' + pyString(target) + '], products=[element])');
      if (itemIndex === recipe.elements.length - 1) lines.push('');
    });
    if (architecture && architecture.blocks.length) {
      lines.push('# Preserve Architecture Studio context as unclassified one-metre proxy boxes.');
      lines.push('# Source axes x/y/z are mapped to IFC x/z/y so source height becomes IFC Z.');
      lines.push('# Source shapes and materials are metadata only; remodel and classify them in Bonsai.');
      lines.push('ARCHITECTURE_STUDIO_BLOCKS = ' + JSON.stringify(architecture.blocks));
      lines.push('proxy_storey = storeys[' + pyString(recipe.storeys[0].name) + ']');
      lines.push('for index, block in enumerate(ARCHITECTURE_STUDIO_BLOCKS):');
      lines.push('    origin_x = float(block["x"])');
      lines.push('    origin_y = float(block["z"])');
      lines.push('    origin_z = float(block["y"])');
      lines.push('    size = 0.9');
      lines.push('    vertices = [[(origin_x, origin_y, origin_z), (origin_x + size, origin_y, origin_z), (origin_x + size, origin_y + size, origin_z), (origin_x, origin_y + size, origin_z), (origin_x, origin_y, origin_z + size), (origin_x + size, origin_y, origin_z + size), (origin_x + size, origin_y + size, origin_z + size), (origin_x, origin_y + size, origin_z + size)]]');
      lines.push('    faces = [[(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]]');
      lines.push('    representation = ifcopenshell.api.geometry.add_mesh_representation(model, context=body_context, vertices=vertices, faces=faces)');
      lines.push('    proxy = ifcopenshell.api.root.create_entity(model, ifc_class="IfcBuildingElementProxy", name="Architecture Studio proxy " + str(index + 1))');
      lines.push('    ifcopenshell.api.geometry.assign_representation(model, product=proxy, representation=representation)');
      lines.push('    ifcopenshell.api.geometry.edit_object_placement(model, product=proxy)');
      lines.push('    ifcopenshell.api.spatial.assign_container(model, relating_structure=proxy_storey, products=[proxy])');
      lines.push('    source_pset = ifcopenshell.api.pset.add_pset(model, product=proxy, name="AlloFlow_ArchitectureStudio")');
      lines.push('    ifcopenshell.api.pset.edit_pset(model, pset=source_pset, properties={"SourceTool": "Architecture Studio", "SourceShape": block["shape"], "SourceMaterial": block["material"], "GeometryStatus": "Approximate 0.9m box on a 1m source grid"})');
      lines.push('');
    }
    lines.push('output_path = ' + pyString(slug(recipe.name, 'alloflow-openbim') + '.ifc'));
    lines.push('model.write(output_path)');
    lines.push('print("Created " + output_path + ". Open it in Bonsai to review, remodel, and classify the concept.")');
    return lines.join('\n') + '\n';
  }

  function downloadText(filename, text, type) {
    if (typeof Blob === 'undefined' || !window.URL || typeof window.URL.createObjectURL !== 'function') return false;
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var url = window.URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { window.URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  function openExternal(url) {
    var opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) try { opened.opener = null; } catch (_) {}
  }

  function aiPrompt(brief, storeys, architecture) {
    var architectureNote = architecture ? {
      blockCount: architecture.blockCount,
      widthUnits: architecture.widthUnits,
      depthUnits: architecture.depthUnits,
      heightUnits: architecture.heightUnits,
      materials: architecture.materials
    } : null;
    return 'You are an OpenBIM planning assistant inside an educational accessibility tool. ' +
      'Convert the design brief into a conservative semantic IFC proposal. Do not claim code compliance, structural safety, professional approval, or exact dimensions. ' +
      'Use ONLY these element classes: ' + Object.keys(ALLOWED_CLASSES).join(', ') + '. ' +
      'Return ONLY JSON with this shape: {"name":"...","storeys":[{"name":"Ground Floor","elevationMetres":0,"spaces":["..."]}],"elements":[{"ifcClass":"IfcWall","name":"...","count":4,"storey":"Ground Floor or All storeys","reason":"..."}],"goals":["..."],"assumptions":["..."]}. ' +
      'Limit the proposal to 1-3 storeys and 20 inventory rows. Requested storeys: ' + storeys + '. ' +
      (architectureNote ? 'Architecture Studio summary: ' + JSON.stringify(architectureNote) + '. Do not pretend the blocks are already classified. ' : '') +
      'User brief: ' + JSON.stringify(plain(brief, 1200));
  }

  function printProject(recipe) {
    var popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!popup) return false;
    var escape = function (value) { return String(value || '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
    var storeys = recipe.storeys.map(function (storey) {
      return '<section><h2>' + escape(storey.name) + '</h2><p>' + escape(storey.spaces.join(' | ')) + '</p></section>';
    }).join('');
    var elements = recipe.elements.map(function (item) {
      return '<tr><td>' + escape(item.ifcClass) + '</td><td>' + escape(item.name) + '</td><td>' + escape(item.count) + '</td><td>' + escape(item.storey) + '</td></tr>';
    }).join('');
    var questions = (recipe.reviewQuestions || []).map(function (item) { return '<li>' + escape(item) + '</li>'; }).join('');
    var proxyNote = recipe.architectureStudio ? '<p><strong>Architecture Studio handoff:</strong> ' + escape(recipe.architectureStudio.blockCount) + ' source blocks export as approximate, unclassified proxy boxes.</p>' : '';
    popup.document.write('<!doctype html><html><head><title>' + escape(recipe.name) + '</title><style>@page{margin:.55in}body{font:12px/1.5 system-ui,sans-serif;color:#172033;max-width:900px;margin:auto}h1{font-size:28px}h2{font-size:17px}header{border-bottom:3px solid #155e75}table{width:100%;border-collapse:collapse}th,td{text-align:left;border:1px solid #a8b4c5;padding:7px;vertical-align:top}.notice{margin-top:18px;padding:12px;background:#eef6f8;border:1px solid #88b8c3}@media print{button{display:none}}</style></head><body><header><p>AlloFlow OpenBIM Companion</p><h1>' + escape(recipe.name) + '</h1><p>' + escape(recipe.brief) + '</p></header><h2>Spatial plan</h2>' + storeys + '<h2>Semantic element inventory</h2><table><thead><tr><th>IFC class</th><th>Name</th><th>Count</th><th>Storey</th></tr></thead><tbody>' + elements + '</tbody></table>' + proxyNote + '<h2>Questions for the next review</h2><ul>' + questions + '</ul><div class="notice"><strong>Concept-model boundary:</strong> ' + escape(recipe.interoperability.limitations) + '</div><p>Prepared for IFC4 exchange. Continue in Bonsai using the exported recipe and IfcOpenShell starter script.</p><button onclick="window.print()">Print this project brief</button></body></html>');
    popup.document.close();
    return true;
  }

  window.OpenBIMBridge = {
    schema: RECIPE_SCHEMA,
    version: RECIPE_VERSION,
    allowedClasses: Object.keys(ALLOWED_CLASSES),
    sampleBriefs: SAMPLE_BRIEFS.slice(),
    summarizeArchitecture: architectureSummary,
    sanitizeArchitectureBlocks: sanitizeArchitectureBlocks,
    buildFallbackPlan: buildFallbackPlan,
    normalizeAiPlan: normalizeAiPlan,
    normalizeImportedRecipe: normalizeImportedRecipe,
    validatePlan: validatePlan,
    analyzePlan: analyzePlan,
    buildRecipe: buildRecipe,
    buildIfcPython: buildIfcPython,
    buildAiPrompt: aiPrompt
  };

  window.StemLab.registerTool('openBim', {
    name: 'OpenBIM Companion',
    label: 'OpenBIM Companion',
    icon: '\u2302',
    desc: 'Plan an accessible semantic building model, approve every proposed change, and prepare an open IFC project for Bonsai.',
    category: 'engineering',
    aliases: ['Bonsai', 'BIM', 'OpenBIM', 'IFC', 'architecture', 'building information modeling', 'blueprint'],
    questHooks: [
      { id: 'draft_bim', label: 'Draft a semantic building proposal', icon: '\u2302', check: function (d) { return !!d.proposal; }, progress: function (d) { return d.proposal ? 'Draft ready' : 'Not started'; } },
      { id: 'approve_bim', label: 'Review and approve an OpenBIM recipe', icon: '\u2713', check: function (d) { return !!d.approvedRecipe; }, progress: function (d) { return d.approvedRecipe ? 'Approved' : 'Needs review'; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      var state = (ctx.toolData && ctx.toolData.openBim) || {};
      var update = function (patch) { ctx.updateMulti('openBim', patch); };
      var brief = state.brief || SAMPLE_BRIEFS[0];
      var requestedStoreys = clamp(state.requestedStoreys || 1, 1, 3);
      var proposal = state.proposal || null;
      var approved = state.approvedRecipe || null;
      var stage = state.stage || 'brief';
      var arch = architectureSummary(ctx.toolData && ctx.toolData.archStudio && ctx.toolData.archStudio.blocks);
      var readiness = proposal ? analyzePlan(proposal) : null;
      var aiAvailable = typeof ctx.generateText === 'function' || typeof ctx.callGemini === 'function';
      var announce = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function () {};
      var toast = typeof ctx.addToast === 'function' ? ctx.addToast : function () {};
      var colors = {
        ink: 'var(--allo-stem-text, #162033)', soft: 'var(--allo-stem-text-soft, #526177)',
        panel: 'var(--allo-stem-panel, #ffffff)', surface: 'var(--allo-stem-surface, #f4f7f8)',
        border: 'var(--allo-stem-border, #b9c6d0)', teal: '#0f766e', cyan: '#155e75', gold: '#a16207'
      };
      var button = function (label, onClick, options) {
        var opts = options || {};
        return el('button', {
          type: 'button', onClick: onClick, disabled: !!opts.disabled,
          'aria-label': opts.ariaLabel || label,
          style: {
            border: opts.primary ? '1px solid #0f766e' : '1px solid ' + colors.border,
            borderRadius: 9, padding: opts.compact ? '5px 8px' : '9px 13px',
            background: opts.primary ? '#0f766e' : colors.panel,
            color: opts.primary ? '#ffffff' : colors.ink,
            fontSize: opts.compact ? 12 : 13, fontWeight: 800,
            cursor: opts.disabled ? 'not-allowed' : 'pointer', opacity: opts.disabled ? 0.55 : 1
          }
        }, label);
      };
      var card = function () {
        var children = Array.prototype.slice.call(arguments);
        return el.apply(null, ['section', { style: { background: colors.panel, border: '1px solid ' + colors.border, borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,.06)' } }].concat(children));
      };

      function setSample(value) { update({ brief: value, stage: 'brief', proposal: null, approvedRecipe: null }); }

      function saveProposal(next, message) {
        update({ proposal: next, approvedRecipe: null, stage: 'review', aiBusy: false, statusMessage: message });
        announce(message);
      }

      function draft(useAi) {
        var options = { storeys: requestedStoreys, architecture: arch };
        var fallback = buildFallbackPlan(brief, options);
        if (!useAi || !aiAvailable) {
          saveProposal(fallback, aiAvailable ? 'Rules-based OpenBIM proposal ready for review.' : 'Offline OpenBIM proposal ready for review. Gemini was not required.');
          return;
        }
        update({ aiBusy: true, statusMessage: 'Gemini is drafting a proposal. No changes will be approved automatically.' });
        announce('Gemini is drafting an OpenBIM proposal.');
        var request;
        try {
          request = typeof ctx.generateText === 'function'
            ? ctx.generateText(aiPrompt(brief, requestedStoreys, arch), { jsonMode: true })
            : ctx.callGemini(aiPrompt(brief, requestedStoreys, arch), true);
        } catch (_) { request = Promise.reject(new Error('AI request could not start.')); }
        Promise.resolve(request).then(function (result) {
          saveProposal(normalizeAiPlan(result, brief, options), 'Gemini proposal passed the IFC allowlist and is ready for your review.');
        }).catch(function () {
          saveProposal(fallback, 'Gemini was unavailable, so AlloFlow prepared a rules-based proposal for review.');
        });
      }

      function changeCount(index, delta) {
        if (!proposal) return;
        var next = JSON.parse(JSON.stringify(proposal));
        next.elements[index].count = clamp(next.elements[index].count + delta, 1, 40);
        next.proposalSource = proposal.proposalSource + '; counts reviewed by user';
        update({ proposal: next, approvedRecipe: null });
        announce(next.elements[index].name + ' count is now ' + next.elements[index].count + '.');
      }

      function removeElement(index) {
        if (!proposal || proposal.elements.length <= 1) return;
        var next = JSON.parse(JSON.stringify(proposal));
        var removed = next.elements.splice(index, 1)[0];
        update({ proposal: next, approvedRecipe: null });
        announce(removed.name + ' removed from the proposal.');
      }

      function approveProposal() {
        var issues = validatePlan(proposal);
        if (issues.length) {
          update({ statusMessage: 'Approval stopped: ' + issues.join(' ') });
          toast('The OpenBIM proposal needs review before approval.', 'error');
          return;
        }
        var recipe = buildRecipe(proposal);
        update({ approvedRecipe: recipe, stage: 'export', statusMessage: 'Concept recipe approved. Export is ready.' });
        toast('OpenBIM concept recipe approved.', 'success');
        announce('OpenBIM concept recipe approved. Export options are ready.');
      }

      function exportRecipe() {
        if (!approved) return;
        var ok = downloadText(slug(approved.name) + '.alloflow-bim.json', JSON.stringify(approved, null, 2), 'application/json;charset=utf-8');
        toast(ok ? 'OpenBIM recipe downloaded.' : 'This browser could not download the recipe.', ok ? 'success' : 'error');
      }

      function exportPython() {
        if (!approved) return;
        var ok = downloadText(slug(approved.name) + '-ifcopenshell.py', buildIfcPython(approved), 'text/x-python;charset=utf-8');
        toast(ok ? 'IfcOpenShell starter script downloaded.' : 'This browser could not download the script.', ok ? 'success' : 'error');
      }

      function importRecipeFile(event) {
        var input = event && event.target;
        var file = input && input.files && input.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
          update({ statusMessage: 'Import stopped: choose an AlloFlow OpenBIM JSON recipe smaller than 1 MB.' });
          toast('The OpenBIM recipe is too large to import safely.', 'error');
          input.value = '';
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var result = normalizeImportedRecipe(String(reader.result || ''));
          if (!result.plan) {
            update({ statusMessage: 'Import stopped: ' + result.errors.join(' ') });
            toast('That file is not a supported AlloFlow OpenBIM recipe.', 'error');
          } else {
            var message = 'Recipe imported locally and normalized. ' + result.warnings.join(' ');
            saveProposal(result.plan, message);
            toast('OpenBIM recipe imported for fresh review.', 'success');
          }
          input.value = '';
        };
        reader.onerror = function () {
          update({ statusMessage: 'Import stopped: this browser could not read the selected file.' });
          toast('The OpenBIM recipe could not be read.', 'error');
          input.value = '';
        };
        reader.readAsText(file);
      }

      var stepLabels = [['brief', '1. Brief'], ['review', '2. Review'], ['export', '3. Export'], ['learn', '4. Learn']];
      var header = el('header', { style: { display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' } },
        el('div', null,
          el('p', { style: { margin: '0 0 4px', color: colors.teal, fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' } }, 'Open architecture pathway'),
          el('h2', { style: { margin: 0, color: colors.ink, fontSize: 25, lineHeight: 1.15 } }, 'OpenBIM Companion'),
          el('p', { style: { margin: '7px 0 0', color: colors.soft, maxWidth: 720, lineHeight: 1.5 } }, 'Turn a design idea into an inspectable semantic building proposal, approve each inventory change, and prepare an IFC4 starter project for the open-source Bonsai authoring environment.')),
        el('div', { style: { border: '1px solid #a7d5cf', background: '#ecfdf5', color: '#115e59', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 900 } }, 'Open formats | Human approval')
      );

      var nav = el('nav', { 'aria-label': 'OpenBIM workflow', style: { display: 'flex', gap: 7, flexWrap: 'wrap', margin: '16px 0' } },
        stepLabels.map(function (entry) {
          var available = entry[0] === 'brief' || entry[0] === 'learn' || (entry[0] === 'review' && proposal) || (entry[0] === 'export' && approved);
          return el('button', {
            key: entry[0], type: 'button', disabled: !available, onClick: function () { if (available) update({ stage: entry[0] }); },
            'aria-current': stage === entry[0] ? 'step' : undefined,
            style: { padding: '7px 11px', borderRadius: 999, border: '1px solid ' + (stage === entry[0] ? colors.cyan : colors.border), background: stage === entry[0] ? '#e6f5f7' : colors.panel, color: stage === entry[0] ? colors.cyan : colors.soft, fontSize: 12, fontWeight: 850, cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : .5 }
          }, entry[1]);
        })
      );

      var briefStage = stage === 'brief' && el('div', { className: 'ob-grid' },
        card(
          el('h3', { style: { margin: '0 0 6px', color: colors.ink, fontSize: 18 } }, 'Describe the building and its purpose'),
          el('p', { style: { margin: '0 0 12px', color: colors.soft, fontSize: 13, lineHeight: 1.5 } }, 'Use everyday language. Include users, spaces, access needs, activities, and environmental goals. Dimensions can come later.'),
          el('label', { htmlFor: 'openbim-brief', style: { display: 'block', color: colors.ink, fontWeight: 850, fontSize: 13, marginBottom: 5 } }, 'Design brief'),
          el('textarea', {
            id: 'openbim-brief', value: brief, onChange: function (event) { update({ brief: event.target.value, approvedRecipe: null }); }, rows: 7,
            style: { width: '100%', resize: 'vertical', boxSizing: 'border-box', border: '2px solid ' + colors.border, borderRadius: 10, padding: 11, background: colors.surface, color: colors.ink, font: '14px/1.5 system-ui,sans-serif' }
          }),
          el('div', { style: { display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginTop: 12 } },
            el('label', { style: { color: colors.ink, fontSize: 13, fontWeight: 800 } }, 'Starting storeys',
              el('select', { value: requestedStoreys, onChange: function (event) { update({ requestedStoreys: Number(event.target.value) }); }, style: { display: 'block', marginTop: 4, minWidth: 150, padding: '8px 10px', border: '1px solid ' + colors.border, borderRadius: 8, background: colors.panel, color: colors.ink } },
                [1, 2, 3].map(function (count) { return el('option', { key: count, value: count }, count + (count === 1 ? ' storey' : ' storeys')); }))),
            button(state.aiBusy ? 'Drafting...' : (aiAvailable ? 'Draft with Gemini' : 'Draft proposal'), function () { draft(true); }, { primary: true, disabled: state.aiBusy || plain(brief, 1200).length < 15 }),
            aiAvailable && button('Use rules-based planner', function () { draft(false); }, { disabled: state.aiBusy })
          ),
          el('p', { style: { color: colors.soft, fontSize: 11, lineHeight: 1.45, margin: '10px 0 0' } }, aiAvailable ? 'Gemini may propose a structure, but AlloFlow filters it to an IFC class allowlist and nothing is approved automatically.' : 'The offline planner remains fully usable. Connect Gemini later for more nuanced space suggestions.')
        ),
        el('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
          card(
            el('h3', { style: { margin: '0 0 8px', color: colors.ink, fontSize: 16 } }, 'Try a starting brief'),
            SAMPLE_BRIEFS.map(function (sample, index) {
              return el('button', { key: index, type: 'button', onClick: function () { setSample(sample); }, style: { display: 'block', width: '100%', textAlign: 'left', marginTop: index ? 7 : 0, padding: 9, border: '1px solid ' + colors.border, borderRadius: 8, background: colors.surface, color: colors.ink, fontSize: 12, lineHeight: 1.4, cursor: 'pointer' } }, sample);
            })
          ),
          card(
            el('h3', { style: { margin: '0 0 5px', color: colors.ink, fontSize: 16 } }, 'Resume an exported recipe'),
            el('p', { style: { margin: '0 0 9px', color: colors.soft, fontSize: 12, lineHeight: 1.5 } }, 'Import an AlloFlow .json recipe locally. Unknown fields are discarded, IFC classes are allowlisted, and prior approval is always cleared.'),
            el('label', { htmlFor: 'openbim-recipe-import', style: { display: 'block', color: colors.ink, fontSize: 12, fontWeight: 850, marginBottom: 5 } }, 'Choose OpenBIM recipe'),
            el('input', { id: 'openbim-recipe-import', type: 'file', accept: '.json,application/json', onChange: importRecipeFile, style: { display: 'block', width: '100%', color: colors.ink, fontSize: 12 } })
          ),
          arch && card(
            el('h3', { style: { margin: '0 0 5px', color: colors.ink, fontSize: 16 } }, 'Architecture Studio detected'),
            el('p', { style: { margin: 0, color: colors.soft, fontSize: 12, lineHeight: 1.5 } }, arch.blockCount + ' blocks | ' + arch.widthUnits + ' x ' + arch.depthUnits + ' x ' + arch.heightUnits + ' grid units. The export can preserve these as one-metre proxy boxes; scale, shape, and semantic classification still require review.')
          )
        )
      );

      var reviewStage = stage === 'review' && proposal && el('div', { className: 'ob-grid' },
        el('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
          card(
            el('p', { style: { margin: 0, color: colors.teal, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' } }, 'Proposed spatial tree'),
            el('h3', { style: { margin: '4px 0 9px', color: colors.ink, fontSize: 19 } }, proposal.name),
            el('ul', { style: { margin: 0, paddingLeft: 20, color: colors.ink, fontSize: 13, lineHeight: 1.7 } },
              el('li', null, 'IfcProject: ', proposal.name,
                el('ul', null, el('li', null, 'IfcSite: ', proposal.siteName,
                  el('ul', null, el('li', null, 'IfcBuilding: ', proposal.name,
                    el('ul', null, proposal.storeys.map(function (storey) {
                      return el('li', { key: storey.id }, 'IfcBuildingStorey: ', storey.name,
                        el('ul', null, storey.spaces.map(function (space) { return el('li', { key: space }, 'IfcSpace: ', space); })));
                    })))))))
            )
          ),
          card(
            el('h3', { style: { margin: '0 0 7px', color: colors.ink, fontSize: 16 } }, 'Assumptions and boundaries'),
            el('ul', { style: { margin: 0, paddingLeft: 19, color: colors.soft, fontSize: 12, lineHeight: 1.55 } }, proposal.assumptions.map(function (item) { return el('li', { key: item }, item); }))
          ),
          card(
            el('h3', { style: { margin: '0 0 7px', color: colors.ink, fontSize: 16 } }, 'Model-readiness questions'),
            readiness.checks.length > 0 && el('p', { style: { margin: '0 0 7px', color: '#115e59', fontSize: 12, lineHeight: 1.5, fontWeight: 750 } }, readiness.checks.join(' ')),
            el('ul', { style: { margin: 0, paddingLeft: 19, color: colors.soft, fontSize: 12, lineHeight: 1.55 } }, readiness.questions.map(function (item) { return el('li', { key: item }, item); })),
            el('p', { style: { margin: '8px 0 0', color: colors.gold, fontSize: 11, lineHeight: 1.45 } }, 'These prompts support review; they are not code or safety checks.')
          )
        ),
        card(
          el('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' } },
            el('div', null,
              el('h3', { style: { margin: 0, color: colors.ink, fontSize: 18 } }, 'Review the semantic inventory'),
              el('p', { style: { margin: '5px 0 10px', color: colors.soft, fontSize: 12 } }, proposal.proposalSource + '. Adjust counts or remove an inventory row before approval.')),
            el('span', { style: { color: '#115e59', background: '#ecfdf5', border: '1px solid #a7d5cf', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 900 } }, 'Allowlisted IFC classes')
          ),
          el('div', { style: { overflowX: 'auto' } },
            el('table', { style: { width: '100%', borderCollapse: 'collapse', color: colors.ink, fontSize: 12 } },
              el('thead', null, el('tr', null,
                ['Element', 'Count', 'Storey', 'Reason', 'Actions'].map(function (heading) { return el('th', { key: heading, scope: 'col', style: { textAlign: 'left', borderBottom: '2px solid ' + colors.border, padding: 8 } }, heading); }))),
              el('tbody', null, proposal.elements.map(function (item, index) {
                return el('tr', { key: item.ifcClass + '-' + index },
                  el('td', { style: { borderBottom: '1px solid ' + colors.border, padding: 8, verticalAlign: 'top' } }, el('strong', null, item.name), el('div', { style: { color: colors.soft, marginTop: 2 } }, item.ifcClass)),
                  el('td', { style: { borderBottom: '1px solid ' + colors.border, padding: 8, verticalAlign: 'top', whiteSpace: 'nowrap' } }, button('-', function () { changeCount(index, -1); }, { compact: true, ariaLabel: 'Decrease ' + item.name }), el('strong', { style: { display: 'inline-block', minWidth: 28, textAlign: 'center' } }, item.count), button('+', function () { changeCount(index, 1); }, { compact: true, ariaLabel: 'Increase ' + item.name })),
                  el('td', { style: { borderBottom: '1px solid ' + colors.border, padding: 8, verticalAlign: 'top' } }, item.storey),
                  el('td', { style: { borderBottom: '1px solid ' + colors.border, padding: 8, verticalAlign: 'top', color: colors.soft, lineHeight: 1.4 } }, item.reason),
                  el('td', { style: { borderBottom: '1px solid ' + colors.border, padding: 8, verticalAlign: 'top' } }, button('Remove', function () { removeElement(index); }, { compact: true, disabled: proposal.elements.length <= 1, ariaLabel: 'Remove ' + item.name }))
                );
              }))
            )
          ),
          el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 } },
            button('Approve concept recipe', approveProposal, { primary: true }),
            button('Revise the brief', function () { update({ stage: 'brief', approvedRecipe: null }); }),
            button('Discard proposal', function () { update({ proposal: null, approvedRecipe: null, stage: 'brief', statusMessage: 'Proposal discarded.' }); })
          )
        )
      );

      var exportStage = stage === 'export' && approved && el('div', { className: 'ob-grid' },
        card(
          el('p', { style: { margin: 0, color: colors.teal, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' } }, 'Approved concept'),
          el('h3', { style: { margin: '4px 0 6px', color: colors.ink, fontSize: 20 } }, approved.name),
          el('p', { style: { color: colors.soft, fontSize: 13, lineHeight: 1.5 } }, approved.storeys.length + ' storey model | ' + approved.elements.length + ' inventory rows | ' + (approved.architectureStudio ? approved.architectureStudio.blockCount + ' source proxies | ' : '') + 'IFC4 target'),
          el('div', { style: { display: 'grid', gap: 8, marginTop: 13 } },
            button('Download OpenBIM recipe (.json)', exportRecipe, { primary: true }),
            button('Download IfcOpenShell starter (.py)', exportPython),
            button('Print project brief', function () { if (!printProject(approved)) toast('Allow pop-ups to print the project brief.', 'error'); }),
            button('Return to review', function () { update({ stage: 'review' }); })
          )
        ),
        el('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
          card(
            el('h3', { style: { margin: '0 0 7px', color: colors.ink, fontSize: 17 } }, 'Continue in Bonsai'),
            el('ol', { style: { margin: 0, paddingLeft: 20, color: colors.soft, fontSize: 13, lineHeight: 1.65 } },
              el('li', null, 'Install Blender and the Bonsai extension.'),
              el('li', null, 'Install IfcOpenShell for Python, then run the downloaded starter script.'),
              el('li', null, 'Open the resulting .ifc file in Bonsai.'),
              el('li', null, approved.architectureStudio ? 'Check the proxy scale and orientation, then remodel and classify the source blocks.' : 'Add geometry and placements to the semantic inventory.'),
              el('li', null, 'Add dimensions, types, materials, and qualified professional review.')),
            el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
              button('Bonsai installation guide', function () { openExternal(BONSAI_INSTALL); }),
              button('IfcOpenShell API guide', function () { openExternal(IFCOS_API); }))
          ),
          card(
            el('h3', { style: { margin: '0 0 6px', color: '#92400e', fontSize: 16 } }, 'What this export does not claim'),
            el('p', { style: { margin: 0, color: colors.soft, fontSize: 12, lineHeight: 1.55 } }, approved.interoperability.limitations)
          ),
          card(
            el('h3', { style: { margin: '0 0 6px', color: colors.ink, fontSize: 16 } }, 'Carry these questions forward'),
            el('ul', { style: { margin: 0, paddingLeft: 19, color: colors.soft, fontSize: 12, lineHeight: 1.55 } }, (approved.reviewQuestions || []).map(function (item) { return el('li', { key: item }, item); }))
          )
        )
      );

      var learnStage = stage === 'learn' && el('div', { className: 'ob-grid' },
        card(
          el('h3', { style: { margin: '0 0 8px', color: colors.ink, fontSize: 19 } }, 'Why OpenBIM?'),
          el('p', { style: { margin: '0 0 9px', color: colors.soft, fontSize: 13, lineHeight: 1.6 } }, 'A BIM model describes what building objects are and how they relate, not only how they look. IFC is an open exchange standard. Bonsai is a free and open-source IFC authoring environment built as a Blender extension.'),
          el('p', { style: { margin: 0, color: colors.soft, fontSize: 13, lineHeight: 1.6 } }, 'AlloFlow is the accessible planning and learning layer. Bonsai remains the specialist desktop authoring environment.')
        ),
        el('div', { style: { display: 'grid', gap: 12, alignContent: 'start' } },
          card(
            el('h3', { style: { margin: '0 0 6px', color: colors.ink, fontSize: 16 } }, 'Open-source boundary'),
            el('dl', { style: { margin: 0, color: colors.soft, fontSize: 12, lineHeight: 1.5 } },
              el('dt', { style: { color: colors.ink, fontWeight: 900 } }, 'Bonsai'), el('dd', { style: { margin: '0 0 8px' } }, 'GPL-3.0-or-later'),
              el('dt', { style: { color: colors.ink, fontWeight: 900 } }, 'IfcOpenShell and IfcMCP'), el('dd', { style: { margin: 0 } }, 'LGPL-3.0-or-later')),
            el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 11 } },
              button('Official Bonsai documentation', function () { openExternal(BONSAI_DOCS); }),
              button('Official source and licenses', function () { openExternal(IFCOS_REPO); }))
          ),
          card(
            el('h3', { style: { margin: '0 0 6px', color: colors.ink, fontSize: 16 } }, 'Agent boundary'),
            el('p', { style: { margin: 0, color: colors.soft, fontSize: 12, lineHeight: 1.55 } }, 'Gemini can draft a proposal inside AlloFlow. It cannot silently control a local Bonsai installation from Gemini Canvas. A future desktop bridge may use IfcOpenShell or IfcMCP with operation allowlists, previews, approval, and undo.')
          )
        )
      );

      return el('div', { className: 'openbim-root', style: { height: '100%', overflowY: 'auto', overflowX: 'hidden', background: colors.surface, color: colors.ink } },
        el('style', null, '.openbim-root *{box-sizing:border-box}.openbim-root .ob-shell{max-width:1180px;margin:0 auto;padding:20px}.openbim-root .ob-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(310px,.92fr);gap:14px;align-items:start}.openbim-root button:focus-visible,.openbim-root input:focus-visible,.openbim-root textarea:focus-visible,.openbim-root select:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}@media(max-width:820px){.openbim-root .ob-grid{grid-template-columns:1fr}.openbim-root .ob-shell{padding:14px}}@media(prefers-reduced-motion:reduce){.openbim-root *{scroll-behavior:auto!important;transition:none!important}}'),
        el('main', { className: 'ob-shell' },
          header,
          nav,
          state.statusMessage && el('div', { role: 'status', 'aria-live': 'polite', style: { marginBottom: 12, borderLeft: '4px solid ' + colors.teal, background: '#eaf7f5', color: '#134e4a', borderRadius: 7, padding: '9px 11px', fontSize: 12, fontWeight: 750 } }, state.statusMessage),
          briefStage,
          reviewStage,
          exportStage,
          learnStage,
          el('p', { style: { margin: '16px 2px 3px', color: colors.soft, fontSize: 10, lineHeight: 1.45 } }, 'Educational planning tool. OpenBIM Companion does not replace an architect, engineer, accessibility specialist, building official, or community design process.')
        )
      );
    }
  });
})();
