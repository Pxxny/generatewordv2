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
  const CUSTOM_KEY = 'csw24_custom_words_v1';
  const SETTINGS_KEY = 'csw24_settings_v1';
  const DAY_MS = 86400000;
  const PAGE_SIZE = 150;

  let uidCounter = 0;

  // ---------- i18n ----------

  const I18N = {
    th: {
      'tab.dashboard': '📊 Dashboard', 'tab.generate': '📝 สร้างคำศัพท์', 'tab.quiz': '🎯 แบบทดสอบ',
      'tab.cardbox': '🗂️ Cardbox', 'tab.browse': '📖 คลังคำศัพท์', 'tab.minigame': '🕹️ Minigame',
      'tab.settings': '⚙️ Setting',
      'app.title': 'CSW24 Word Lab',
      'app.subtitle': 'เจนคำศัพท์ · หา Anagram · เก็บลง Cardbox · ทบทวนแบบ Spaced Repetition · Minigame',
      'gen.title': 'สร้างรายการคำศัพท์',
      'gen.sub': 'สุ่มคำจากพจนานุกรม CSW24 กำหนดความยาวตัวอักษร (ช่วง) และจำนวนคำที่ต้องการ พร้อมดู Anagram และคะแนนของแต่ละคำ',
      'common.minLen': 'ความยาวต่ำสุด', 'common.maxLen': 'ความยาวสูงสุด', 'common.wordCount': 'จำนวนคำ',
      'common.randomize': '🎲 สุ่มคำศัพท์', 'common.selectAll': 'เลือกทั้งหมด', 'common.saveToCardbox': '💾 Save to Cardbox',
      'quiz.title': 'แบบทดสอบ — เลือกคำเก็บใน Cardbox',
      'quiz.sub': 'สุ่มคำศัพท์ชุดใหม่ (ค่าเริ่มต้น 50 คำ) เลือกคำที่ถูกใจอยากจำ แล้วกด Save to Cardbox เพื่อเก็บไว้ทบทวน',
      'cardbox.title': 'การ์ดของฉัน (Cardbox)', 'cardbox.studyMode': 'รูปแบบ Quiz',
      'cardbox.anagramOrder': 'การเรียงตัวอักษร', 'cardbox.studyCount': 'จำนวนคำที่ทบทวน', 'cardbox.start': '▶ เริ่มทบทวน',
      'browse.title': 'คลังคำศัพท์ทั้งหมด', 'browse.search': '🔍 ค้นหา (Enter)', 'browse.clear': 'ล้างตัวกรอง',
      'mini.title': '🕹️ Minigame', 'mini.typing': '⌨️ พิมพ์ศัพท์ Random', 'mini.racks': '🁢 Random Racks',
      'mini.startGame': '▶ เริ่มเกม', 'mini.newRack': '▶ สุ่ม Rack ใหม่',
      'dash.title': 'Dashboard', 'dash.sub': 'ภาพรวมความคืบหน้าในการเรียนคำศัพท์ของคุณ ข้อมูลทั้งหมดเก็บไว้ในเบราว์เซอร์นี้เท่านั้น',
      'dash.mastered': 'เชี่ยวชาญ', 'dash.reset': '♻ Reset ความคืบหน้าทั้งหมด',
      'dash.suggested': 'คำแนะนำสำหรับวันนี้', 'dash.suggestedSub': 'สุ่มมาให้ตอนเปิดเว็บ (รีเฉพาะตอนรีเฟรชหน้า) ความยาวตามที่ตั้งไว้ในหน้า Setting',
      'dash.suggestedRefresh': '🔁 สุ่มใหม่ (ไม่รอ refresh หน้า)',
      'settings.title': '⚙️ Setting', 'settings.sub': 'ตั้งค่าภาษา สีเว็บ และช่วงความยาวคำแนะนำของ Dashboard',
      'settings.language': 'ภาษา / Language', 'settings.themePreset': 'ธีมสี (Preset)',
      'settings.customBoard': 'สีพื้นบอร์ด', 'settings.customBrass': 'สีเน้น (Brass)',
      'settings.customTeal': 'สีเทียบรอง (Teal)', 'settings.customCream': 'สีตัวหนังสือ',
      'settings.themeReset': '↺ คืนค่าเริ่มต้น', 'settings.dashRange': 'ช่วงความยาวคำแนะนำใน Dashboard',
      'settings.min': 'ต่ำสุด', 'settings.max': 'สูงสุด', 'settings.count': 'จำนวนคำ',
      'settings.importExport': 'นำเข้า / ส่งออกข้อมูล',
      'settings.importExportSub': 'สำรองความคืบหน้าไว้เป็นไฟล์ หรือเพิ่มคำศัพท์ของคุณเองเข้าไปใช้งานร่วมกับพจนานุกรม CSW24',
      'settings.exportProgress': '⬇ ส่งออกความคืบหน้า (JSON)', 'settings.importProgress': '⬆ นำเข้าความคืบหน้า (JSON)',
      'settings.importWords': '⬆ นำเข้ารายการคำศัพท์ของฉัน (.txt)', 'settings.includeCustom': 'รวมคำที่นำเข้าเองตอนสุ่ม/ค้นหา'
    },
    en: {
      'tab.dashboard': '📊 Dashboard', 'tab.generate': '📝 Generate', 'tab.quiz': '🎯 Quiz',
      'tab.cardbox': '🗂️ Cardbox', 'tab.browse': '📖 Word Browser', 'tab.minigame': '🕹️ Minigame',
      'tab.settings': '⚙️ Settings',
      'app.title': 'CSW24 Word Lab',
      'app.subtitle': 'Generate words · Find Anagrams · Save to Cardbox · Spaced Repetition review · Minigames',
      'gen.title': 'Generate word list',
      'gen.sub': 'Randomize words from the CSW24 dictionary, set a length range and word count, view Anagrams and each word\u2019s score.',
      'common.minLen': 'Min length', 'common.maxLen': 'Max length', 'common.wordCount': 'Word count',
      'common.randomize': '🎲 Randomize', 'common.selectAll': 'Select all', 'common.saveToCardbox': '💾 Save to Cardbox',
      'quiz.title': 'Quiz — pick words to save to Cardbox',
      'quiz.sub': 'Randomize a fresh batch (default 50), select the words you want to learn, then Save to Cardbox.',
      'cardbox.title': 'My Cards (Cardbox)', 'cardbox.studyMode': 'Study mode',
      'cardbox.anagramOrder': 'Letter order', 'cardbox.studyCount': 'Words to review', 'cardbox.start': '▶ Start review',
      'browse.title': 'Full word dictionary', 'browse.search': '🔍 Search (Enter)', 'browse.clear': 'Clear filters',
      'mini.title': '🕹️ Minigame', 'mini.typing': '⌨️ Random Word Typing', 'mini.racks': '🁢 Random Racks',
      'mini.startGame': '▶ Start game', 'mini.newRack': '▶ New rack',
      'dash.title': 'Dashboard', 'dash.sub': 'Overview of your word-learning progress. All data is stored in this browser only.',
      'dash.mastered': 'Mastered', 'dash.reset': '♻ Reset all progress',
      'dash.suggested': 'Suggested for today', 'dash.suggestedSub': 'Randomized when the page loads (refreshes only on page reload). Length set in Settings.',
      'dash.suggestedRefresh': '🔁 Reshuffle (without reloading)',
      'settings.title': '⚙️ Settings', 'settings.sub': 'Set language, site colors, and the Dashboard suggested-word length range.',
      'settings.language': 'Language / ภาษา', 'settings.themePreset': 'Color theme (presets)',
      'settings.customBoard': 'Board color', 'settings.customBrass': 'Accent (brass)',
      'settings.customTeal': 'Secondary (teal)', 'settings.customCream': 'Text color',
      'settings.themeReset': '↺ Reset to default', 'settings.dashRange': 'Dashboard suggested-word length range',
      'settings.min': 'Min', 'settings.max': 'Max', 'settings.count': 'Count',
      'settings.importExport': 'Import / Export data',
      'settings.importExportSub': 'Back up your progress to a file, or add your own words to use alongside the CSW24 dictionary.',
      'settings.exportProgress': '⬇ Export progress (JSON)', 'settings.importProgress': '⬆ Import progress (JSON)',
      'settings.importWords': '⬆ Import my word list (.txt)', 'settings.includeCustom': 'Include imported words in randomize/search'
    }
  };

  const THEME_PRESETS = [
    { id: 'felt', name: { th: 'เขียวบอร์ด (Default)', en: 'Felt Green (Default)' }, board0: '#0f1c17', board1: '#16241f', board2: '#1d2f28', rail: '#274236', brass: '#d1a53d', brassDeep: '#a97f20', teal: '#4aa596', tealDeep: '#2f7469', cream: '#f6f1e4' },
    { id: 'navy', name: { th: 'น้ำเงินราตรี', en: 'Midnight Navy' }, board0: '#0b1220', board1: '#111a2e', board2: '#182640', rail: '#2c3e5e', brass: '#e0a94a', brassDeep: '#b2812c', teal: '#5aa9e6', tealDeep: '#3c7fb8', cream: '#eef2fb' },
    { id: 'plum', name: { th: 'ม่วงเบอร์กันดี', en: 'Plum Burgundy' }, board0: '#1a0f18', board1: '#25151f', board2: '#331e2c', rail: '#4a2c40', brass: '#dba15a', brassDeep: '#ad7739', teal: '#c76b8a', tealDeep: '#9b4e69', cream: '#f6ecef' },
    { id: 'slate', name: { th: 'เทาหิน', en: 'Slate Gray' }, board0: '#14171a', board1: '#1c2024', board2: '#262b31', rail: '#3a414a', brass: '#c9a24a', brassDeep: '#9c7c33', teal: '#5bb0a3', tealDeep: '#3d7f75', cream: '#f0f1f3' },
    { id: 'clay', name: { th: 'ดินเผาอุ่น', en: 'Warm Clay' }, board0: '#1c1410', board1: '#261b15', board2: '#33251c', rail: '#4a3527', brass: '#e2a13c', brassDeep: '#b3791f', teal: '#6f9c7e', tealDeep: '#4e735a', cream: '#f7eee1' }
  ];

  let settings = {
    lang: 'th',
    themePreset: 'felt',
    customColors: null, // {board,brass,teal,cream} or null
    dashMin: 5, dashMax: 9, dashCount: 12,
    dueTimePreset: '24h', // 1h,5h,12h,24h,1d,2d,5d,10d,30d,custom
    dueTimeCustomValue: 3, dueTimeCustomUnit: 'd'
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = Object.assign(settings, JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function t(key) {
    const dict = I18N[settings.lang] || I18N.th;
    return dict[key] || I18N.th[key] || key;
  }

  function applyI18n() {
    document.documentElement.lang = settings.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
  }

  function applyTheme() {
    const root = document.documentElement.style;
    if (settings.customColors) {
      const c = settings.customColors;
      root.setProperty('--board-0', c.board);
      root.setProperty('--board-1', shadeColor(c.board, 8));
      root.setProperty('--board-2', shadeColor(c.board, 16));
      root.setProperty('--rail', shadeColor(c.board, 30));
      root.setProperty('--brass', c.brass);
      root.setProperty('--brass-deep', shadeColor(c.brass, -20));
      root.setProperty('--teal', c.teal);
      root.setProperty('--teal-deep', shadeColor(c.teal, -20));
      root.setProperty('--cream', c.cream);
    } else {
      const preset = THEME_PRESETS.find(function (p) { return p.id === settings.themePreset; }) || THEME_PRESETS[0];
      root.setProperty('--board-0', preset.board0);
      root.setProperty('--board-1', preset.board1);
      root.setProperty('--board-2', preset.board2);
      root.setProperty('--rail', preset.rail);
      root.setProperty('--brass', preset.brass);
      root.setProperty('--brass-deep', preset.brassDeep);
      root.setProperty('--teal', preset.teal);
      root.setProperty('--teal-deep', preset.tealDeep);
      root.setProperty('--cream', preset.cream);
    }
  }

  function shadeColor(hex, percent) {
    hex = (hex || '#000000').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }

  function initSettingsTab() {
    const presetWrap = document.getElementById('themePresetChips');

    function refreshPresetChips() {
      presetWrap.querySelectorAll('.theme-preset-chip').forEach(function (btn) {
        btn.classList.toggle('active', !settings.customColors && settings.themePreset === btn.dataset.preset);
      });
    }

    function renderPresetChips() {
      presetWrap.innerHTML = THEME_PRESETS.map(function (p) {
        return '<button type="button" class="theme-preset-chip" data-preset="' + p.id + '">' +
          '<span class="theme-preset-swatch" style="background:' + p.brass + '"></span>' +
          (p.name[settings.lang] || p.name.th) + '</button>';
      }).join('');
      presetWrap.querySelectorAll('.theme-preset-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          settings.themePreset = btn.dataset.preset;
          settings.customColors = null;
          saveSettings();
          applyTheme();
          refreshPresetChips();
          syncColorInputsToCurrentTheme();
        });
      });
      refreshPresetChips();
    }

    // language chips
    const langBtns = { th: document.getElementById('langThBtn'), en: document.getElementById('langEnBtn') };
    function refreshLangChips() {
      Object.keys(langBtns).forEach(function (k) { langBtns[k].classList.toggle('active', settings.lang === k); });
    }
    Object.keys(langBtns).forEach(function (k) {
      langBtns[k].addEventListener('click', function () {
        settings.lang = k;
        saveSettings();
        refreshLangChips();
        applyI18n();
        renderPresetChips();
        renderDashboard();
      });
    });
    refreshLangChips();

    // theme preset chips (initial render)
    renderPresetChips();

    // custom color pickers
    const boardInput = document.getElementById('themeColorBoard');
    const brassInput = document.getElementById('themeColorBrass');
    const tealInput = document.getElementById('themeColorTeal');
    const creamInput = document.getElementById('themeColorCream');

    function syncColorInputsToCurrentTheme() {
      const preset = THEME_PRESETS.find(function (p) { return p.id === settings.themePreset; }) || THEME_PRESETS[0];
      const c = settings.customColors || { board: preset.board0, brass: preset.brass, teal: preset.teal, cream: preset.cream };
      boardInput.value = c.board;
      brassInput.value = c.brass;
      tealInput.value = c.teal;
      creamInput.value = c.cream;
    }
    syncColorInputsToCurrentTheme();

    function applyCustomFromInputs() {
      settings.customColors = {
        board: boardInput.value, brass: brassInput.value, teal: tealInput.value, cream: creamInput.value
      };
      saveSettings();
      applyTheme();
      refreshPresetChips();
    }
    [boardInput, brassInput, tealInput, creamInput].forEach(function (inp) {
      inp.addEventListener('input', applyCustomFromInputs);
    });

    document.getElementById('themeResetBtn').addEventListener('click', function () {
      settings.customColors = null;
      settings.themePreset = 'felt';
      saveSettings();
      applyTheme();
      refreshPresetChips();
      syncColorInputsToCurrentTheme();
    });

    // dashboard suggested-word range settings
    const dashMinInput = document.getElementById('dashRangeMin');
    const dashMaxInput = document.getElementById('dashRangeMax');
    const dashCountInput = document.getElementById('dashRangeCount');
    dashMinInput.value = settings.dashMin;
    dashMaxInput.value = settings.dashMax;
    dashCountInput.value = settings.dashCount;
    [dashMinInput, dashMaxInput, dashCountInput].forEach(function (inp) {
      inp.addEventListener('change', function () {
        let min = parseInt(dashMinInput.value, 10) || CSW24_MIN_LEN;
        let max = parseInt(dashMaxInput.value, 10) || CSW24_MAX_LEN;
        let count = parseInt(dashCountInput.value, 10) || 12;
        min = Math.max(CSW24_MIN_LEN, Math.min(min, CSW24_MAX_LEN));
        max = Math.max(CSW24_MIN_LEN, Math.min(max, CSW24_MAX_LEN));
        if (min > max) { const t2 = min; min = max; max = t2; }
        count = Math.max(1, Math.min(count, 60));
        settings.dashMin = min; settings.dashMax = max; settings.dashCount = count;
        dashMinInput.value = min; dashMaxInput.value = max; dashCountInput.value = count;
        saveSettings();
      });
    });
  }

  // ---------- generic helpers ----------

  function sortLetters(word) {
    return word.split('').sort().join('');
  }

  function wordScore(word) {
    let s = 0;
    for (let i = 0; i < word.length; i++) s += SCRABBLE_VALUES[word[i]] || 0;
    return s;
  }

  function letterCounts(str) {
    const m = {};
    for (let i = 0; i < str.length; i++) m[str[i]] = (m[str[i]] || 0) + 1;
    return m;
  }

  function isSubsetOfCounts(word, rackCounts) {
    const wc = letterCounts(word);
    for (const ch in wc) {
      if ((rackCounts[ch] || 0) < wc[ch]) return false;
    }
    return true;
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

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- custom word pool ----------

  let customWords = [];
  let customByLength = {};

  function loadCustomWords() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      customWords = raw ? JSON.parse(raw) : [];
    } catch (e) {
      customWords = [];
    }
    rebuildCustomIndex();
  }

  function saveCustomWords() {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customWords));
  }

  function rebuildCustomIndex() {
    customByLength = {};
    customWords.forEach(function (w) {
      (customByLength[w.length] = customByLength[w.length] || []).push(w);
    });
  }

  function includeCustomEnabled() {
    const el = document.getElementById('includeCustomWords');
    return !!(el && el.checked && customWords.length);
  }

  // central pool accessor — everything that needs a word list by length
  // should go through here so custom imported words participate everywhere.
  function lengthPool(L) {
    const base = CSW24_BY_LENGTH[L] || [];
    if (includeCustomEnabled() && customByLength[L] && customByLength[L].length) {
      return base.concat(customByLength[L]);
    }
    return base;
  }

  function getAnagrams(word) {
    const key = sortLetters(word);
    const pool = lengthPool(word.length);
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
      const arr = lengthPool(L);
      if (arr && arr.length) {
        lengths.push({ L: L, w: arr.length });
        totalWeight += arr.length;
      }
    }
    if (!lengths.length) return [];
    const target = Math.min(count, totalWeight);
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
      const arr = lengthPool(chosenLen);
      const w = arr[Math.floor(Math.random() * arr.length)];
      if (!seen.has(w)) { seen.add(w); result.push(w); }
    }
    return result;
  }

  // ---------- shared word-row + anagram toggle rendering ----------

  function wordRowHTML(word) {
    uidCounter++;
    const uid = uidCounter;
    return (
      '<div class="word-row" data-word="' + word + '">' +
        '<div class="word-row-top">' +
          '<div>' + tileRowHTML(word) + '</div>' +
          '<div class="word-meta">' + word.length + ' ตัวอักษร · ' + wordScore(word) + ' คะแนน</div>' +
          '<button class="anagram-toggle" data-uid="' + uid + '" data-word="' + word + '">🔤 ดู Anagram</button>' +
        '</div>' +
        '<div class="anagram-detail" id="anagram-' + uid + '"></div>' +
      '</div>'
    );
  }

  function bindAnagramToggles(container) {
    container.querySelectorAll('.anagram-toggle').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        const uid = btn.dataset.uid;
        const word = btn.dataset.word;
        const detail = document.getElementById('anagram-' + uid);
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
            html += '<div class="no-anagram">ไม่มีคำอื่นที่เป็น Anagram ของคำนี้ในพจนานุกรม</div>';
          }
          detail.innerHTML = html;
          detail.dataset.built = '1';
        }
        detail.classList.add('open');
        btn.textContent = '🔤 ซ่อน Anagram';
      });
    });
  }

  // ---------- toast ----------

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  // ---------- cardbox storage + spaced repetition ----------

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

  const HOUR_MS = 3600000;

  const DUE_PRESET_MS = {
    '1h': 1 * HOUR_MS, '5h': 5 * HOUR_MS, '12h': 12 * HOUR_MS, '24h': 24 * HOUR_MS,
    '1d': 1 * DAY_MS, '2d': 2 * DAY_MS, '5d': 5 * DAY_MS, '10d': 10 * DAY_MS, '30d': 30 * DAY_MS
  };

  function currentDueOffsetMs() {
    if (settings.dueTimePreset === 'custom') {
      const val = Math.max(1, parseInt(settings.dueTimeCustomValue, 10) || 1);
      const unitMs = settings.dueTimeCustomUnit === 'h' ? HOUR_MS : DAY_MS;
      return val * unitMs;
    }
    return DUE_PRESET_MS[settings.dueTimePreset] || DUE_PRESET_MS['24h'];
  }

  function newCard(word) {
    const now = Date.now();
    return {
      word: word, addedAt: now, status: 'new',
      correct: 0, incorrect: 0, lastReviewed: null,
      interval: 0, ease: 2.5, reps: 0, due: now + currentDueOffsetMs()
    };
  }

  function addWordsToCardbox(words) {
    const box = loadCardbox();
    const existing = new Set(box.map(function (c) { return c.word; }));
    let added = 0;
    words.forEach(function (w) {
      if (!existing.has(w)) {
        box.push(newCard(w));
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

  function patchLegacyCard(card) {
    if (card.ease == null) card.ease = 2.5;
    if (card.reps == null) card.reps = 0;
    if (card.interval == null) card.interval = 0;
    if (card.due == null) card.due = Date.now();
    return card;
  }

  // simplified SM-2 style spaced repetition
  function updateCardResult(word, isCorrect) {
    const box = loadCardbox();
    const card = box.find(function (c) { return c.word === word; });
    if (!card) return;
    patchLegacyCard(card);

    if (isCorrect) card.correct++; else card.incorrect++;
    card.lastReviewed = Date.now();

    if (isCorrect) {
      if (card.reps === 0) card.interval = 1;
      else if (card.reps === 1) card.interval = 3;
      else card.interval = Math.max(1, Math.round(card.interval * card.ease));
      card.reps++;
      card.ease = Math.min(3.2, card.ease + 0.1);
    } else {
      card.reps = 0;
      card.interval = 1;
      card.ease = Math.max(1.3, card.ease - 0.2);
    }
    card.due = Date.now() + card.interval * DAY_MS;

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

  let browseInitialized = false;

  function initTabs() {
    const btns = document.querySelectorAll('.tab-btn');
    const defaultBtn = document.querySelector('.tab-btn[data-tab="dashboard"]');
    if (defaultBtn) defaultBtn.classList.add('active');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'cardbox') renderCardboxTab();
        if (btn.dataset.tab === 'dashboard') renderDashboard();
        if (btn.dataset.tab === 'settings') { renderDashboard(); }
        if (btn.dataset.tab === 'browse' && !browseInitialized) {
          browseInitialized = true;
          initBrowseChips();
          runBrowseSearch();
        }
      });
    });
  }

  // ---------- Generator tab ----------

  const genState = { words: [] };

  function renderGenResults() {
    const wrap = document.getElementById('genResults');
    wrap.innerHTML = genState.words.map(wordRowHTML).join('');
    bindAnagramToggles(wrap);

    let totalScore = 0;
    genState.words.forEach(function (w) { totalScore += wordScore(w); });
    document.getElementById('genSummaryLine').textContent =
      'รวม ' + genState.words.length + ' คำ · คะแนนรวม ' + totalScore + ' แต้ม';
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
          '<span class="word-meta">' + wordScore(word) + ' pts</span>' +
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
    const now = Date.now();
    const dueCount = box.filter(function (c) { return (c.due || 0) <= now; }).length;

    document.getElementById('cardboxCount').textContent = box.length;
    document.getElementById('cardboxDueCount').textContent =
      box.length ? dueCount + ' คำถึงกำหนดทบทวนตอนนี้' : '';

    const listEl = document.getElementById('cardboxList');

    if (!box.length) {
      listEl.innerHTML = '<div class="empty-state">ยังไม่มีคำศัพท์ใน Cardbox — ไปที่แท็บ "แบบทดสอบ" เพื่อเลือกคำที่อยากจำ</div>';
    } else {
      listEl.innerHTML = box.slice().sort(function (a, b) { return b.addedAt - a.addedAt; }).map(function (c) {
        const isDue = (c.due || 0) <= now;
        return (
          '<div class="card-row">' +
            '<div>' + tileRowHTML(c.word, 'small') + '</div>' +
            '<div class="card-row-meta">' +
              (isDue ? '<span class="status-pill status-learning">⏰ ถึงกำหนด</span>' : '') +
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
      const dueOnly = document.getElementById('dueOnlyToggle').checked;
      const now = Date.now();

      let pool = dueOnly ? box.filter(function (c) { return (c.due || 0) <= now; }) : box.slice();
      if (dueOnly && !pool.length) {
        showToast('ไม่มีคำที่ถึงกำหนดทบทวนตอนนี้ — ลองปิด "เฉพาะคำที่ถึงกำหนด" เพื่อทบทวนคำอื่น');
        return;
      }
      pool.sort(function (a, b) { return (a.due || 0) - (b.due || 0); });

      let n = parseInt(document.getElementById('studyCount').value, 10) || pool.length;
      n = Math.max(1, Math.min(n, pool.length));

      const queue = dueOnly ? pool.slice(0, n) : shuffle(pool).slice(0, n);
      startStudySession(queue, mode, anagramOrder);
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      if (!confirm('ต้องการรีเซ็ตความคืบหน้าทั้งหมด และลบคำศัพท์ทั้งหมดใน Cardbox ใช่หรือไม่?')) return;
      localStorage.removeItem(CARDBOX_KEY);
      renderCardboxTab();
      renderDashboard();
      showToast('รีเซ็ตความคืบหน้าเรียบร้อยแล้ว');
    });
  }

  // ---------- Due-time preset controls ----------

  const DUE_PRESET_LABEL_TH = {
    '1h': '1 ชั่วโมง', '5h': '5 ชั่วโมง', '12h': '12 ชั่วโมง', '24h': '24 ชั่วโมง',
    '1d': '1 วัน', '2d': '2 วัน', '5d': '5 วัน', '10d': '10 วัน', '30d': '30 วัน'
  };

  function renderDueTimeSummary() {
    const summaryEl = document.getElementById('dueTimeSummary');
    if (!summaryEl) return;
    if (settings.dueTimePreset === 'custom') {
      const val = Math.max(1, parseInt(settings.dueTimeCustomValue, 10) || 1);
      const unitLabel = settings.dueTimeCustomUnit === 'h' ? (val === 1 ? 'ชั่วโมง' : 'ชั่วโมง') : (val === 1 ? 'วัน' : 'วัน');
      summaryEl.textContent = val + ' ' + unitLabel;
    } else {
      summaryEl.textContent = DUE_PRESET_LABEL_TH[settings.dueTimePreset] || '24 ชั่วโมง';
    }
  }

  function initDueTimeControls() {
    const chipWrap = document.getElementById('dueTimePresetChips');
    const customRow = document.getElementById('dueTimeCustomRow');
    const customValueInput = document.getElementById('dueTimeCustomValue');
    const customUnitSelect = document.getElementById('dueTimeCustomUnit');
    if (!chipWrap) return;

    // restore saved state into UI
    chipWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.due === settings.dueTimePreset);
    });
    customRow.style.display = settings.dueTimePreset === 'custom' ? '' : 'none';
    customValueInput.value = settings.dueTimeCustomValue;
    customUnitSelect.value = settings.dueTimeCustomUnit;
    renderDueTimeSummary();

    chipWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        chipWrap.querySelectorAll('.mode-chip').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        settings.dueTimePreset = btn.dataset.due;
        customRow.style.display = settings.dueTimePreset === 'custom' ? '' : 'none';
        saveSettings();
        renderDueTimeSummary();
      });
    });

    customValueInput.addEventListener('change', function () {
      settings.dueTimeCustomValue = Math.max(1, parseInt(customValueInput.value, 10) || 1);
      customValueInput.value = settings.dueTimeCustomValue;
      saveSettings();
      renderDueTimeSummary();
    });

    customUnitSelect.addEventListener('change', function () {
      settings.dueTimeCustomUnit = customUnitSelect.value;
      saveSettings();
      renderDueTimeSummary();
    });
  }

  // ---------- Study session ----------

  const session = { queue: [], index: 0, mode: 'flashcard', anagramOrder: 'alpha', correct: 0, incorrect: 0, flipped: false };

  function sessionKeyHandler(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (confirm('ต้องการออกจากเซสชันทบทวนหรือไม่?')) endStudySession();
      return;
    }
    if (e.key === 'Enter') {
      const nextBtn = document.getElementById('anagramNextBtn') ||
        document.getElementById('recallNextBtn') || document.getElementById('sessionFinishBtn');
      if (nextBtn) { e.preventDefault(); nextBtn.click(); return; }
    }
    if (session.mode === 'flashcard') {
      if (!session.flipped && (e.key === 'Enter' || e.code === 'Space')) {
        const flipBtn = document.getElementById('flipBtn');
        if (flipBtn) { e.preventDefault(); flipBtn.click(); }
      } else if (session.flipped) {
        if (e.key === 'Enter') {
          const k = document.getElementById('knowBtn');
          if (k) { e.preventDefault(); k.click(); }
        } else if (e.key === 'Backspace') {
          const d = document.getElementById('dontKnowBtn');
          if (d) { e.preventDefault(); d.click(); }
        }
      }
    }
  }

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
    document.addEventListener('keydown', sessionKeyHandler);
    renderSessionCard();
  }

  function endStudySession() {
    document.removeEventListener('keydown', sessionKeyHandler);
    document.getElementById('studySession').classList.remove('open');
    document.getElementById('cardboxSetup').style.display = '';
    document.getElementById('cardboxList').style.display = '';
    renderCardboxTab();
  }

  function updateSessionProgressBar() {
    const total = session.queue.length;
    document.getElementById('sessionProgressLabel').textContent =
      'คำที่ ' + Math.min(session.index + 1, total) + ' / ' + total +
      '   ·   ถูก ' + session.correct + '   ผิด ' + session.incorrect +
      '   ·   ⌨️ Enter = ตอบ/ถัดไป · Esc = ออก';
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
          '<div class="session-prompt-label">Flashcard · แตะเพื่อดูคำตอบ (หรือกด Enter)</div>' +
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
          '<div class="session-prompt-label">คำตอบ · Enter = จำได้ · Backspace = ยังไม่รู้</div>' +
          tileRowHTML(word, 'big') +
          '<div class="word-meta">' + wordScore(word) + ' คะแนน' + (partners.length ? ' · Anagram: ' + partners.join(', ') : '') + '</div>' +
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
          '<input type="text" id="anagramInput" autocomplete="off" placeholder="พิมพ์คำตอบแล้วกด Enter" autofocus>' +
          '<button class="btn btn-primary" type="submit">ตรวจคำตอบ</button>' +
        '</form>' +
        '<div class="session-feedback" id="anagramFeedback"></div>' +
        '<div class="session-controls" id="anagramNextWrap" style="display:none">' +
          '<button class="btn btn-teal" id="anagramNextBtn">ต่อไป (Enter) →</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('anagramForm');
    const feedback = document.getElementById('anagramFeedback');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('anagramInput');
      const guess = input.value.trim().toUpperCase();
      if (!guess) return;

      // A scrambled rack of letters can legitimately spell more than one
      // dictionary word (e.g. EGL -> LEG or GEL) — any of them counts.
      const validGroup = [word].concat(getAnagrams(word));
      const isCorrect = validGroup.indexOf(guess) !== -1;

      input.disabled = true;
      form.querySelector('button').disabled = true;
      if (isCorrect) {
        feedback.textContent = '✓ ถูกต้อง! ' + guess +
          (validGroup.length > 1 ? '  (คำอื่นที่เป็นไปได้เช่นกัน: ' + validGroup.filter(function (w) { return w !== guess; }).join(', ') + ')' : '');
        feedback.className = 'session-feedback correct';
      } else {
        feedback.textContent = '✗ ยังไม่ถูก — คำตอบที่เป็นไปได้: ' + validGroup.join(', ');
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
          '<input type="text" id="recallInput" autocomplete="off" placeholder="พิมพ์คำตอบแล้วกด Enter" autofocus>' +
          '<button class="btn btn-primary" type="submit">ตรวจคำตอบ</button>' +
        '</form>' +
        '<div class="session-feedback" id="recallFeedback"></div>' +
        '<div class="session-controls" id="recallNextWrap" style="display:none">' +
          '<button class="btn btn-teal" id="recallNextBtn">ต่อไป (Enter) →</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('recallForm');
    const feedback = document.getElementById('recallFeedback');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = document.getElementById('recallInput');
      const guess = input.value.trim().toUpperCase();
      if (!guess) return;
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
    const now = Date.now();
    const total = box.length;
    const counts = { new: 0, learning: 0, mastered: 0 };
    let totalCorrect = 0, totalIncorrect = 0, dueCount = 0;
    box.forEach(function (c) {
      counts[c.status] = (counts[c.status] || 0) + 1;
      totalCorrect += c.correct;
      totalIncorrect += c.incorrect;
      if ((c.due || 0) <= now) dueCount++;
    });

    document.getElementById('dashStatGrid').innerHTML =
      statCard(total, 'คำใน Cardbox', '') +
      statCard(dueCount, 'ถึงกำหนดทบทวน', 'brass') +
      statCard(counts.learning, 'กำลังเรียน', '') +
      statCard(counts.mastered, 'เชี่ยวชาญ', 'teal') +
      statCard(totalCorrect + totalIncorrect, 'จำนวนครั้งที่ทบทวน', '');

    const pct = total ? Math.round((counts.mastered / total) * 100) : 0;
    document.getElementById('dashDonut').style.setProperty('--p', pct);
    document.getElementById('dashPct').textContent = pct + '%';

    document.getElementById('dashLegend').innerHTML =
      legendItem('var(--teal)', 'เชี่ยวชาญ', counts.mastered) +
      legendItem('var(--brass)', 'กำลังเรียน', counts.learning) +
      legendItem('#3a4a42', 'คำใหม่', counts.new);

    document.getElementById('customWordsCount').textContent =
      customWords.length ? 'คำศัพท์ที่นำเข้าเอง: ' + customWords.length + ' คำ' : 'ยังไม่มีคำศัพท์ที่นำเข้าเอง';

    renderDashSuggested();
  }

  function statCard(num, label, cls) {
    return '<div class="stat-card ' + cls + '"><div class="stat-num">' + num + '</div><div class="stat-label">' + label + '</div></div>';
  }

  // ---------- Dashboard: suggested words (fixed for the page load, unless reshuffled) ----------

  let dashSuggestedWords = null;

  function generateDashSuggested() {
    dashSuggestedWords = pickRandomWords(settings.dashMin, settings.dashMax, settings.dashCount);
  }

  function renderDashSuggested() {
    if (!dashSuggestedWords) generateDashSuggested();
    const wrap = document.getElementById('dashSuggestedWords');
    if (!wrap) return;
    if (!dashSuggestedWords.length) {
      wrap.innerHTML = '<div class="empty-state">ไม่พบคำศัพท์ในช่วงความยาวที่ตั้งไว้ — ปรับได้ที่หน้า Setting</div>';
      return;
    }
    wrap.innerHTML = dashSuggestedWords.map(wordRowHTML).join('');
    bindAnagramToggles(wrap);
  }

  function initDashSuggested() {
    document.getElementById('dashSuggestedRefreshBtn').addEventListener('click', function () {
      generateDashSuggested();
      renderDashSuggested();
    });
  }

  function legendItem(color, label, count) {
    return '<div class="legend-item"><span class="legend-dot" style="background:' + color + '"></span>' + label + ' (' + count + ')</div>';
  }

  // ---------- Import / Export ----------

  function initImportExport() {
    document.getElementById('exportProgressBtn').addEventListener('click', function () {
      const box = loadCardbox();
      const blob = new Blob([JSON.stringify(box, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      downloadDataUrl(url, 'csw24-progress-backup-' + today + '.json');
      showToast('ส่งออกความคืบหน้าแล้ว (' + box.length + ' คำ)');
    });

    document.getElementById('importProgressInput').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported)) throw new Error('bad format');
          const box = loadCardbox();
          const byWord = {};
          box.forEach(function (c) { byWord[c.word] = c; });
          let added = 0, updated = 0;
          imported.forEach(function (item) {
            if (!item || !item.word) return;
            const word = String(item.word).toUpperCase();
            const card = Object.assign(newCard(word), item, { word: word });
            patchLegacyCard(card);
            if (byWord[word]) updated++; else added++;
            byWord[word] = card;
          });
          saveCardbox(Object.values(byWord));
          renderCardboxTab();
          renderDashboard();
          showToast('นำเข้าความคืบหน้าแล้ว (เพิ่มใหม่ ' + added + ' · อัปเดต ' + updated + ')');
        } catch (err) {
          showToast('ไฟล์ไม่ถูกต้อง ไม่สามารถนำเข้าได้');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    document.getElementById('importWordsInput').addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        const lines = reader.result.split(/\r?\n/);
        const existing = new Set(customWords);
        let added = 0, skipped = 0;
        lines.forEach(function (line) {
          const w = line.trim().toUpperCase();
          if (!w) return;
          if (!/^[A-Z]{2,15}$/.test(w)) { skipped++; return; }
          if (existing.has(w)) { skipped++; return; }
          existing.add(w);
          customWords.push(w);
          added++;
        });
        rebuildCustomIndex();
        saveCustomWords();
        renderDashboard();
        showToast('นำเข้าคำศัพท์ใหม่ ' + added + ' คำ (ข้าม ' + skipped + ' คำที่ซ้ำ/ไม่ถูกรูปแบบ)');
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // ---------- Dedicated Cardbox export/import (replace semantics) ----------

  function initCardboxImportExport() {
    const exportBtn = document.getElementById('exportCardboxBtn');
    const importInput = document.getElementById('importCardboxInput');
    if (!exportBtn || !importInput) return;

    exportBtn.addEventListener('click', function () {
      const box = loadCardbox();
      if (!box.length) { showToast('Cardbox ว่างอยู่ ไม่มีอะไรให้ Export'); return; }
      const blob = new Blob([JSON.stringify(box, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      downloadDataUrl(url, 'csw24-cardbox-' + today + '.json');
      showToast('Export Cardbox แล้ว (' + box.length + ' คำ) — เก็บไฟล์นี้ไว้ก่อน Import ชุดใหม่');
    });

    importInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported)) throw new Error('bad format');
          const currentCount = loadCardbox().length;
          if (currentCount > 0) {
            const ok = confirm(
              'Cardbox ปัจจุบันมี ' + currentCount + ' คำ การ Import จะ "แทนที่ทั้งหมด" ด้วยไฟล์นี้ ' +
              '(แนะนำ Export เก็บไว้ก่อนถ้ายังไม่ได้ทำ) ต้องการดำเนินการต่อหรือไม่?'
            );
            if (!ok) { e.target.value = ''; return; }
          }
          const cleaned = [];
          const seen = new Set();
          imported.forEach(function (item) {
            if (!item || !item.word) return;
            const word = String(item.word).toUpperCase();
            if (seen.has(word)) return;
            seen.add(word);
            const card = Object.assign(newCard(word), item, { word: word });
            patchLegacyCard(card);
            cleaned.push(card);
          });
          saveCardbox(cleaned);
          renderCardboxTab();
          renderDashboard();
          showToast('Import Cardbox แล้ว — แทนที่ด้วย ' + cleaned.length + ' คำ');
        } catch (err) {
          showToast('ไฟล์ไม่ถูกต้อง ไม่สามารถ Import ได้');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // ---------- Word browser tab ----------

  const browseState = { activeLength: 'all', results: [], shown: 0 };

  const BROWSE_FILTER_IDS = [
    'filterStarts', 'filterEnds', 'filterContains', 'filterContainsAll',
    'filterScoreMin', 'filterScoreMax', 'filterPattern', 'filterRack',
    'filterVowelMin', 'filterVowelMax'
  ];

  function initBrowseChips() {
    const wrap = document.getElementById('browseLengthChips');
    let html = '<button class="length-chip active" data-len="all">ทั้งหมด</button>';
    for (let L = CSW24_MIN_LEN; L <= CSW24_MAX_LEN; L++) {
      html += '<button class="length-chip" data-len="' + L + '">' + L + '</button>';
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.length-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        wrap.querySelectorAll('.length-chip').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        browseState.activeLength = btn.dataset.len === 'all' ? 'all' : parseInt(btn.dataset.len, 10);
        runBrowseSearch();
      });
    });

    // Progressive search: re-run the search in real time as the person types,
    // debounced so fast typing doesn't re-filter the whole dictionary on
    // every single keystroke. Enter still triggers an immediate search.
    let browseDebounceHandle = null;
    BROWSE_FILTER_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      el.addEventListener('input', function () {
        if (browseDebounceHandle) clearTimeout(browseDebounceHandle);
        browseDebounceHandle = setTimeout(runBrowseSearch, 200);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          if (browseDebounceHandle) clearTimeout(browseDebounceHandle);
          runBrowseSearch();
        }
      });
    });
    document.getElementById('browseSearchBtn').addEventListener('click', runBrowseSearch);
    document.getElementById('browseClearBtn').addEventListener('click', function () {
      BROWSE_FILTER_IDS.forEach(function (id) { document.getElementById(id).value = ''; });
      runBrowseSearch();
    });
    document.getElementById('browseLoadMoreBtn').addEventListener('click', function () { renderBrowseResults(false); });
  }

  const VOWELS = { A: 1, E: 1, I: 1, O: 1, U: 1 };

  function vowelRatioPct(word) {
    let v = 0;
    for (let i = 0; i < word.length; i++) if (VOWELS[word[i]]) v++;
    return (v / word.length) * 100;
  }

  // Pattern like "C_C" or "?AT": '_' and '?' match any single letter,
  // any other character must match exactly. Length must match the word.
  function wordMatchesPattern(word, pattern) {
    if (word.length !== pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      const p = pattern[i];
      if (p === '_' || p === '?') continue;
      if (p !== word[i]) return false;
    }
    return true;
  }

  // Rack string like "AEINRT" or "AEIN?T" ('?' = blank, matches any letter).
  // The word must be fully buildable from the given letters (each rack
  // letter usable once), independent of position/order.
  function wordPlayableFromRack(word, rackCounts, blankCount) {
    return isSubsetOfCountsWithBlanks(word, rackCounts, blankCount);
  }

  function wordMatchesFilters(word, f) {
    if (f.starts && !word.startsWith(f.starts)) return false;
    if (f.ends && !word.endsWith(f.ends)) return false;
    if (f.contains && word.indexOf(f.contains) === -1) return false;
    if (f.containsAll) {
      for (let i = 0; i < f.containsAll.length; i++) {
        if (word.indexOf(f.containsAll[i]) === -1) return false;
      }
    }
    if (f.scoreMin != null && wordScore(word) < f.scoreMin) return false;
    if (f.scoreMax != null && wordScore(word) > f.scoreMax) return false;
    if (f.pattern && !wordMatchesPattern(word, f.pattern)) return false;
    if (f.rackCounts && !wordPlayableFromRack(word, f.rackCounts, f.rackBlanks)) return false;
    if (f.vowelMin != null && vowelRatioPct(word) < f.vowelMin) return false;
    if (f.vowelMax != null && vowelRatioPct(word) > f.vowelMax) return false;
    return true;
  }

  function runBrowseSearch() {
    const starts = document.getElementById('filterStarts').value.trim().toUpperCase();
    const ends = document.getElementById('filterEnds').value.trim().toUpperCase();
    const contains = document.getElementById('filterContains').value.trim().toUpperCase();
    const containsAllRaw = document.getElementById('filterContainsAll').value.trim().toUpperCase();
    const scoreMinRaw = document.getElementById('filterScoreMin').value;
    const scoreMaxRaw = document.getElementById('filterScoreMax').value;
    const patternRaw = document.getElementById('filterPattern').value.trim().toUpperCase();
    const rackRaw = document.getElementById('filterRack').value.trim().toUpperCase();
    const vowelMinRaw = document.getElementById('filterVowelMin').value;
    const vowelMaxRaw = document.getElementById('filterVowelMax').value;

    let rackCounts = null;
    let rackBlanks = 0;
    if (rackRaw) {
      const rackLetters = rackRaw.replace(/[^A-Z?]/g, '');
      rackBlanks = (rackLetters.match(/\?/g) || []).length;
      rackCounts = letterCounts(rackLetters.replace(/\?/g, ''));
    }

    const f = {
      starts: starts, ends: ends, contains: contains,
      containsAll: containsAllRaw ? Array.from(new Set(containsAllRaw.split(''))) : null,
      scoreMin: scoreMinRaw ? parseInt(scoreMinRaw, 10) : null,
      scoreMax: scoreMaxRaw ? parseInt(scoreMaxRaw, 10) : null,
      pattern: patternRaw ? patternRaw.replace(/[^A-Z_?]/g, '') : null,
      rackCounts: rackCounts, rackBlanks: rackBlanks,
      vowelMin: vowelMinRaw ? parseFloat(vowelMinRaw) : null,
      vowelMax: vowelMaxRaw ? parseFloat(vowelMaxRaw) : null
    };
    const hasFilters = !!(
      starts || ends || contains || f.containsAll || f.scoreMin != null || f.scoreMax != null ||
      f.pattern || f.rackCounts || f.vowelMin != null || f.vowelMax != null
    );

    let candidates = [];
    if (f.pattern) {
      // Pattern search implies a fixed word length, so narrow to that length
      // directly instead of scanning every length in the dictionary.
      candidates = lengthPool(f.pattern.length);
    } else if (browseState.activeLength === 'all') {
      for (let L = CSW24_MIN_LEN; L <= CSW24_MAX_LEN; L++) candidates = candidates.concat(lengthPool(L));
    } else {
      candidates = lengthPool(browseState.activeLength);
    }

    const results = hasFilters ? candidates.filter(function (w) { return wordMatchesFilters(w, f); }) : candidates;
    browseState.results = results;
    browseState.shown = 0;

    document.getElementById('browseResultCount').textContent = 'พบ ' + results.length.toLocaleString('en-US') + ' คำ';
    renderBrowseResults(true);
  }

  function renderBrowseResults(reset) {
    const wrap = document.getElementById('browseResults');
    if (reset) wrap.innerHTML = '';
    const slice = browseState.results.slice(browseState.shown, browseState.shown + PAGE_SIZE);
    wrap.insertAdjacentHTML('beforeend', slice.map(wordRowHTML).join(''));
    bindAnagramToggles(wrap);
    browseState.shown += slice.length;
    document.getElementById('browseLoadMoreWrap').style.display =
      browseState.shown < browseState.results.length ? '' : 'none';
  }

  // ---------- Minigame: typing ----------

  const TG_SAVE_KEY = 'csw24_typing_progress_v1';

  const tg = { words: [], index: 0, strict: false, mistakes: 0, startTime: 0, timerHandle: null, mode: 'random', showAnagram: false, typed: [], typedSelected: new Set(), containsAll: '' };

  function tgWordsForLetterMode(len) {
    // All words of a single chosen length, sorted A→Z.
    let pool = lengthPool(len).slice();
    pool = Array.from(new Set(pool)).sort();
    return pool;
  }

  function tgApplyContainsAllFilter(words, substr) {
    const needle = (substr || '').toUpperCase().trim();
    if (!needle) return words;
    return words.filter(function (w) { return w.indexOf(needle) !== -1; });
  }

  function tgWordsFromCardbox() {
    return loadCardbox().map(function (c) { return c.word; });
  }

  function tgWordsFromSuggested() {
    if (!dashSuggestedWords) generateDashSuggested();
    return (dashSuggestedWords || []).slice();
  }

  function tgSaveProgress() {
    try {
      localStorage.setItem(TG_SAVE_KEY, JSON.stringify({
        words: tg.words, index: tg.index, mistakes: tg.mistakes, startTime: tg.startTime,
        strict: tg.strict, showAnagram: tg.showAnagram, mode: tg.mode, containsAll: tg.containsAll,
        typed: tg.typed
      }));
    } catch (e) { /* ignore */ }
  }

  function tgLoadProgress() {
    try {
      const raw = localStorage.getItem(TG_SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.words) || !data.words.length) return null;
      if (typeof data.index !== 'number' || data.index >= data.words.length) return null;
      return data;
    } catch (e) { return null; }
  }

  function tgClearProgress() {
    localStorage.removeItem(TG_SAVE_KEY);
  }

  function tgRefreshResumeBtn() {
    const btn = document.getElementById('tgResumeBtn');
    if (!btn) return;
    const saved = tgLoadProgress();
    if (saved) {
      btn.style.display = '';
      btn.textContent = '↩ เล่นต่อจากที่ค้างไว้ (' + saved.index + '/' + saved.words.length + ')';
    } else {
      btn.style.display = 'none';
    }
  }

  function initTypingGame() {
    const modeBtns = {
      random: document.getElementById('tgModeRandomBtn'),
      letter: document.getElementById('tgModeLetterBtn'),
      cardbox: document.getElementById('tgModeCardboxBtn'),
      suggested: document.getElementById('tgModeSuggestedBtn')
    };
    const rangeRow = document.getElementById('tgRangeRow');
    const countField = document.getElementById('tgCountField');
    const letterNote = document.getElementById('tgLetterNote');
    const maxField = document.getElementById('tgMax').closest('.field');

    function refreshModeChips() {
      Object.keys(modeBtns).forEach(function (m) { modeBtns[m].classList.toggle('active', tg.mode === m); });
      const isLetter = tg.mode === 'letter';
      const isSourceMode = tg.mode === 'cardbox' || tg.mode === 'suggested';
      rangeRow.style.display = isSourceMode ? 'none' : '';
      letterNote.style.display = isLetter ? '' : 'none';
      countField.style.display = isLetter ? 'none' : '';
      if (maxField) maxField.style.display = isLetter ? 'none' : '';
    }
    Object.keys(modeBtns).forEach(function (m) {
      modeBtns[m].addEventListener('click', function () { tg.mode = m; refreshModeChips(); });
    });
    refreshModeChips();

    const containsAllToggle = document.getElementById('tgContainsAllToggle');
    const containsAllField = document.getElementById('tgContainsAllField');
    containsAllToggle.addEventListener('change', function () {
      containsAllField.style.display = containsAllToggle.checked ? '' : 'none';
    });

    document.getElementById('tgStartBtn').addEventListener('click', function () {
      let words;
      if (tg.mode === 'letter') {
        let len = parseInt(document.getElementById('tgMin').value, 10) || CSW24_MIN_LEN;
        len = Math.max(CSW24_MIN_LEN, Math.min(len, CSW24_MAX_LEN));
        words = tgWordsForLetterMode(len);
        const containsAllPre = containsAllToggle.checked ? document.getElementById('tgContainsAllInput').value : '';
        if (containsAllPre) words = tgApplyContainsAllFilter(words, containsAllPre);
      } else if (tg.mode === 'cardbox') {
        words = tgWordsFromCardbox();
        const containsAllPre = containsAllToggle.checked ? document.getElementById('tgContainsAllInput').value : '';
        if (containsAllPre) words = tgApplyContainsAllFilter(words, containsAllPre);
        if (!words.length) { showToast('Cardbox ยังไม่มีคำศัพท์ที่ตรงเงื่อนไข'); return; }
      } else if (tg.mode === 'suggested') {
        words = tgWordsFromSuggested();
        const containsAllPre = containsAllToggle.checked ? document.getElementById('tgContainsAllInput').value : '';
        if (containsAllPre) words = tgApplyContainsAllFilter(words, containsAllPre);
        if (!words.length) { showToast('ยังไม่มีคำแนะนำจาก Dashboard ที่ตรงเงื่อนไข'); return; }
      } else {
        let min = parseInt(document.getElementById('tgMin').value, 10) || CSW24_MIN_LEN;
        let max = parseInt(document.getElementById('tgMax').value, 10) || CSW24_MAX_LEN;
        let count = parseInt(document.getElementById('tgCount').value, 10) || 10;
        min = Math.max(CSW24_MIN_LEN, Math.min(min, CSW24_MAX_LEN));
        max = Math.max(CSW24_MIN_LEN, Math.min(max, CSW24_MAX_LEN));
        if (min > max) { const t2 = min; min = max; max = t2; }
        count = Math.max(1, count);

        const containsAllPre = containsAllToggle.checked ? document.getElementById('tgContainsAllInput').value : '';
        if (containsAllPre) {
          // Filter the full candidate pool by the substring first, then randomly
          // sample `count` from the matches — filtering after picking would
          // silently shrink the result set below what the user asked for.
          let pool = [];
          for (let L = min; L <= max; L++) pool = pool.concat(lengthPool(L));
          pool = tgApplyContainsAllFilter(pool, containsAllPre);
          words = shuffle(pool.slice()).slice(0, Math.min(count, pool.length));
        } else {
          words = pickRandomWords(min, max, count);
        }
      }

      const containsAll = containsAllToggle.checked ? document.getElementById('tgContainsAllInput').value : '';
      if (!words.length) { showToast('ไม่พบคำศัพท์ที่ตรงกับเงื่อนไขที่เลือก'); return; }

      tg.words = words;
      tg.strict = document.getElementById('tgStrict').checked;
      tg.showAnagram = document.getElementById('tgShowAnagramToggle').checked;
      tg.containsAll = containsAll;
      tg.typed = [];
      tg.typedSelected = new Set();
      tgRestart();
      document.getElementById('typingPlay').style.display = '';
      document.getElementById('tgTypedPanel').style.display = 'none';
    });

    document.getElementById('tgResumeBtn').addEventListener('click', function () {
      const saved = tgLoadProgress();
      if (!saved) { tgRefreshResumeBtn(); return; }
      tg.words = saved.words;
      tg.index = saved.index;
      tg.mistakes = saved.mistakes || 0;
      tg.startTime = saved.startTime || Date.now();
      tg.strict = !!saved.strict;
      tg.showAnagram = !!saved.showAnagram;
      tg.mode = saved.mode || 'random';
      tg.containsAll = saved.containsAll || '';
      tg.typed = saved.typed || [];
      tg.typedSelected = new Set();
      if (tg.timerHandle) clearInterval(tg.timerHandle);
      tg.timerHandle = setInterval(tgUpdateTimer, 500);
      tgRenderPlay();
      document.getElementById('typingPlay').style.display = '';
      document.getElementById('tgTypedPanel').style.display = 'none';
    });

    tgRefreshResumeBtn();
  }

  function tgRestart() {
    tg.index = 0;
    tg.mistakes = 0;
    tg.startTime = Date.now();
    if (tg.timerHandle) clearInterval(tg.timerHandle);
    tg.timerHandle = setInterval(tgUpdateTimer, 500);
    tgSaveProgress();
    tgRenderPlay();
  }

  function tgFormatTime(ms) {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  function tgUpdateTimer() {
    const el = document.getElementById('tgTimer');
    if (el) el.textContent = tgFormatTime(Date.now() - tg.startTime);
  }

  function tgRenderPlay() {
    const word = tg.words[tg.index];
    const area = document.getElementById('typingPlay');
    const pct = Math.round((tg.index / tg.words.length) * 100);
    area.innerHTML =
      '<div class="session-progress">คำที่ ' + (tg.index + 1) + ' / ' + tg.words.length +
        ' · พลาด ' + tg.mistakes + ' ครั้ง · เวลา <span id="tgTimer">' + tgFormatTime(Date.now() - tg.startTime) + '</span></div>' +
      '<div class="session-bar"><div class="session-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="session-card">' +
        '<div class="session-prompt-label">พิมพ์คำนี้ให้ตรงทุกตัวอักษร' + (tg.strict ? ' · โหมดเข้มงวด: พิมพ์ผิด = เริ่มใหม่' : '') + '</div>' +
        '<div class="tile-word" id="tgTargetTiles">' + word.split('').map(function (ch) {
          return '<span class="letter-tile big type-letter">' + ch + '</span>';
        }).join('') + '</div>' +
        '<input type="text" id="tgInput" class="session-answer-form-input" autocomplete="off" autofocus>' +
        (tg.showAnagram ?
          '<div class="session-controls"><button class="btn btn-outline btn-sm" id="tgAnagramHintBtn">🔤 ดู Anagram ของคำนี้</button></div>' +
          '<div class="anagram-detail" id="tgAnagramHintDetail"></div>'
          : '') +
      '</div>';

    const input = document.getElementById('tgInput');
    input.addEventListener('input', function () { tgHandleInput(word, input); });
    input.focus();

    if (tg.showAnagram) {
      const hintBtn = document.getElementById('tgAnagramHintBtn');
      hintBtn.addEventListener('click', function () {
        const detail = document.getElementById('tgAnagramHintDetail');
        const isOpen = detail.classList.contains('open');
        if (isOpen) { detail.classList.remove('open'); hintBtn.textContent = '🔤 ดู Anagram ของคำนี้'; return; }
        const key = sortLetters(word);
        const partners = getAnagrams(word);
        let html = '<div class="key-row"><span class="key-label">เรียงตามตัวอักษร:</span>' + tileRowHTML(key, 'small') + '</div>';
        if (partners.length) {
          html += '<div class="key-row"><span class="key-label">คำ Anagram (' + partners.length + '):</span></div>';
          html += '<div class="anagram-partners">' + partners.map(function (p) { return '<span class="anagram-chip">' + p + '</span>'; }).join('') + '</div>';
        } else {
          html += '<div class="no-anagram">ไม่มีคำอื่นที่เป็น Anagram ของคำนี้ในพจนานุกรม</div>';
        }
        detail.innerHTML = html;
        detail.classList.add('open');
        hintBtn.textContent = '🔤 ซ่อน Anagram';
        input.focus();
      });
    }
  }

  function tgHandleInput(word, input) {
    let val = input.value.toUpperCase();
    if (val.length > word.length) { val = val.slice(0, word.length); input.value = val; }

    const tiles = document.querySelectorAll('#tgTargetTiles .letter-tile');
    let mismatch = false;
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove('correct-letter', 'wrong-letter');
      if (i < val.length) {
        if (val[i] === word[i]) tiles[i].classList.add('correct-letter');
        else { tiles[i].classList.add('wrong-letter'); mismatch = true; }
      }
    }

    if (mismatch) {
      tg.mistakes++;
      if (tg.strict) {
        showToast('พิมพ์ผิด! เริ่มใหม่ตั้งแต่คำแรก');
        tg.typed = [];
        tg.typedSelected = new Set();
        tgRestart();
        return;
      }
      return;
    }

    if (val === word) {
      input.disabled = true;
      tg.typed.push(word);
      tg.index++;
      tgSaveProgress();
      setTimeout(function () {
        if (tg.index >= tg.words.length) tgFinish();
        else tgRenderPlay();
      }, 200);
    }
  }

  function tgFinish() {
    if (tg.timerHandle) { clearInterval(tg.timerHandle); tg.timerHandle = null; }
    tgClearProgress();
    const elapsed = Date.now() - tg.startTime;
    const area = document.getElementById('typingPlay');
    area.innerHTML =
      '<div class="session-summary">' +
        '<div class="session-prompt-label">จบเกม!</div>' +
        '<div class="big-stat">' + tgFormatTime(elapsed) + '</div>' +
        '<p>พิมพ์ครบ ' + tg.words.length + ' คำ · พลาดทั้งหมด ' + tg.mistakes + ' ครั้ง</p>' +
        '<div class="session-controls"><button class="btn btn-primary" id="tgPlayAgainBtn">🔁 เล่นอีกครั้ง</button></div>' +
      '</div>';
    document.getElementById('tgPlayAgainBtn').addEventListener('click', function () {
      tg.typed = [];
      tg.typedSelected = new Set();
      document.getElementById('tgTypedPanel').style.display = 'none';
      tgRestart();
    });
    tgRenderTypedPanel();
    tgRefreshResumeBtn();
  }

  // ---------- Minigame typing: "typed words so far" review + save panel ----------

  function tgRenderTypedPanel() {
    const panel = document.getElementById('tgTypedPanel');
    if (!tg.typed.length) { panel.style.display = 'none'; return; }
    panel.style.display = '';

    const wrap = document.getElementById('tgTypedList');
    wrap.innerHTML = tg.typed.map(function (word, idx) {
      return (
        '<label class="quiz-item">' +
          '<input type="checkbox" class="tg-typed-check" data-word="' + word + '">' +
          '<span class="qi-index">' + (idx + 1) + '</span>' +
          tileRowHTML(word, 'small') +
          '<span class="word-meta">' + wordScore(word) + ' pts</span>' +
        '</label>'
      );
    }).join('');

    wrap.querySelectorAll('.tg-typed-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (cb.checked) tg.typedSelected.add(cb.dataset.word);
        else tg.typedSelected.delete(cb.dataset.word);
        tgUpdateTypedSelectedCount();
      });
    });
    tg.typedSelected = new Set();
    tgUpdateTypedSelectedCount();
    document.getElementById('tgTypedSelectAll').checked = false;
  }

  function tgUpdateTypedSelectedCount() {
    document.getElementById('tgTypedSelectedCount').textContent = 'เลือกแล้ว ' + tg.typedSelected.size + ' คำ';
  }

  function initTgTypedPanel() {
    document.getElementById('tgTypedSelectAll').addEventListener('change', function (e) {
      const checked = e.target.checked;
      document.querySelectorAll('.tg-typed-check').forEach(function (cb) {
        cb.checked = checked;
        if (checked) tg.typedSelected.add(cb.dataset.word);
        else tg.typedSelected.delete(cb.dataset.word);
      });
      tgUpdateTypedSelectedCount();
    });
    document.getElementById('tgTypedSaveBtn').addEventListener('click', function () {
      if (!tg.typedSelected.size) { showToast('กรุณาเลือกคำศัพท์อย่างน้อย 1 คำ'); return; }
      const added = addWordsToCardbox(Array.from(tg.typedSelected));
      showToast('บันทึกลง Cardbox แล้ว ' + added + ' คำ');
    });
  }

  // ---------- Minigame: random racks ----------

  const rg = { rack: [], blanks: 0, solutions: new Set(), found: new Set(), score: 0, revealed: false };
  const RG_LETTER_BAG = 'AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ';
  const RG_BLANK_CHANCE = 0.12; // per-tile chance of drawing a blank when the option is enabled

  function initRacksGame() {
    document.getElementById('rgStartBtn').addEventListener('click', rgStart);
  }

  // A word is buildable from the rack if, after using rack letters directly,
  // any leftover required letters can be covered by the rack's blank count.
  function isSubsetOfCountsWithBlanks(word, rackCounts, blankCount) {
    const wc = letterCounts(word);
    let blanksNeeded = 0;
    for (const ch in wc) {
      const have = rackCounts[ch] || 0;
      if (have < wc[ch]) blanksNeeded += (wc[ch] - have);
    }
    return blanksNeeded <= blankCount;
  }

  function rgStart() {
    let size = parseInt(document.getElementById('rgSize').value, 10) || 7;
    size = Math.max(4, Math.min(size, 10));
    const allowBlank = document.getElementById('rgAllowBlank').checked;

    const letters = [];
    let blanks = 0;
    for (let i = 0; i < size; i++) {
      if (allowBlank && Math.random() < RG_BLANK_CHANCE) { blanks++; letters.push('?'); }
      else letters.push(RG_LETTER_BAG[Math.floor(Math.random() * RG_LETTER_BAG.length)]);
    }
    rg.rack = letters;
    rg.blanks = blanks;

    const rackCounts = letterCounts(letters.filter(function (ch) { return ch !== '?'; }).join(''));
    const solutions = new Set();
    for (let L = 2; L <= size; L++) {
      const pool = lengthPool(L);
      for (let i = 0; i < pool.length; i++) {
        if (isSubsetOfCountsWithBlanks(pool[i], rackCounts, blanks)) solutions.add(pool[i]);
      }
    }
    rg.solutions = solutions;
    rg.found = new Set();
    rg.score = 0;
    rg.revealed = false;

    document.getElementById('racksPlay').style.display = '';
    rgRenderPlay();
  }

  function rgTileRowWithBlanks(letters, sizeClass) {
    sizeClass = sizeClass || '';
    return '<span class="tile-word">' + letters.map(function (ch) {
      if (ch === '?') return '<span class="letter-tile blank-rack ' + sizeClass + '">★<span class="pv">0</span></span>';
      return '<span class="letter-tile ' + sizeClass + '">' + ch + '<span class="pv">' + (SCRABBLE_VALUES[ch] || '') + '</span></span>';
    }).join('') + '</span>';
  }

  function rgRenderPlay() {
    const area = document.getElementById('racksPlay');
    const foundChips = Array.from(rg.found).sort().map(function (w) {
      return '<span class="anagram-chip">' + w + ' (' + wordScore(w) + ')</span>';
    }).join('');

    area.innerHTML =
      '<div class="session-progress">พบแล้ว ' + rg.found.size + ' / ' + rg.solutions.size + ' คำ · คะแนนรวม ' + rg.score +
        (rg.blanks ? ' · 🁢 มี Blank ' + rg.blanks + ' ตัว' : '') + '</div>' +
      '<div class="session-card">' +
        '<div class="session-prompt-label">หาคำศัพท์ทั้งหมดที่ประกอบจากตัวอักษรใน Rack นี้' + (rg.blanks ? ' (★ = Blank แทนตัวอักษรใดก็ได้)' : '') + '</div>' +
        rgTileRowWithBlanks(rg.rack, 'big') +
        (rg.revealed ? '' :
          '<form class="session-answer-form" id="rgForm">' +
            '<input type="text" id="rgInput" autocomplete="off" placeholder="พิมพ์คำแล้วกด Enter" autofocus>' +
            '<button class="btn btn-primary" type="submit">ส่งคำตอบ</button>' +
          '</form>') +
        '<div class="session-controls">' +
          (rg.revealed ? '' : '<button class="btn btn-outline" id="rgRevealBtn">👁 ดูคำตอบทั้งหมด</button>') +
          '<button class="btn btn-teal" id="rgNewRoundBtn">🔁 รอบใหม่</button>' +
        '</div>' +
      '</div>' +
      '<div class="anagram-partners" id="rgFoundList" style="margin-top:1rem">' + foundChips + '</div>' +
      (rg.revealed ? '<div id="rgAllSolutions" style="margin-top:1rem"></div>' : '');

    document.getElementById('rgNewRoundBtn').addEventListener('click', rgStart);

    if (!rg.revealed) {
      document.getElementById('rgRevealBtn').addEventListener('click', function () {
        rg.revealed = true;
        rgRenderPlay();
      });
      const form = document.getElementById('rgForm');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const input = document.getElementById('rgInput');
        const guess = input.value.trim().toUpperCase();
        input.value = '';
        input.focus();
        if (!guess) return;
        if (rg.found.has(guess)) { showToast('เจอคำนี้ไปแล้ว'); return; }
        if (rg.solutions.has(guess)) {
          rg.found.add(guess);
          rg.score += wordScore(guess);
          showToast('✓ ถูกต้อง! +' + wordScore(guess) + ' คะแนน');
          rgRenderPlay();
          const freshInput = document.getElementById('rgInput');
          if (freshInput) freshInput.focus();
        } else {
          showToast('✗ ไม่ใช่คำที่ประกอบจาก Rack นี้');
        }
      });
    } else {
      const byLen = {};
      rg.solutions.forEach(function (w) { (byLen[w.length] = byLen[w.length] || []).push(w); });
      const lens = Object.keys(byLen).map(Number).sort(function (a, b) { return b - a; });
      let html = '';
      lens.forEach(function (L) {
        html += '<div class="key-row"><span class="key-label">' + L + ' ตัวอักษร</span></div><div class="anagram-partners">';
        html += byLen[L].sort().map(function (w) {
          return '<span class="anagram-chip' + (rg.found.has(w) ? '' : ' missed') + '">' + w + '</span>';
        }).join('');
        html += '</div>';
      });
      document.getElementById('rgAllSolutions').innerHTML = html;
    }
  }

  // ---------- Minigame sub-tab toggle ----------

  function initMinigameTabs() {
    const typingBtn = document.getElementById('gameTabTyping');
    const racksBtn = document.getElementById('gameTabRacks');
    const typingPanel = document.getElementById('typingGamePanel');
    const racksPanel = document.getElementById('racksGamePanel');
    typingBtn.addEventListener('click', function () {
      typingBtn.classList.add('btn-primary'); typingBtn.classList.remove('btn-outline');
      racksBtn.classList.add('btn-outline'); racksBtn.classList.remove('btn-primary');
      typingPanel.style.display = ''; racksPanel.style.display = 'none';
    });
    racksBtn.addEventListener('click', function () {
      racksBtn.classList.add('btn-primary'); racksBtn.classList.remove('btn-outline');
      typingBtn.classList.add('btn-outline'); typingBtn.classList.remove('btn-primary');
      racksPanel.style.display = ''; typingPanel.style.display = 'none';
    });
  }

  // ---------- global keyboard shortcuts ----------

  function initGlobalShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/') return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const browseTab = document.getElementById('tab-browse');
      if (browseTab && browseTab.classList.contains('active')) {
        e.preventDefault();
        document.getElementById('filterContains').focus();
      }
    });
  }

  // ---------- init ----------

  document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    applyTheme();
    loadCustomWords();
    initTabs();
    applyI18n();
    initSettingsTab();
    initGenerator();
    initQuizTab();
    initCardboxTab();
    initDueTimeControls();
    initImportExport();
    initCardboxImportExport();
    initTypingGame();
    initTgTypedPanel();
    initRacksGame();
    initMinigameTabs();
    initDashSuggested();
    initGlobalShortcuts();
    renderCardboxTab();
    renderDashboard();
  });
})();
