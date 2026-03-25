  window.StemLab.registerTool('codingPlayground', {
    icon: '🔬',
    label: 'codingPlayground',
    desc: '',
    color: 'slate',
    category: 'creative',
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var _codingCanvasRef = ctx._codingCanvasRef;

      // ── Tool body (codingPlayground) ──
    return (function() {
          // ── State from labToolData ──
          var d = (labToolData && labToolData._codingPlayground) || {};
          var upd = function (key, val) {
            setLabToolData(function (prev) {
              var cp = Object.assign({}, (prev && prev._codingPlayground) || {});
              cp[key] = val;
              return Object.assign({}, prev, { _codingPlayground: cp });
            });
          };
          var updMulti = function (obj) {
            setLabToolData(function (prev) {
              var cp = Object.assign({}, (prev && prev._codingPlayground) || {});
              Object.keys(obj).forEach(function (k) { cp[k] = obj[k]; });
              return Object.assign({}, prev, { _codingPlayground: cp });
            });
          };

          // ── Defaults ──
          var blocks = d.blocks || [];
          var turtleState = d.turtle || { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };
          var drawnLines = d.lines || [];
          var running = d.running || false;
          var stepIdx = d.stepIdx != null ? d.stepIdx : -1;
          var codeMode = d.codeMode || 'blocks';
          var textCode = d.textCode || '';
          var challengeIdx = d.challengeIdx != null ? d.challengeIdx : -1;
          var completed = d.completed || [];
          var speed = d.speed || 200;
          var showTurtle = d.showTurtle !== false;
          var cumulativeMode = d.cumulativeMode || false;
          var runHistory = d.history || [];
          var undoStack = d.undoStack || [];
          var redoStack = d.redoStack || [];
          var showTemplates = d.showTemplates || false;
          var tutorialDismissed = d.tutorialDismissed || false;

          var showGrid = d.showGrid !== false;

          var aiExplanation = d.aiExplanation || '';

          var aiLoading = d.aiLoading || false;

          var showAIPanel = d.showAIPanel || false;
          var earnedBadges = d.earnedBadges || [];
          var highContrastMode = d.highContrastMode || false;


          // ── Multi-Turtle & Extra Feature State ──
          var turtleSkin = d.turtleSkin || '🐢';
          var extraTurtles = d.extraTurtles || [];   // [{name, x, y, angle, penDown, color, width, skin}]
          var showCoordPicker = d.showCoordPicker || false;
          var timelinePos = d.timelinePos != null ? d.timelinePos : -1;
          var timelineFrames = d.timelineFrames || [];
          var showImportExport = d.showImportExport || false;
          var bgMusicNotes = d.bgMusicNotes || [];
          var bgMusicPlaying = d.bgMusicPlaying || false;
          var canvasLayer = d.canvasLayer || 'foreground'; // 'background' | 'foreground'
          var bgLines = d.bgLines || [];
          var show3D = d.show3D || false;

          // ── Turtle Skin Options ──
          var TURTLE_SKINS = [
            { emoji: '🐢', label: 'Turtle' },
            { emoji: '🚀', label: 'Rocket' },
            { emoji: '🦋', label: 'Butterfly' },
            { emoji: '🐱', label: 'Cat' },
            { emoji: '🐶', label: 'Dog' },
            { emoji: '🦊', label: 'Fox' },
            { emoji: '🐝', label: 'Bee' },
            { emoji: '🎃', label: 'Pumpkin' },
            { emoji: '⭐', label: 'Star' },
            { emoji: '🛸', label: 'UFO' }
          ];

          // ── Achievement Badges ──
          var BADGES = [
            { id: 'first_program', icon: '🌟', title: 'First Program', desc: 'Run your first program', check: function() { return runHistory.length >= 1; } },
            { id: 'loop_master', icon: '🔄', title: 'Loop Master', desc: 'Use a Repeat block', check: function() { return blocks.some(function(b) { return b.type === 'repeat'; }); } },
            { id: 'color_artist', icon: '🎨', title: 'Color Artist', desc: 'Use 3+ different colors', check: function() { var c = {}; drawnLines.forEach(function(l) { c[l.color]=true; }); return Object.keys(c).length >= 3; } },
            { id: 'century', icon: '💯', title: 'Century Club', desc: 'Draw 100+ line segments', check: function() { return drawnLines.length >= 100; } },
            { id: 'robot_commander', icon: '🤖', title: 'Robot Commander', desc: 'Complete a robot challenge', check: function() { return robotCompleted.length >= 1; } },
            { id: 'musician', icon: '🎵', title: 'Digital Musician', desc: 'Use a Play Note block', check: function() { return blocks.some(function(b) { return b.type === 'playNote'; }); } },
            { id: 'function_pro', icon: '📋', title: 'Function Pro', desc: 'Define and call a function', check: function() { return blocks.some(function(b) { return b.type === 'function'; }) && blocks.some(function(b) { return b.type === 'callFunction'; }); } },
            { id: 'challenge_5', icon: '🏆', title: 'Puzzle Solver', desc: 'Complete 5 challenges', check: function() { return completed.length >= 5; } },
            { id: 'efficiency', icon: '⚡', title: 'Efficiency Expert', desc: 'Complete a challenge using fewer than 5 blocks', check: function() { return completed.length >= 1 && blocks.length < 5 && blocks.length > 0; } },
            { id: 'generative', icon: '🎲', title: 'Generative Artist', desc: 'Use Random block in a Repeat loop', check: function() { return blocks.some(function(b) { return b.type === 'repeat' && (b.children || []).some(function(c) { return c.type === 'random'; }); }); } }
          ];

          // Badge check — runs after program execution
          function checkBadges() {
            var newBadges = [];
            BADGES.forEach(function(badge) {
              if (earnedBadges.indexOf(badge.id) < 0 && badge.check()) {
                newBadges.push(badge.id);
                if (addToast) addToast(badge.icon + ' Badge Earned: ' + badge.title + '!', 'success');
                awardStemXP('codingPlayground', 10, 'Badge: ' + badge.title);
              }
            });
            if (newBadges.length > 0) {
              upd('earnedBadges', earnedBadges.concat(newBadges));
              if (typeof stemCelebrate === 'function') stemCelebrate();
            }
          }

          var showCoords = d.showCoords !== false;

          // ── Robot Grid Mode State ──
          var playgroundMode = d.playgroundMode || 'turtle';
          var robotGrid = d.robotGrid || null;
          var robotPos = d.robotPos || { x: 0, y: 0, dir: 0 }; // dir: 0=up,1=right,2=down,3=left
          var robotBlocks = d.robotBlocks || [];
          var robotRunning = d.robotRunning || false;
          var robotChallengeIdx = d.robotChallengeIdx != null ? d.robotChallengeIdx : -1;
          var robotCompleted = d.robotCompleted || [];
          var robotTrail = d.robotTrail || [];

          // ── Block definitions ──
          var BLOCK_TYPES = [
            { type: 'forward', label: '🐢 Move Forward', param: 'distance', defaultVal: 50, unit: 'px', color: '#6366f1' },
            { type: 'backward', label: '🔙 Move Backward', param: 'distance', defaultVal: 50, unit: 'px', color: '#818cf8' },
            { type: 'right', label: '↩️ Turn Right', param: 'degrees', defaultVal: 90, unit: '°', color: '#f59e0b' },
            { type: 'left', label: '↪️ Turn Left', param: 'degrees', defaultVal: 90, unit: '°', color: '#f59e0b' },
            { type: 'penup', label: '✏️ Pen Up', param: null, defaultVal: null, unit: null, color: '#94a3b8' },
            { type: 'pendown', label: '✏️ Pen Down', param: null, defaultVal: null, unit: null, color: '#22c55e' },
            { type: 'color', label: '🎨 Set Color', param: 'color', defaultVal: '#6366f1', unit: null, color: '#ec4899' },
            { type: 'width', label: '📏 Set Width', param: 'width', defaultVal: 2, unit: 'px', color: '#14b8a6' },
            { type: 'circle', label: '⭕ Draw Circle', param: 'radius', defaultVal: 30, unit: 'px', color: '#06b6d4' },
            { type: 'goto', label: '📍 Go To', param: 'x', defaultVal: 250, unit: null, color: '#a855f7' },
            { type: 'home', label: '🏠 Go Home', param: null, defaultVal: null, unit: null, color: '#78716c' },
            { type: 'repeat', label: '🔄 Repeat', param: 'times', defaultVal: 4, unit: '×', color: '#8b5cf6' },
            { type: 'setVar', label: '📦 Set Variable', param: 'varName', defaultVal: 'size', unit: null, color: '#0ea5e9' },
            { type: 'changeVar', label: '📦± Change Var', param: 'varName', defaultVal: 'size', unit: null, color: '#0284c7' },
            { type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' }
          ];

          // ── Challenges ──
          var CHALLENGES = [
            { id: 'hello', title: '1. Hello, Turtle!', desc: 'Add a "Move Forward" block and run it.', concept: 'Sequencing', hint: 'Drag a Move Forward block to your program and click Run!', check: function (lines) { return lines.length >= 1; } },
            { id: 'square', title: '2. Draw a Square', desc: 'Draw a square using Move and Turn blocks.', concept: 'Sequencing', hint: 'You need 4× Move Forward + 4× Turn Right 90°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && Math.abs(ex.turns - 360) < 10 && ex.segments >= 4; } },
            { id: 'loop_square', title: '3. Loop It!', desc: 'Draw the same square using a Repeat block.', concept: 'Loops', hint: 'Use Repeat 4× with Move Forward and Turn Right 90° inside.', check: function (lines, blks) { return blks.some(function (b) { return b.type === 'repeat'; }) && lines.length >= 4; } },
            { id: 'triangle', title: '4. Triangle Time', desc: 'Draw an equilateral triangle.', concept: 'Loops + Angles', hint: 'Repeat 3×: Move Forward, Turn Right 120°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && ex.segments >= 3 && Math.abs(ex.turns - 360) < 15; } },
            { id: 'rainbow', title: '5. Rainbow Line', desc: 'Draw 3+ lines, each a different color.', concept: 'Variables', hint: 'Use Set Color blocks between your Move Forward blocks.', check: function (lines) { var colors = {}; lines.forEach(function (l) { colors[l.color] = true; }); return Object.keys(colors).length >= 3; } },
            { id: 'star', title: '6. Star Power', desc: 'Draw a 5-pointed star.', concept: 'Math + Patterns', hint: 'Repeat 5×: Move Forward 100, Turn Right 144°', check: function (lines) { return lines.length >= 5; } },
            { id: 'spiral', title: '7. Spiral', desc: 'Create a spiral that grows outward.', concept: 'Variables in Loops', hint: 'This is tricky! Try increasing the distance each time.', check: function (lines) { return lines.length >= 10; } },
            { id: 'hexagon', title: '8. Hexagon Hero', desc: 'Draw a perfect regular hexagon.', concept: 'Math + Patterns', hint: 'Repeat 6×: Move Forward 60, Turn Right 60°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && ex.segments >= 6 && Math.abs(ex.turns - 360) < 15; } },
            { id: 'freestyle', title: '9. Freestyle!', desc: 'Create any drawing with 20+ line segments.', concept: 'Creativity', hint: 'Combine everything you\'ve learned!', check: function (lines) { return lines.length >= 20; } },
            { id: 'house', title: '10. Build a House', desc: 'Draw a house: a square base with a triangle roof on top.', concept: 'Decomposition', hint: 'Draw a square, then use Pen Up to move, then draw a triangle for the roof. Think about angles: square = 90°, triangle = 120°.', check: function (lines) { return lines.length >= 7 && getEndpoints(lines.slice(0, 4)).segments >= 4; } }
          ];

          // ── Starter Templates ──
          var TEMPLATES = [
            { name: 'Five-Point Star', icon: '⭐', desc: 'A classic 5-pointed star', blocks: [{ type: 'color', color: '#f59e0b' }, { type: 'repeat', times: 5, children: [{ type: 'forward', distance: 100 }, { type: 'right', degrees: 144 }] }] },
            { name: 'Square Spiral', icon: '🌀', desc: 'A growing square spiral', blocks: [{ type: 'forward', distance: 20 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 40 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 60 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 80 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 100 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 120 }, { type: 'right', degrees: 90 }] },
            { name: 'Flower', icon: '🌸', desc: 'A 6-petal flower pattern', blocks: [{ type: 'color', color: '#ec4899' }, { type: 'repeat', times: 6, children: [{ type: 'forward', distance: 60 }, { type: 'right', degrees: 60 }, { type: 'forward', distance: 60 }, { type: 'right', degrees: 120 }] }] },
            { name: 'Hexagon', icon: '⬡', desc: 'A perfect regular hexagon', blocks: [{ type: 'color', color: '#06b6d4' }, { type: 'width', width: 3 }, { type: 'repeat', times: 6, children: [{ type: 'forward', distance: 60 }, { type: 'right', degrees: 60 }] }] },
            { name: 'Triangle', icon: '🔺', desc: 'An equilateral triangle', blocks: [{ type: 'color', color: '#22c55e' }, { type: 'width', width: 3 }, { type: 'repeat', times: 3, children: [{ type: 'forward', distance: 120 }, { type: 'right', degrees: 120 }] }] },
            { name: 'Staircase', icon: '🪜', desc: 'A step-by-step staircase', blocks: [{ type: 'color', color: '#8b5cf6' }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 30 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 30 }, { type: 'left', degrees: 90 }] }] },
            { name: 'Zigzag', icon: '⚡', desc: 'A sharp zigzag pattern', blocks: [{ type: 'color', color: '#ef4444' }, { type: 'width', width: 3 }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 40 }, { type: 'right', degrees: 120 }, { type: 'forward', distance: 40 }, { type: 'left', degrees: 120 }] }] },
            { name: 'Circle Art', icon: '🎯', desc: 'Concentric circles', blocks: [{ type: 'color', color: '#6366f1' }, { type: 'circle', radius: 20 }, { type: 'penup' }, { type: 'forward', distance: 25 }, { type: 'pendown' }, { type: 'color', color: '#ec4899' }, { type: 'circle', radius: 25 }, { type: 'penup' }, { type: 'forward', distance: 30 }, { type: 'pendown' }, { type: 'color', color: '#f59e0b' }, { type: 'circle', radius: 30 }] },
            { name: 'Octagon', icon: '🛑', desc: 'A regular octagon', blocks: [{ type: 'color', color: '#dc2626' }, { type: 'width', width: 3 }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 50 }, { type: 'right', degrees: 45 }] }] },
            { name: 'Windmill', icon: '🎡', desc: 'A spinning windmill', blocks: [{ type: 'color', color: '#7c3aed' }, { type: 'repeat', times: 12, children: [{ type: 'forward', distance: 80 }, { type: 'backward', distance: 80 }, { type: 'right', degrees: 30 }] }] }
          ];

          // ══════════════════════════════════════════════════
          // ── ROBOT GRID MODE — Blocks, Challenges, Engine ──
          // ══════════════════════════════════════════════════

          var ROBOT_BLOCKS = [
            { type: 'moveForward', label: '🤖 Move Forward', color: '#6366f1', desc: 'Move robot one cell forward' },
            { type: 'turnRight', label: '↩️ Turn Right', color: '#f59e0b', desc: 'Rotate 90° clockwise' },
            { type: 'turnLeft', label: '↪️ Turn Left', color: '#f59e0b', desc: 'Rotate 90° counter-clockwise' },
            { type: 'repeatR', label: '🔄 Repeat', color: '#8b5cf6', desc: 'Repeat commands N times', param: 'times', defaultVal: 3 },
            { type: 'ifWall', label: '🧱 If Wall Ahead', color: '#ef4444', desc: 'Check if a wall is in front' },
            { type: 'ifGem', label: '💎 If On Gem', color: '#22c55e', desc: 'Check if standing on a gem' },
            { type: 'collectGem', label: '💎 Collect Gem', color: '#14b8a6', desc: 'Pick up the gem at current position' },
            { type: 'paintCell', label: '🎨 Paint Cell', color: '#ec4899', desc: 'Paint the current cell' },
            { type: 'whileNotGoal', label: '🏁 While Not At Goal', color: '#d946ef', desc: 'Repeat until reaching the goal' }
          ];

          // Grid generator — creates level maps
          function generateGrid(size, walls, gems, goalPos, startPos) {
            var grid = [];
            for (var gy = 0; gy < size; gy++) {
              var row = [];
              for (var gx = 0; gx < size; gx++) {
                row.push({ wall: false, gem: false, goal: false, painted: false, start: false });
              }
              grid.push(row);
            }
            if (walls) walls.forEach(function(w) { if (grid[w[1]] && grid[w[1]][w[0]]) grid[w[1]][w[0]].wall = true; });
            if (gems) gems.forEach(function(g) { if (grid[g[1]] && grid[g[1]][g[0]]) grid[g[1]][g[0]].gem = true; });
            if (goalPos && grid[goalPos[1]] && grid[goalPos[1]][goalPos[0]]) grid[goalPos[1]][goalPos[0]].goal = true;
            if (startPos && grid[startPos[1]] && grid[startPos[1]][startPos[0]]) grid[startPos[1]][startPos[0]].start = true;
            return grid;
          }

          var ROBOT_CHALLENGES = [
            {
              id: 'r1', title: '1. First Steps', desc: 'Move the robot forward 3 spaces to reach the goal!',
              concept: 'Sequencing', hint: 'Add 3 "Move Forward" blocks.',
              size: 5, start: [0, 2], startDir: 1, goal: [3, 2], walls: [], gems: [],
              check: function(rp, trail, grid) { return rp.x === 3 && rp.y === 2; }
            },
            {
              id: 'r2', title: '2. Turn the Corner', desc: 'Navigate around the corner to reach the goal.',
              concept: 'Sequencing', hint: 'Move forward, then turn, then move forward again.',
              size: 5, start: [0, 0], startDir: 2, goal: [2, 2], walls: [[1, 1], [2, 0], [2, 1]], gems: [],
              check: function(rp) { return rp.x === 2 && rp.y === 2; }
            },
            {
              id: 'r3', title: '3. Repeat Yourself', desc: 'Use a Repeat block to reach the goal efficiently.',
              concept: 'Loops', hint: 'Use "Repeat 4" with "Move Forward" inside.',
              size: 6, start: [0, 3], startDir: 1, goal: [4, 3], walls: [], gems: [],
              check: function(rp) { return rp.x === 4 && rp.y === 3; }
            },
            {
              id: 'r4', title: '4. Gem Collector', desc: 'Move through the path and collect all 3 gems!',
              concept: 'Sequencing + Actions', hint: 'Move to each gem and use "Collect Gem" on each one.',
              size: 5, start: [0, 2], startDir: 1, goal: [4, 2], walls: [[1, 1], [1, 3], [3, 1], [3, 3]], gems: [[1, 2], [2, 2], [3, 2]],
              check: function(rp, trail, grid) {
                var allCollected = true;
                for (var gy = 0; gy < grid.length; gy++) for (var gx = 0; gx < grid[0].length; gx++) { if (grid[gy][gx].gem) allCollected = false; }
                return allCollected && rp.x === 4 && rp.y === 2;
              }
            },
            {
              id: 'r5', title: '5. Wall Detective', desc: 'Use "If Wall Ahead" to navigate a maze with turns!',
              concept: 'Conditionals', hint: 'Combine "While Not At Goal" with "If Wall Ahead" → Turn Right, else → Move Forward.',
              size: 6, start: [0, 0], startDir: 1, goal: [5, 5],
              walls: [[2, 0], [2, 1], [2, 2], [4, 2], [4, 3], [4, 4], [1, 4], [2, 4], [0, 2], [0, 3]],
              gems: [],
              check: function(rp) { return rp.x === 5 && rp.y === 5; }
            },
            {
              id: 'r6', title: '6. Painter Bot', desc: 'Paint all the unpainted cells in the row!',
              concept: 'Loops + Actions', hint: 'Use Repeat with "Move Forward" and "Paint Cell".',
              size: 5, start: [0, 2], startDir: 1, goal: [4, 2], walls: [], gems: [],
              check: function(rp, trail, grid) {
                for (var px = 0; px <= 4; px++) { if (!grid[2][px].painted) return false; }
                return rp.x === 4 && rp.y === 2;
              }
            },
            {
              id: 'r7', title: '7. Spiral Maze', desc: 'Navigate the spiral maze using loops and conditionals!',
              concept: 'Conditionals + Loops', hint: 'Try "While Not At Goal": If Wall → Turn Right, else → Move Forward.',
              size: 7, start: [0, 0], startDir: 2, goal: [3, 3],
              walls: [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
                      [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
                      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4],
                      [2, 4], [1, 4], [0, 4]],
              gems: [[3, 1], [5, 3], [3, 5], [1, 3]],
              check: function(rp) { return rp.x === 3 && rp.y === 3; }
            },
            {
              id: 'r8', title: '8. Gem Sweep', desc: 'Collect ALL gems and reach the goal! Use everything you learned.',
              concept: 'Algorithm Design', hint: 'Plan your path carefully. You may need nested loops!',
              size: 6, start: [0, 0], startDir: 1, goal: [5, 5],
              walls: [[2, 1], [3, 1], [1, 3], [2, 3], [4, 3], [3, 5]],
              gems: [[1, 0], [4, 0], [0, 2], [5, 2], [3, 4], [2, 5]],
              check: function(rp, trail, grid) {
                for (var gy = 0; gy < grid.length; gy++) for (var gx = 0; gx < grid[0].length; gx++) { if (grid[gy][gx].gem) return false; }
                return rp.x === 5 && rp.y === 5;
              }
            }
          ];

          // ── Robot Execution Engine ──
          function executeRobotBlocks(rBlocks, startPos, startDir, grid, cb) {
            var pos = { x: startPos[0], y: startPos[1], dir: startDir };
            var gridCopy = JSON.parse(JSON.stringify(grid));
            var trail = [{ x: pos.x, y: pos.y }];
            var maxSteps = 500;
            var stepCount = 0;

            var DX = [0, 1, 0, -1]; // up, right, down, left
            var DY = [-1, 0, 1, 0];
            var size = gridCopy.length;

            function isWallAhead(p) {
              var nx = p.x + DX[p.dir], ny = p.y + DY[p.dir];
              if (nx < 0 || ny < 0 || nx >= size || ny >= size) return true;
              return gridCopy[ny][nx].wall;
            }

            function flattenRobot(bArr) {
              var flat = [];
              for (var j = 0; j < bArr.length; j++) {
                var blk = bArr[j];
                if (blk.type === 'repeatR') {
                  var times = blk.times || 3;
                  for (var r = 0; r < times; r++) {
                    flat = flat.concat(flattenRobot(blk.children || []));
                  }
                } else if (blk.type === 'whileNotGoal') {
                  // Expand up to maxSteps iterations
                  for (var w = 0; w < maxSteps; w++) {
                    flat = flat.concat(flattenRobot(blk.children || []));
                    flat.push({ type: '_checkGoal' });
                  }
                } else if (blk.type === 'ifWall') {
                  flat.push(blk); // defer evaluation
                } else if (blk.type === 'ifGem') {
                  flat.push(blk);
                } else {
                  flat.push(blk);
                }
              }
              return flat;
            }

            var flat = flattenRobot(rBlocks);
            var idx = 0;
            var reachedGoal = false;

            function step() {
              stepCount++;
              if (stepCount > maxSteps || idx >= flat.length || reachedGoal) {
                cb(pos, trail, gridCopy, reachedGoal);
                return;
              }
              var b = flat[idx];
              if (b.type === '_checkGoal') {
                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x] && gridCopy[pos.y][pos.x].goal) {
                  reachedGoal = true;
                  cb(pos, trail, gridCopy, true);
                  return;
                }
              } else if (b.type === 'moveForward') {
                var nx = pos.x + DX[pos.dir], ny = pos.y + DY[pos.dir];
                if (nx >= 0 && ny >= 0 && nx < size && ny < size && !gridCopy[ny][nx].wall) {
                  pos.x = nx; pos.y = ny;
                  trail.push({ x: pos.x, y: pos.y });
                }
              } else if (b.type === 'turnRight') {
                pos.dir = (pos.dir + 1) % 4;
              } else if (b.type === 'turnLeft') {
                pos.dir = (pos.dir + 3) % 4;
              } else if (b.type === 'collectGem') {
                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x]) gridCopy[pos.y][pos.x].gem = false;
              } else if (b.type === 'paintCell') {
                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x]) gridCopy[pos.y][pos.x].painted = true;
              } else if (b.type === 'ifWall') {
                var wallAhead = isWallAhead(pos);
                var branch = wallAhead ? (b.children || []) : (b.elseChildren || []);
                var branchFlat = flattenRobot(branch);
                var before = flat.slice(0, idx + 1);
                var after = flat.slice(idx + 1);
                flat = before.concat(branchFlat).concat(after);
              } else if (b.type === 'ifGem') {
                var onGem = gridCopy[pos.y] && gridCopy[pos.y][pos.x] && gridCopy[pos.y][pos.x].gem;
                var branch2 = onGem ? (b.children || []) : (b.elseChildren || []);
                var branchFlat2 = flattenRobot(branch2);
                var before2 = flat.slice(0, idx + 1);
                var after2 = flat.slice(idx + 1);
                flat = before2.concat(branchFlat2).concat(after2);
              }
              // Update state for animation
              updMulti({ robotPos: Object.assign({}, pos), robotTrail: trail.slice(), robotGrid: gridCopy, robotRunning: true });
              idx++;
              setTimeout(step, 250);
            }
            step();
          }

          function handleRobotRun() {
            var ch = robotChallengeIdx >= 0 && robotChallengeIdx < ROBOT_CHALLENGES.length ? ROBOT_CHALLENGES[robotChallengeIdx] : null;
            if (!ch) return;
            var grid = generateGrid(ch.size, ch.walls, ch.gems, ch.goal, ch.start);
            updMulti({ robotGrid: grid, robotPos: { x: ch.start[0], y: ch.start[1], dir: ch.startDir }, robotTrail: [{ x: ch.start[0], y: ch.start[1] }], robotRunning: true });
            setTimeout(function () {
              executeRobotBlocks(robotBlocks, ch.start, ch.startDir, grid, function (finalPos, trail, finalGrid, goalReached) {
                updMulti({ robotPos: finalPos, robotTrail: trail, robotGrid: finalGrid, robotRunning: false });
                if (ch.check(finalPos, trail, finalGrid)) {
                  if (robotCompleted.indexOf(ch.id) < 0) {
                    upd('robotCompleted', robotCompleted.concat([ch.id]));
                    awardStemXP('codingPlayground', 20, 'Robot Challenge: ' + ch.title);
                    if (addToast) addToast('\uD83E\uDD16 Robot Challenge "' + ch.title + '" complete! +20 XP', 'success');
                  }
                } else {
                  if (addToast) addToast('\uD83E\uDD14 Not quite! Check your logic and try again.', 'warning');
                }
              });
            }, 100);
          }

          function addRobotBlock(type) {
            var def = ROBOT_BLOCKS.find(function(b) { return b.type === type; });
            var newBlock = { type: type };
            if (type === 'repeatR') { newBlock.times = 3; newBlock.children = []; }
            if (type === 'ifWall' || type === 'ifGem') { newBlock.children = []; newBlock.elseChildren = []; }
            if (type === 'whileNotGoal') { newBlock.children = []; }
            upd('robotBlocks', robotBlocks.concat([newBlock]));
          }

          function removeRobotBlock(idx) {
            upd('robotBlocks', robotBlocks.filter(function(_, i) { return i !== idx; }));
          }

          function addRobotChildBlock(parentIdx, type, isElse) {
            var def = ROBOT_BLOCKS.find(function(b) { return b.type === type; });
            var newBlock = { type: type };
            if (type === 'repeatR') { newBlock.times = 3; newBlock.children = []; }
            if (type === 'ifWall' || type === 'ifGem') { newBlock.children = []; newBlock.elseChildren = []; }
            if (type === 'whileNotGoal') { newBlock.children = []; }
            var updated = robotBlocks.map(function(b, i) {
              if (i === parentIdx && (b.type === 'repeatR' || b.type === 'ifWall' || b.type === 'ifGem' || b.type === 'whileNotGoal')) {
                var nb = Object.assign({}, b);
                if (isElse) { nb.elseChildren = (nb.elseChildren || []).concat([newBlock]); }
                else { nb.children = (nb.children || []).concat([newBlock]); }
                return nb;
              }
              return b;
            });
            upd('robotBlocks', updated);
          }

          function loadRobotChallenge(idx) {
            var ch = ROBOT_CHALLENGES[idx];
            var grid = generateGrid(ch.size, ch.walls, ch.gems, ch.goal, ch.start);
            updMulti({ robotChallengeIdx: idx, robotBlocks: [], robotGrid: grid, robotPos: { x: ch.start[0], y: ch.start[1], dir: ch.startDir }, robotTrail: [{ x: ch.start[0], y: ch.start[1] }], robotRunning: false });
          }

          // ── Helper: analyze drawn lines for challenge checking ──
          function getEndpoints(lines) {
            if (lines.length === 0) return { closed: false, turns: 0, segments: 0 };
            var first = lines[0];
            var last = lines[lines.length - 1];
            var dist = Math.sqrt(Math.pow(last.x2 - first.x1, 2) + Math.pow(last.y2 - first.y1, 2));
            var totalAngle = 0;
            for (var i = 1; i < lines.length; i++) {
              var a1 = Math.atan2(lines[i - 1].y2 - lines[i - 1].y1, lines[i - 1].x2 - lines[i - 1].x1);
              var a2 = Math.atan2(lines[i].y2 - lines[i].y1, lines[i].x2 - lines[i].x1);
              var diff = (a2 - a1) * 180 / Math.PI;
              while (diff > 180) diff -= 360;
              while (diff < -180) diff += 360;
              totalAngle += Math.abs(diff);
            }
            return { closed: dist < 15, turns: totalAngle, segments: lines.length };
          }

          // ── Generate text code from blocks ──
          function blocksToText(blks, indent) {
            indent = indent || '';
            var lines = [];
            for (var i = 0; i < blks.length; i++) {
              var b = blks[i];
              if (b.type === 'forward') lines.push(indent + 'forward(' + (b.distance || 50) + ')');
              else if (b.type === 'backward') lines.push(indent + 'backward(' + (b.distance || 50) + ')');
              else if (b.type === 'right') lines.push(indent + 'right(' + (b.degrees || 90) + ')');
              else if (b.type === 'left') lines.push(indent + 'left(' + (b.degrees || 90) + ')');
              else if (b.type === 'penup') lines.push(indent + 'penUp()');
              else if (b.type === 'pendown') lines.push(indent + 'penDown()');
              else if (b.type === 'color') lines.push(indent + 'setColor("' + (b.color || '#6366f1') + '")');
              else if (b.type === 'width') lines.push(indent + 'setWidth(' + (b.width || 2) + ')');
              else if (b.type === 'circle') lines.push(indent + 'circle(' + (b.radius || 30) + ')');
              else if (b.type === 'goto') lines.push(indent + 'goto(' + (b.x != null ? b.x : 250) + ', ' + (b.y != null ? b.y : 250) + ')');
              else if (b.type === 'home') lines.push(indent + 'home()');
              else if (b.type === 'setVar') lines.push(indent + 'setVar("' + (b.varName || 'size') + '", ' + (b.varValue != null ? b.varValue : 50) + ')');
              else if (b.type === 'changeVar') lines.push(indent + 'changeVar("' + (b.varName || 'size') + '", ' + (b.varDelta != null ? b.varDelta : 10) + ')');
              else if (b.type === 'repeat') {
                lines.push(indent + 'repeat(' + (b.times || 4) + ', function() {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '})');
              } else if (b.type === 'ifelse') {
                lines.push(indent + 'if (' + (b.condition || 'x > 250') + ') {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '} else {');
                if (b.elseChildren && b.elseChildren.length > 0) {
                  lines.push(blocksToText(b.elseChildren, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'while') {
                lines.push(indent + 'while (' + (b.condition || 'x < 450') + ') {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'function') {
                lines.push(indent + 'function ' + (b.funcName || 'myShape') + '() {');
                if (b.children && b.children.length > 0) {
                  lines.push(blocksToText(b.children, indent + '  '));
                }
                lines.push(indent + '}');
              } else if (b.type === 'callFunction') {
                lines.push(indent + (b.funcName || 'myShape') + '()');
              } else if (b.type === 'random') {
                lines.push(indent + 'random("' + (b.varName || 'r') + '", ' + (b.randomMin || 0) + ', ' + (b.randomMax || 100) + ')');
              } else if (b.type === 'stamp') {
                lines.push(indent + 'stamp()');
              } else if (b.type === 'arc') {
                lines.push(indent + 'arc(' + (b.arcAngle || 180) + ', ' + (b.arcRadius || 30) + ')');
              } else if (b.type === 'playNote') {
                lines.push(indent + 'playNote(' + (b.frequency || 440) + ', ' + (b.duration || 200) + ')');
              } else if (b.type === 'spawnTurtle') {
                lines.push(indent + 'spawnTurtle("' + (b.turtleName || 'bob') + '")');
              } else if (b.type === 'switchTurtle') {
                lines.push(indent + 'switchTurtle("' + (b.turtleName || 'bob') + '")');
              }
            }
            return lines.join('\n');
          }

          // ── Parse text code to blocks ──
          function textToBlocks(code) {
            var result = [];
            var lineArr = code.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
            var i = 0;
            function parse() {
              var blks = [];
              while (i < lineArr.length) {
                var line = lineArr[i];
                if (line.match(/^}\)?;?$/) || line.match(/^\} else \{$/)) { i++; return blks; }
                var m;
                if ((m = line.match(/^forward\(([\$\w]+)\)/))) { blks.push({ type: 'forward', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^backward\(([\$\w]+)\)/))) { blks.push({ type: 'backward', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^right\(([\$\w]+)\)/))) { blks.push({ type: 'right', degrees: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^left\(([\$\w]+)\)/))) { blks.push({ type: 'left', degrees: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if (line.match(/^penUp\(\)/)) { blks.push({ type: 'penup' }); }
                else if (line.match(/^penDown\(\)/)) { blks.push({ type: 'pendown' }); }
                else if ((m = line.match(/^setColor\("([^"]+)"\)/))) { blks.push({ type: 'color', color: m[1] }); }
                else if ((m = line.match(/^setWidth\(([\$\w]+)\)/))) { blks.push({ type: 'width', width: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^circle\(([\$\w]+)\)/))) { blks.push({ type: 'circle', radius: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }
                else if ((m = line.match(/^goto\((\d+),\s*(\d+)\)/))) { blks.push({ type: 'goto', x: parseInt(m[1]), y: parseInt(m[2]) }); }
                else if (line.match(/^home\(\)/)) { blks.push({ type: 'home' }); }
                else if ((m = line.match(/^setVar\("([^"]+)",\s*(-?[\d.]+)\)/))) { blks.push({ type: 'setVar', varName: m[1], varValue: parseFloat(m[2]) }); }
                else if ((m = line.match(/^changeVar\("([^"]+)",\s*(-?[\d.]+)\)/))) { blks.push({ type: 'changeVar', varName: m[1], varDelta: parseFloat(m[2]) }); }
                else if ((m = line.match(/^if\s*\((.+)\)\s*\{/))) {
                  i++;
                  var ifChildren = parse();
                  // After parse returns, current line should be '} else {' or '}'
                  var elseChildren = [];
                  if (i < lineArr.length && lineArr[i - 1] && lineArr[i - 1].match(/\} else \{/)) {
                    elseChildren = parse();
                  }
                  blks.push({ type: 'ifelse', condition: m[1].trim(), children: ifChildren, elseChildren: elseChildren });
                  continue;
                }
                else if ((m = line.match(/^repeat\((\d+)/))) {
                  i++;
                  var children = parse();
                  blks.push({ type: 'repeat', times: parseInt(m[1]), children: children });
                  continue;
                }
                else if ((m = line.match(/^while\s*\((.+)\)\s*\{/))) {
                  i++;
                  var whileChildren = parse();
                  blks.push({ type: 'while', condition: m[1].trim(), children: whileChildren });
                  continue;
                }
                else if ((m = line.match(/^function\s+(\w+)\(\)\s*\{/))) {
                  i++;
                  var funcBody = parse();
                  blks.push({ type: 'function', funcName: m[1], children: funcBody });
                  continue;
                }
                else if ((m = line.match(/^(\w+)\(\)$/))) { blks.push({ type: 'callFunction', funcName: m[1] }); }
                else if ((m = line.match(/^random\("([^"]+)",\s*(-?[\d.]+),\s*(-?[\d.]+)\)/))) { blks.push({ type: 'random', varName: m[1], randomMin: parseFloat(m[2]), randomMax: parseFloat(m[3]) }); }
                else if (line.match(/^stamp\(\)/)) { blks.push({ type: 'stamp' }); }
                else if ((m = line.match(/^arc\(([\d.]+),\s*([\d.]+)\)/))) { blks.push({ type: 'arc', arcAngle: parseFloat(m[1]), arcRadius: parseFloat(m[2]) }); }
                else if ((m = line.match(/^playNote\(([\d.]+)(?:,\s*([\d.]+))?\)/))) { blks.push({ type: 'playNote', frequency: parseFloat(m[1]), duration: m[2] ? parseFloat(m[2]) : 200 }); }
                else if ((m = line.match(/^spawnTurtle\("([^"]+)"\)/))) { blks.push({ type: 'spawnTurtle', turtleName: m[1] }); }
                else if ((m = line.match(/^switchTurtle\("([^"]+)"\)/))) { blks.push({ type: 'switchTurtle', turtleName: m[1] }); }
                i++;
              }
              return blks;
            }
            return parse();
          }

          // ── Resolve variable values ──
          function resolveVal(val, vars) {
            if (typeof val === 'string' && val.charAt(0) === '$') {
              var vName = val.substring(1);
              return vars[vName] != null ? vars[vName] : 0;
            }
            return typeof val === 'number' ? val : (parseFloat(val) || 0);
          }

          // ── Evaluate condition against turtle state + vars ──
          function evalCondition(cond, turtle, vars) {
            if (!cond) return false;
            var m;
            // Pattern: lhs op rhs
            if ((m = cond.match(/^(\$?[\w.]+)\s*(>|<|>=|<=|==|!=)\s*(.+)$/))) {
              var lhsRaw = m[1].trim(), op = m[2], rhsRaw = m[3].trim();
              var lhs, rhs;
              // Resolve lhs
              if (lhsRaw === 'x') lhs = turtle.x;
              else if (lhsRaw === 'y') lhs = turtle.y;
              else if (lhsRaw === 'angle') lhs = turtle.angle;
              else if (lhsRaw === 'penDown') lhs = turtle.penDown;
              else if (lhsRaw.charAt(0) === '$') lhs = vars[lhsRaw.substring(1)] || 0;
              else lhs = parseFloat(lhsRaw) || 0;
              // Resolve rhs
              if (rhsRaw === 'true') rhs = true;
              else if (rhsRaw === 'false') rhs = false;
              else if (rhsRaw.charAt(0) === '$') rhs = vars[rhsRaw.substring(1)] || 0;
              else rhs = parseFloat(rhsRaw);
              if (isNaN(rhs) && typeof rhs !== 'boolean') rhs = 0;
              if (op === '>') return lhs > rhs;
              if (op === '<') return lhs < rhs;
              if (op === '>=') return lhs >= rhs;
              if (op === '<=') return lhs <= rhs;
              if (op === '==') return lhs == rhs;
              if (op === '!=') return lhs != rhs;
            }
            return false;
          }

          // ── Execute blocks (async with animation) ──
          function executeBlocks(blks, turtle, lines, cb, spd, stepCb) {
            var t = Object.assign({}, turtle);
            var allLines = lines.slice();
            var vars = {};

            function flattenBlocks(bArr) {
              var flat = [];
              for (var j = 0; j < bArr.length; j++) {
                var blk = bArr[j];
                if (blk.type === 'repeat') {
                  var times = blk.times || 4;
                  for (var r = 0; r < times; r++) {
                    flat = flat.concat(flattenBlocks(blk.children || []));
                  }
                } else if (blk.type === 'while') {
                  // While — push as marker for deferred evaluation in step()
                  flat.push(blk);
                } else if (blk.type === 'function') {
                  // Function definition — push as marker to register in step()
                  flat.push(blk);
                } else if (blk.type === 'ifelse') {
                  // defer evaluation — push a marker
                  flat.push(blk);
                } else {
                  flat.push(blk);
                }
              }
              return flat;
            }
            var flat = flattenBlocks(blks);
            var idx = 0;

            function step() {
              if (idx >= flat.length) {
                if (cb) cb(t, allLines);
                return;
              }
              var b = flat[idx];
              if (stepCb) stepCb(idx);

              if (b.type === 'setVar') {
                vars[b.varName || 'size'] = b.varValue != null ? b.varValue : 50;
              } else if (b.type === 'changeVar') {
                var vn = b.varName || 'size';
                vars[vn] = (vars[vn] || 0) + (b.varDelta != null ? b.varDelta : 10);
              } else if (b.type === 'ifelse') {
                var condResult = evalCondition(b.condition || 'x > 250', t, vars);
                var branch = condResult ? (b.children || []) : (b.elseChildren || []);
                var branchFlat = flattenBlocks(branch);
                // Insert branch blocks right after the current position
                var before = flat.slice(0, idx + 1);
                var after = flat.slice(idx + 1);
                flat = before.concat(branchFlat).concat(after);
              } else if (b.type === 'forward') {
                var dist = resolveVal(b.distance != null ? b.distance : 50, vars);
                var rad = t.angle * Math.PI / 180;
                var nx = t.x + Math.cos(rad) * dist;
                var ny = t.y + Math.sin(rad) * dist;
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: nx, y2: ny, color: t.color, width: t.width });
                }
                t.x = nx; t.y = ny;
              } else if (b.type === 'backward') {
                var dist2 = resolveVal(b.distance != null ? b.distance : 50, vars);
                var rad2 = t.angle * Math.PI / 180;
                var nx2 = t.x - Math.cos(rad2) * dist2;
                var ny2 = t.y - Math.sin(rad2) * dist2;
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: nx2, y2: ny2, color: t.color, width: t.width });
                }
                t.x = nx2; t.y = ny2;
              } else if (b.type === 'right') {
                t.angle = (t.angle + resolveVal(b.degrees != null ? b.degrees : 90, vars)) % 360;
              } else if (b.type === 'left') {
                t.angle = (t.angle - resolveVal(b.degrees != null ? b.degrees : 90, vars) + 360) % 360;
              } else if (b.type === 'penup') {
                t.penDown = false;
              } else if (b.type === 'pendown') {
                t.penDown = true;
              } else if (b.type === 'color') {
                t.color = b.color || '#6366f1';
              } else if (b.type === 'width') {
                t.width = resolveVal(b.width != null ? b.width : 2, vars);
              } else if (b.type === 'circle') {
                var cRadius = resolveVal(b.radius != null ? b.radius : 30, vars);
                if (t.penDown) {
                  var segs = 36;
                  for (var si = 0; si < segs; si++) {
                    var a1 = t.angle + (si / segs) * 360;
                    var a2 = t.angle + ((si + 1) / segs) * 360;
                    var r1 = a1 * Math.PI / 180;
                    var r2 = a2 * Math.PI / 180;
                    var cx1 = t.x + cRadius * (Math.cos(r1) - Math.cos(t.angle * Math.PI / 180));
                    var cy1 = t.y + cRadius * (Math.sin(r1) - Math.sin(t.angle * Math.PI / 180));
                    var cx2 = t.x + cRadius * (Math.cos(r2) - Math.cos(t.angle * Math.PI / 180));
                    var cy2 = t.y + cRadius * (Math.sin(r2) - Math.sin(t.angle * Math.PI / 180));
                    allLines.push({ x1: cx1, y1: cy1, x2: cx2, y2: cy2, color: t.color, width: t.width });
                  }
                }
              } else if (b.type === 'goto') {
                var gx = b.x != null ? b.x : 250;
                var gy = b.y != null ? b.y : 250;
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: gx, y2: gy, color: t.color, width: t.width });
                }
                t.x = gx; t.y = gy;
              } else if (b.type === 'home') {
                if (t.penDown) {
                  allLines.push({ x1: t.x, y1: t.y, x2: 250, y2: 250, color: t.color, width: t.width });
                }
                t.x = 250; t.y = 250; t.angle = -90;
              } else if (b.type === 'while') {
                // While loop: evaluate condition and insert children + self if true (with safety cap)
                if (!b._iterCount) b._iterCount = 0;
                if (b._iterCount < 1000 && evalCondition(b.condition || 'x < 450', t, vars)) {
                  b._iterCount++;
                  var whileBody = flattenBlocks(b.children || []);
                  var whileMarker = Object.assign({}, b); // re-evaluate on next pass
                  var beforeW = flat.slice(0, idx + 1);
                  var afterW = flat.slice(idx + 1);
                  flat = beforeW.concat(whileBody).concat([whileMarker]).concat(afterW);
                } else {
                  b._iterCount = 0; // reset for next run
                }
              } else if (b.type === 'function') {
                // Function definition — store in registry, don't execute
                vars['__func_' + (b.funcName || 'myShape')] = b.children || [];
              } else if (b.type === 'callFunction') {
                // Call function — insert its body into execution stream
                var funcBody = vars['__func_' + (b.funcName || 'myShape')];
                if (funcBody && funcBody.length > 0) {
                  var callBody = flattenBlocks(JSON.parse(JSON.stringify(funcBody)));
                  var beforeC = flat.slice(0, idx + 1);
                  var afterC = flat.slice(idx + 1);
                  flat = beforeC.concat(callBody).concat(afterC);
                }
              } else if (b.type === 'random') {
                // Random — set variable to random value in [min, max]
                var rMin = b.randomMin != null ? b.randomMin : 0;
                var rMax = b.randomMax != null ? b.randomMax : 100;
                vars[b.varName || 'r'] = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
              } else if (b.type === 'stamp') {
                // Stamp — duplicate all current lines at current position (creates a "stamp")
                if (allLines.length > 0) {
                  var stampLines = allLines.slice();
                  var ox = stampLines[0].x1, oy = stampLines[0].y1;
                  var dx = t.x - ox, dy = t.y - oy;
                  for (var si = 0; si < stampLines.length; si++) {
                    allLines.push({ x1: stampLines[si].x1 + dx, y1: stampLines[si].y1 + dy, x2: stampLines[si].x2 + dx, y2: stampLines[si].y2 + dy, color: stampLines[si].color, width: stampLines[si].width });
                  }
                }
              } else if (b.type === 'arc') {
                // Arc — draw a portion of a circle (arcAngle degrees, arcRadius pixels)
                var arcAngle = resolveVal(b.arcAngle != null ? b.arcAngle : 180, vars);
                var arcRadius = resolveVal(b.arcRadius != null ? b.arcRadius : 30, vars);
                if (t.penDown) {
                  var arcSegs = Math.max(8, Math.ceil(Math.abs(arcAngle) / 10));
                  var arcStep = arcAngle / arcSegs;
                  var prevX = t.x, prevY = t.y;
                  for (var ai = 1; ai <= arcSegs; ai++) {
                    var curAngle = t.angle + arcStep * ai;
                    var curRad = curAngle * Math.PI / 180;
                    var stepDist = (2 * arcRadius * Math.sin(Math.abs(arcStep) * Math.PI / 360));
                    var ax = prevX + Math.cos((t.angle + arcStep * (ai - 0.5)) * Math.PI / 180) * stepDist;
                    var ay = prevY + Math.sin((t.angle + arcStep * (ai - 0.5)) * Math.PI / 180) * stepDist;
                    allLines.push({ x1: prevX, y1: prevY, x2: ax, y2: ay, color: t.color, width: t.width });
                    prevX = ax; prevY = ay;
                  }
                  t.x = prevX; t.y = prevY;
                }
                t.angle = (t.angle + arcAngle) % 360;
              } else if (b.type === 'spawnTurtle') {
                // Spawn a named turtle at current position
                var tName = b.turtleName || 'bob';
                var newT = { name: tName, x: t.x, y: t.y, angle: t.angle, penDown: true, color: '#22c55e', width: 2, skin: '🐢' };
                var existing = extraTurtles.filter(function(et) { return et.name !== tName; });
                existing.push(newT);
                upd('extraTurtles', existing);
              } else if (b.type === 'switchTurtle') {
                // Switch to a named turtle
                var sName = b.turtleName || 'bob';
                var found = extraTurtles.find(function(et) { return et.name === sName; });
                if (found) {
                  // Save current main turtle state, load the named one
                  var mainTurtle = Object.assign({}, t);
                  t.x = found.x; t.y = found.y; t.angle = found.angle;
                  t.penDown = found.penDown; t.color = found.color; t.width = found.width;
                }
              } else if (b.type === 'playNote') {
                // Play Note — use Web Audio API for sound
                try {
                  var audioCtx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                  var osc = audioCtx.createOscillator();
                  var gain = audioCtx.createGain();
                  osc.type = 'sine';
                  osc.frequency.value = resolveVal(b.frequency != null ? b.frequency : 440, vars);
                  gain.gain.value = 0.15;
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  var noteDur = (b.duration || 200) / 1000;
                  osc.start();
                  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteDur);
                  osc.stop(audioCtx.currentTime + noteDur + 0.05);
                } catch(e) { /* Audio not available */ }
              }
              updMulti({ turtle: Object.assign({}, t), lines: allLines.slice(), stepIdx: idx, running: true });
              recordFrame(t, allLines, idx);
              idx++;
              setTimeout(step, spd || 200);
            }
            step();
          }

          // ── Run handler ──
          function handleRun() {
            var blks = codeMode === 'text' ? textToBlocks(textCode) : blocks;
            var startTurtle, startLines;
            if (cumulativeMode) {
              // In cumulative mode, start from current turtle state and keep existing lines
              startTurtle = Object.assign({}, turtleState);
              startLines = drawnLines.slice();
            } else {
              startTurtle = { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };
              startLines = [];
            }
            updMulti({ turtle: startTurtle, lines: startLines, running: true, stepIdx: 0, timelineFrames: [], timelinePos: -1 });
            setTimeout(function () {
              executeBlocks(blks, startTurtle, startLines, function (finalTurtle, finalLines) {
                var newHistory = runHistory.concat([{
                  blocks: blks.slice(),
                  linesCount: finalLines.length - startLines.length,
                  timestamp: Date.now()
                }]);
                updMulti({ turtle: finalTurtle, lines: finalLines, running: false, stepIdx: -1, history: newHistory });
                setTimeout(checkBadges, 100);
                if (challengeIdx >= 0 && challengeIdx < CHALLENGES.length) {
                  var ch = CHALLENGES[challengeIdx];
                  if (ch.check(finalLines, blks)) {
                    if (completed.indexOf(ch.id) < 0) {
                      var newCompleted = completed.concat([ch.id]);
                      upd('completed', newCompleted);
                      awardStemXP('codingPlayground', 15, 'Completed: ' + ch.title);
                      // Victory sound effect
                      try {
                        var actx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                        var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
                        notes.forEach(function(freq, ni) {
                          var o = actx.createOscillator(); var g = actx.createGain();
                          o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.12;
                          o.connect(g); g.connect(actx.destination);
                          o.start(actx.currentTime + ni * 0.12);
                          g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + ni * 0.12 + 0.3);
                          o.stop(actx.currentTime + ni * 0.12 + 0.35);
                        });
                      } catch(e) {}
                      if (addToast) addToast('🎉 Challenge "' + ch.title + '" complete!', 'success');
                    }
                  }
                }
              }, speed, function (si) {
                upd('stepIdx', si);
              });
            }, 50);
          }

          function handleClear() {
            updMulti({ turtle: { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 }, lines: [], running: false, stepIdx: -1, history: [] });
          }

          function handleReset() {
            updMulti({ blocks: [], turtle: { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 }, lines: [], running: false, stepIdx: -1, textCode: '', challengeIdx: -1, history: [], cumulativeMode: false, showTurtle: true });
          }

          // ── Undo/Redo helpers ──
          function pushUndo() {
            var newUndo = undoStack.concat([JSON.parse(JSON.stringify(blocks))]);
            if (newUndo.length > 50) newUndo = newUndo.slice(-50);
            updMulti({ undoStack: newUndo, redoStack: [] });
          }
          function handleUndo() {
            if (undoStack.length === 0) return;
            var prev = undoStack[undoStack.length - 1];
            var newUndo = undoStack.slice(0, -1);
            var newRedo = redoStack.concat([JSON.parse(JSON.stringify(blocks))]);
            updMulti({ blocks: prev, undoStack: newUndo, redoStack: newRedo });
            if (codeMode === 'text') upd('textCode', blocksToText(prev));
          }
          function handleRedo() {
            if (redoStack.length === 0) return;
            var next = redoStack[redoStack.length - 1];
            var newRedo = redoStack.slice(0, -1);
            var newUndo = undoStack.concat([JSON.parse(JSON.stringify(blocks))]);
            updMulti({ blocks: next, undoStack: newUndo, redoStack: newRedo });
            if (codeMode === 'text') upd('textCode', blocksToText(next));
          }


          // ── AI Assistant Functions ──
          function handleExplainCode() {
            if (!callGemini || blocks.length === 0) {
              if (addToast) addToast('Add some blocks first!', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocksToText(blocks);
            var prompt = 'You are a friendly coding tutor for kids. The student wrote this turtle graphics program:\n\n' + code + '\n\nExplain in 2-3 simple sentences what this program does and what shape it will draw. Use encouraging language and emojis.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', result || 'I could not analyze this code right now.');
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', 'Oops! AI is not available right now. Try again later.');
              upd('aiLoading', false);
            });
          }

          function handleSuggestNext() {
            if (!callGemini) {
              if (addToast) addToast('AI not available', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocks.length > 0 ? blocksToText(blocks) : '(empty program)';
            var prompt = 'You are a friendly coding tutor. The student has this turtle graphics program so far:\n\n' + code + '\n\nSuggest ONE specific next step they could try to make their drawing more interesting. Be encouraging, use emojis, and keep it to 1-2 sentences. Mention the exact block name they should add.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', '💡 ' + (result || 'Try adding a Repeat block to create a pattern!'));
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', '💡 Try adding a Repeat block around your moves to create a pattern!');
              upd('aiLoading', false);
            });
          }

          function handleDebugHelp() {
            if (!callGemini || challengeIdx < 0) {
              if (addToast) addToast('Select a challenge first!', 'info');
              return;
            }
            upd('aiLoading', true);
            upd('showAIPanel', true);
            var code = blocks.length > 0 ? blocksToText(blocks) : '(empty program)';
            var ch = CHALLENGES[challengeIdx];
            var prompt = 'You are a friendly coding tutor. The student is trying to solve this challenge:\n\nTitle: ' + ch.title + '\nGoal: ' + ch.desc + '\nHint: ' + ch.hint + '\n\nTheir current code:\n' + code + '\n\nGive them a specific, encouraging hint about what might be wrong or what to try next. Do NOT give the full solution. Use emojis and keep it to 2-3 sentences.';
            callGemini(prompt).then(function(result) {
              upd('aiExplanation', '🐛 ' + (result || ch.hint));
              upd('aiLoading', false);
            }).catch(function() {
              upd('aiExplanation', '🐛 Hint: ' + ch.hint);
              upd('aiLoading', false);
            });
          }

          // ── Export SVG ──
          function handleExportSVG() {
            if (drawnLines.length === 0) {
              if (addToast) addToast('Draw something first!', 'info');
              return;
            }
            var svgLines = drawnLines.map(function(l) {
              return '<line x1="' + l.x1 + '" y1="' + l.y1 + '" x2="' + l.x2 + '" y2="' + l.y2 + '" stroke="' + l.color + '" stroke-width="' + l.width + '" stroke-linecap="round"/>';
            }).join('\n  ');
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">\n  <rect width="500" height="500" fill="#0f172a"/>\n  ' + svgLines + '\n</svg>';
            var blob = new Blob([svg], { type: 'image/svg+xml' });
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.download = 'coding_playground_' + Date.now() + '.svg';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            if (addToast) addToast('📥 SVG exported!', 'success');
          }

          // ── Share Link ──
          function handleShareLink() {
            if (blocks.length === 0) {
              if (addToast) addToast('Add some blocks first!', 'info');
              return;
            }
            try {
              var encoded = btoa(JSON.stringify(blocks));
              var url = window.location.origin + window.location.pathname + '?codingShare=' + encoded;
              navigator.clipboard.writeText(url).then(function() {
                if (addToast) addToast('🔗 Share link copied to clipboard!', 'success');
              });
            } catch(e) {
              if (addToast) addToast('Could not generate share link', 'error');
            }
          }


          // ── Import/Export JSON ──
          function handleExportJSON() {
            if (blocks.length === 0) { if (addToast) addToast('Add some blocks first!', 'info'); return; }
            var data = JSON.stringify({ blocks: blocks, version: 2, skin: turtleSkin }, null, 2);
            var blob = new Blob([data], { type: 'application/json' });
            var link = document.createElement('a');
            link.download = 'coding_program_' + Date.now() + '.json';
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            if (addToast) addToast('📥 Program exported as JSON!', 'success');
          }

          function handleImportJSON() {
            var input = document.createElement('input');
            input.type = 'file'; input.accept = '.json';
            input.onchange = function(e) {
              var file = e.target.files[0];
              if (!file) return;
              var reader = new FileReader();
              reader.onload = function(ev) {
                try {
                  var data = JSON.parse(ev.target.result);
                  if (data.blocks && Array.isArray(data.blocks)) {
                    pushUndo();
                    updMulti({ blocks: data.blocks });
                    if (data.skin) upd('turtleSkin', data.skin);
                    if (codeMode === 'text') upd('textCode', blocksToText(data.blocks));
                    if (addToast) addToast('📂 Program imported! (' + data.blocks.length + ' blocks)', 'success');
                  } else {
                    if (addToast) addToast('Invalid program file', 'error');
                  }
                } catch(err) {
                  if (addToast) addToast('Could not parse file: ' + err.message, 'error');
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }

          // ── Animation Timeline — record frames during execution ──
          function recordFrame(turtle, lines, idx) {
            var frames = timelineFrames.slice();
            frames.push({ turtle: Object.assign({}, turtle), lines: lines.slice(), stepIdx: idx });
            upd('timelineFrames', frames);
          }

          function seekTimeline(pos) {
            if (pos >= 0 && pos < timelineFrames.length) {
              var frame = timelineFrames[pos];
              updMulti({ turtle: frame.turtle, lines: frame.lines, stepIdx: frame.stepIdx, timelinePos: pos });
            }
          }

          // ── Background Music Loop ──
          function toggleBgMusic() {
            if (bgMusicPlaying) {
              upd('bgMusicPlaying', false);
              if (window.__bgMusicInterval) { clearInterval(window.__bgMusicInterval); window.__bgMusicInterval = null; }
              return;
            }
            if (bgMusicNotes.length === 0) {
              upd('bgMusicNotes', [262, 330, 392, 330]); // C-E-G-E chord loop
            }
            var notes = bgMusicNotes.length > 0 ? bgMusicNotes : [262, 330, 392, 330];
            upd('bgMusicPlaying', true);
            var noteIdx = 0;
            window.__bgMusicInterval = setInterval(function() {
              try {
                var actx = window.__codingAudioCtx || (window.__codingAudioCtx = new (window.AudioContext || window.webkitAudioContext)());
                var o = actx.createOscillator(); var g = actx.createGain();
                o.type = 'triangle'; o.frequency.value = notes[noteIdx % notes.length];
                g.gain.value = 0.08; o.connect(g); g.connect(actx.destination);
                o.start(); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.3);
                o.stop(actx.currentTime + 0.35);
                noteIdx++;
              } catch(e) {}
            }, 400);
          }

          // ── Coordinate Picker Handler ──
          function handleCanvasClick(e) {
            if (!showCoordPicker) return;
            var rect = e.target.getBoundingClientRect();
            var scaleX = 500 / rect.width, scaleY = 500 / rect.height;
            var cx = Math.round((e.clientX - rect.left) * scaleX);
            var cy = Math.round((e.clientY - rect.top) * scaleY);
            pushUndo();
            var updated = blocks.concat([{ type: 'goto', x: cx, y: cy }]);
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
            upd('showCoordPicker', false);
            if (addToast) addToast('📍 Added goto(' + cx + ', ' + cy + ')', 'success');
          }

          // ── Export PNG ──
          function handleExportPNG() {
            if (!canvasRef || !canvasRef.current) return;
            var dataURL = canvasRef.current.toDataURL('image/png');
            var link = document.createElement('a');
            link.download = 'coding_playground_' + Date.now() + '.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (addToast) addToast('📥 PNG exported!', 'success');
          }

          // ── Load template ──
          function loadTemplate(tmpl) {
            if (blocks.length > 0 && !confirm('Replace current program with template?')) return;
            pushUndo();
            var tBlocks = JSON.parse(JSON.stringify(tmpl.blocks));
            updMulti({ blocks: tBlocks, showTemplates: false });
            if (codeMode === 'text') upd('textCode', blocksToText(tBlocks));
            if (addToast) addToast('📂 Loaded: ' + tmpl.name, 'info');
          }

          // ── Drag and drop state ──
          var dragIdxRef = { current: null };

          function addBlock(type) {
            pushUndo();
            var def = BLOCK_TYPES.find(function (bt) { return bt.type === type; });
            var newBlock = { type: type };
            if (def && def.param) newBlock[def.param] = def.defaultVal;
            if (type === 'repeat') newBlock.children = [];
            if (type === 'ifelse') { newBlock.children = []; newBlock.elseChildren = []; newBlock.condition = 'x > 250'; }
            if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
            if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }
            var updated = blocks.concat([newBlock]);
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }

          function removeBlock(idx) {
            pushUndo();
            var updated = blocks.filter(function (_, i) { return i !== idx; });
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }

          function updateBlockParam(idx, param, val) {
            var updated = blocks.map(function (b, i) {
              if (i === idx) { var nb = Object.assign({}, b); nb[param] = val; return nb; }
              return b;
            });
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }

          function addChildBlock(parentIdx, type, isElse) {
            pushUndo();
            var def = BLOCK_TYPES.find(function (bt) { return bt.type === type; });
            var newBlock = { type: type };
            if (def && def.param) newBlock[def.param] = def.defaultVal;
            if (type === 'repeat') newBlock.children = [];
            if (type === 'setVar') { newBlock.varName = 'size'; newBlock.varValue = 50; }
            if (type === 'changeVar') { newBlock.varName = 'size'; newBlock.varDelta = 10; }
            var updated = blocks.map(function (b, i) {
              if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse' || b.type === 'while' || b.type === 'function')) {
                var nb = Object.assign({}, b);
                if (isElse && b.type === 'ifelse') {
                  nb.elseChildren = (nb.elseChildren || []).concat([newBlock]);
                } else {
                  nb.children = (nb.children || []).concat([newBlock]);
                }
                return nb;
              }
              return b;
            });
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }

          function removeChildBlock(parentIdx, childIdx, isElse) {
            pushUndo();
            var updated = blocks.map(function (b, i) {
              if (i === parentIdx && (b.type === 'repeat' || b.type === 'ifelse' || b.type === 'while' || b.type === 'function')) {
                var nb = Object.assign({}, b);
                if (isElse && b.type === 'ifelse') {
                  nb.elseChildren = (nb.elseChildren || []).filter(function (_, ci) { return ci !== childIdx; });
                } else {
                  nb.children = (nb.children || []).filter(function (_, ci) { return ci !== childIdx; });
                }
                return nb;
              }
              return b;
            });
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }

          function toggleMode() {
            if (codeMode === 'blocks') {
              upd('textCode', blocksToText(blocks));
              upd('codeMode', 'text');
            } else {
              upd('blocks', textToBlocks(textCode));
              upd('codeMode', 'blocks');
            }
          }

          function moveBlock(idx, dir) {
            pushUndo();
            var newIdx = idx + dir;
            if (newIdx < 0 || newIdx >= blocks.length) return;
            var updated = blocks.slice();
            var tmp = updated[idx];
            updated[idx] = updated[newIdx];
            updated[newIdx] = tmp;
            upd('blocks', updated);
          }

          function handleDragStart(e, idx) {
            dragIdxRef.current = idx;
            e.dataTransfer.effectAllowed = 'move';
            e.currentTarget.style.opacity = '0.4';
          }
          function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.style.borderTop = '3px solid #818cf8';
          }
          function handleDragLeave(e) {
            e.currentTarget.style.borderTop = '';
          }
          function handleDrop(e, dropIdx) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '';
            var fromIdx = dragIdxRef.current;
            if (fromIdx == null || fromIdx === dropIdx) return;
            pushUndo();
            var updated = blocks.slice();
            var moved = updated.splice(fromIdx, 1)[0];
            var targetIdx = fromIdx < dropIdx ? dropIdx - 1 : dropIdx;
            updated.splice(targetIdx, 0, moved);
            upd('blocks', updated);
            if (codeMode === 'text') upd('textCode', blocksToText(updated));
          }
          function handleDragEnd(e) {
            e.currentTarget.style.opacity = '1';
            dragIdxRef.current = null;
          }

          // ── Tutorial steps ──
          var TUTORIAL_STEPS = [
            { target: '.coding-toolbox', title: 'Welcome!', text: 'Add coding blocks from this Toolbox to build your program.' },
            { target: '.coding-program', title: 'Your Program', text: 'Each block is a command. Set values with the number inputs. Drag blocks to reorder!' },
            { target: '.coding-run-btn', title: 'Run It!', text: 'Click Run to watch your program execute step by step on the canvas.' },
            { target: '.coding-challenges', title: 'Challenges', text: 'Try Challenges to learn CS concepts like loops and earn XP! 🏆' },
            { target: '.coding-mode-toggle', title: 'Code Mode', text: 'Switch to Code mode for JavaScript-like syntax. Everything stays in sync!' }
          ];


          // ── Keyboard Shortcuts ──
          if (typeof document !== 'undefined') {
            var _kbHandler = function(e) {
              // Only handle if Coding Playground is active
              if (!document.querySelector('.coding-run-btn')) return;
              if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
              else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
              else if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); if (!running) handleRun(); }
              else if (e.key === 'Escape') { if (running) updMulti({ running: false, stepIdx: -1 }); }
            };
            // Attach once using a flag
            if (!window.__codingKBAttached) {
              document.addEventListener('keydown', _kbHandler);
              window.__codingKBAttached = true;
            }
          }
          // NOTE: Coding Playground canvas hooks (useRef + useEffect) have been hoisted
          // to top level of StemLabModal to satisfy React Rules of Hooks.
          // The ref is available as _codingCanvasRef.
          var canvasRef = _codingCanvasRef;

          // Canvas click handler for coordinate picker
          var canvasClickHandler = handleCanvasClick;

          // ── Render ──
          // Helper: render a single child block within repeat/ifelse
          function renderChildBlock(child, ci, parentIdx, isElse) {
            var cdef = BLOCK_TYPES.find(function (bt) { return bt.type === child.type; });
            return React.createElement("div", {
              key: (isElse ? 'e' : 'i') + ci,
              className: "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-white",
              style: { backgroundColor: cdef ? cdef.color : '#64748b', opacity: 0.85 }
            },
              React.createElement("span", { className: "flex-1 truncate" },
                cdef ? cdef.label : child.type,
                cdef && cdef.param && child.type !== 'color' ? ' ' + (child[cdef.param] || cdef.defaultVal) + (cdef.unit || '') : ''
              ),
              React.createElement("button", { onClick: function () { removeChildBlock(parentIdx, ci, isElse); }, className: "text-white/50 hover:text-red-300 text-xs" }, "×")
            );
          }

          // Helper: render quick-add buttons for children
          function renderQuickAdd(parentIdx, isElse) {
            return React.createElement("div", { className: "flex flex-wrap gap-1 mt-1" },
              ['forward', 'backward', 'right', 'left', 'circle', 'color', 'playNote', 'random'].map(function (ct) {
                return React.createElement("button", {
                  key: ct, onClick: function () { addChildBlock(parentIdx, ct, isElse); },
                  className: "px-2 py-0.5 rounded text-[10px] bg-slate-600 text-slate-300 hover:bg-slate-500 transition-colors"
                }, ct === 'forward' ? '+🐢' : ct === 'backward' ? '+🔙' : ct === 'right' ? '+↩️' : ct === 'left' ? '+↪️' : ct === 'circle' ? '+⭕' : ct === 'playNote' ? '+🎵' : ct === 'random' ? '+🎲' : '+🎨');
              })
            );
          }

          return React.createElement("div", {
            className: "grid gap-4 relative",
            style: { gridTemplateColumns: '220px 1fr', gridTemplateRows: 'auto auto' }
          },
            // ── Templates gallery overlay ──
            showTemplates && React.createElement("div", {
              className: "col-span-2 bg-slate-800/95 backdrop-blur-sm rounded-xl p-4 border border-amber-500/30 shadow-2xl z-10",
              style: { position: 'relative' }
            },
              React.createElement("div", { className: "flex items-center justify-between mb-3" },
                React.createElement("h3", { className: "text-sm font-bold text-amber-300" }, "📂 Starter Templates"),
                React.createElement("button", {
                  onClick: function () { upd('showTemplates', false); },
                  className: "text-slate-400 hover:text-white text-lg px-2"
                }, "×")
              ),
              React.createElement("div", {
                className: "grid gap-2",
                style: { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }
              },
                TEMPLATES.map(function (tmpl, ti) {
                  return React.createElement("button", {
                    key: ti,
                    onClick: function () { loadTemplate(tmpl); },
                    className: "flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-700/80 hover:bg-slate-600 border border-slate-600 hover:border-amber-500/50 transition-all text-left group"
                  },
                    React.createElement("span", { className: "text-2xl group-hover:scale-110 transition-transform" }, tmpl.icon),
                    React.createElement("span", { className: "text-xs font-bold text-white text-center" }, tmpl.name),
                    React.createElement("span", { className: "text-[10px] text-slate-400 text-center leading-tight" }, tmpl.desc),
                    React.createElement("span", { className: "text-[9px] text-amber-400/70 mt-0.5" }, tmpl.blocks.length + ' blocks')
                  );
                })
              )
            ),

            // ── Tutorial overlay ──
            !tutorialDismissed && blocks.length === 0 && !running && React.createElement("div", {
              className: "col-span-2 bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-sm rounded-xl p-4 border border-indigo-400/40 shadow-2xl z-10"
            },
              React.createElement("div", { className: "flex items-start gap-3" },
                React.createElement("span", { className: "text-3xl" }, "🎓"),
                React.createElement("div", { className: "flex-1" },
                  React.createElement("h3", { className: "text-sm font-bold text-white mb-2" }, "Welcome to the Coding Playground!"),
                  React.createElement("div", { className: "grid gap-2", style: { gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' } },
                    TUTORIAL_STEPS.map(function (step, si) {
                      return React.createElement("div", {
                        key: si,
                        className: "flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                      },
                        React.createElement("span", { className: "text-lg font-bold text-indigo-300 mt-0.5" }, (si + 1) + '.'),
                        React.createElement("div", null,
                          React.createElement("span", { className: "text-xs font-bold text-indigo-200" }, step.title),
                          React.createElement("p", { className: "text-[10px] text-indigo-300/70 leading-snug mt-0.5" }, step.text)
                        )
                      );
                    })
                  )
                ),
                React.createElement("button", {
                  onClick: function () { upd('tutorialDismissed', true); },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-all shrink-0"
                }, "Got it! ✕")
              )
            ),

            // ── Header bar ──
            React.createElement("div", {
              className: "col-span-2 flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg"
            },
              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-white/20 rounded-lg transition-all", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 20, className: "text-white" })),
              React.createElement("span", { className: "text-2xl" }, playgroundMode === 'robot' ? "\uD83E\uDD16" : "\uD83D\uDDA5\uFE0F"),
              React.createElement("div", { className: "flex-1" },
                React.createElement("h2", { className: "text-white font-bold text-lg" }, "Coding Playground"),
                React.createElement("p", { className: "text-indigo-200 text-xs" },
                  playgroundMode === 'robot' ? (robotChallengeIdx >= 0 ? '\uD83C\uDFAF ' + ROBOT_CHALLENGES[robotChallengeIdx].title + ' — ' + ROBOT_CHALLENGES[robotChallengeIdx].desc : 'Program a robot to navigate mazes, collect gems, and solve puzzles!') :
                  (challengeIdx >= 0 ? '\uD83C\uDFAF ' + CHALLENGES[challengeIdx].title + ' — ' + CHALLENGES[challengeIdx].desc :
                    'Build programs with blocks or code. The turtle draws your creation!')
                )
              ),
              // Playground Mode Tabs (Turtle / Robot)
              React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-white/20 mr-2" },
                [{ key: 'turtle', icon: '\uD83D\uDC22', label: 'Turtle' }, { key: 'robot', icon: '\uD83E\uDD16', label: 'Robot' }].map(function(tab) {
                  return React.createElement("button", {
                    key: tab.key,
                    onClick: function() { upd('playgroundMode', tab.key); },
                    className: "px-3 py-1.5 text-xs font-bold transition-all " +
                      (playgroundMode === tab.key ? "bg-white text-indigo-700" : "bg-white/10 text-white/70 hover:bg-white/20")
                  }, tab.icon + " " + tab.label);
                })
              ),
              // Mode toggle
              React.createElement("button", {
                onClick: toggleMode,
                className: "coding-mode-toggle flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all " +
                  (codeMode === 'blocks' ? 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900/70' : 'bg-amber-500/90 text-white hover:bg-amber-500')
              },
                React.createElement("span", null, codeMode === 'blocks' ? '🧩' : '📝'),
                codeMode === 'blocks' ? 'Switch to Code' : 'Switch to Blocks'
              ),
              // Speed
              React.createElement("select", {
                'aria-label': 'Execution speed',
                value: speed,
                onChange: function (e) { upd('speed', parseInt(e.target.value)); },
                className: "px-2 py-1 rounded-lg bg-indigo-900/50 text-indigo-200 text-xs border border-indigo-400/30"
              },
                React.createElement("option", { value: 50 }, "⚡ Fast"),
                React.createElement("option", { value: 200 }, "🐢 Normal"),
                React.createElement("option", { value: 500 }, "🐌 Slow")
              ),
              // Undo / Redo
              React.createElement("button", {
                onClick: handleUndo, disabled: undoStack.length === 0,
                title: 'Undo (Ctrl+Z)',
                'aria-label': 'Undo',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (undoStack.length > 0 ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white/5 text-white/30 cursor-not-allowed')
              }, "↩"),
              React.createElement("button", {
                onClick: handleRedo, disabled: redoStack.length === 0,
                title: 'Redo (Ctrl+Y)',
                'aria-label': 'Redo',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (redoStack.length > 0 ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-white/5 text-white/30 cursor-not-allowed')
              }, "↪"),
              // Export PNG
              React.createElement("button", {
                onClick: handleExportPNG,
                className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "📥 PNG"),
              // Templates
              React.createElement("button", {
                onClick: function () { upd('showTemplates', !showTemplates); },
                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (showTemplates ? 'bg-amber-500 text-white' : 'bg-white/15 text-white hover:bg-white/25')
              }, "📂 Templates"),


              // AI Assistant buttons
              callGemini && React.createElement("div", { className: "flex rounded-lg overflow-hidden border border-white/20" },
                React.createElement("button", {
                  onClick: handleExplainCode,
                  disabled: aiLoading || blocks.length === 0,
                  title: "AI explains what your code does",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all " +
                    (aiLoading ? "bg-white/5 text-white/30 cursor-wait" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, aiLoading ? "⏳" : "🤖 Explain"),
                React.createElement("button", {
                  onClick: handleSuggestNext,
                  disabled: aiLoading,
                  title: "AI suggests what to try next",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all border-l border-white/20 " +
                    (aiLoading ? "bg-white/5 text-white/30" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, "💡 Suggest"),
                React.createElement("button", {
                  onClick: handleDebugHelp,
                  disabled: aiLoading || challengeIdx < 0,
                  title: "AI helps debug your challenge attempt",
                  className: "px-2.5 py-1.5 text-[10px] font-bold transition-all border-l border-white/20 " +
                    (aiLoading || challengeIdx < 0 ? "bg-white/5 text-white/30" : "bg-white/10 text-white/80 hover:bg-white/20")
                }, "🐛 Debug")
              ),
              // SVG Export + Share
              React.createElement("button", {
                onClick: handleExportSVG,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "📐 SVG"),
              React.createElement("button", {
                onClick: handleShareLink,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "🔗 Share"),

              // Turtle Skin selector
              React.createElement("select", {
                value: turtleSkin,
                onChange: function(e) { upd('turtleSkin', e.target.value); },
                title: 'Turtle Skin',
                className: "px-1.5 py-1 rounded-lg bg-indigo-900/50 text-white text-xs border border-indigo-400/30 cursor-pointer"
              },
                TURTLE_SKINS.map(function(sk) {
                  return React.createElement("option", { key: sk.emoji, value: sk.emoji }, sk.emoji + ' ' + sk.label);
                })
              ),
              // Import/Export
              React.createElement("button", {
                onClick: handleExportJSON,
                title: 'Export program as JSON',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "💾 Save"),
              React.createElement("button", {
                onClick: handleImportJSON,
                title: 'Import program from JSON',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/15 text-white hover:bg-white/25 transition-all"
              }, "📂 Load"),
              // Coordinate Picker
              React.createElement("button", {
                onClick: function() { upd('showCoordPicker', !showCoordPicker); },
                title: showCoordPicker ? 'Cancel coordinate picker' : 'Click canvas to add goto(x,y)',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (showCoordPicker ? "bg-amber-500 text-white animate-pulse" : "bg-white/15 text-white hover:bg-white/25")
              }, "📌 Pick"),
              // Background Music toggle
              React.createElement("button", {
                onClick: toggleBgMusic,
                title: bgMusicPlaying ? 'Stop background music' : 'Play background music loop',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (bgMusicPlaying ? "bg-green-500 text-white" : "bg-white/15 text-white hover:bg-white/25")
              }, bgMusicPlaying ? "🔊 Music" : "🔇 Music"),
              // Canvas Layer toggle
              React.createElement("button", {
                onClick: function() { upd('canvasLayer', canvasLayer === 'foreground' ? 'background' : 'foreground'); },
                title: 'Drawing layer: ' + canvasLayer,
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (canvasLayer === 'background' ? "bg-purple-500 text-white" : "bg-white/15 text-white hover:bg-white/25")
              }, canvasLayer === 'background' ? "🎨 BG" : "🎨 FG"),
              // Canvas controls
              React.createElement("button", {
                onClick: function () { upd('showGrid', !showGrid); },
                title: showGrid ? 'Hide grid' : 'Show grid',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (showGrid ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40')
              }, "⊞"),
              React.createElement("button", {
                onClick: function () { upd('showCoords', !showCoords); },
                title: showCoords ? 'Hide coordinates' : 'Show coordinates',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " +
                  (showCoords ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40')
              }, "📐"),
              // Tutorial help button
              tutorialDismissed && React.createElement("button", {
                onClick: function () { upd('tutorialDismissed', false); },
                title: 'Show tutorial',
                className: "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              }, "❓")
            ),

            // ══════════════════════════
            // ROBOT GRID MODE UI
            // ══════════════════════════
            playgroundMode === 'robot' && React.createElement("div", { className: "col-span-2 grid gap-4", style: { gridTemplateColumns: "200px 1fr 260px" } },
              // Robot Toolbox
              React.createElement("div", { className: "coding-toolbox bg-slate-800/80 backdrop-blur-sm rounded-xl p-3 border border-slate-700/60 shadow-lg", style: { maxHeight: '500px', overflowY: 'auto' } },
                React.createElement("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" }, "\uD83E\uDD16 Robot Commands"),
                React.createElement("div", { className: "space-y-1" },
                  ROBOT_BLOCKS.map(function(rb) {
                    return React.createElement("button", {
                      key: rb.type,
                      onClick: function() { addRobotBlock(rb.type); },
                      disabled: robotRunning,
                      className: "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.02] hover:brightness-110",
                      style: { backgroundColor: rb.color }
                    },
                      React.createElement("span", null, rb.label.split(' ')[0]),
                      React.createElement("span", { className: "flex-1 text-left" }, rb.label.split(' ').slice(1).join(' ')),
                      React.createElement("span", { className: "text-[9px] opacity-60" }, "+")
                    );
                  })
                ),
                React.createElement("div", { className: "mt-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600/30" },
                  React.createElement("p", { className: "text-[10px] text-slate-400 leading-relaxed" },
                    "\uD83D\uDCA1 Drag commands into your program. Use If/While blocks for smart navigation!"
                  )
                )
              ),
              // Robot Grid Canvas + Program
              React.createElement("div", { className: "flex flex-col gap-3" },
                // Grid Canvas
                React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-[#0f172a]", style: { height: '380px' } },
                  React.createElement("canvas", {
                    "data-robot-canvas": "true",
                    style: { width: '100%', height: '100%', display: 'block' },
                    ref: function(cvEl) {
                      if (!cvEl) return;
                      var ctx = cvEl.getContext('2d');
                      var W = cvEl.offsetWidth || 500, H = cvEl.offsetHeight || 380;
                      cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);
                      var grid = robotGrid;
                      if (!grid || grid.length === 0) {
                        ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
                        ctx.fillStyle = '#475569'; ctx.font = '14px sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('Select a challenge to begin!', W / 2, H / 2);
                        return;
                      }
                      var size = grid.length;
                      var cellW = Math.min(W, H) * 0.85 / size;
                      var offX = (W - cellW * size) / 2;
                      var offY = (H - cellW * size) / 2;
                      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
                      for (var gy = 0; gy < size; gy++) {
                        for (var gx = 0; gx < size; gx++) {
                          var cell = grid[gy][gx];
                          var cx = offX + gx * cellW, cy = offY + gy * cellW;
                          if (cell.wall) { ctx.fillStyle = '#374151'; }
                          else if (cell.painted) { ctx.fillStyle = '#1e3a5f'; }
                          else if (cell.goal) { ctx.fillStyle = '#064e3b'; }
                          else { ctx.fillStyle = '#1e293b'; }
                          ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellW - 2);
                          ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5;
                          ctx.strokeRect(cx + 1, cy + 1, cellW - 2, cellW - 2);
                          if (cell.wall) {
                            ctx.fillStyle = '#4b5563';
                            for (var bx = 0; bx < 3; bx++) for (var by = 0; by < 3; by++) {
                              ctx.fillRect(cx + 3 + bx * (cellW / 3 - 1), cy + 3 + by * (cellW / 3 - 1), cellW / 3 - 3, cellW / 3 - 3);
                            }
                          }
                          if (cell.gem) {
                            ctx.fillStyle = '#34d399'; ctx.font = 'bold ' + (cellW * 0.45) + 'px sans-serif';
                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText('\u2666', cx + cellW / 2, cy + cellW / 2);
                          }
                          if (cell.goal && !cell.wall) {
                            ctx.fillStyle = '#10b981'; ctx.font = 'bold ' + (cellW * 0.4) + 'px sans-serif';
                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText('\uD83C\uDFC1', cx + cellW / 2, cy + cellW / 2);
                          }
                        }
                      }
                      if (robotTrail.length > 1) {
                        ctx.strokeStyle = 'rgba(99,102,241,0.4)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
                        ctx.beginPath();
                        ctx.moveTo(offX + robotTrail[0].x * cellW + cellW / 2, offY + robotTrail[0].y * cellW + cellW / 2);
                        for (var ti = 1; ti < robotTrail.length; ti++) {
                          ctx.lineTo(offX + robotTrail[ti].x * cellW + cellW / 2, offY + robotTrail[ti].y * cellW + cellW / 2);
                        }
                        ctx.stroke();
                      }
                      var rx = offX + robotPos.x * cellW + cellW / 2;
                      var ry = offY + robotPos.y * cellW + cellW / 2;
                      var rr = cellW * 0.35;
                      ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
                      ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; ctx.stroke();
                      var arrowDirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                      var ad = arrowDirs[robotPos.dir];
                      ctx.fillStyle = '#fff'; ctx.beginPath();
                      ctx.moveTo(rx + ad[0] * rr * 0.9, ry + ad[1] * rr * 0.9);
                      ctx.lineTo(rx + ad[0] * rr * 0.3 - ad[1] * rr * 0.5, ry + ad[1] * rr * 0.3 + ad[0] * rr * 0.5);
                      ctx.lineTo(rx + ad[0] * rr * 0.3 + ad[1] * rr * 0.5, ry + ad[1] * rr * 0.3 - ad[0] * rr * 0.5);
                      ctx.fill();
                      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(4, 4, 140, 24);
                      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                      ctx.fillText('Pos: (' + robotPos.x + ',' + robotPos.y + ')  Dir: ' + ['\u2191','\u2192','\u2193','\u2190'][robotPos.dir], 8, 8);
                    }
                  })
                ),
                // Robot Program
                React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-slate-700/50", style: { maxHeight: '200px', overflowY: 'auto' } },
                  React.createElement("div", { className: "flex items-center justify-between mb-2" },
                    React.createElement("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider" }, "\uD83D\uDCDD Program (" + robotBlocks.length + ")"),
                    React.createElement("div", { className: "flex gap-1" },
                      React.createElement("button", {
                        onClick: function() { upd('robotBlocks', []); },
                        disabled: robotBlocks.length === 0,
                        className: "px-2 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600 transition-all"
                      }, "\uD83D\uDDD1 Clear"),
                      React.createElement("button", {
                        onClick: function() {
                          if (robotChallengeIdx >= 0) {
                            var ch = ROBOT_CHALLENGES[robotChallengeIdx];
                            var grid = generateGrid(ch.size, ch.walls, ch.gems, ch.goal, ch.start);
                            updMulti({ robotGrid: grid, robotPos: { x: ch.start[0], y: ch.start[1], dir: ch.startDir }, robotTrail: [{ x: ch.start[0], y: ch.start[1] }], robotRunning: false });
                          }
                        },
                        className: "px-2 py-1 rounded text-[10px] font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600 transition-all"
                      }, "\u21BA Reset"),
                      React.createElement("button", {
                        onClick: handleRobotRun,
                        disabled: robotBlocks.length === 0 || robotRunning || robotChallengeIdx < 0,
                        className: "px-3 py-1 rounded text-[10px] font-bold transition-all " +
                          (robotBlocks.length > 0 && !robotRunning && robotChallengeIdx >= 0 ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-slate-700 text-slate-500 cursor-not-allowed")
                      }, robotRunning ? "\u23F3 Running..." : "\u25B6 Run")
                    )
                  ),
                  robotBlocks.length === 0 ?
                    React.createElement("p", { className: "text-[10px] text-slate-500 text-center py-3 italic" }, "Click commands from the toolbox to build your program!") :
                    React.createElement("div", { className: "space-y-1" },
                      robotBlocks.map(function(b, bi) {
                        var bdef = ROBOT_BLOCKS.find(function(rb) { return rb.type === b.type; });
                        return React.createElement("div", { key: bi },
                          React.createElement("div", { className: "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold text-white", style: { backgroundColor: bdef ? bdef.color : '#64748b' } },
                            React.createElement("span", { className: "flex-1" }, bdef ? bdef.label : b.type),
                            b.type === 'repeatR' && React.createElement("input", {
                              type: "number", min: 1, max: 20, value: b.times || 3,
                              onChange: function(e) { var updated = robotBlocks.map(function(rb2, i2) { if (i2 === bi) { return Object.assign({}, rb2, { times: parseInt(e.target.value) || 3 }); } return rb2; }); upd('robotBlocks', updated); },
                              className: "w-10 px-1 py-0.5 bg-white/20 rounded text-[10px] text-white text-center border-0 outline-none"
                            }),
                            React.createElement("button", {
                              onClick: function() { removeRobotBlock(bi); },
                              className: "text-white/60 hover:text-white text-xs px-1"
                            }, "\u2715")
                          ),
                          (b.type === 'repeatR' || b.type === 'ifWall' || b.type === 'ifGem' || b.type === 'whileNotGoal') &&
                            React.createElement("div", { className: "ml-4 mt-1 space-y-1 border-l-2 pl-2", style: { borderColor: bdef ? bdef.color + '60' : '#475569' } },
                              (b.children || []).map(function(child, ci) {
                                var cdef = ROBOT_BLOCKS.find(function(rb) { return rb.type === child.type; });
                                return React.createElement("div", { key: ci, className: "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white", style: { backgroundColor: cdef ? cdef.color : '#475569' } },
                                  React.createElement("span", { className: "flex-1" }, cdef ? cdef.label : child.type),
                                  React.createElement("button", { onClick: function() {
                                    var updated = robotBlocks.map(function(rb2, i2) { if (i2 === bi) { var nb = Object.assign({}, rb2); nb.children = (nb.children || []).filter(function(_, k) { return k !== ci; }); return nb; } return rb2; });
                                    upd('robotBlocks', updated);
                                  }, className: "text-white/60 hover:text-white text-[10px]" }, "\u2715")
                                );
                              }),
                              React.createElement("div", { className: "flex gap-1 flex-wrap" },
                                ROBOT_BLOCKS.filter(function(rb) { return ['moveForward','turnRight','turnLeft','collectGem','paintCell'].indexOf(rb.type) >= 0; }).map(function(rb) {
                                  return React.createElement("button", {
                                    key: rb.type,
                                    onClick: function() { addRobotChildBlock(bi, rb.type, false); },
                                    className: "px-1.5 py-0.5 rounded text-[9px] font-bold text-white/80 hover:text-white transition-all",
                                    style: { backgroundColor: rb.color + '80' }
                                  }, "+ " + rb.label.split(' ').slice(1).join(' '));
                                })
                              ),
                              (b.type === 'ifWall' || b.type === 'ifGem') && React.createElement("div", null,
                                React.createElement("div", { className: "text-[9px] font-bold text-slate-500 mt-1" }, "ELSE:"),
                                (b.elseChildren || []).map(function(child, ci) {
                                  var cdef = ROBOT_BLOCKS.find(function(rb) { return rb.type === child.type; });
                                  return React.createElement("div", { key: 'e' + ci, className: "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white mt-1", style: { backgroundColor: cdef ? cdef.color : '#475569' } },
                                    React.createElement("span", { className: "flex-1" }, cdef ? cdef.label : child.type),
                                    React.createElement("button", { onClick: function() {
                                      var updated = robotBlocks.map(function(rb2, i2) { if (i2 === bi) { var nb = Object.assign({}, rb2); nb.elseChildren = (nb.elseChildren || []).filter(function(_, k) { return k !== ci; }); return nb; } return rb2; });
                                      upd('robotBlocks', updated);
                                    }, className: "text-white/60 hover:text-white text-[10px]" }, "\u2715")
                                  );
                                }),
                                React.createElement("div", { className: "flex gap-1 flex-wrap mt-1" },
                                  ROBOT_BLOCKS.filter(function(rb) { return ['moveForward','turnRight','turnLeft','collectGem','paintCell'].indexOf(rb.type) >= 0; }).map(function(rb) {
                                    return React.createElement("button", {
                                      key: 'e' + rb.type,
                                      onClick: function() { addRobotChildBlock(bi, rb.type, true); },
                                      className: "px-1.5 py-0.5 rounded text-[9px] font-bold text-white/80 hover:text-white transition-all",
                                      style: { backgroundColor: rb.color + '60' }
                                    }, "+ " + rb.label.split(' ').slice(1).join(' '));
                                  })
                                )
                              )
                            )
                        );
                      })
                    )
                )
              ),
              // Right sidebar — Robot Challenges
              React.createElement("div", { className: "bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50", style: { maxHeight: '600px', overflowY: 'auto' } },
                React.createElement("h3", { className: "text-xs font-bold text-slate-400 uppercase tracking-wider mb-2" }, "\uD83C\uDFAF Robot Challenges"),
                React.createElement("div", { className: "space-y-1.5" },
                  ROBOT_CHALLENGES.map(function(ch, ci) {
                    var done = robotCompleted.indexOf(ch.id) >= 0;
                    var active = robotChallengeIdx === ci;
                    return React.createElement("button", {
                      key: ch.id,
                      onClick: function() { loadRobotChallenge(ci); },
                      className: "w-full text-left p-2.5 rounded-lg border transition-all " +
                        (active ? "bg-indigo-900/60 border-indigo-400/50 shadow-md" : done ? "bg-emerald-900/30 border-emerald-500/30" : "bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50")
                    },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-sm" }, done ? "\u2705" : active ? "\u25B6\uFE0F" : "\u2B1C"),
                        React.createElement("div", { className: "flex-1 min-w-0" },
                          React.createElement("div", { className: "text-xs font-bold " + (done ? "text-emerald-300" : active ? "text-indigo-300" : "text-slate-300") }, ch.title),
                          React.createElement("div", { className: "text-[10px] " + (done ? "text-emerald-400/60" : "text-slate-500") + " truncate" }, ch.desc)
                        ),
                        React.createElement("span", { className: "text-[9px] px-1.5 py-0.5 rounded-full border " +
                          (ch.concept === 'Sequencing' ? "border-blue-500/40 text-blue-400 bg-blue-500/10" :
                           ch.concept === 'Loops' ? "border-purple-500/40 text-purple-400 bg-purple-500/10" :
                           ch.concept.indexOf('Conditional') >= 0 ? "border-red-500/40 text-red-400 bg-red-500/10" :
                           "border-amber-500/40 text-amber-400 bg-amber-500/10")
                        }, ch.concept)
                      ),
                      active && ch.hint && React.createElement("div", { className: "mt-2 text-[10px] text-indigo-300/70 bg-indigo-900/40 rounded-lg p-2 border border-indigo-500/20" }, "\uD83D\uDCA1 " + ch.hint)
                    );
                  })
                ),
                React.createElement("div", { className: "mt-3 p-2 rounded-lg bg-slate-700/50 border border-slate-600/30" },
                  React.createElement("div", { className: "flex items-center justify-between text-[10px]" },
                    React.createElement("span", { className: "text-slate-400 font-bold" }, "Progress"),
                    React.createElement("span", { className: "text-emerald-400 font-bold" }, robotCompleted.length + "/" + ROBOT_CHALLENGES.length)
                  ),
                  React.createElement("div", { className: "w-full h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden" },
                    React.createElement("div", { className: "h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all", style: { width: (robotCompleted.length / ROBOT_CHALLENGES.length * 100) + '%' } })
                  )
                ),
                React.createElement("div", { className: "mt-3 p-2 rounded-lg bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-500/20" },
                  React.createElement("p", { className: "text-[9px] text-violet-300 font-bold" }, "\uD83C\uDF93 CS Standards"),
                  React.createElement("p", { className: "text-[9px] text-violet-400/70 mt-0.5" }, "CSTA K-12 \u2022 ISTE CT \u2022 Sequencing, Loops, Conditionals, Algorithms")
                )
              )
            ),

            // ── Left panel: Toolbox + Program (TURTLE MODE) ──
            playgroundMode === 'turtle' && React.createElement("div", { className: "coding-toolbox flex flex-col gap-3 max-h-[600px] overflow-y-auto" },
              // Toolbox
              React.createElement("div", { className: "bg-slate-800 rounded-xl p-3 border border-slate-700" },
                React.createElement("h3", { className: "text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2" }, "🧰 Toolbox"),
                React.createElement("div", { className: "flex flex-col gap-1" },
                  BLOCK_TYPES.map(function (bt) {
                    return React.createElement("button", {
                      key: bt.type,
                      onClick: function () { addBlock(bt.type); },
                      disabled: running,
                      className: "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02] hover:brightness-110 disabled:opacity-40",
                      style: { backgroundColor: bt.color }
                    }, bt.label);
                  })
                )
              ),

              // Program (blocks mode)
              codeMode === 'blocks' && React.createElement("div", { className: "coding-program bg-slate-800 rounded-xl p-3 border border-slate-700 flex-1" },
                React.createElement("h3", { className: "text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2" },
                  "📋 Program (" + blocks.length + " blocks)"
                ),
                blocks.length === 0 && React.createElement("p", { className: "text-slate-400 text-xs italic text-center py-4" },
                  'Click blocks above or load a template to start'
                ),
                React.createElement("div", { className: "flex flex-col gap-1" },
                  blocks.map(function (b, idx) {
                    var def = BLOCK_TYPES.find(function (bt) { return bt.type === b.type; });
                    var isActive = running && stepIdx === idx;
                    return React.createElement("div", {
                      key: idx,
                      draggable: !running,
                      onDragStart: function (e) { handleDragStart(e, idx); },
                      onDragOver: handleDragOver,
                      onDragLeave: handleDragLeave,
                      onDrop: function (e) { handleDrop(e, idx); },
                      onDragEnd: handleDragEnd,
                      style: { cursor: running ? 'default' : 'grab' }
                    },
                      React.createElement("div", {
                        className: "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-white transition-all " +
                          (isActive ? 'ring-2 ring-yellow-400 scale-105' : ''),
                        style: { backgroundColor: def ? def.color : '#64748b' }
                      },
                        // Drag handle
                        React.createElement("span", {
                          className: "text-white/40 text-[10px] cursor-grab mr-0.5 select-none",
                          title: "Drag to reorder"
                        }, "⠿"),
                        React.createElement("span", { className: "flex-1 truncate" },
                          def ? def.label : b.type,
                          // Show param summary for basic blocks only
                          def && def.param && b.type !== 'repeat' && b.type !== 'color' && b.type !== 'goto' && b.type !== 'setVar' && b.type !== 'changeVar' && b.type !== 'ifelse' ? ' ' + (b[def.param] || def.defaultVal) + (def.unit || '') : '',
                          b.type === 'goto' ? ' (' + (b.x != null ? b.x : 250) + ', ' + (b.y != null ? b.y : 250) + ')' : '',
                          b.type === 'repeat' ? ' ' + (b.times || 4) + '×' : '',
                          b.type === 'setVar' ? ' ' + (b.varName || 'size') + ' = ' + (b.varValue != null ? b.varValue : 50) : '',
                          b.type === 'changeVar' ? ' ' + (b.varName || 'size') + ' += ' + (b.varDelta != null ? b.varDelta : 10) : '',
                          b.type === 'ifelse' ? ' (' + (b.condition || 'x > 250') + ')' : ''
                        ),
                        // Param editor (single-param basic blocks only)
                        def && def.param && b.type !== 'color' && b.type !== 'goto' && b.type !== 'setVar' && b.type !== 'changeVar' && b.type !== 'ifelse' && React.createElement("input", {
                          type: "number", value: b[def.param] || def.defaultVal,
                          onChange: function (e) { updateBlockParam(idx, def.param, parseInt(e.target.value) || def.defaultVal); },
                          className: "w-12 px-1 py-0.5 rounded text-xs bg-white/20 text-white text-center",
                          style: { appearance: 'textfield' }
                        }),
                        // Goto dual param editor (x, y)
                        b.type === 'goto' && React.createElement("span", { className: "flex items-center gap-0.5" },
                          React.createElement("span", { className: "text-[10px] text-white/60" }, "x"),
                          React.createElement("input", {
                            type: "number", value: b.x != null ? b.x : 250,
                            onChange: function (e) { updateBlockParam(idx, 'x', parseInt(e.target.value) || 0); },
                            className: "w-10 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            style: { appearance: 'textfield' }
                          }),
                          React.createElement("span", { className: "text-[10px] text-white/60" }, "y"),
                          React.createElement("input", {
                            type: "number", value: b.y != null ? b.y : 250,
                            onChange: function (e) { updateBlockParam(idx, 'y', parseInt(e.target.value) || 0); },
                            className: "w-10 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            style: { appearance: 'textfield' }
                          })
                        ),
                        // Color picker
                        b.type === 'color' && React.createElement("input", {
                          type: "color", value: b.color || '#6366f1',
                          onChange: function (e) { updateBlockParam(idx, 'color', e.target.value); },
                          className: "w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        }),
                        // ── setVar inline editor ──
                        b.type === 'setVar' && React.createElement("span", { className: "flex items-center gap-0.5" },
                          React.createElement("input", {
                            type: "text", value: b.varName || 'size',
                            onChange: function (e) { updateBlockParam(idx, 'varName', e.target.value || 'size'); },
                            className: "w-12 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            placeholder: "name"
                          }),
                          React.createElement("span", { className: "text-[10px] text-white/60" }, "="),
                          React.createElement("input", {
                            type: "number", value: b.varValue != null ? b.varValue : 50,
                            onChange: function (e) { updateBlockParam(idx, 'varValue', parseFloat(e.target.value) || 0); },
                            className: "w-12 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            style: { appearance: 'textfield' }
                          })
                        ),
                        // ── changeVar inline editor ──
                        b.type === 'changeVar' && React.createElement("span", { className: "flex items-center gap-0.5" },
                          React.createElement("input", {
                            type: "text", value: b.varName || 'size',
                            onChange: function (e) { updateBlockParam(idx, 'varName', e.target.value || 'size'); },
                            className: "w-12 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            placeholder: "name"
                          }),
                          React.createElement("span", { className: "text-[10px] text-white/60" }, "+="),
                          React.createElement("input", {
                            type: "number", value: b.varDelta != null ? b.varDelta : 10,
                            onChange: function (e) { updateBlockParam(idx, 'varDelta', parseFloat(e.target.value) || 0); },
                            className: "w-12 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center",
                            style: { appearance: 'textfield' }
                          })
                        ),
                        // ── ifelse condition editor ──
                        b.type === 'ifelse' && React.createElement("input", {
                          type: "text", value: b.condition || 'x > 250',
                          onChange: function (e) { updateBlockParam(idx, 'condition', e.target.value); },
                          className: "w-24 px-1 py-0.5 rounded text-[10px] bg-white/20 text-white text-center font-mono",
                          placeholder: "x > 250"
                        }),
                        // Move / Remove buttons
                        React.createElement("button", { onClick: function () { moveBlock(idx, -1); }, className: "text-white/60 hover:text-white text-[10px]", disabled: idx === 0 }, "▲"),
                        React.createElement("button", { onClick: function () { moveBlock(idx, 1); }, className: "text-white/60 hover:text-white text-[10px]", disabled: idx === blocks.length - 1 }, "▼"),
                        React.createElement("button", { onClick: function () { removeBlock(idx); }, className: "text-white/60 hover:text-red-300 text-sm ml-1" }, "×")
                      ),
                      // ── Repeat children ──
                      b.type === 'repeat' && React.createElement("div", { className: "ml-4 mt-1 pl-2 border-l-2 border-purple-400/50 flex flex-col gap-1" },
                        (b.children || []).map(function (child, ci) { return renderChildBlock(child, ci, idx, false); }),
                        renderQuickAdd(idx, false)
                      ),
                      // ── If/Else children ──
                      b.type === 'ifelse' && React.createElement("div", { className: "ml-3 mt-1 flex flex-col gap-1" },
                        // IF branch
                        React.createElement("div", { className: "pl-2 border-l-2 border-fuchsia-400/50" },
                          React.createElement("span", { className: "text-[9px] font-bold text-fuchsia-300 uppercase tracking-wider" }, "✔ If true"),
                          (b.children || []).length === 0 && React.createElement("p", { className: "text-[10px] text-slate-500 italic py-1" }, "No blocks yet"),
                          (b.children || []).map(function (child, ci) { return renderChildBlock(child, ci, idx, false); }),
                          renderQuickAdd(idx, false)
                        ),
                        // ELSE branch
                        React.createElement("div", { className: "pl-2 border-l-2 border-slate-500/50 mt-1" },
                          React.createElement("span", { className: "text-[9px] font-bold text-slate-400 uppercase tracking-wider" }, "✖ Else"),
                          (b.elseChildren || []).length === 0 && React.createElement("p", { className: "text-[10px] text-slate-500 italic py-1" }, "No blocks yet"),
                          (b.elseChildren || []).map(function (child, ci) { return renderChildBlock(child, ci, idx, true); }),
                          renderQuickAdd(idx, true)
                        )
                      )
                    );
                  })
                )
              ),

              // Code editor (text mode)
              codeMode === 'text' && React.createElement("div", { className: "bg-slate-800 rounded-xl p-3 border border-slate-700 flex-1" },
                React.createElement("h3", { className: "text-xs font-bold text-amber-400 uppercase tracking-wider mb-2" }, "📝 Code Editor"),
                React.createElement("textarea", {
                  'aria-label': 'Code editor',
                  value: textCode,
                  onChange: function (e) { upd('textCode', e.target.value); },
                  placeholder: "forward(50)\nright(90)\nbackward(30)\n\nrepeat(4, function() {\n  forward(100)\n  right(90)\n})\n\nsetVar('size', 50)\nchangeVar('size', 10)\n\nif(x > 250, function() {\n  left(45)\n}, function() {\n  right(45)\n})",
                  className: "w-full h-60 p-3 rounded-lg bg-slate-900 text-green-400 text-xs font-mono border border-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none",
                  spellCheck: false
                }),
                React.createElement("p", { className: "text-slate-500 text-[10px] mt-1" },
                  "Commands: forward(px), backward(px), right(deg), left(deg), penUp(), penDown(), setColor(\"#hex\"), setWidth(px), circle(r), goto(x,y), home(), repeat(n, fn), setVar('name', val), changeVar('name', delta), if(condition, ifFn, elseFn)"
                )
              )
            ),

            // ── Right panel: Canvas + Controls (TURTLE MODE) ──
            playgroundMode === 'turtle' && React.createElement("div", { className: "flex flex-col gap-3" },
              // Canvas
              React.createElement("div", { className: "bg-slate-900 rounded-xl p-2 border border-slate-700 shadow-inner" },
                React.createElement("canvas", {
                  ref: canvasRef, width: 500, height: 500,
                  className: "w-full rounded-lg",
                  style: { maxWidth: '500px', aspectRatio: '1/1', imageRendering: 'auto' }
                })
              ),

              // Controls
              React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("button", {
                  onClick: handleRun,
                  disabled: running || (codeMode === 'blocks' ? blocks.length === 0 : !textCode.trim()),
                  className: "coding-run-btn flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all " +
                    (running ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-green-500/30')
                }, "▶ Run"),
                React.createElement("button", {
                  onClick: handleClear,
                  className: "flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-all"
                }, "🗑️ Clear Canvas"),
                React.createElement("button", {
                  onClick: handleReset,
                  className: "flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600/80 text-white hover:bg-red-600 transition-all"
                }, "⏪ Reset All"),
                running && React.createElement("span", { className: "text-xs text-yellow-400 animate-pulse font-medium" },
                  "🔄 Running... step " + (stepIdx + 1)
                )
              ),

              // Options bar (turtle toggle + cumulative mode)
              React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
                React.createElement("button", {
                  onClick: function () { upd('showTurtle', !showTurtle); },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " +
                    (showTurtle ? 'bg-emerald-600/80 text-white hover:bg-emerald-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                }, showTurtle ? '🐢 Turtle On' : '▸ Cursor Only'),
                React.createElement("button", {
                  onClick: function () { upd('cumulativeMode', !cumulativeMode); },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all " +
                    (cumulativeMode ? 'bg-amber-600/80 text-white hover:bg-amber-600 ring-1 ring-amber-400/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                }, cumulativeMode ? '📚 Cumulative Mode' : '🔄 Fresh Start Mode'),
                cumulativeMode && runHistory.length > 0 && React.createElement("span", {
                  className: "flex items-center gap-1 text-[11px] text-amber-300/80 font-medium bg-amber-900/30 px-2 py-1 rounded-full"
                }, '📊 ' + runHistory.length + ' run' + (runHistory.length !== 1 ? 's' : '') + ' • ' + drawnLines.length + ' lines drawn')
              ),

              // ── Challenges panel (TURTLE MODE) ──
            playgroundMode === 'turtle' &&
              React.createElement("div", { className: "coding-challenges bg-slate-800 rounded-xl p-3 border border-slate-700" },
                React.createElement("h3", { className: "text-xs font-bold text-amber-300 uppercase tracking-wider mb-2" },
                  "🏆 Challenges (" + completed.length + "/" + CHALLENGES.length + ")"
                ),
                React.createElement("div", { className: "flex flex-col gap-1" },
                  CHALLENGES.map(function (ch, ci) {
                    var done = completed.indexOf(ch.id) >= 0;
                    var active = challengeIdx === ci;
                    return React.createElement("button", {
                      key: ch.id,
                      onClick: function () { upd('challengeIdx', active ? -1 : ci); },
                      className: "flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all " +
                        (done ? 'bg-green-900/40 text-green-300 border border-green-700/50' :
                          active ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-500/50 ring-1 ring-indigo-400' :
                            'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-transparent')
                    },
                      React.createElement("span", { className: "text-sm" }, done ? '✅' : active ? '🎯' : '⬜'),
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("span", { className: "font-semibold" }, ch.title),
                        active && React.createElement("p", { className: "text-[10px] text-indigo-300/70 mt-0.5" }, '💡 ' + ch.hint)
                      ),
                      React.createElement("span", {
                        className: "text-[10px] px-1.5 py-0.5 rounded-full " +
                          (done ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400')
                      }, ch.concept)
                    );
                  })
                )
              ),




              // ── Animation Timeline ──
              timelineFrames.length > 0 && React.createElement("div", { className: "bg-slate-800/60 rounded-xl p-3 border border-slate-700/40" },
                React.createElement("h4", { className: "text-xs font-bold text-slate-400 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "⏱️"), " Timeline (" + timelineFrames.length + " frames)"
                ),
                React.createElement("input", {
                  type: "range",
                  min: 0,
                  max: Math.max(0, timelineFrames.length - 1),
                  value: timelinePos >= 0 ? timelinePos : 0,
                  onChange: function(e) { seekTimeline(parseInt(e.target.value)); },
                  className: "w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500",
                  style: { accentColor: '#6366f1' }
                }),
                React.createElement("div", { className: "flex justify-between text-[9px] text-slate-500 mt-1" },
                  React.createElement("span", null, "Frame 0"),
                  React.createElement("span", { className: "text-indigo-400 font-bold" }, timelinePos >= 0 ? "Frame " + timelinePos : "—"),
                  React.createElement("span", null, "Frame " + (timelineFrames.length - 1))
                )
              ),
              // ── Achievement Badges Gallery ──
              React.createElement("div", { className: "bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-xl p-3 border border-amber-600/30" },
                React.createElement("h4", { className: "text-xs font-bold text-amber-300 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "🏆"), " Badges (" + earnedBadges.length + "/" + BADGES.length + ")"
                ),
                React.createElement("div", { className: "grid gap-1", style: { gridTemplateColumns: 'repeat(5, 1fr)' } },
                  BADGES.map(function(badge) {
                    var earned = earnedBadges.indexOf(badge.id) >= 0;
                    return React.createElement("div", {
                      key: badge.id,
                      title: badge.title + ': ' + badge.desc,
                      className: "flex items-center justify-center w-full aspect-square rounded-lg text-lg transition-all " +
                        (earned ? "bg-amber-500/20 scale-100 cursor-default" : "bg-slate-700/30 grayscale opacity-30 cursor-help"),
                      style: earned ? { animation: 'none' } : {}
                    }, badge.icon);
                  })
                )
              ),

              // ── Accessibility Controls ──
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("button", {
                  onClick: function() { upd('highContrastMode', !highContrastMode); },
                  className: "flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all " +
                    (highContrastMode ? "bg-white text-slate-900" : "bg-slate-700/50 text-slate-400 hover:text-white")
                }, highContrastMode ? "◐ Standard Mode" : "◑ High Contrast")
              ),
              // ── AI Assistant Panel ──
              showAIPanel && React.createElement("div", { className: "bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-xl p-3 border border-blue-500/30 shadow-lg" },
                React.createElement("div", { className: "flex items-center justify-between mb-2" },
                  React.createElement("h4", { className: "text-xs font-bold text-blue-300 flex items-center gap-1" },
                    React.createElement("span", null, "🤖"), " AI Assistant"
                  ),
                  React.createElement("button", {
                    onClick: function() { updMulti({ showAIPanel: false, aiExplanation: '' }); },
                    className: "text-slate-400 hover:text-white text-sm px-1"
                  }, "×")
                ),
                aiLoading ?
                  React.createElement("div", { className: "flex items-center gap-2 py-2" },
                    React.createElement("div", { className: "animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" }),
                    React.createElement("span", { className: "text-[11px] text-blue-300" }, "Thinking...")
                  ) :
                  React.createElement("p", { className: "text-[11px] text-blue-200/80 leading-relaxed whitespace-pre-wrap" }, aiExplanation || "Click 'Explain', 'Suggest', or 'Debug' to get AI help!")
              ),
              // ── Variable Inspector / Debug Panel ──
              React.createElement("div", { className: "bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-3 border border-slate-600/40" },
                React.createElement("h4", { className: "text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1" },
                  React.createElement("span", null, "🔍"), " Variable Inspector"
                ),
                React.createElement("div", { className: "grid gap-1", style: { gridTemplateColumns: '1fr 1fr' } },
                  // Turtle State
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "🐢 x: ", React.createElement("span", { className: "text-cyan-300 font-bold" }, Math.round(turtleState.x))
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "🐢 y: ", React.createElement("span", { className: "text-cyan-300 font-bold" }, Math.round(turtleState.y))
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "🧭 angle: ", React.createElement("span", { className: "text-amber-300 font-bold" }, Math.round(turtleState.angle) + "°")
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "✏️ pen: ", React.createElement("span", { className: turtleState.penDown ? "text-green-400 font-bold" : "text-red-400 font-bold" }, turtleState.penDown ? "down" : "up")
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "📐 lines: ", React.createElement("span", { className: "text-purple-300 font-bold" }, drawnLines.length)
                  ),
                  React.createElement("div", { className: "text-[10px] font-mono text-slate-300 bg-slate-700/50 rounded px-2 py-1" },
                    "⚡ step: ", React.createElement("span", { className: "text-orange-300 font-bold" }, stepIdx >= 0 ? stepIdx : "—")
                  )
                ),
                // User-defined variables
                d._vars && Object.keys(d._vars).length > 0 && React.createElement("div", { className: "mt-2 border-t border-slate-600/30 pt-2" },
                  React.createElement("span", { className: "text-[9px] font-bold text-slate-500 uppercase tracking-wider" }, "User Variables"),
                  React.createElement("div", { className: "grid gap-1 mt-1", style: { gridTemplateColumns: '1fr 1fr' } },
                    Object.keys(d._vars || {}).filter(function(k) { return k.indexOf('__func_') !== 0; }).map(function(vk) {
                      return React.createElement("div", { key: vk, className: "text-[10px] font-mono text-slate-300 bg-emerald-900/30 rounded px-2 py-1 border border-emerald-700/20" },
                        "$" + vk + " = ", React.createElement("span", { className: "text-emerald-300 font-bold" }, String(d._vars[vk]))
                      );
                    })
                  )
                )
              ),

              // CS concepts panel
              React.createElement("div", { className: "bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-3 border border-indigo-700/30" },
                React.createElement("h4", { className: "text-xs font-bold text-indigo-300 mb-1" }, "🔬 CS Concepts"),
                React.createElement("p", { className: "text-[11px] text-indigo-200/70 leading-relaxed" },
                  challengeIdx >= 0 ? '📖 This challenge teaches: ' + CHALLENGES[challengeIdx].concept + '. ' + CHALLENGES[challengeIdx].desc :
                    'Computational thinking is the foundation of all computer science. Sequencing puts steps in order. Loops repeat steps efficiently. Variables store data. Conditionals make decisions. Together they let you create anything!'
                )
              ),

              // Snapshot button
              React.createElement("button", {
                onClick: function () {
                  setToolSnapshots(function (prev) { return prev.concat([{ id: 'code-' + Date.now(), tool: 'codingPlayground', label: 'Coding Playground', data: Object.assign({}, d), timestamp: Date.now() }]); });
                  if (addToast) addToast('📸 Code snapshot saved!', 'success');
                },
                className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              }, "📸 Snapshot")
            )
          );
    })();
  }
});
