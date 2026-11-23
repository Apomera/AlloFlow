// Practice and check adapter: Rapid symbol, letter, digit, and subitizing trainer (symbol_runner).
// Supports Direct response mode and Aim and lock-on challenge mode (hover or ArrowLeft/ArrowRight
// onto the target lane before responding), plus incremental rehearsal study cards and cue pictures.
module.exports = {
  id: 'symbol_runner',
  title: 'Symbol runner',
  labels: {
    symbol_runner_intro: 'Read or name each symbol shown on the lane. Aim first if lock-on mode is active.',
    symbol_runner_study: 'A new symbol to learn. Look closely at it, then choose Cover it.',
    symbol_runner_cover: 'Cover it',
    symbol_runner_direct: 'Choose the matching key or type the answer.',
    symbol_runner_lockon_wait: 'Lock onto lane {n} by tapping, hovering over it, or using Left and Right arrows.',
    symbol_runner_lockon_ready: 'Target locked on. Now choose or type the answer.',
    symbol_runner_lane_group: 'Three-lane target track',
    symbol_runner_lane: 'Lane {n}',
    symbol_runner_target_lane: 'Target in lane {n}: {word}',
    symbol_runner_hear: 'Hear symbol',
    symbol_runner_picture_alt: 'Picture cue for {word}',
    symbol_runner_input_label: 'Type your answer',
    symbol_runner_keys: 'Response choices',
    symbol_runner_done: 'Check',
    symbol_runner_correct: 'Yes. {word} matches {answer}.',
    symbol_runner_retry: 'Not quite. Look at {word} and try {answer} once more.',
    symbol_runner_missed: 'Here is the answer for {word}: {answer}.',
  },
  prepare: function (p) {
    p = p || {};
    var word = String(p.word == null ? '' : p.word).replace(/\s+/g, ' ').trim();
    if (!word || word.length > 24) return { missing: ['a symbol prompt of 1 to 24 characters'] };
    var answer = String(p.answer == null ? '' : p.answer).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!answer || answer.length > 24) return { missing: ['an answer of 1 to 24 characters'] };
    var role = p.role === 'new' || p.role === 'known' ? p.role : '';
    var study = p.study === true && role !== 'known';
    var laneNum = Number(p.lane);
    var lane = laneNum === 0 || laneNum === 1 || laneNum === 2 ? laneNum : 1;
    var control = p.control === 'lockon' ? 'lockon' : 'direct';
    var dotsNum = Number(p.dots);
    var dots = Number.isInteger(dotsNum) && dotsNum >= 1 && dotsNum <= 9 ? dotsNum : 0;
    var rawChoices = Array.isArray(p.choices) ? p.choices : [answer];
    var choices = [];
    var seen = {};
    for (var i = 0; i < rawChoices.length && choices.length < 6; i++) {
      var c = String(rawChoices[i] == null ? '' : rawChoices[i]).replace(/\s+/g, ' ').trim();
      var k = c.toLowerCase();
      if (!c || c.length > 24 || seen[k]) continue;
      seen[k] = true;
      choices.push(c);
    }
    if (!seen[answer]) {
      if (choices.length >= 6) choices.pop();
      choices.push(answer);
    }
    var image = typeof p.image === 'string' && /^[a-z0-9_-]{1,40}$/i.test(p.image) ? p.image : '';
    var audio = typeof p.audio === 'string' && /^[a-z0-9_-]{1,40}$/i.test(p.audio) ? p.audio : '';
    var mode = typeof p.mode === 'string' ? p.mode.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) : '';
    var maxAttempts = Number(p.maxAttempts);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) maxAttempts = 3;
    var prompt = typeof p.prompt === 'string' ? p.prompt.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    var flankerCenter = Number.isInteger(Number(p.flankerCenter)) && Number(p.flankerCenter) >= 0 && Number(p.flankerCenter) < word.length ? Number(p.flankerCenter) : -1;
    var stroopInk = typeof p.stroopInk === 'string' && /^#[0-9a-f]{6}$/i.test(p.stroopInk.trim()) ? p.stroopInk.trim() : '';
    var allowedShapes = { '●': 1, '▲': 1, '■': 1, '★': 1 };
    var stroopShape = typeof p.stroopShape === 'string' && allowedShapes[p.stroopShape.trim()] ? p.stroopShape.trim() : '';
    var sizePair = null;
    if (p.sizePair && typeof p.sizePair === 'object') {
      var spL = String(p.sizePair.left == null ? '' : p.sizePair.left).replace(/\s+/g, ' ').trim().slice(0, 8);
      var spR = String(p.sizePair.right == null ? '' : p.sizePair.right).replace(/\s+/g, ' ').trim().slice(0, 8);
      if (spL && spR) {
        var ls = Math.max(0.5, Math.min(2.0, Number(p.sizePair.leftScale) || 1));
        var rs = Math.max(0.5, Math.min(2.0, Number(p.sizePair.rightScale) || 1));
        sizePair = { left: spL, right: spR, leftScale: ls, rightScale: rs, pick: p.sizePair.pick === 'size' ? 'size' : 'value' };
      }
    }
    var congruent = typeof p.congruent === 'boolean' ? p.congruent : null;
    return {
      item: {
        word: word,
        answer: answer,
        target: answer,
        role: role,
        study: study,
        lane: lane,
        control: control,
        dots: dots,
        choices: choices,
        image: image,
        audio: audio,
        mode: mode,
        maxAttempts: maxAttempts,
        prompt: prompt,
        flankerCenter: flankerCenter,
        stroopInk: stroopInk,
        stroopShape: stroopShape,
        sizePair: sizePair,
        congruent: congruent,
      },
    };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var phase = item.study ? 'study' : 'play';
    var isLockOn = item.control === 'lockon';
    var aimLane = isLockOn ? (item.lane === 1 ? 0 : 1) : item.lane;
    var lockedOn = !isLockOn;
    var tried = {};
    var outcome = null;

    var imgSrc = item.image ? ctx.image(item.image) : null;
    var hasSafeImg = typeof imgSrc === 'string' && /^data:image\//i.test(imgSrc);

    var say = ctx.el('p', {
      'data-sr-say': '',
      style: 'text-align:center;font-weight:700;margin:0 0 10px',
    });

    var coverButton = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-sr-cover': '',
      style: 'display:block;margin:8px auto',
      on: {
        click: function () {
          if (phase !== 'study' || ctx.isDone()) return;
          phase = 'play';
          redraw();
          try {
            if (isLockOn && laneButtons[aimLane]) { laneButtons[aimLane].focus(); }
            else {
              var nextFocus = ctx.root.querySelector('[data-lane]:not([disabled]), [data-sr-choice]:not([disabled]), input:not([disabled]):not([hidden]), button:not([disabled]):not([hidden])');
              if (nextFocus && typeof nextFocus.focus === 'function') nextFocus.focus();
            }
          } catch (_) {}
        },
      },
    }, [L.symbol_runner_cover]);

    var hearButton = item.audio
      ? ctx.el('button', {
        type: 'button',
        'data-sr-hear': '',
        style: 'display:inline-flex;align-items:center;gap:6px;margin:0 auto 10px',
        on: {
          click: function () {
            if (typeof ctx.play === 'function') ctx.play(item.audio);
            ctx.support('audio');
          },
        },
      }, [L.symbol_runner_hear])
      : null;

    function buildDotGrid(count) {
      var wrap = ctx.el('span', {
        'data-sr-dots': String(count),
        'aria-hidden': 'true',
        style: 'display:inline-grid;grid-template-columns:repeat(3,14px);gap:6px;padding:6px;vertical-align:middle',
      });
      var layouts = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8],
        7: [0, 2, 3, 4, 5, 6, 8],
        8: [0, 1, 2, 3, 5, 6, 7, 8],
        9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      };
      var active = layouts[count] || layouts[1];
      for (var d = 0; d < 9; d++) {
        var on = active.indexOf(d) >= 0;
        wrap.appendChild(ctx.el('span', {
          style: 'width:12px;height:12px;border-radius:50%;display:block;' + (on ? 'background:currentColor;' : 'opacity:0;'),
        }));
      }
      return wrap;
    }

    var laneTrack = ctx.el('div', {
      'data-sr-lanes': '',
      'data-control': item.control,
      'data-locked': String(!lockedOn),
      role: 'group',
      'aria-label': L.symbol_runner_lane_group,
      style: 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:var(--sr-lane,460px);width:100%;box-sizing:border-box;margin:0 auto 14px;padding:8px;border-radius:16px;background:var(--soft);border:2px solid var(--muted)',
    });

    var laneButtons = [];
    function lockToLane(idx) {
      if (phase !== 'play' || ctx.isDone()) return;
      aimLane = idx;
      if (isLockOn && idx === item.lane && !lockedOn) {
        lockedOn = true;
        ctx.support('lockon');
        ctx.announce(L.symbol_runner_lockon_ready);
      }
      redraw();
    }

    for (var i = 0; i < 3; i++) {
      (function (laneIndex) {
        var isTarget = laneIndex === item.lane;
        var children = [];
        children.push(ctx.el('span', {
          style: 'font-size:0.75rem;font-weight:700;opacity:0.8',
          text: ctx.fmt(L.symbol_runner_lane, { n: laneIndex + 1 }),
        }));
        if (isTarget) {
          if (item.dots > 0 && item.mode === 'quantity_stroop') {
            var qWrap = ctx.el('div', {
              style: 'position:relative;display:inline-flex;align-items:center;justify-content:center;padding:4px',
            });
            qWrap.appendChild(ctx.el('span', {
              'aria-hidden': 'true',
              style: 'position:absolute;font-size:2.6rem;font-weight:900;opacity:0.42;color:var(--warn);pointer-events:none',
              text: item.word,
            }));
            qWrap.appendChild(buildDotGrid(item.dots));
            children.push(qWrap);
          } else if (item.dots > 0) {
            children.push(buildDotGrid(item.dots));
          } else if (item.sizePair) {
            children.push(ctx.el('div', {
              'data-sr-symbol': item.word,
              style: 'display:flex;align-items:baseline;justify-content:center;gap:clamp(4px,2vw,12px);line-height:1.1;margin:4px 0',
            }, [
              ctx.el('span', { style: 'font-weight:900;font-size:clamp(' + (1.0 * item.sizePair.leftScale).toFixed(2) + 'rem,' + (4.2 * item.sizePair.leftScale).toFixed(2) + 'vw,' + (1.45 * item.sizePair.leftScale).toFixed(2) + 'rem)', text: item.sizePair.left }),
              ctx.el('span', { 'aria-hidden': 'true', style: 'opacity:0.4;font-size:clamp(0.8rem,2.5vw,1rem)', text: '|' }),
              ctx.el('span', { style: 'font-weight:900;font-size:clamp(' + (1.0 * item.sizePair.rightScale).toFixed(2) + 'rem,' + (4.2 * item.sizePair.rightScale).toFixed(2) + 'vw,' + (1.45 * item.sizePair.rightScale).toFixed(2) + 'rem)', text: item.sizePair.right }),
            ]));
          } else if (item.stroopInk) {
            var badgeChildren = [];
            if (item.stroopShape) {
              badgeChildren.push(ctx.el('span', { 'aria-hidden': 'true', style: 'margin-inline-end:6px', text: item.stroopShape }));
            }
            badgeChildren.push(ctx.el('span', { text: item.word }));
            children.push(ctx.el('span', {
              'data-sr-symbol': item.word,
              // A fixed white card in every theme (and with forced colors), so the ink is seen as it was made.
              style: 'display:inline-block;max-width:100%;font-size:clamp(1.05rem,4.8vw,1.7rem);font-weight:900;line-height:1.1;margin:4px 0;padding:6px clamp(6px,2.5vw,14px);border-radius:10px;border:2px solid #6b7280;background:#ffffff;forced-color-adjust:none;color:' + item.stroopInk,
            }, badgeChildren));
          } else if (item.flankerCenter >= 0) {
            var chars = item.word.split('');
            var fNodes = chars.map(function (ch, idx) {
              return idx === item.flankerCenter
                ? ctx.el('span', { style: 'text-decoration:underline;font-weight:900;padding:0 2px', text: ch })
                : ctx.el('span', { text: ch });
            });
            children.push(ctx.el('span', {
              'data-sr-symbol': item.word,
              style: 'font-size:clamp(1.05rem,5vw,1.8rem);font-weight:800;line-height:1.1;margin:4px 0;letter-spacing:clamp(0.02em,0.8vw,0.08em)',
            }, fNodes));
          } else {
            children.push(ctx.el('span', {
              'data-sr-symbol': item.word,
              style: 'font-size:clamp(1.25rem,6.5vw,2.4rem);font-weight:900;line-height:1.1;margin:4px 0;max-width:100%;overflow-wrap:anywhere',
              text: item.word,
            }));
          }
          if (hasSafeImg) {
            children.push(ctx.el('img', {
              src: imgSrc,
              alt: ctx.fmt(L.symbol_runner_picture_alt, { word: item.word }),
              style: 'width:52px;height:52px;object-fit:contain;margin-top:4px;border-radius:8px;background:#fff;padding:2px',
            }));
          }
        } else {
          children.push(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:1.5rem;opacity:0.3', text: '·' }));
        }
        var lb = ctx.el('button', {
          type: 'button',
          'data-lane': String(laneIndex),
          'data-sr-target': isTarget ? 'true' : 'false',
          // 2026-11-18: on dot, ink and size cards the card's word is the answer ("5 dots") or the distractor (the
          // digit, the color word): their lanes are named by number only.
          'aria-label': isTarget && !(item.dots > 0 || item.stroopInk || item.sizePair)
            ? ctx.fmt(L.symbol_runner_target_lane, { n: laneIndex + 1, word: item.word })
            : ctx.fmt(L.symbol_runner_lane, { n: laneIndex + 1 }),
          style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:112px;min-width:0;width:100%;box-sizing:border-box;padding:8px 4px;border-radius:12px;border:3px solid var(--muted);background:var(--bg)',
          on: {
            mouseenter: function () { if (isTarget) lockToLane(laneIndex); else { aimLane = laneIndex; redraw(); } },
            pointerenter: function () { if (isTarget) lockToLane(laneIndex); },
            click: function () { lockToLane(laneIndex); },
            keydown: function (e) {
              if (e.key === 'ArrowLeft') { e.preventDefault(); var p1 = Math.max(0, aimLane - 1); aimLane = p1; if (laneButtons[p1]) laneButtons[p1].focus(); lockToLane(p1); }
              else if (e.key === 'ArrowRight') { e.preventDefault(); var p2 = Math.min(2, aimLane + 1); aimLane = p2; if (laneButtons[p2]) laneButtons[p2].focus(); lockToLane(p2); }
              else if ((e.key === 'Enter' || e.key === ' ') && isTarget) { e.preventDefault(); lockToLane(laneIndex); }
            },
          },
        }, children);
        laneButtons.push(lb);
        laneTrack.appendChild(lb);
      })(i);
    }

    var numericChoices = item.choices.length > 0 && item.choices.every(function (c) { return /^[0-9]+$/.test(String(c).trim()); });
    var textInput = ctx.el('input', {
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'data-sr-input': '',
      'aria-label': L.symbol_runner_input_label,
      style: 'max-width:160px;text-align:center;font-size:1.3rem;font-weight:700',
    });
    if (numericChoices) textInput.setAttribute('inputmode', 'numeric');

    var submitBtn = ctx.el('button', {
      type: 'button',
      class: 'primary',
      'data-sr-submit': '',
      on: {
        click: function () {
          submitAnswer(textInput.value);
        },
      },
    }, [L.symbol_runner_done]);

    textInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.repeat && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        submitAnswer(textInput.value);
      }
    });
    // Practice mode: auto-submit an exact typed match when no longer choice shares it as a prefix.
    textInput.addEventListener('input', function () {
      if (ctx.check || phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return;
      var raw = String(textInput.value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!raw || raw !== item.answer) return;
      var longer = item.choices.some(function (c) {
        var cl = String(c == null ? '' : c).trim().toLowerCase();
        return cl.length > raw.length && cl.indexOf(raw) === 0;
      });
      if (!longer) submitAnswer(raw);
    });

    var typedRow = ctx.el('div', {
      class: 'row',
      style: 'justify-content:center;gap:8px;margin-bottom:12px',
    }, [textInput, submitBtn]);

    var choiceGroup = ctx.el('div', {
      role: 'group',
      'aria-label': L.symbol_runner_keys,
      style: 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:var(--sr-keys,440px);margin:0 auto',
    });

    var shapeMap = { red: '●', blue: '▲', green: '■', gold: '★' };
    var choiceButtons = item.choices.map(function (c, cIdx) {
      var shapeCue = item.stroopInk ? (shapeMap[String(c).toLowerCase()] || '') : '';
      var labelChildren = [];
      if (ctx.check && !numericChoices) {
        labelChildren.push(ctx.el('span', { 'aria-hidden': 'true', style: 'font-size:0.85rem;opacity:0.75;margin-inline-end:6px', text: String(cIdx + 1) }));
      }
      labelChildren.push(ctx.el('span', { text: shapeCue ? (shapeCue + ' ' + c) : c }));
      var cb = ctx.el('button', {
        type: 'button',
        'data-sr-choice': c,
        style: 'min-width:64px;min-height:52px;font-size:1.35rem;font-weight:800;padding:8px 16px;border-radius:12px',
        on: {
          click: function () {
            submitAnswer(c);
          },
        },
      }, labelChildren);
      choiceGroup.appendChild(cb);
      return { val: c, node: cb };
    });

    var padWrap = ctx.el('div', { 'data-sr-pad': '' }, [typedRow, choiceGroup]);
    var sealedPick = false;
    var revealAnswer = null;

    function submitAnswer(raw) {
      if (phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return;
      var clean = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim().toLowerCase();
      if (!clean) return;
      if (ctx.check) {
        var said = ctx.answer(clean);
        if (said !== 'ignored' && said !== 'time_up') {
          sealedPick = true;
          redraw();
        }
        return;
      }
      var right = clean === item.answer;
      var res = ctx.answer(clean, right, {
        correctText: ctx.fmt(L.symbol_runner_correct, { word: item.word, answer: item.answer }),
        retryText: ctx.fmt(L.symbol_runner_retry, { word: item.word, answer: item.answer }),
        missedText: ctx.fmt(L.symbol_runner_missed, { word: item.word, answer: item.answer }),
      });
      if (res === 'retry') {
        tried[clean] = true;
        textInput.value = '';
        redraw();
        if (!ctx.check && item.audio && !item.stroopInk && typeof ctx.play === 'function') {
          ctx.play(item.audio);
        }
      }
    }

    function redraw() {
      laneTrack.setAttribute('data-locked', String(!lockedOn));
      for (var j = 0; j < laneButtons.length; j++) {
        var btn = laneButtons[j];
        var isTarget = j === item.lane;
        var isAimed = j === aimLane;
        btn.style.borderColor = phase === 'done' && isTarget
          ? (outcome ? 'var(--ok)' : 'var(--warn)')
          : isTarget && lockedOn
            ? 'var(--accent)'
            : isAimed
              ? 'var(--warn)'
              : 'var(--muted)';
        // A color item's lanes are not tinted: a green lane behind a color task is itself a color.
        btn.style.background = isTarget && lockedOn && !item.stroopInk ? 'var(--ok-bg)' : isAimed && !item.stroopInk ? 'var(--warn-bg)' : 'var(--bg)';
        btn.style.transform = isAimed ? 'scale(1.03)' : 'scale(1)';
      }

      if (phase === 'study') {
        say.textContent = L.symbol_runner_study;
        coverButton.hidden = false;
        padWrap.hidden = true;
      } else if (phase === 'play') {
        coverButton.hidden = true;
        padWrap.hidden = false;
        say.textContent = lockedOn
          ? (item.prompt || L.symbol_runner_direct)
          : ctx.fmt(L.symbol_runner_lockon_wait, { n: item.lane + 1 });
      } else {
        coverButton.hidden = true;
        padWrap.hidden = false;
        say.textContent = '';
      }

      var inputsBlocked = phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick;
      textInput.disabled = inputsBlocked;
      submitBtn.disabled = inputsBlocked;
      submitBtn.setAttribute('aria-disabled', inputsBlocked ? 'true' : 'false');
      choiceButtons.forEach(function (entry) {
        var usedUp = !!tried[entry.val.toLowerCase()];
        var off = inputsBlocked || usedUp;
        entry.node.disabled = off;
        entry.node.setAttribute('aria-disabled', off ? 'true' : 'false');
        if (phase === 'done' && entry.val.toLowerCase() === (revealAnswer || item.answer)) {
          entry.node.style.borderColor = 'var(--ok)';
          entry.node.style.background = 'var(--ok-bg)';
        }
      });
    }

    if (typeof ctx.keys === 'function') {
      ctx.keys(function (key) {
        var k = String(key == null ? '' : key);
        if (isLockOn && phase === 'play' && !ctx.isDone() && !sealedPick && (k === 'ArrowLeft' || k === 'ArrowRight')) {
          var nextLane = k === 'ArrowLeft' ? Math.max(0, aimLane - 1) : Math.min(2, aimLane + 1);
          aimLane = nextLane;
          if (laneButtons[nextLane]) { try { laneButtons[nextLane].focus(); } catch (_) {} }
          lockToLane(nextLane);
          return true;
        }
        if (phase !== 'play' || !lockedOn || ctx.isDone() || sealedPick) return false;
        var lc = k.toLowerCase();
        if (numericChoices) {
          if (!/^[0-9]$/.test(k)) return false;
          var matched = item.choices.filter(function (c) { return String(c).trim() === k; })[0];
          var longerNum = item.choices.some(function (c) { var s = String(c).trim(); return s.length > 1 && s.indexOf(k) === 0; });
          if (!matched || longerNum) return false;
          if (!tried[matched.toLowerCase()]) submitAnswer(matched);
          return true;
        }
        if (item.stroopInk && k.length === 1) {
          var wantColor = { r: 'red', b: 'blue', g: 'green', y: 'gold' }[lc] || '';
          if (wantColor) {
            var colorHit = item.choices.filter(function (c) {
              var cl = String(c).trim().toLowerCase();
              return cl === wantColor || (lc === 'y' && cl === 'yellow');
            })[0];
            if (colorHit && !tried[colorHit.toLowerCase()]) { submitAnswer(colorHit); return true; }
          }
        }
        if (/^[1-9]$/.test(k)) {
          var n = Number(k);
          if (n >= 1 && n <= item.choices.length) {
            var pickChoice = item.choices[n - 1];
            if (!tried[pickChoice.toLowerCase()]) submitAnswer(pickChoice);
            return true;
          }
          return false;
        }
        if (k.length === 1 && /^[a-z0-9]$/i.test(k)) {
          var exact = item.choices.filter(function (c) { return String(c).trim().toLowerCase() === lc; })[0];
          var longerChoice = item.choices.some(function (c) { var cl = String(c).trim().toLowerCase(); return cl.length > 1 && cl.indexOf(lc) === 0; });
          if (exact && !longerChoice) {
            if (!tried[exact.toLowerCase()]) submitAnswer(exact);
            return true;
          }
        }
        return false;
      });
    }

    ctx.root.appendChild(say);
    if (hearButton) ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'justify-content:center' }, [hearButton]));
    ctx.root.appendChild(laneTrack);
    ctx.root.appendChild(coverButton);
    ctx.root.appendChild(padWrap);
    redraw();
    if (!ctx.noFocus && isLockOn && phase === 'play' && !ctx.isDone() && laneButtons[aimLane]) {
      try { laneButtons[aimLane].focus(); } catch (_) {}
    }

    return {
      replay: item.audio ? function () { if (typeof ctx.play === 'function') ctx.play(item.audio); } : null,
      reveal: function (correct) {
        phase = 'done';
        if (typeof correct === 'string') {
          revealAnswer = String(correct).replace(/\s+/g, ' ').trim().toLowerCase();
          outcome = true;
        } else {
          outcome = correct === true;
        }
        redraw();
      },
    };
  },
  score: function (item, answer, response) {
    var a = String(answer == null ? '' : answer).replace(/\s+/g, ' ').trim().toLowerCase();
    var r = String(response == null ? '' : response).replace(/\s+/g, ' ').trim().toLowerCase();
    return { correct: r !== '' && r === a, digitsCorrect: null, digitsPossible: null };
  },
};
