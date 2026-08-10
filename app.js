/* =========================================================
   CSW24 Word Lab — application logic
   Depends on words-data.js (CSW24_BY_LENGTH, CSW24_TOTAL_COUNT,
   CSW24_MIN_LEN, CSW24_MAX_LEN) being loaded first.
   ========================================================= */

(function () {
  'use strict';

  const SCRABBLE_VALUES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
  };

  const CARDBOX_KEY = 'csw24_cardbox_v1';

  // ---------- generic helpers ----------

  function sortLetters(word) {
    return word.split('').sort().join('');
  }

  function tileRowHTML(word, sizeClass) {
    sizeClass = sizeClass || '';
    return '<span class="tile-word">' + word.split('').map(function (ch) {
      return '<span class="letter-tile ' + sizeClass + '">' + ch +
        '<span class="pv">' + (SCRABBLE_VALUES[ch] || '') + '</span></span>';
    }).join('') + '</span>';
  }

  function blankTileRowHTML(length, sizeClass) {
    sizeClass = sizeClass || '';
    let out = '<span class="tile-word">';
    for (let i = 0; i < length; i++) {
      out += '<span class="letter-tile blank ' + sizeClass + '">&nbsp;</span>';
    }
    return out + '</span>';
  }

  function getAnagrams(word) {
    const key = sortLetters(word);
    const pool = CSW24_BY_LENGTH[word.length] || [];
    const partners = [];
    for (let i = 0; i < pool.length; i++) {
      const w = pool[i];
      if (w !== word && sortLetters(w) === key) partners.push(w);
    }
    return partners;
  }

  function pickRandomWords(min, max, count) {
    const lengths = [];
    let totalWeight = 0;
    for (let L = min; L <= max; L++) {
      const arr = CSW24_BY_LENGTH[L];
      if (arr && arr.length) {
        lengths.push({ L: L, w: arr.length });
        totalWeight += arr.length;
      }
    }
    if (!lengths.length) return [];
    const maxPossible = totalWeight;
    const target = Math.min(count, maxPossible);
    const seen = new Set();
    const result = [];
    let guard = 0;
    while (result.length < target && guard < target * 60 + 200) {
      guard++;
      let r = Math.random() * totalWeight;
      let chosenLen = lengths[lengths.length - 1].L;
      for (let i = 0; i < lengths.length; i++) {
        if (r < lengths[i].w) { chosenLen = lengths[i].L; break; }
        r -= lengths[i].w;
      }
      const arr = CSW24_BY_LENGTH[chosenLen];
      const w = arr[Math.floor(Math.random() * arr.length)];
      if (!seen.has(w)) { seen.add(w); result.push(w); }
    }
    return result;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- toast ----------

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  // ---------- storage ----------

  function loadCardbox() {
    try {
      const raw = localStorage.getItem(CARDBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCardbox(list) {
    localStorage.setItem(CARDBOX_KEY, JSON.stringify(list));
  }

  function addWordsToCardbox(words) {
    const box = loadCardbox();
    const existing = new Set(box.map(function (c) { return c.word; }));
    let added = 0;
    words.forEach(function (w) {
      if (!existing.has(w)) {
        box.push({ word: w, addedAt: Date.now(), status: 'new', correct: 0, incorrect: 0, lastReviewed: null });
        existing.add(w);
        added++;
      }
    });
    saveCardbox(box);
    return added;
  }

  function removeFromCardbox(word) {
    const box = loadCardbox().filter(function (c) { return c.word !== word; });
    saveCardbox(box);
  }

  function updateCardResult(word, isCorrect) {
    const box = loadCardbox();
    const card = box.find(function (c) { return c.word === word; });
    if (!card) return;
    if (isCorrect) card.correct++; else card.incorrect++;
    card.lastReviewed = Date.now();
    if (card.correct >= 3) card.status = 'mastered';
    else if (card.correct >= 1) card.status = 'learning';
    else card.status = 'new';
    saveCardbox(box);
  }

  function statusLabel(status) {
    if (status === 'mastered') return 'เชี่ยวชาญ';
    if (status === 'learning') return 'กำลังเรียน';
    return 'คำใหม่';
  }

  // ---------- tab navigation ----------

  function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'cardbox') renderCardboxTab();
        if (btn.dataset.tab === 'dashboard') renderDashboard();
      });
    });
  }

  // ---------- Generator tab ----------

  const genState = { words: [] };

  function renderGenResults() {
    const wrap = document.getElementById('genResults');
    wrap.innerHTML = genState.words.map(function (word, idx) {
      return (
        '<div class="word-row" data-word="' + word + '">' +
          '<div class="word-row-top">' +
            '<div>' + tileRowHTML(word) + '</div>' +
            '<div class="word-meta">' + word.length + ' ตัวอักษร</div>' +
            '<button class="anagram-toggle" data-idx="' + idx + '">🔤 ดู Anagram</button>' +
          '</div>' +
          '<div class="anagram-detail" id="anagram-' + idx + '"></div>' +
        '</div>'
      );
    }).join('');

    wrap.querySelectorAll('.anagram-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = btn.dataset.idx;
        const word = genState.words[idx];
        const detail = document.getElementById('anagram-' + idx);
        const isOpen = detail.classList.contains('open');
        if (isOpen) {
          detail.classList.remove('open');
          btn.textContent = '🔤 ดู Anagram';
          return;
        }
        if (!detail.dataset.built) {
          const key = sortLetters(word);
          const partners = getAnagrams(word);
          let html = '<div class="key-row"><span class="key-label">เรียงตามตัวอักษร:</span>' + tileRowHTML(key, 'small') + '</div>';
          if (partners.length) {
            html += '<div class="key-row"><span class="key-label">คำ Anagram (' + partners.length + '):</span></div>';
            html += '<div class="anagram-partners">' + partners.map(function (p) {
              return '<span class="anagram-chip">' + p + '</span>';
            }).join('') + '</div>';
          } else {
            html += '<div class="no-anagram">ไม่มีคำอื่นที่เป็น Anagram ของคำนี้ในพจนานุกรม CSW24</div>';
          }
          detail.innerHTML = html;
          detail.dataset.built = '1';
        }
        detail.classList.add('open');
        btn.textContent = '🔤 ซ่อน Anagram';
      });
    });
  }

  function initGenerator() {
    document.getElementById('totalWordsLabel').textContent = CSW24_TOTAL_COUNT.toLocaleString('en-US');

    document.getElementById('genBtn').addEventListener('click', function () {
      let min = parseInt(document.getElementById('genMin').value, 10) || CSW24_MIN_LEN;
      let max = parseInt(document.getElementById('genMax').value, 10) || CSW24_MAX_LEN;
      let count = parseInt(document.getElementById('genCount').value, 10) || 10;
      min = Math.max(CSW24_MIN_LEN, Math.min(min, CSW24_MAX_LEN));
      max = Math.max(CSW24_MIN_LEN, Math.min(max, CSW24_MAX_LEN));
      if (min > max) { const t = min; min = max; max = t; }
      count = Math.max(1, Math.min(count, 300));

      const words = pickRandomWords(min, max, count);
      if (!words.length) { showToast('ไม่พบคำศัพท์ในช่วงความยาวที่เลือก'); return; }
      if (words.length < count) showToast('มีคำในช่วงนี้ได้แค่ ' + words.length + ' คำ');
      genState.words = words;
      document.getElementById('genResultsPanel').style.display = '';
      document.getElementById('exportTitle').textContent =
        'รายการคำศัพท์ · ' + min + '-' + max + ' ตัวอักษร · ' + words.length + ' คำ';
      renderGenResults();
    });

    document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);
    document.getElementById('exportJpgBtn').addEventListener('click', function () { exportImage('jpg'); });
    document.getElementById('exportPngBtn').addEventListener('click', function () { exportImage('png'); });
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function exportImage(type) {
    if (!genState.words.length) { showToast('กรุณาสุ่มคำศัพท์ก่อน export'); return; }
    showToast('กำลังสร้างไฟล์...');
    const target = document.getElementById('exportCapture');
    const canvas = await html2canvas(target, { backgroundColor: '#16241f', scale: 2 });
    const mime = type === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.95);
    downloadDataUrl(dataUrl, 'csw24-wordlist.' + type);
    showToast('ดาวน์โหลด ' + type.toUpperCase() + ' แล้ว');
  }

  async function exportPDF() {
    if (!genState.words.length) { showToast('กรุณาสุ่มคำศัพท์ก่อน export'); return; }
    showToast('กำลังสร้าง PDF...');
    const target = document.getElementById('exportCapture');
    const canvas = await html2canvas(target, { backgroundColor: '#16241f', scale: 2 });
    const jsPDFCtor = window.jspdf.jsPDF;
    const pdf = new jsPDFCtor('p', 'pt', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = canvas.height * imgW / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgH;
    let position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
    heightLeft -= (pageH - margin * 2);
    while (heightLeft > 0) {
      position = heightLeft - imgH + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
      heightLeft -= (pageH - margin * 2);
    }
    pdf.save('csw24-wordlist.pdf');
    showToast('ดาวน์โหลด PDF แล้ว');
  }

  // ---------- Quiz tab (generate 50, select, save) ----------

  const quizState = { words: [], selected: new Set() };

  function renderQuizList() {
    const wrap = document.getElementById('quizList');
    wrap.innerHTML = quizState.words.map(function (word, idx) {
      return (
        '<label class="quiz-item">' +
          '<input type="checkbox" class="quiz-check" data-word="' + word + '">' +
          '<span class="qi-index">' + (idx + 1) + '</span>' +
          tileRowHTML(word, 'small') +
        '</label>'
      );
    }).join('');

    wrap.querySelectorAll('.quiz-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) quizState.selected.add(cb.dataset.word);
        else quizState.selected.delete(cb.dataset.word);
        updateQuizSelectedCount();
      });
    });
    quizState.selected = new Set();
    updateQuizSelectedCount();
    document.getElementById('quizSelectAll').checked = false;
  }

  function updateQuizSelectedCount() {
    document.getElementById('quizSelectedCount').textContent = 'เลือกแล้ว ' + quizState.selected.size + ' คำ';
  }

  function initQuizTab() {
    document.getElementById('quizGenBtn').addEventListener('click', function () {
      let min = parseInt(document.getElementById('quizMin').value, 10) || CSW24_MIN_LEN;
      let max = parseInt(document.getElementById('quizMax').value, 10) || CSW24_MAX_LEN;
      let count = parseInt(document.getElementById('quizCount').value, 10) || 50;
      min = Math.max(CSW24_MIN_LEN, Math.min(min, CSW24_MAX_LEN));
      max = Math.max(CSW24_MIN_LEN, Math.min(max, CSW24_MAX_LEN));
      if (min > max) { const t = min; min = max; max = t; }
      count = Math.max(5, Math.min(count, 200));

      const words = pickRandomWords(min, max, count);
      if (!words.length) { showToast('ไม่พบคำศัพท์ในช่วงความยาวที่เลือก'); return; }
      quizState.words = words;
      document.getElementById('quizListPanel').style.display = '';
      renderQuizList();
    });

    document.getElementById('quizSelectAll').addEventListener('change', function (e) {
      const checked = e.target.checked;
      document.querySelectorAll('.quiz-check').forEach(function (cb) {
        cb.checked = checked;
        if (checked) quizState.selected.add(cb.dataset.word);
        else quizState.selected.delete(cb.dataset.word);
      });
      updateQuizSelectedCount();
    });

    document.getElementById('quizSaveBtn').addEventListener('click', function () {
      if (!quizState.selected.size) { showToast('กรุณาเลือกคำศัพท์อย่างน้อย 1 คำ'); return; }
      const added = addWordsToCardbox(Array.from(quizState.selected));
      showToast('บันทึกลง Cardbox แล้ว ' + added + ' คำ');
    });
  }

  // ---------- Cardbox tab ----------

  function renderCardboxTab() {
    const box = loadCardbox();
    document.getElementById('cardboxCount').textContent = box.length;
    const listEl = document.getElementById('cardboxList');

    if (!box.length) {
      listEl.innerHTML = '<div class="empty-state">ยังไม่มีคำศัพท์ใน Cardbox — ไปที่แท็บ "แบบทดสอบ" เพื่อเลือกคำที่อยากจำ</div>';
    } else {
      listEl.innerHTML = box.slice().sort(function (a, b) { return b.addedAt - a.addedAt; }).map(function (c) {
        return (
          '<div class="card-row">' +
            '<div>' + tileRowHTML(c.word, 'small') + '</div>' +
            '<div class="card-row-meta">' +
              '<span class="status-pill status-' + c.status + '">' + statusLabel(c.status) + '</span>' +
              '<span>✓' + c.correct + ' ✗' + c.incorrect + '</span>' +
              '<button class="remove-card-btn" data-word="' + c.word + '" title="ลบออกจาก Cardbox">✕</button>' +
            '</div>' +
          '</div>'
        );
      }).join('');

      listEl.querySelectorAll('.remove-card-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          removeFromCardbox(btn.dataset.word);
          renderCardboxTab();
          showToast('ลบคำออกจาก Cardbox แล้ว');
        });
      });
    }

    const studyCountInput = document.getElementById('studyCount');
    studyCountInput.max = Math.max(1, box.length);
    if (parseInt(studyCountInput.value, 10) > box.length) studyCountInput.value = Math.max(1, box.length);
  }

  function initCardboxTab() {
    document.getElementById('studyMode').addEventListener('change', function (e) {
      document.getElementById('anagramOrderField').style.display = e.target.value === 'anagram' ? '' : 'none';
    });
    document.getElementById('anagramOrderField').style.display = 'none';

    document.getElementById('startStudyBtn').addEventListener('click', function () {
      const box = loadCardbox();
      if (!box.length) { showToast('Cardbox ว่างอยู่ — เลือกคำศัพท์จากแท็บแบบทดสอบก่อน'); return; }
      const mode = document.getElementById('studyMode').value;
      const anagramOrder = document.getElementById('anagramOrder').value;
      let n = parseInt(document.getElementById('studyCount').value, 10) || box.length;
      n = Math.max(1, Math.min(n, box.length));
      startStudySession(shuffle(box).slice(0, n), mode, anagramOrder);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      if (!confirm('ต้องการรีเซ็ตความคืบหน้าทั้งหมด และลบคำศัพท์ทั้งหมดใน Cardbox ใช่หรือไม่?')) return;
      localStorage.removeItem(CARDBOX_KEY);
      renderCardboxTab();
      renderDashboard();
      showToast('รีเซ็ตความคืบหน้าเรียบร้อยแล้ว');
    });
  }

  // ---------- Study session ----------

  const session = { queue: [], index: 0, mode: 'flashcard', anagramOrder: 'alpha', correct: 0, incorrect: 0, flipped: false };

  function startStudySession(cards, mode, anagramOrder) {
    session.queue = cards;
    session.index = 0;
    session.mode = mode;
    session.anagramOrder = anagramOrder;
    session.correct = 0;
    session.incorrect = 0;
    document.getElementById('cardboxSetup').style.display = 'none';
    document.getElementById('cardboxList').style.display = 'none';
    document.getElementById('studySession').classList.add('open');
    renderSessionCard();
  }

  function endStudySession() {
    document.getElementById('studySession').classList.remove('open');
    document.getElementById('cardboxSetup').style.display = '';
    document.getElementById('cardboxList').style.display = '';
    renderCardboxTab();
  }

  function updateSessionProgressBar() {
    const total = session.queue.length;
    document.getElementById('sessionProgressLabel').textContent =
      'คำที่ ' + Math.min(session.index + 1, total) + ' / ' + total +
      '   ·   ถูก ' + session.correct + '   ผิด ' + session.incorrect;
    const pct = total ? Math.round((session.index / total) * 100) : 0;
    document.getElementById('sessionBarFill').style.width = pct + '%';
  }

  function recordAnswer(word, isCorrect) {
    updateCardResult(word, isCorrect);
    if (isCorrect) session.correct++; else session.incorrect++;
  }

  function nextCard() {
    session.index++;
    session.flipped = false;
    renderSessionCard();
  }

  function renderSessionCard() {
    updateSessionProgressBar();
    const area = document.getElementById('sessionArea');

    if (session.index >= session.queue.length) {
      area.innerHTML =
        '<div class="session-summary">' +
          '<div class="session-prompt-label">จบเซสชันทบทวนแล้ว</div>' +
          '<div class="big-stat">' + session.correct + ' / ' + session.queue.length + '</div>' +
          '<p>ตอบถูก ' + session.correct + ' คำ · ตอบผิด ' + session.incorrect + ' คำ</p>' +
          '<div class="session-controls"><button class="btn btn-primary" id="sessionFinishBtn">เสร็จสิ้น</button></div>' +
        '</div>';
      document.getElementById('sessionFinishBtn').addEventListener('click', endStudySession);
      return;
    }

    const card = session.queue[session.index];
    const word = card.word;

    if (session.mode === 'flashcard') renderFlashcard(area, word);
    else if (session.mode === 'anagram') renderAnagramCard(area, word);
    else renderRecallCard(area, word);
  }

  function renderFlashcard(area, word) {
    const scrambled = shuffle(word.split('')).join('');
    if (!session.flipped) {
      area.innerHTML =
        '<div class="session-card">' +
          '<div class="session-prompt-label">Flashcard · แตะเพื่อดูคำตอบ</div>' +
          tileRowHTML(scrambled, 'big') +
          '<div class="session-controls"><button class="btn btn-primary" id="flipBtn">🔄 พลิกไพ่</button></div>' +
        '</div>';
      document.getElementById('flipBtn').addEventListener('click', function () {
        session.flipped = true;
        renderFlashcard(area, word);
      });
    } else {
      const partners = getAnagrams(word);
      area.innerHTML =
        '<div class="session-card">' +
          '<div class="session-prompt-label">คำตอบ</div>' +
          tileRowHTML(word, 'big') +
          (partners.length ? '<div class="word-meta">Anagram: ' + partners.join(', ') + '</div>' : '') +
          '<div class="session-controls">' +
            '<button class="btn btn-outline" id="dontKnowBtn">✗ ยังไม่รู้</button>' +
            '<button class="btn btn-teal" id="knowBtn">✓ จำได้</button>' +
          '</div>' +
        '</div>';
      document.getElementById('knowBtn').addEventListener('click', function () { recordAnswer(word, true); nextCard(); });
      document.getElementById('dontKnowBtn').addEventListener('click', function () { recordAnswer(word, false); nextCard(); });
    }
  }

  function renderAnagramCard(area, word) {
    const letters = session.anagramOrder === 'alpha' ? sortLetters(word) : shuffle(word.split('')).join('');
    area.innerHTML =
      '<div class="session-card">' +
        '<div class="session-prompt-label">Anagram · เรียงตัวอักษรให้เป็นคำศัพท์</div>' +
        tileRowHTML(letters, 'big') +
        '<form class="session-answer-form" id="anagramForm">' +
          '<input type="text" id="anagramInput" autocomplete="off" placeholder="พิมพ์คำตอบ" autofocus>' +
          '<button class="btn btn-primary" type="submit">ตรวจคำตอบ</button>' +
        '</form>' +
        '<div class="session-feedback" id="anagramFeedback"></div>' +
        '<div class="session-controls" id="anagramNextWrap" style="display:none">' +
          '<button class="btn btn-teal" id="anagramNextBtn">ต่อไป →</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('anagramForm');
    const feedback = document.getElementById('anagramFeedback');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('anagramInput');
      const guess = input.value.trim().toUpperCase();
      const isCorrect = guess === word;
      input.disabled = true;
      form.querySelector('button').disabled = true;
      if (isCorrect) {
        feedback.textContent = '✓ ถูกต้อง! ' + word;
        feedback.className = 'session-feedback correct';
      } else {
        feedback.textContent = '✗ ยังไม่ถูก — คำตอบคือ ' + word;
        feedback.className = 'session-feedback wrong';
      }
      recordAnswer(word, isCorrect);
      document.getElementById('anagramNextWrap').style.display = '';
      document.getElementById('anagramNextBtn').addEventListener('click', nextCard);
    });
  }

  function renderRecallCard(area, word) {
    area.innerHTML =
      '<div class="session-card">' +
        '<div class="session-prompt-label">Active Recall · นึกคำศัพท์จากความจำ (' + word.length + ' ตัวอักษร)</div>' +
        blankTileRowHTML(word.length, 'big') +
        '<form class="session-answer-form" id="recallForm">' +
          '<input type="text" id="recallInput" autocomplete="off" placeholder="พิมพ์คำตอบ" autofocus>' +
          '<button class="btn btn-primary" type="submit">ตรวจคำตอบ</button>' +
        '</form>' +
        '<div class="session-feedback" id="recallFeedback"></div>' +
        '<div class="session-controls" id="recallNextWrap" style="display:none">' +
          '<button class="btn btn-teal" id="recallNextBtn">ต่อไป →</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('recallForm');
    const feedback = document.getElementById('recallFeedback');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('recallInput');
      const guess = input.value.trim().toUpperCase();
      const isCorrect = guess === word;
      input.disabled = true;
      form.querySelector('button').disabled = true;
      if (isCorrect) {
        feedback.textContent = '✓ ถูกต้อง!';
        feedback.className = 'session-feedback correct';
      } else {
        feedback.textContent = '✗ ยังไม่ถูก — คำตอบคือ ' + word;
        feedback.className = 'session-feedback wrong';
      }
      recordAnswer(word, isCorrect);
      document.getElementById('recallNextWrap').style.display = '';
      document.getElementById('recallNextBtn').addEventListener('click', nextCard);
    });
  }

  // ---------- Dashboard ----------

  function renderDashboard() {
    const box = loadCardbox();
    const total = box.length;
    const counts = { new: 0, learning: 0, mastered: 0 };
    let totalCorrect = 0, totalIncorrect = 0;
    box.forEach(function (c) {
      counts[c.status] = (counts[c.status] || 0) + 1;
      totalCorrect += c.correct;
      totalIncorrect += c.incorrect;
    });

    document.getElementById('dashStatGrid').innerHTML =
      statCard(total, 'คำใน Cardbox', '') +
      statCard(counts.new, 'คำใหม่', '') +
      statCard(counts.learning, 'กำลังเรียน', 'brass') +
      statCard(counts.mastered, 'เชี่ยวชาญ', 'teal') +
      statCard(totalCorrect + totalIncorrect, 'จำนวนครั้งที่ทบทวน', '');

    const pct = total ? Math.round((counts.mastered / total) * 100) : 0;
    document.getElementById('dashDonut').style.setProperty('--p', pct);
    document.getElementById('dashPct').textContent = pct + '%';

    document.getElementById('dashLegend').innerHTML =
      legendItem('var(--teal)', 'เชี่ยวชาญ', counts.mastered) +
      legendItem('var(--brass)', 'กำลังเรียน', counts.learning) +
      legendItem('#3a4a42', 'คำใหม่', counts.new);
  }

  function statCard(num, label, cls) {
    return '<div class="stat-card ' + cls + '"><div class="stat-num">' + num + '</div><div class="stat-label">' + label + '</div></div>';
  }

  function legendItem(color, label, count) {
    return '<div class="legend-item"><span class="legend-dot" style="background:' + color + '"></span>' + label + ' (' + count + ')</div>';
  }

  // ---------- init ----------

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initGenerator();
    initQuizTab();
    initCardboxTab();
    renderCardboxTab();
    renderDashboard();
  });
})();
