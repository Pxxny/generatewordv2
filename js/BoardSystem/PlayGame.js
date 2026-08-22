// PlayGame.js — Play tab controller (wires BoardSystems + RackManage + BotSystem to UI)
(function (global) {
  'use strict';

  let state = null;
  let timerInterval = null;
  let initialized = false;

  function $(id) { return document.getElementById(id); }

  // Sort the player's rack alphabetically, with blank tiles ('?') pushed to the end
  // (standard Scrabble rack convention). Bot's rack is left unsorted since it's never
  // shown to the player.
  function sortRackAlpha(rack) {
    return rack.slice().sort((a, b) => {
      if (a === '?' && b === '?') return 0;
      if (a === '?') return 1;
      if (b === '?') return -1;
      return a.localeCompare(b);
    });
  }

  function newGame(opts) {
    const board = global.BoardSystems.createEmptyBoard();
    const bag = global.RackManage.createBag();
    const youRack = sortRackAlpha(global.RackManage.drawTiles(bag, 7));
    const botRack = global.RackManage.drawTiles(bag, 7);
    return {
      board, bag,
      youRack, botRack,
      youScore: 0, botScore: 0,
      turn: opts.firstTurn === 'bot' ? 'bot' : 'you',
      botLevel: opts.botLevel,
      scoringMode: opts.scoringMode, // 'auto' | 'manual'
      challengeRule: opts.challengeRule, // 'double' | 'plus5'
      timeMinutes: opts.timeMinutes,
      youSeconds: opts.timeMinutes * 60,
      botSeconds: opts.timeMinutes * 60,
      pending: [],          // tiles placed this turn but not submitted: {r,c,letter,blank,rackIdx}
      selectedTileIdx: null,
      lastMove: null,       // for challenge: {placements, direction, formed, score, by}
      moveLog: [],
      gameOver: false,
      passStreak: 0
    };
  }

  function init() {
    if (initialized) return;
    initialized = true;

    $('playStartBtn').addEventListener('click', startGameFromSetup);
    $('playScoringMode').addEventListener('change', () => {});
    $('playSubmitBtn').addEventListener('click', submitMove);
    $('playShuffleBtn').addEventListener('click', shuffleRack);
    $('playExchangeBtn').addEventListener('click', exchangeSelected);
    $('playPassBtn').addEventListener('click', passTurn);
    $('playChallengeBtn').addEventListener('click', challengeLastMove);
    $('playRecallBtn').addEventListener('click', recallPending);
    $('playHoldScoreBtn').addEventListener('click', holdManualScore);
    $('playCoinFlipContinueBtn').addEventListener('click', continueAfterCoinFlip);
    $('playBotLevel').addEventListener('change', updateBotThinkTimeNote);
    updateBotThinkTimeNote();
  }

  function updateBotThinkTimeNote() {
    const level = $('playBotLevel').value;
    const profile = global.BotSystem.getProfile(level);
    const capSec = Math.round((profile.thinkTimeCapMs || 10000) / 1000);
    $('playBotThinkTimeNote').textContent = `บอทคิดคำนานสุดประมาณ ${capSec} วินาที`;
  }

  let pendingGameOpts = null;

  function startGameFromSetup() {
    const botLevel = $('playBotLevel').value;
    const timeMinutes = parseInt($('playTimeMinutes').value, 10);
    const scoringMode = $('playScoringMode').value;
    const challengeRule = $('playChallengeRule').value;

    pendingGameOpts = { botLevel, timeMinutes, scoringMode, challengeRule };

    $('playSetupCard').style.display = 'none';
    $('playCoinFlipCard').style.display = 'block';
    $('coinflipBotName').textContent = global.BotSystem.getProfile(botLevel).label;
    runCoinFlip();
  }

  // ---------- coin flip: randomly decide who goes first ----------
  // House rule: each side draws one tile; closest to 'A' goes first, and a
  // blank beats every letter (same convention used with a real tile bag).
  function tileDrawRank(letter) {
    if (letter === '?') return -1; // blank always wins
    return letter.charCodeAt(0);
  }

  function runCoinFlip() {
    const youTileEl = $('coinflipYouTile');
    const botTileEl = $('coinflipBotTile');
    const outcomeEl = $('coinflipOutcome');
    const continueBtn = $('playCoinFlipContinueBtn');
    continueBtn.style.display = 'none';
    outcomeEl.textContent = 'กำลังจั่ว...';
    youTileEl.classList.add('flipping');
    botTileEl.classList.add('flipping');
    youTileEl.classList.remove('winner');
    botTileEl.classList.remove('winner');

    // Draw from a fresh temporary bag (doesn't touch the real game's bag/tiles).
    const tempBag = global.RackManage.createBag();
    const [youLetter, botLetter] = global.RackManage.drawTiles(tempBag, 2);

    setTimeout(() => {
      youTileEl.classList.remove('flipping');
      botTileEl.classList.remove('flipping');
      youTileEl.textContent = youLetter === '?' ? '★' : youLetter;
      botTileEl.textContent = botLetter === '?' ? '★' : botLetter;

      const youRank = tileDrawRank(youLetter);
      const botRank = tileDrawRank(botLetter);
      let firstTurn;
      if (youRank === botRank) {
        // tie (rare, e.g. drew the same letter) -> redraw
        outcomeEl.textContent = 'เสมอ! จั่วใหม่...';
        setTimeout(runCoinFlip, 800);
        return;
      } else if (youRank < botRank) {
        firstTurn = 'you';
        youTileEl.classList.add('winner');
        outcomeEl.textContent = `คุณจั่ว ${youLetter === '?' ? 'Blank' : youLetter} ใกล้ A กว่า — คุณเริ่มก่อน!`;
      } else {
        firstTurn = 'bot';
        botTileEl.classList.add('winner');
        outcomeEl.textContent = `${$('coinflipBotName').textContent} จั่ว ${botLetter === '?' ? 'Blank' : botLetter} ใกล้ A กว่า — บอทเริ่มก่อน!`;
      }
      pendingGameOpts.firstTurn = firstTurn;
      continueBtn.style.display = '';
    }, 700);
  }

  function continueAfterCoinFlip() {
    state = newGame(pendingGameOpts);

    $('playCoinFlipCard').style.display = 'none';
    $('playGameCard').style.display = 'block';
    $('playBotLabel').textContent = global.BotSystem.getProfile(pendingGameOpts.botLevel).label;
    $('playManualScoreWrap').style.display = pendingGameOpts.scoringMode === 'manual' ? 'flex' : 'none';
    $('playChallengeBtn').style.display = pendingGameOpts.challengeRule === 'void' ? 'none' : '';

    renderAll();
    startTimer();
    if (state.turn === 'bot') doBotTurn();
  }

  // ---------- rendering ----------

  function renderAll() {
    renderBoard();
    renderRack();
    renderScoreboard();
    renderBagCount();
    renderLog();
    updateTimerDisplay();
  }

  function renderBoard() {
    const boardEl = $('playBoard');
    boardEl.innerHTML = '';
    const size = global.BoardSystems.SIZE;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cellEl = document.createElement('div');
        cellEl.className = 'play-cell';
        const premium = global.BoardSystems.getPremium(r, c);
        if (premium) cellEl.classList.add('premium-' + premium);
        if (r === 7 && c === 7) cellEl.classList.add('center-star');

        const boardCell = state.board[r][c];
        const pendingCell = state.pending.find(p => p.r === r && p.c === c);

        if (boardCell) {
          cellEl.classList.add('has-tile');
          cellEl.textContent = boardCell.letter;
          const val = document.createElement('span');
          val.className = 'tile-val';
          val.textContent = boardCell.blank ? '' : global.RackManage.tileValue(boardCell.letter);
          cellEl.appendChild(val);
        } else if (pendingCell) {
          cellEl.classList.add('pending-tile');
          cellEl.textContent = pendingCell.letter;
        } else if (premium) {
          cellEl.textContent = premiumLabel(premium);
        }

        cellEl.dataset.r = r;
        cellEl.dataset.c = c;
        cellEl.addEventListener('click', () => onCellClick(r, c));
        // Native HTML5 drag/drop (mouse-only); pointer-based drag below covers touch too.
        cellEl.addEventListener('dragover', (e) => {
          if (state.turn !== 'you' || state.gameOver) return;
          if (state.board[r][c]) return;
          e.preventDefault();
          cellEl.classList.add('drag-over');
        });
        cellEl.addEventListener('dragleave', () => cellEl.classList.remove('drag-over'));
        cellEl.addEventListener('drop', (e) => {
          e.preventDefault();
          cellEl.classList.remove('drag-over');
          const idxStr = e.dataTransfer.getData('text/plain');
          if (idxStr === '') return;
          const idx = parseInt(idxStr, 10);
          placeRackTileAt(idx, r, c);
        });
        boardEl.appendChild(cellEl);
      }
    }
  }

  function premiumLabel(p) {
    return { TW: 'TW', DW: 'DW', TL: 'TL', DL: 'DL' }[p] || '';
  }

  function renderRack() {
    const rackEl = $('playRack');
    rackEl.innerHTML = '';
    state.youRack.forEach((letter, idx) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'play-tile';
      if (letter === '?') tileEl.classList.add('blank-tile');
      const usedInPending = state.pending.some(p => p.rackIdx === idx);
      if (usedInPending) tileEl.classList.add('tile-used');
      if (state.selectedTileIdx === idx) tileEl.classList.add('tile-selected');

      tileEl.textContent = letter === '?' ? '' : letter;
      const val = document.createElement('span');
      val.className = 'tile-val';
      val.textContent = global.RackManage.tileValue(letter);
      tileEl.appendChild(val);

      tileEl.addEventListener('click', () => onRackTileClick(idx));

      // Drag-and-drop: rack tiles can be dragged straight onto the board.
      // Two mechanisms so it works on both desktop (mouse) and mobile (touch):
      //  - native HTML5 drag/drop for mouse
      //  - Pointer Events based custom drag for touch/pen (HTML5 DnD is not
      //    supported on most touch browsers, which is why dragging felt "stuck").
      const draggable = state.turn === 'you' && !usedInPending && !state.gameOver;
      tileEl.draggable = draggable;
      if (draggable) {
        tileEl.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', String(idx));
          e.dataTransfer.effectAllowed = 'move';
          tileEl.classList.add('tile-dragging');
        });
        tileEl.addEventListener('dragend', () => tileEl.classList.remove('tile-dragging'));

        tileEl.style.touchAction = 'none';
        tileEl.addEventListener('pointerdown', (e) => startPointerDrag(e, idx, tileEl));
      }
      rackEl.appendChild(tileEl);
    });
  }

  function renderScoreboard() {
    $('playScoreYou').textContent = state.youScore;
    $('playScoreBot').textContent = state.botScore;
    renderTurnIndicator();
  }

  function renderTurnIndicator() {
    const isYourTurn = state.turn === 'you' || state.turn === 'you-manual-pending';
    const isBotTurn = state.turn === 'bot';
    $('playScoreYouWrap').classList.toggle('turn-active', isYourTurn);
    $('playScoreBotWrap').classList.toggle('turn-active', isBotTurn);
    const label = $('playTurnIndicator');
    if (state.gameOver) {
      label.textContent = 'เกมจบแล้ว';
    } else if (isYourTurn) {
      label.textContent = '👉 ตาคุณ';
    } else if (isBotTurn) {
      label.textContent = '🤖 ตาบอทกำลังคิด...';
    } else {
      label.textContent = '';
    }
  }

  function renderBagCount() {
    $('playBagCount').textContent = global.RackManage.bagCount(state.bag);
  }

  function renderLog() {
    const logEl = $('playMoveLog');
    logEl.innerHTML = state.moveLog.map(entry => {
      const cls = entry.by === 'you' ? 'log-you' : 'log-bot';
      return `<div class="log-entry ${cls}">${entry.text}</div>`;
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ---------- interaction ----------

  function onRackTileClick(idx) {
    if (state.turn !== 'you' || state.gameOver) return;
    const alreadyUsed = state.pending.some(p => p.rackIdx === idx);
    if (alreadyUsed) return;
    state.selectedTileIdx = (state.selectedTileIdx === idx) ? null : idx;
    renderRack();
  }

  // ---------- pointer-based drag (works for touch, mouse, pen) ----------
  let dragGhost = null;
  let dragMoved = false;
  let dragStartXY = null;

  function startPointerDrag(e, idx, tileEl) {
    if (state.turn !== 'you' || state.gameOver) return;
    // Let a plain tap still work as click-to-select; only hijack once the
    // pointer actually moves past a small threshold (i.e. a real drag).
    dragMoved = false;
    dragStartXY = { x: e.clientX, y: e.clientY };
    const pointerId = e.pointerId;

    function onMove(ev) {
      const dx = ev.clientX - dragStartXY.x;
      const dy = ev.clientY - dragStartXY.y;
      if (!dragMoved && Math.hypot(dx, dy) > 8) {
        dragMoved = true;
        createDragGhost(tileEl, ev.clientX, ev.clientY);
        tileEl.classList.add('tile-dragging');
      }
      if (dragMoved && dragGhost) {
        positionDragGhost(ev.clientX, ev.clientY);
        highlightCellUnder(ev.clientX, ev.clientY);
      }
    }

    function onUp(ev) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      tileEl.classList.remove('tile-dragging');
      clearCellHighlights();
      if (dragMoved) {
        const cell = cellFromPoint(ev.clientX, ev.clientY);
        destroyDragGhost();
        if (cell) placeRackTileAt(idx, cell.r, cell.c);
      }
      dragMoved = false;
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  function createDragGhost(tileEl, x, y) {
    destroyDragGhost();
    dragGhost = tileEl.cloneNode(true);
    dragGhost.classList.add('play-tile-ghost');
    document.body.appendChild(dragGhost);
    positionDragGhost(x, y);
  }

  function positionDragGhost(x, y) {
    if (!dragGhost) return;
    dragGhost.style.left = x + 'px';
    dragGhost.style.top = y + 'px';
  }

  function destroyDragGhost() {
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  }

  function cellFromPoint(x, y) {
    if (dragGhost) dragGhost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (dragGhost) dragGhost.style.display = '';
    const cellEl = el && el.closest ? el.closest('.play-cell') : null;
    if (!cellEl) return null;
    return { r: parseInt(cellEl.dataset.r, 10), c: parseInt(cellEl.dataset.c, 10) };
  }

  function highlightCellUnder(x, y) {
    clearCellHighlights();
    const cell = cellFromPoint(x, y);
    if (!cell) return;
    if (state.board[cell.r][cell.c]) return;
    const boardEl = $('playBoard');
    const idx = cell.r * global.BoardSystems.SIZE + cell.c;
    const cellEl = boardEl.children[idx];
    if (cellEl) cellEl.classList.add('drag-over');
  }

  function clearCellHighlights() {
    document.querySelectorAll('.play-cell.drag-over').forEach(el => el.classList.remove('drag-over'));
  }

  function onCellClick(r, c) {
    if (state.turn !== 'you' || state.gameOver) return;
    if (state.board[r][c]) return; // occupied
    const existingPendingIdx = state.pending.findIndex(p => p.r === r && p.c === c);

    if (existingPendingIdx !== -1) {
      // clicking an already-pending cell removes it (returns tile to rack)
      state.pending.splice(existingPendingIdx, 1);
      renderAll();
      return;
    }

    if (state.selectedTileIdx === null) return;
    placeRackTileAt(state.selectedTileIdx, r, c);
  }

  // Shared placement logic used by both click-to-place and drag-and-drop.
  function placeRackTileAt(rackIdx, r, c) {
    if (state.turn !== 'you' || state.gameOver) return;
    if (state.board[r][c]) return; // occupied
    if (state.pending.some(p => p.r === r && p.c === c)) return; // already has a pending tile
    if (state.pending.some(p => p.rackIdx === rackIdx)) return; // tile already placed elsewhere this turn
    const letter0 = state.youRack[rackIdx];
    if (letter0 === undefined) return;

    let letter = letter0;
    let isBlank = letter === '?';
    if (isBlank) {
      const chosen = prompt('เลือกตัวอักษรแทน Blank tile (A-Z):');
      if (!chosen || !/^[A-Za-z]$/.test(chosen)) return;
      letter = chosen.toUpperCase();
    }
    state.pending.push({ r, c, letter, blank: isBlank, rackIdx });
    state.selectedTileIdx = null;
    renderAll();
  }

  function recallPending() {
    if (state.turn !== 'you') return;
    state.pending = [];
    renderAll();
  }

  function shuffleRack() {
    if (state.pending.length > 0) return; // avoid index confusion mid-placement
    state.youRack = global.RackManage.shuffle(state.youRack);
    renderRack();
  }

  // ---------- submitting a move ----------

  function submitMove() {
    if (state.turn !== 'you' || state.gameOver) return;
    if (state.pending.length === 0) { alert('ยังไม่ได้ลงคำ'); return; }

    const shape = global.BoardSystems.validatePlacementShape(state.board, state.pending);
    if (!shape.ok) {
      alert(shapeErrorMessage(shape.reason));
      return;
    }

    const formed = global.BoardSystems.collectFormedWords(state.board, state.pending, shape.direction);
    if (formed.length === 0) { alert('ไม่พบคำที่เกิดขึ้น'); return; }

    const invalidWords = formed.filter(w => !global.BotSystem.isValidWord(w.text));

    if (state.challengeRule === 'void') {
      // Void Challenge: no challenging allowed — every word MUST be in the CSW24
      // dictionary or the move cannot be submitted at all.
      if (invalidWords.length > 0) {
        alert('Void Challenge: คำต่อไปนี้ไม่มีใน CSW24 จึงลงไม่ได้: ' + invalidWords.map(w => w.text).join(', '));
        return;
      }
    } else if (invalidWords.length > 0) {
      const proceed = confirm('คำบางคำอาจไม่อยู่ใน CSW24: ' + invalidWords.map(w => w.text).join(', ') + '\nยืนยันลงคำหรือไม่? (บอทอาจ Challenge)');
      if (!proceed) return;
    }

    finalizeYourMove(shape.direction, formed);
  }

  function finalizeYourMove(direction, formed) {
    const placements = state.pending.slice();
    const { totalScore, breakdown } = global.BoardSystems.scoreWords(state.board, placements, formed);

    let scoreToApply = totalScore;
    if (state.scoringMode === 'manual') {
      // manual mode: score gets applied only through the Hold button flow.
      state.lastMove = { placements, direction, formed, autoScore: totalScore, by: 'you', applied: false };
      global.BoardSystems.applyPlacements(state.board, placements);
      refillRackAfterMove('you', placements);
      logEntry('you', `คุณลงคำ: ${formed.map(w => w.text).join(', ')} (รอใส่คะแนนเอง)`);
      state.pending = [];
      state.turn = 'you-manual-pending';
      renderAll();
      return;
    }

    state.youScore += scoreToApply;
    global.BoardSystems.applyPlacements(state.board, placements);
    state.lastMove = { placements, direction, formed, score: scoreToApply, by: 'you' };
    logEntry('you', `คุณลงคำ: ${breakdown.map(b => `${b.word}(+${b.score})`).join(', ')} รวม +${scoreToApply}`);
    refillRackAfterMove('you', placements);
    state.pending = [];
    state.passStreak = 0;
    endTurn();
  }

  function holdManualScore() {
    if (!state.lastMove || state.lastMove.by !== 'you' || state.lastMove.applied) return;
    const val = parseInt($('playManualScoreInput').value, 10) || 0;
    state.youScore += val;
    state.lastMove.applied = true;
    state.lastMove.score = val;
    logEntry('you', `ยืนยันคะแนนเอง: +${val}`);
    state.turn = 'you';
    state.passStreak = 0;
    endTurn();
  }

  function shapeErrorMessage(reason) {
    return {
      no_tiles: 'ยังไม่ได้วางตัวอักษร',
      not_in_line: 'ตัวอักษรต้องอยู่แถวหรือคอลัมน์เดียวกัน',
      must_cover_center: 'คำแรกต้องผ่านช่องกลาง (★)',
      not_connected: 'คำต้องเชื่อมกับคำที่มีอยู่บนกระดาน',
      gap_in_line: 'มีช่องว่างระหว่างตัวอักษรที่วาง'
    }[reason] || 'การวางไม่ถูกต้อง';
  }

  function refillRackAfterMove(who, placements) {
    const rackKey = who === 'you' ? 'youRack' : 'botRack';
    const usedIdx = new Set(placements.map(p => p.rackIdx).filter(i => i !== undefined));
    const remaining = state[rackKey].filter((_, idx) => !usedIdx.has(idx));
    const needed = 7 - remaining.length;
    const drawn = global.RackManage.drawTiles(state.bag, needed);
    const newRack = remaining.concat(drawn);
    state[rackKey] = who === 'you' ? sortRackAlpha(newRack) : newRack;
  }

  // ---------- pass / exchange ----------

  function passTurn() {
    if (state.turn !== 'you' || state.gameOver) return;
    state.pending = [];
    logEntry('you', 'คุณ Pass');
    state.passStreak++;
    checkGameEndByPasses();
    endTurn();
  }

  function exchangeSelected() {
    if (state.turn !== 'you' || state.gameOver) return;
    if (global.RackManage.bagCount(state.bag) < 7) { alert('Tile Bag เหลือน้อยเกินไปสำหรับ Exchange'); return; }
    const idx = state.selectedTileIdx;
    if (idx === null) { alert('เลือกตัวอักษรที่จะแลกก่อน (คลิกที่ตัวอักษรใน Rack)'); return; }
    const tile = state.youRack[idx];
    global.RackManage.returnTiles(state.bag, [tile]);
    const drawn = global.RackManage.drawTiles(state.bag, 1);
    state.youRack.splice(idx, 1, drawn[0]);
    state.youRack = sortRackAlpha(state.youRack);
    state.selectedTileIdx = null;
    logEntry('you', `แลกตัวอักษร 1 ตัว`);
    state.passStreak++;
    checkGameEndByPasses();
    endTurn();
  }

  function checkGameEndByPasses() {
    if (state.passStreak >= 6) {
      state.gameOver = true;
      logEntry('you', 'เกมจบ: Pass ติดต่อกันครบกำหนด');
      stopTimer();
    }
  }

  // ---------- challenge ----------

  function challengeLastMove() {
    if (!state.lastMove || state.gameOver) return;
    if (state.challengeRule === 'void') return; // Void Challenge: challenging is disabled entirely
    const move = state.lastMove;
    // Ensure the CSW24 word set is built before checking, otherwise a valid word
    // can incorrectly come back as "invalid" (the bug where challenges failed
    // on words that were actually fine).
    if (global.BotSystem.ensureWordSet) global.BotSystem.ensureWordSet();
    const invalid = move.formed.filter(w => !global.BotSystem.isValidWord(w.text));
    const challenger = move.by === 'you' ? 'bot' : 'you'; // the OTHER player challenges the mover
    const failed = invalid.length === 0; // move was actually valid -> challenge fails

    if (failed) {
      if (state.challengeRule === 'plus5') {
        applyChallengePenalty(challenger, 5);
        logEntry(challenger, `Challenge ล้มเหลว (คำถูกต้องทั้งหมด) เสีย 5 แต้ม`);
      } else {
        logEntry(challenger, `Challenge ล้มเหลว เสียเทิร์น`);
        skipChallengerTurn(challenger);
      }
    } else {
      // move gets retracted
      retractLastMove(move);
      logEntry(challenger, `Challenge สำเร็จ! คำ "${invalid.map(w => w.text).join(', ')}" ไม่ถูกต้อง ถอนคำคืน`);
    }
    state.lastMove = null;
    renderAll();
  }

  function applyChallengePenalty(who, amount) {
    if (who === 'you') state.youScore = Math.max(0, state.youScore - amount);
    else state.botScore = Math.max(0, state.botScore - amount);
  }

  function skipChallengerTurn(challenger) {
    // simplistic: mark a flag so their next natural turn is auto-passed once
    state._skipNextTurnFor = challenger;
  }

  function retractLastMove(move) {
    move.placements.forEach(p => { state.board[p.r][p.c] = null; });
    if (move.by === 'you') state.youScore -= (move.score || 0);
    else state.botScore -= (move.score || 0);
  }

  // ---------- turn flow ----------

  function endTurn() {
    if (state.gameOver) { renderAll(); return; }
    state.turn = state.turn === 'you' ? 'bot' : 'you';
    if (state._skipNextTurnFor === state.turn) {
      state._skipNextTurnFor = null;
      logEntry(state.turn, `${state.turn === 'you' ? 'คุณ' : 'บอท'} ถูกข้ามเทิร์นจาก Challenge`);
      state.turn = state.turn === 'you' ? 'bot' : 'you';
    }
    renderAll();
    if (state.turn === 'bot') doBotTurn();
  }

  function doBotTurn() {
    const waitForBotEl = $('playWaitForBot');
    const skipThinkDelay = waitForBotEl ? !waitForBotEl.checked : false;
    if (!skipThinkDelay) renderTurnIndicator(); // shows "บอทกำลังคิด..." while waiting
    global.BotSystem.decideMove(state.board, state.botRack, state.botLevel, { skipThinkDelay }).then(move => {
      if (state.gameOver) return;
      if (!move) {
        logEntry('bot', 'บอท Pass');
        state.passStreak++;
        checkGameEndByPasses();
        state.turn = 'you';
        renderAll();
        return;
      }
      let scoreToApply = move.score;
      if (state.scoringMode === 'manual') {
        const selfCheck = global.BotSystem.botSelfScore(state.board, move.placements, move.direction);
        scoreToApply = selfCheck.totalScore;
      }
      global.BoardSystems.applyPlacements(state.board, move.placements);
      state.botScore += scoreToApply;
      state.lastMove = { placements: move.placements, direction: move.direction, formed: move.formed, score: scoreToApply, by: 'bot' };
      logEntry('bot', `บอทลงคำ: ${move.formed.map(w => w.text).join(', ')} +${scoreToApply}`);
      refillRackAfterMove('bot', move.placements);
      state.passStreak = 0;
      state.turn = 'you';
      renderAll();
    });
  }

  function logEntry(by, text) {
    state.moveLog.push({ by, text });
    renderLog();
  }

  // ---------- timer ----------

  function startTimer() {
    if (state.timeMinutes === 0) {
      $('playTimerYou').textContent = '∞';
      $('playTimerBot').textContent = '∞';
      return;
    }
    stopTimer();
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      if (state.gameOver) { stopTimer(); return; }
      if (state.turn === 'you') state.youSeconds = Math.max(0, state.youSeconds - 1);
      else if (state.turn === 'bot') state.botSeconds = Math.max(0, state.botSeconds - 1);
      updateTimerDisplay();
      if ((state.turn === 'you' && state.youSeconds === 0) || (state.turn === 'bot' && state.botSeconds === 0)) {
        state.gameOver = true;
        logEntry(state.turn, 'หมดเวลา! เกมจบ');
        stopTimer();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function formatSeconds(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Always show BOTH clocks at once (yours and the bot's), not just the active one.
  function updateTimerDisplay() {
    $('playTimerYou').textContent = formatSeconds(state.youSeconds);
    $('playTimerBot').textContent = formatSeconds(state.botSeconds);
  }

  global.PlayGame = { init };
})(window);
