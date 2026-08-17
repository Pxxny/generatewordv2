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

  // Standard 100-tile English/CSW Scrabble bag composition (2 blanks).
  const TILE_BAG = {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
    K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
    U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2
  };
  const TILE_BAG_TOTAL = 100;

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
      'tab.achievements': '🏆 Achievement', 'tab.settings': '⚙️ Setting',
      'ach.title': '🏆 Achievement', 'ach.sub': 'ปลดล็อกเหรียญตราจากการเรียนและเล่นมินิเกม ข้อมูลเก็บไว้ในเบราว์เซอร์นี้เท่านั้น',
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
      'cardbox.selectedCount': 'เลือกแล้ว 0 คำ', 'cardbox.studySelected': '▶ ทบทวนคำที่เลือก',
      'browse.title': 'คลังคำศัพท์ทั้งหมด', 'browse.search': '🔍 ค้นหา (Enter)', 'browse.clear': 'ล้างตัวกรอง', 'browse.sortLabel': 'เรียงลำดับ',
      'mini.title': '🕹️ Minigame', 'mini.typing': '⌨️ พิมพ์ศัพท์ Random', 'mini.racks': '🁢 Random Racks',
      'mini.alpha': '🔀 Alphagram Blitz', 'mini.marathon': '⚡ Time Attack Marathon',
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
      'settings.importWords': '⬆ นำเข้ารายการคำศัพท์ของฉัน (.txt)', 'settings.includeCustom': 'รวมคำที่นำเข้าเองตอนสุ่ม/ค้นหา',
      'settings.studySession': 'เซสชันทบทวน (Cardbox)',
      'settings.studySessionSub': 'ปรับพฤติกรรมระหว่างทำ Quiz ในเซสชันทบทวน',
      'settings.autoAdvance': 'ไปคำต่อไปอัตโนมัติเมื่อตอบถูกครบ',
      'settings.autoAdvanceHint': 'เมื่อเปิด: หลังตอบถูกครบทุกคำ ระบบจะไปคำถัดไปให้เองโดยไม่ต้องกด Enter ซ้ำ',
      'settings.showHooks': 'แสดง Hook (Front/Back) ของคำ',
      'settings.showHooksHint': 'เมื่อเปิด: ทุกที่ที่แสดงคำศัพท์จะโชว์ตัวอักษรที่เติมหน้า/หลังคำแล้วได้เป็นคำใหม่ทันที'
    },
    en: {
      'tab.dashboard': '📊 Dashboard', 'tab.generate': '📝 Generate', 'tab.quiz': '🎯 Quiz',
      'tab.cardbox': '🗂️ Cardbox', 'tab.browse': '📖 Word Browser', 'tab.minigame': '🕹️ Minigame',
      'tab.achievements': '🏆 Achievements', 'tab.settings': '⚙️ Settings',
      'ach.title': '🏆 Achievements', 'ach.sub': 'Unlock badges by studying and playing minigames. All data is stored in this browser only.',
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
      'cardbox.selectedCount': '0 selected', 'cardbox.studySelected': '▶ Study selected',
      'browse.title': 'Full word dictionary', 'browse.search': '🔍 Search (Enter)', 'browse.clear': 'Clear filters', 'browse.sortLabel': 'Sort by',
      'mini.title': '🕹️ Minigame', 'mini.typing': '⌨️ Random Word Typing', 'mini.racks': '🁢 Random Racks',
      'mini.alpha': '🔀 Alphagram Blitz', 'mini.marathon': '⚡ Time Attack Marathon',
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
      'settings.importWords': '⬆ Import my word list (.txt)', 'settings.includeCustom': 'Include imported words in randomize/search',
      'settings.studySession': 'Study session (Cardbox)',
      'settings.studySessionSub': 'Adjust behavior while taking Quizzes in a review session.',
      'settings.autoAdvance': 'Auto-advance to next word once fully correct',
      'settings.autoAdvanceHint': 'When on: after all required words are found, the app moves to the next card automatically without needing another Enter press.',
      'settings.showHooks': 'Show word hooks (front/back)',
      'settings.showHooksHint': 'When on: everywhere a word is shown, letters that extend it into a new word (front or back) are displayed right away.'
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
    dueTimeCustomValue: 3, dueTimeCustomUnit: 'd',
    fontFamily: 'inter', fontScale: 1,
    autoAdvance: true, autoAdvanceDelay: 900,
    showHooks: true
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

  const FONT_OPTIONS = [
    { id: 'inter', label: 'Inter (ค่าเริ่มต้น)', body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" },
    { id: 'atkinson', label: 'Atkinson Hyperlegible (อ่านง่าย)', body: "'Atkinson Hyperlegible', -apple-system, sans-serif" },
    { id: 'lexend', label: 'Lexend (อ่านง่าย)', body: "'Lexend', -apple-system, sans-serif" },
    { id: 'sarabun', label: 'Sarabun (ไทย)', body: "'Sarabun', -apple-system, sans-serif" },
    { id: 'system', label: 'ตัวอักษรระบบ (System)', body: "system-ui, -apple-system, Segoe UI, sans-serif" }
  ];

  function applyFontSettings() {
    const root = document.documentElement.style;
    const opt = FONT_OPTIONS.find(function (o) { return o.id === settings.fontFamily; }) || FONT_OPTIONS[0];
    root.setProperty('--font-body', opt.body);
    root.setProperty('--font-scale', settings.fontScale || 1);
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

    // font family + size
    const fontFamilyWrap = document.getElementById('fontFamilyChips');
    fontFamilyWrap.innerHTML = FONT_OPTIONS.map(function (o) {
      return '<button type="button" class="mode-chip" data-font="' + o.id + '">' + o.label + '</button>';
    }).join('');
    function refreshFontFamilyChips() {
      fontFamilyWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.font === settings.fontFamily);
      });
    }
    refreshFontFamilyChips();
    fontFamilyWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.fontFamily = btn.dataset.font;
        saveSettings();
        applyFontSettings();
        refreshFontFamilyChips();
      });
    });

    const fontSizeWrap = document.getElementById('fontSizeChips');
    function refreshFontSizeChips() {
      fontSizeWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
        btn.classList.toggle('active', parseFloat(btn.dataset.size) === settings.fontScale);
      });
    }
    refreshFontSizeChips();
    fontSizeWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        settings.fontScale = parseFloat(btn.dataset.size);
        saveSettings();
        applyFontSettings();
        refreshFontSizeChips();
      });
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

    // auto-advance toggle for Cardbox study sessions
    const autoAdvanceToggle = document.getElementById('autoAdvanceToggle');
    autoAdvanceToggle.checked = !!settings.autoAdvance;
    autoAdvanceToggle.addEventListener('change', function () {
      settings.autoAdvance = autoAdvanceToggle.checked;
      saveSettings();
    });

    // show-hooks toggle (front/back hooks displayed inline wherever a word shows)
    const showHooksToggle = document.getElementById('showHooksToggle');
    showHooksToggle.checked = settings.showHooks !== false;
    showHooksToggle.addEventListener('change', function () {
      settings.showHooks = showHooksToggle.checked;
      saveSettings();
      // re-render whichever view is currently open so the change is visible
      // immediately without requiring navigation.
      if (document.getElementById('tab-dashboard').classList.contains('active')) renderDashboard();
      if (document.getElementById('tab-cardbox').classList.contains('active')) renderCardboxTab();
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

  // ---------- Hooks (front/back single-letter extensions) ----------
  // A "hook" is a single letter that, added to the front or back of a word,
  // forms another valid dictionary word of length+1. E.g. AA -> BAA (front
  // hook B) or AAL (back hook L). We cache a Set per word-length so repeated
  // hook lookups (26 letters x 2 sides, for every word shown) stay O(1) each
  // instead of re-scanning the whole length-pool per check.
  const _lengthSetCache = {};
  function lengthSet(L) {
    const cacheKey = L + (includeCustomEnabled() ? ':custom' : '');
    if (_lengthSetCache[cacheKey]) return _lengthSetCache[cacheKey];
    const pool = lengthPool(L);
    const set = new Set(pool);
    _lengthSetCache[cacheKey] = set;
    return set;
  }

  function getHooks(word) {
    const front = [];
    const back = [];
    const longerSet = lengthSet(word.length + 1);
    if (longerSet.size) {
      for (let c = 65; c <= 90; c++) {
        const letter = String.fromCharCode(c);
        if (longerSet.has(letter + word)) front.push(letter);
        if (longerSet.has(word + letter)) back.push(letter);
      }
    }
    return { front: front, back: back };
  }

  // ---------- word "Probability" and "Playability" ----------
  // Probability: chance of drawing exactly this word's letters (as a set,
  // any order) in a single random draw of word.length tiles from the full
  // 100-tile bag (2 blanks). This is the standard combinatorial word-study
  // stat used by tools like Zyzzyva: (ways to draw this letter multiset,
  // counting blanks-as-any-letter) / (total ways to draw N tiles from 100).
  // Playability: a 0-100 relative ease score, ranking each word against all
  // other words of the same length by that same probability (higher =
  // easier/more likely to be drawable).

  const _nCrCache = {};
  function nCr(n, r) {
    if (r < 0 || r > n) return 0;
    if (r === 0 || r === n) return 1;
    const key = n + '_' + r;
    if (_nCrCache[key] !== undefined) return _nCrCache[key];
    r = Math.min(r, n - r);
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = (result * (n - i)) / (i + 1);
    }
    _nCrCache[key] = result;
    return result;
  }

  // Computes: sum over ways to cover `blanksForWord` letter-instances (from
  // `counts`) with blanks, of [ product over letters of C(bagCount[ch], directCopiesNeeded) ]
  // times C(remaining blanks, 0..) handled by caller for extra/filler tiles.
  // For simplicity and correctness at rack sizes actually used (<=15, mostly <=7),
  // we do a direct recursive allocation over the (small) set of distinct letters.
  function distributeBlanksWays(counts, blanksForWord) {
    const letters = Object.keys(counts);
    let totalWays = 0;
    function recurse(i, blanksLeft, product) {
      if (i === letters.length) {
        if (blanksLeft === 0) totalWays += product;
        return;
      }
      const ch = letters[i];
      const need = counts[ch];
      const bagHas = TILE_BAG[ch] || 0;
      const maxBlankHere = Math.min(need, blanksLeft);
      for (let b = 0; b <= maxBlankHere; b++) {
        const directNeeded = need - b;
        const ways = nCr(bagHas, directNeeded);
        if (ways === 0 && directNeeded > 0) continue;
        recurse(i + 1, blanksLeft - b, product * ways);
      }
    }
    recurse(0, blanksForWord, 1);
    return totalWays;
  }

  const _wordProbCache = {};
  // Returns probability (0-1) of drawing this word's letters in a random
  // draw of word.length tiles from the 100-tile bag (fillers can be anything).
  function wordDrawProbability(word) {
    if (_wordProbCache[word] !== undefined) return _wordProbCache[word];
    const n = word.length;
    if (n < 1 || n > TILE_BAG_TOTAL) { _wordProbCache[word] = 0; return 0; }
    const counts = letterCounts(word);
    const need = n; // total letters needed = word length (no repeats beyond counts)
    const blanksAvail = TILE_BAG['?'];
    let favorable = 0;
    // For each number of blanks used to cover word letters (0..min(need,2)):
    for (let blanksForWord = 0; blanksForWord <= Math.min(need, blanksAvail); blanksForWord++) {
      const allocateWays = distributeBlanksWays(counts, blanksForWord);
      if (allocateWays === 0) continue;
      // Ways to choose *which* physical blank tile(s) out of the bag's 2
      // blanks are the ones drawn (blanks are separate tiles in the bag).
      const chooseBlankWays = nCr(blanksAvail, blanksForWord);
      // drawSize === word.length here, so no extra filler tiles are needed.
      favorable += allocateWays * chooseBlankWays;
    }
    const totalWays = nCr(TILE_BAG_TOTAL, n);
    const prob = totalWays > 0 ? favorable / totalWays : 0;
    _wordProbCache[word] = prob;
    return prob;
  }

  // Playability: percentile rank (0-100) of this word's draw probability
  // among all CSW24 words of the same length. Higher = relatively easier
  // to draw/play than other words of that length. Cached per length.
  const _playabilityRankCache = {};
  function _playabilityRankData(L) {
    if (!_playabilityRankCache[L]) {
      const pool = (typeof lengthPool === 'function' ? lengthPool(L) : (CSW24_BY_LENGTH[L] || []));
      const probs = pool.map(function (w) { return wordDrawProbability(w); });
      const sorted = probs.slice().sort(function (a, b) { return a - b; });
      const max = sorted.length ? sorted[sorted.length - 1] : 0;
      _playabilityRankCache[L] = { pool: pool, sorted: sorted, max: max };
    }
    return _playabilityRankCache[L];
  }

  function wordPlayability(word) {
    const data = _playabilityRankData(word.length);
    const sorted = data.sorted;
    if (!sorted.length) return 0;
    const p = wordDrawProbability(word);
    // Binary search for rank position (percentile of words at or below this probability)
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < p) lo = mid + 1; else hi = mid;
    }
    const percentile = sorted.length > 1 ? (lo / (sorted.length - 1)) * 100 : 100;
    return Math.round(percentile);
  }

  // Probability normalized against the easiest-to-draw word of the same
  // length (that word = 100%), so the displayed number is always a
  // readable 0-100% instead of a tiny fraction like 0.0035%.
  function wordProbabilityNormalizedPct(word) {
    const data = _playabilityRankData(word.length);
    if (!data.max) return 0;
    const p = wordDrawProbability(word);
    return Math.round((p / data.max) * 100);
  }

  // For "big" tiles, longer words need a smaller tile size or they can't
  // realistically fit/wrap on a phone screen (a 15-letter word at full size
  // is wider than most viewports). This only kicks in for the big size,
  // since small/rack tiles are already compact.
  function lengthTileSizeClass(sizeClass, length) {
    if (sizeClass !== 'big') return sizeClass;
    if (length >= 13) return 'big longer-word';
    if (length >= 10) return 'big long-word';
    return sizeClass;
  }

  function tileRowHTML(word, sizeClass) {
    sizeClass = lengthTileSizeClass(sizeClass || '', word.length);
    return '<span class="tile-word">' + word.split('').map(function (ch) {
      return '<span class="letter-tile ' + sizeClass + '">' + ch +
        '<span class="pv">' + (SCRABBLE_VALUES[ch] || '') + '</span></span>';
    }).join('') + '</span>';
  }

  function blankTileRowHTML(length, sizeClass) {
    sizeClass = lengthTileSizeClass(sizeClass || '', length);
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
    // custom words changed the length pools, so any cached hook/anagram
    // length-sets built from the old pools are now stale.
    for (const k in _lengthSetCache) delete _lengthSetCache[k];
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

  function hookSummaryHTML(word) {
    if (!settings.showHooks) return '';
    const hooks = getHooks(word);
    if (!hooks.front.length && !hooks.back.length) return '';
    let html = '<div class="word-hooks">';
    if (hooks.front.length) {
      html += '<span class="hook-group hook-front"><span class="hook-label">Front:</span>' +
        hooks.front.map(function (l) { return '<span class="hook-letter">' + l + '</span>'; }).join('') +
        '</span>';
    }
    if (hooks.back.length) {
      html += '<span class="hook-group hook-back"><span class="hook-label">Back:</span>' +
        hooks.back.map(function (l) { return '<span class="hook-letter">' + l + '</span>'; }).join('') +
        '</span>';
    }
    html += '</div>';
    return html;
  }

  function wordRowHTML(word) {
    uidCounter++;
    const uid = uidCounter;
    return (
      '<div class="word-row" data-word="' + word + '">' +
        '<div class="word-row-top">' +
          '<div>' + tileRowHTML(word) + '</div>' +
          '<div class="word-meta">' + word.length + ' ตัวอักษร · ' + wordScore(word) + ' คะแนน · ' +
            'Prob ' + wordProbabilityNormalizedPct(word) + '% · Play ' + wordPlayability(word) + '</div>' +
          hookSummaryHTML(word) +
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
        if (window.Achievements) window.Achievements.record('anagram_view');
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

  let _cardboxCache = null;
  function loadCardbox() {
    if (_cardboxCache) return _cardboxCache;
    try {
      const raw = localStorage.getItem(CARDBOX_KEY);
      _cardboxCache = raw ? JSON.parse(raw) : [];
    } catch (e) {
      _cardboxCache = [];
    }
    return _cardboxCache;
  }

  function saveCardbox(list) {
    _cardboxCache = list;
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
  function updateCardResult(word, isCorrect, hintUsed) {
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
      // A correct answer reached with a hint means the word wasn't fully
      // recalled unaided, so it gets a smaller ease boost (and slightly
      // shorter next interval) than a clean, unhinted recall.
      card.ease = Math.min(3.2, card.ease + (hintUsed ? 0.03 : 0.1));
      if (hintUsed) card.interval = Math.max(1, Math.round(card.interval * 0.6));
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
        if (btn.dataset.tab === 'achievements' && window.Achievements) window.Achievements.renderTab();
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
      if (window.Achievements) window.Achievements.record('cardbox_add');
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

    // Sort once, cache the sorted list + reset pagination to the top.
    cardboxRenderState.sorted = box.slice().sort(function (a, b) { return b.addedAt - a.addedAt; });
    cardboxRenderState.shown = 0;

    // Drop any selected words that no longer exist in the cardbox.
    const stillPresent = new Set(box.map(function (c) { return c.word; }));
    cardboxRenderState.selected.forEach(function (w) {
      if (!stillPresent.has(w)) cardboxRenderState.selected.delete(w);
    });

    const listEl = document.getElementById('cardboxList');
    if (!box.length) {
      listEl.innerHTML = '<div class="empty-state">ยังไม่มีคำศัพท์ใน Cardbox — ไปที่แท็บ "แบบทดสอบ" เพื่อเลือกคำที่อยากจำ</div>';
      document.getElementById('cardboxLoadMoreWrap').style.display = 'none';
    } else {
      listEl.innerHTML = '';
      renderCardboxPage(true);
    }

    const selectAllCb = document.getElementById('cardboxSelectAll');
    if (selectAllCb) selectAllCb.checked = box.length > 0 && cardboxRenderState.selected.size === box.length;
    updateCardboxSelectedCount();

    const studyCountInput = document.getElementById('studyCount');
    studyCountInput.max = Math.max(1, box.length);
    if (parseInt(studyCountInput.value, 10) > box.length) studyCountInput.value = Math.max(1, box.length);

    const minLenInput = document.getElementById('studyMinLen');
    const maxLenInput = document.getElementById('studyMaxLen');
    if (minLenInput && maxLenInput && box.length && !minLenInput.dataset.touched && !maxLenInput.dataset.touched) {
      const lens = box.map(function (c) { return c.word.length; });
      minLenInput.value = Math.min.apply(null, lens);
      maxLenInput.value = Math.max.apply(null, lens);
    }
  }

  // Cardbox list is paginated like the Word Browser (PAGE_SIZE per page) and
  // uses a single delegated click listener instead of one per row, so large
  // cardboxes (hundreds/thousands of cards) don't lag the UI.
  const cardboxRenderState = { sorted: [], shown: 0, selected: new Set() };

  function cardboxRowHTML(c, now) {
    const isDue = (c.due || 0) <= now;
    const checked = cardboxRenderState.selected.has(c.word) ? ' checked' : '';
    return (
      '<div class="card-row">' +
        '<label class="card-row-select"><input type="checkbox" class="cardbox-check" data-word="' + c.word + '"' + checked + '></label>' +
        '<div>' + tileRowHTML(c.word, 'small') + '</div>' +
        '<div class="card-row-meta">' +
          (isDue ? '<span class="status-pill status-learning">⏰ ถึงกำหนด</span>' : '') +
          '<span class="status-pill status-' + c.status + '">' + statusLabel(c.status) + '</span>' +
          '<span>✓' + c.correct + ' ✗' + c.incorrect + '</span>' +
          '<button class="remove-card-btn" data-word="' + c.word + '" title="ลบออกจาก Cardbox">✕</button>' +
        '</div>' +
      '</div>'
    );
  }

  function updateCardboxSelectedCount() {
    const el = document.getElementById('cardboxSelectedCount');
    if (!el) return;
    const n = cardboxRenderState.selected.size;
    el.textContent = (settings.lang === 'en' ? n + ' selected' : 'เลือกแล้ว ' + n + ' คำ');
  }

  function renderCardboxPage(reset) {
    const listEl = document.getElementById('cardboxList');
    if (reset) listEl.innerHTML = '';
    const now = Date.now();
    const slice = cardboxRenderState.sorted.slice(cardboxRenderState.shown, cardboxRenderState.shown + PAGE_SIZE);
    listEl.insertAdjacentHTML('beforeend', slice.map(function (c) { return cardboxRowHTML(c, now); }).join(''));
    cardboxRenderState.shown += slice.length;
    document.getElementById('cardboxLoadMoreWrap').style.display =
      cardboxRenderState.shown < cardboxRenderState.sorted.length ? '' : 'none';
  }

  function initCardboxList() {
    const listEl = document.getElementById('cardboxList');
    // Single delegated listener for remove buttons + select checkboxes, current and future.
    listEl.addEventListener('click', function (e) {
      const btn = e.target.closest('.remove-card-btn');
      if (!btn) return;
      const word = btn.dataset.word;
      removeFromCardbox(word);
      // Remove just this row + update in-memory sorted list, instead of a full re-render.
      const row = btn.closest('.card-row');
      if (row) row.remove();
      cardboxRenderState.sorted = cardboxRenderState.sorted.filter(function (c) { return c.word !== word; });
      cardboxRenderState.shown = Math.max(0, cardboxRenderState.shown - 1);
      cardboxRenderState.selected.delete(word);
      document.getElementById('cardboxCount').textContent = loadCardbox().length;
      updateCardboxSelectedCount();
      const selectAllCb = document.getElementById('cardboxSelectAll');
      if (selectAllCb) selectAllCb.checked = false;
      showToast('ลบคำออกจาก Cardbox แล้ว');
      if (!loadCardbox().length) {
        listEl.innerHTML = '<div class="empty-state">ยังไม่มีคำศัพท์ใน Cardbox — ไปที่แท็บ "แบบทดสอบ" เพื่อเลือกคำที่อยากจำ</div>';
        document.getElementById('cardboxLoadMoreWrap').style.display = 'none';
      }
    });

    listEl.addEventListener('change', function (e) {
      const cb = e.target.closest('.cardbox-check');
      if (!cb) return;
      const word = cb.dataset.word;
      if (cb.checked) cardboxRenderState.selected.add(word);
      else cardboxRenderState.selected.delete(word);
      updateCardboxSelectedCount();
      const selectAllCb = document.getElementById('cardboxSelectAll');
      if (selectAllCb) {
        selectAllCb.checked = cardboxRenderState.selected.size === loadCardbox().length && loadCardbox().length > 0;
      }
    });

    document.getElementById('cardboxLoadMoreBtn').addEventListener('click', function () {
      renderCardboxPage(false);
    });

    document.getElementById('cardboxSelectAll').addEventListener('change', function (e) {
      const checked = e.target.checked;
      const box = loadCardbox();
      if (checked) {
        box.forEach(function (c) { cardboxRenderState.selected.add(c.word); });
      } else {
        cardboxRenderState.selected.clear();
      }
      // Update checkboxes currently rendered on screen.
      listEl.querySelectorAll('.cardbox-check').forEach(function (cb) { cb.checked = checked; });
      updateCardboxSelectedCount();
    });

    document.getElementById('studySelectedBtn').addEventListener('click', function () {
      const selectedWords = cardboxRenderState.selected;
      if (!selectedWords.size) { showToast('กรุณาเลือกคำศัพท์อย่างน้อย 1 คำ'); return; }
      const box = loadCardbox();
      const queue = box.filter(function (c) { return selectedWords.has(c.word); });
      if (!queue.length) { showToast('กรุณาเลือกคำศัพท์อย่างน้อย 1 คำ'); return; }

      const mode = document.getElementById('studyMode').value;
      const anagramOrder = document.getElementById('anagramOrder').value;
      startStudySession(queue, mode, anagramOrder);
    });
  }

  function initCardboxTab() {
    document.getElementById('studyMode').addEventListener('change', function (e) {
      document.getElementById('anagramOrderField').style.display = e.target.value === 'anagram' ? '' : 'none';
    });
    document.getElementById('anagramOrderField').style.display = 'none';

    document.getElementById('studyMinLen').addEventListener('change', function (e) { e.target.dataset.touched = '1'; });
    document.getElementById('studyMaxLen').addEventListener('change', function (e) { e.target.dataset.touched = '1'; });

    document.getElementById('startStudyBtn').addEventListener('click', function () {
      const box = loadCardbox();
      if (!box.length) { showToast('Cardbox ว่างอยู่ — เลือกคำศัพท์จากแท็บแบบทดสอบก่อน'); return; }

      const mode = document.getElementById('studyMode').value;
      const anagramOrder = document.getElementById('anagramOrder').value;
      const dueOnly = document.getElementById('dueOnlyToggle').checked;
      const minLen = Math.max(1, parseInt(document.getElementById('studyMinLen').value, 10) || 1);
      const maxLen = Math.max(minLen, parseInt(document.getElementById('studyMaxLen').value, 10) || 99);
      const now = Date.now();

      let pool = dueOnly ? box.filter(function (c) { return (c.due || 0) <= now; }) : box.slice();
      pool = pool.filter(function (c) { return c.word.length >= minLen && c.word.length <= maxLen; });
      if (!pool.length) {
        showToast(dueOnly
          ? 'ไม่มีคำที่ถึงกำหนดทบทวนในช่วงความยาวนี้ — ลองปรับความยาวหรือปิด "เฉพาะคำที่ถึงกำหนด"'
          : 'ไม่มีคำใน Cardbox ที่อยู่ในช่วงความยาวนี้');
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

  const session = { queue: [], index: 0, mode: 'flashcard', anagramOrder: 'alpha', correct: 0, incorrect: 0, flipped: false, hintLevel: 0, hintUsed: false };

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
    session.hintLevel = 0;
    session.hintUsed = false;
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

  function recordAnswer(word, isCorrect, hintUsed) {
    updateCardResult(word, isCorrect, hintUsed);
    if (isCorrect) session.correct++; else session.incorrect++;
  }

  function nextCard() {
    session.index++;
    session.flipped = false;
    session.hintLevel = 0;
    session.hintUsed = false;
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
      if (window.Achievements) {
        window.Achievements.record('session_complete', {
          total: session.queue.length, correct: session.correct, incorrect: session.incorrect
        });
      }
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
          hookSummaryHTML(word) +
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
    session.hintLevel = 0;

    // A scrambled rack of letters can legitimately spell more than one
    // dictionary word (e.g. EGL -> LEG or GEL). When that happens, the
    // learner must find every one of them before moving on.
    const validGroup = [word].concat(getAnagrams(word));
    const found = new Set();
    let wrongStreak = false;

    area.innerHTML =
      '<div class="session-card">' +
        '<div class="session-prompt-label">Anagram · เรียงตัวอักษรให้เป็นคำศัพท์' +
          (validGroup.length > 1 ? ' (มี ' + validGroup.length + ' คำตอบ ต้องหาให้ครบ)' : '') +
        '</div>' +
        tileRowHTML(letters, 'big') +
        (validGroup.length > 1 ? '<div class="anagram-found-progress" id="anagramFoundProgress">พบแล้ว 0 / ' + validGroup.length + ' คำ</div>' : '') +
        '<form class="session-answer-form" id="anagramForm">' +
          '<input type="text" id="anagramInput" autocomplete="off" placeholder="พิมพ์คำตอบ — ตรวจให้อัตโนมัติ" autofocus>' +
        '</form>' +
        '<div class="session-controls">' +
          '<button type="button" class="btn btn-outline btn-sm" id="anagramHintBtn">💡 Hint</button>' +
        '</div>' +
        '<div class="field-hint" id="anagramHintText"></div>' +
        '<div class="session-feedback" id="anagramFeedback"></div>' +
        '<div class="session-controls" id="anagramNextWrap" style="display:none">' +
          '<button class="btn btn-teal" id="anagramNextBtn">ต่อไป (Enter) →</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('anagramForm');
    const input = document.getElementById('anagramInput');
    const feedback = document.getElementById('anagramFeedback');
    const hintBtn = document.getElementById('anagramHintBtn');
    const hintText = document.getElementById('anagramHintText');
    const progressEl = document.getElementById('anagramFoundProgress');

    hintBtn.addEventListener('click', function () {
      // Reveal one more letter each click, up to word.length - 1 so the
      // final letter is never handed over for free. Also nudge the ease
      // factor down slightly so hinted cards resurface a bit sooner —
      // using a hint means the word wasn't fully recalled unaided.
      const maxHint = Math.max(1, word.length - 1);
      if (session.hintLevel < maxHint) {
        session.hintLevel++;
        session.hintUsed = true;
      }
      const revealed = word.slice(0, session.hintLevel).split('').join(' ');
      const blanks = word.length - session.hintLevel;
      hintText.textContent = '💡 ' + revealed + (blanks > 0 ? '  ' + '_ '.repeat(blanks).trim() : '') +
        ' (' + session.hintLevel + '/' + word.length + ' ตัวอักษร)';
      if (session.hintLevel >= maxHint) {
        hintBtn.disabled = true;
        hintBtn.textContent = '💡 Hint (สูงสุดแล้ว)';
      }
    });

    function finishCard() {
      input.disabled = true;
      hintBtn.disabled = true;
      const allCorrect = found.size === validGroup.length;
      recordAnswer(word, allCorrect, session.hintUsed);

      if (settings.autoAdvance && allCorrect) {
        // Auto-advance: skip the manual "Next" button/Enter entirely and
        // move on after a short pause so the learner still sees the
        // "all correct" feedback before the card changes.
        feedback.textContent += '  ⏳';
        setTimeout(nextCard, settings.autoAdvanceDelay || 900);
        return;
      }

      document.getElementById('anagramNextWrap').style.display = '';
      document.getElementById('anagramNextBtn').addEventListener('click', nextCard);
    }

    // Live-checks whatever is currently typed, letter by letter — no Enter
    // or submit button needed. Fires on every keystroke; a guess is only
    // evaluated once its length matches a real candidate word, so partial
    // typing along the way doesn't flash a false "wrong".
    function checkTyped() {
      const guess = input.value.trim().toUpperCase();
      if (!guess) { feedback.textContent = ''; feedback.className = 'session-feedback'; return; }

      if (found.has(guess)) {
        feedback.textContent = 'พิมพ์คำนี้ไปแล้ว ลองคำอื่น (เหลืออีก ' + (validGroup.length - found.size) + ' คำ)';
        feedback.className = 'session-feedback wrong';
        return;
      }

      // Only judge once the guess is at least as long as the shortest
      // remaining valid word — otherwise every keystroke along the way to
      // a correct word would momentarily show as "wrong".
      const minRemainingLen = Math.min.apply(null, validGroup.filter(function (w) { return !found.has(w); }).map(function (w) { return w.length; }));
      if (guess.length < minRemainingLen) { feedback.textContent = ''; feedback.className = 'session-feedback'; return; }

      const isValid = validGroup.indexOf(guess) !== -1;

      if (isValid) {
        found.add(guess);
        wrongStreak = false;
        input.value = '';

        if (progressEl) progressEl.textContent = 'พบแล้ว ' + found.size + ' / ' + validGroup.length + ' คำ';

        if (found.size < validGroup.length) {
          // Still missing at least one valid word — keep the input open
          // and do not allow moving to the next card yet.
          feedback.textContent = '✓ ถูกต้อง! ' + guess + ' — หาคำที่เหลืออีก ' + (validGroup.length - found.size) + ' คำ';
          feedback.className = 'session-feedback correct';
          input.focus();
          return;
        }

        feedback.textContent = '✓ ถูกต้องครบทุกคำ! ' + Array.from(found).join(', ') +
          (session.hintUsed ? '  (ใช้ Hint ช่วย)' : '');
        feedback.className = 'session-feedback correct';
        finishCard();
      } else if (guess.length >= word.length) {
        // Typed at least as many letters as the target word but it's not
        // a valid answer — flag it as wrong right away.
        wrongStreak = true;
        feedback.textContent = '✗ ยังไม่ถูก ลองอีกครั้ง' +
          (found.size ? ' (พบแล้ว ' + found.size + ' / ' + validGroup.length + ' คำ)' : '');
        feedback.className = 'session-feedback wrong';
      } else {
        feedback.textContent = '';
        feedback.className = 'session-feedback';
      }
    }

    input.addEventListener('input', checkTyped);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
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

  const browseState = { activeLength: 'all', results: [], shown: 0, sort: 'alpha' };

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
    document.getElementById('browseSortSelect').addEventListener('change', function (e) {
      browseState.sort = e.target.value;
      applyBrowseSort();
      browseState.shown = 0;
      renderBrowseResults(true);
    });
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
    if (f.containsAll && !wordContainsLettersAnywhere(word, f.containsAll)) return false;
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
      containsAll: containsAllRaw ? containsAllRaw.replace(/[^A-Z?]/g, '') : null,
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
    applyBrowseSort();

    document.getElementById('browseResultCount').textContent = 'พบ ' + results.length.toLocaleString('en-US') + ' คำ';
    renderBrowseResults(true);
  }

  // Sorts browseState.results in place according to browseState.sort.
  // "alpha" keeps the natural dictionary order words were gathered in
  // (already alphabetical per length bucket). The Prob sorts use each
  // word's normalized draw-probability percentile (see wordPlayability /
  // wordProbabilityNormalizedPct above) so mixed-length result sets still
  // compare fairly across different word lengths.
  function applyBrowseSort() {
    const sort = browseState.sort;
    if (sort === 'prob-desc' || sort === 'prob-asc') {
      const dir = sort === 'prob-desc' ? -1 : 1;
      // Precompute each word's probability once (Schwartzian transform)
      // instead of recomputing it inside the comparator — on a large
      // result set the sort makes O(n log n) comparisons, so calling
      // wordProbabilityNormalizedPct() twice per comparison was doing
      // millions of redundant lookups on big lists.
      const withKey = browseState.results.map(function (w) {
        return { w: w, p: wordProbabilityNormalizedPct(w) };
      });
      withKey.sort(function (a, b) {
        if (a.p !== b.p) return (a.p - b.p) * dir;
        return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0);
      });
      browseState.results = withKey.map(function (x) { return x.w; });
    } else {
      browseState.results.sort(function (a, b) { return a < b ? -1 : (a > b ? 1 : 0); });
    }
  }

  function renderBrowseResults(reset) {
    const wrap = document.getElementById('browseResults');
    if (reset) wrap.innerHTML = '';
    const slice = browseState.results.slice(browseState.shown, browseState.shown + PAGE_SIZE);
    // Render only the new slice into a detached fragment and scan just that
    // fragment for anagram-toggle buttons to bind — scanning the whole
    // (potentially huge) container on every "Load More" click is what made
    // paging through large result sets increasingly slow.
    const temp = document.createElement('div');
    temp.innerHTML = slice.map(wordRowHTML).join('');
    bindAnagramToggles(temp);
    while (temp.firstChild) wrap.appendChild(temp.firstChild);
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

  // Letters (and optional '?' wildcards) must all be present in the word
  // somewhere, regardless of position/order. Repeated letters in the needle
  // require that many occurrences in the word (e.g. "NN" needs 2 N's).
  // Each '?' in the needle is a wildcard that can cover any one missing letter,
  // like a Scrabble blank tile.
  function wordContainsLettersAnywhere(word, needle) {
    const clean = (needle || '').toUpperCase().replace(/[^A-Z?]/g, '');
    if (!clean) return true;
    const blankCount = (clean.match(/\?/g) || []).length;
    const letters = clean.replace(/\?/g, '');
    const needCounts = letterCounts(letters);
    const wordCounts = letterCounts(word);
    let blanksUsed = 0;
    for (const ch in needCounts) {
      const have = wordCounts[ch] || 0;
      const short = needCounts[ch] - have;
      if (short > 0) blanksUsed += short;
    }
    return blanksUsed <= blankCount;
  }

  function tgApplyContainsAllFilter(words, needle) {
    if (!needle || !needle.trim()) return words;
    return words.filter(function (w) { return wordContainsLettersAnywhere(w, needle); });
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
          return '<span class="letter-tile ' + lengthTileSizeClass('big', word.length) + ' type-letter">' + ch + '</span>';
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
    if (window.Achievements) window.Achievements.record('typing_win');
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
          '<span class="word-meta">' + wordScore(word) + ' pts · Prob ' +
            wordProbabilityNormalizedPct(word) + '% · Play ' + wordPlayability(word) + '</span>' +
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
      if (window.Achievements) window.Achievements.record('cardbox_add');
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
          if (window.Achievements) window.Achievements.record('racks_correct');
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

  // ---------- Minigame: Alphagram Blitz ----------

  const alpha = {
    len: 7, items: [], index: 0, found: [], score: 0,
    timeAttack: false, minutes: 5, deadline: 0, timerHandle: null,
    showAnagram: false, finished: false, startTime: 0
  };

  // Groups every word of a given length by its sorted-letter alphagram key,
  // so each "clue" may have one or several valid solutions (like the reference screenshot).
  function alphaBuildGroups(L, count) {
    const pool = lengthPool(L);
    const byKey = {};
    for (let i = 0; i < pool.length; i++) {
      const w = pool[i];
      const key = sortLetters(w);
      (byKey[key] = byKey[key] || []).push(w);
    }
    const keys = shuffle(Object.keys(byKey));
    const chosen = keys.slice(0, Math.min(count, keys.length));
    return chosen.map(function (key) {
      return { key: key, solutions: byKey[key].slice().sort(), found: new Set() };
    });
  }

  function alphaStart() {
    const count = Math.max(5, Math.min(parseInt(document.getElementById('alphaCount').value, 10) || 20, 200));
    alpha.len = alpha.len || 7;
    alpha.items = alphaBuildGroups(alpha.len, count);
    if (!alpha.items.length) { showToast('ไม่พบคำศัพท์ความยาวนี้'); return; }
    alpha.index = 0;
    alpha.found = [];
    alpha.score = 0;
    alpha.finished = false;
    alpha.showAnagram = document.getElementById('alphaShowAnagramToggle').checked;
    alpha.startTime = Date.now();

    if (alpha.timeAttack) {
      alpha.minutes = Math.max(1, Math.min(parseInt(document.getElementById('alphaMinutes').value, 10) || 5, 60));
      alpha.deadline = Date.now() + alpha.minutes * 60000;
      if (alpha.timerHandle) clearInterval(alpha.timerHandle);
      alpha.timerHandle = setInterval(alphaTickTimer, 250);
    } else if (alpha.timerHandle) {
      clearInterval(alpha.timerHandle);
      alpha.timerHandle = null;
    }

    document.getElementById('alphaPlay').style.display = '';
    alphaRenderPlay();
  }

  function alphaFormatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function alphaTickTimer() {
    const remaining = alpha.deadline - Date.now();
    const label = document.getElementById('alphaTimeLeft');
    if (label) label.textContent = alphaFormatTime(remaining);
    if (remaining <= 0 && !alpha.finished) {
      alphaFinish();
    }
  }

  function alphaCurrentItem() {
    return alpha.items[alpha.index];
  }

  function alphaRenderPlay() {
    const area = document.getElementById('alphaPlay');
    if (alpha.finished) { alphaRenderSummary(area); return; }

    const item = alphaCurrentItem();
    if (!item) { alphaFinish(); return; }

    const totalDone = alpha.index;
    const progressLabel = 'ชุดที่ ' + (alpha.index + 1) + ' / ' + alpha.items.length +
      ' · เจอแล้ว ' + item.found.size + ' / ' + item.solutions.length + ' คำในชุดนี้' +
      ' · คะแนนรวม ' + alpha.score +
      (alpha.timeAttack ? ' · ⏱️ <span id="alphaTimeLeft">' + alphaFormatTime(alpha.deadline - Date.now()) + '</span>' : '');

    area.innerHTML =
      '<div class="session-progress">' + progressLabel + '</div>' +
      '<div class="session-bar"><div class="session-bar-fill" id="alphaBarFill" style="width:' +
        Math.round((totalDone / alpha.items.length) * 100) + '%"></div></div>' +
      '<div class="session-card">' +
        '<div class="session-prompt-label">เรียงตัวอักษรใหม่ให้เป็นคำศัพท์' +
          (item.solutions.length > 1 ? ' (มีคำตอบได้ ' + item.solutions.length + ' คำ — หาให้ครบ)' : '') + '</div>' +
        tileRowHTML(item.key, 'big') +
        '<form class="session-answer-form" id="alphaForm">' +
          '<input type="text" id="alphaInput" autocomplete="off" placeholder="พิมพ์คำแล้วกด Enter" autofocus>' +
          '<button class="btn btn-primary" type="submit">ส่งคำตอบ</button>' +
        '</form>' +
        (item.found.size ? '<div class="anagram-partners">' + Array.from(item.found).sort().map(function (w) {
          return '<span class="anagram-chip">' + w + '</span>';
        }).join('') + '</div>' : '') +
        '<div class="session-controls">' +
          (alpha.showAnagram ? '<button class="btn btn-outline" id="alphaHintBtn">🔤 ดูคำใบ้</button>' : '') +
          '<button class="btn btn-outline" id="alphaSkipBtn">⏭ ข้ามชุดนี้</button>' +
          '<button class="btn btn-danger btn-sm" id="alphaEndBtn">⏹ จบเกม</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('alphaForm');
    const input = document.getElementById('alphaInput');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const guess = input.value.trim().toUpperCase();
      input.value = '';
      input.focus();
      if (!guess) return;
      const cur = alphaCurrentItem();
      if (!cur) return;
      if (cur.found.has(guess)) { showToast('เจอคำนี้ไปแล้ว'); return; }
      if (cur.solutions.indexOf(guess) !== -1) {
        cur.found.add(guess);
        alpha.score += wordScore(guess);
        alpha.found.push(guess);
        if (cur.found.size >= cur.solutions.length) {
          showToast('✓ ครบทุกคำในชุดนี้! +' + wordScore(guess) + ' คะแนน');
          alpha.index++;
          if (window.Achievements) window.Achievements.record('alpha_cleared');
        } else {
          showToast('✓ ถูกต้อง! +' + wordScore(guess) + ' คะแนน (ยังเหลืออีก ' + (cur.solutions.length - cur.found.size) + ' คำ)');
        }
        alphaRenderPlay();
      } else {
        showToast('✗ ไม่ใช่คำตอบของชุดนี้');
      }
    });

    const hintBtn = document.getElementById('alphaHintBtn');
    if (hintBtn) {
      hintBtn.addEventListener('click', function () {
        const cur = alphaCurrentItem();
        const remaining = cur.solutions.filter(function (w) { return !cur.found.has(w); });
        showToast('เหลือ ' + remaining.length + ' คำ · ตัวแรก: ' + remaining.map(function (w) { return w[0]; }).join(', '));
      });
    }

    document.getElementById('alphaSkipBtn').addEventListener('click', function () {
      alpha.index++;
      alphaRenderPlay();
    });

    document.getElementById('alphaEndBtn').addEventListener('click', alphaFinish);
  }

  function alphaFinish() {
    alpha.finished = true;
    if (alpha.timerHandle) { clearInterval(alpha.timerHandle); alpha.timerHandle = null; }
    alphaRenderPlay();
  }

  function alphaRenderSummary(area) {
    const totalSolutions = alpha.items.reduce(function (sum, it) { return sum + it.solutions.length; }, 0);
    const totalItemsCleared = alpha.items.filter(function (it) { return it.found.size >= it.solutions.length; }).length;
    const elapsedMs = Date.now() - alpha.startTime;
    const missed = [];
    alpha.items.forEach(function (it) {
      it.solutions.forEach(function (w) {
        if (!it.found.has(w)) missed.push(w);
      });
    });

    area.innerHTML =
      '<div class="session-summary">' +
        '<div class="big-stat">' + alpha.score + '</div>' +
        '<div class="field-hint" style="margin-bottom:1rem">คะแนนรวม · เจอ ' + alpha.found.length + ' / ' + totalSolutions +
          ' คำ · ผ่านครบ ' + totalItemsCleared + ' / ' + alpha.items.length + ' ชุด · ใช้เวลา ' + alphaFormatTime(elapsedMs) + '</div>' +
        (missed.length ? '<p class="panel-sub" style="margin-bottom:0.5rem">คำที่พลาด:</p><div class="anagram-partners">' +
          missed.sort().map(function (w) { return '<span class="anagram-chip missed">' + w + '</span>'; }).join('') + '</div>' : '') +
        '<div class="session-controls" style="margin-top:1.2rem">' +
          '<button class="btn btn-primary" id="alphaPlayAgainBtn">🔁 เล่นอีกรอบ</button>' +
          (alpha.found.length ? '<button class="btn btn-teal" id="alphaSaveFoundBtn">💾 Save คำที่เจอลง Cardbox</button>' : '') +
        '</div>' +
      '</div>';

    document.getElementById('alphaPlayAgainBtn').addEventListener('click', function () {
      document.getElementById('alphaSetup').style.display = '';
      document.getElementById('alphaPlay').style.display = 'none';
    });
    const saveBtn = document.getElementById('alphaSaveFoundBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const uniqueWords = Array.from(new Set(alpha.found));
        const added = addWordsToCardbox(uniqueWords);
        showToast('เพิ่มลง Cardbox แล้ว ' + added + ' คำ');
        if (window.Achievements) window.Achievements.record('cardbox_add');
      });
    }
  }

  function initAlphaGame() {
    const lenWrap = document.getElementById('alphaLenChips');
    lenWrap.querySelectorAll('.mode-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        lenWrap.querySelectorAll('.mode-chip').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        alpha.len = parseInt(btn.dataset.len, 10);
      });
    });

    const untimedBtn = document.getElementById('alphaModeUntimedBtn');
    const timeAttackBtn = document.getElementById('alphaModeTimeAttackBtn');
    const timeAttackRow = document.getElementById('alphaTimeAttackRow');
    untimedBtn.addEventListener('click', function () {
      alpha.timeAttack = false;
      untimedBtn.classList.add('active'); timeAttackBtn.classList.remove('active');
      timeAttackRow.style.display = 'none';
    });
    timeAttackBtn.addEventListener('click', function () {
      alpha.timeAttack = true;
      timeAttackBtn.classList.add('active'); untimedBtn.classList.remove('active');
      timeAttackRow.style.display = '';
    });

    document.getElementById('alphaStartBtn').addEventListener('click', function () {
      document.getElementById('alphaSetup').style.display = 'none';
      alphaStart();
    });
  }

  // ---------- Minigame: Time Attack Marathon ----------
  // Continuous short rounds; each round randomly picks a puzzle type
  // (Anagram / Rack / Cardbox word) and gives a tight time budget to answer.

  const RACK_LETTER_BAG = 'AAAAAAAAABBCCDDDDEEEEEEEEEEEEFFGGGHHIIIIIIIIIJKLLLLMMNNNNNNOOOOOOOOPPQRRRRRRSSSSTTTTTTUUUUVVWWXYYZ';

  const mar = {
    rounds: 20, roundSeconds: 12, minLen: 4, maxLen: 7,
    types: [], round: 0, correct: 0, incorrect: 0, skipped: 0,
    score: 0, streak: 0, bestStreak: 0,
    current: null, deadline: 0, timerHandle: null, finished: false, startTime: 0
  };

  function marEnabledTypes() {
    const types = [];
    if (document.getElementById('marTypeAnagram').checked) types.push('anagram');
    if (document.getElementById('marTypeRack').checked) types.push('rack');
    if (document.getElementById('marTypeCardbox').checked && loadCardbox().length) types.push('cardbox');
    if (!types.length) return ['anagram', 'rack']; // fallback if nothing usable is selected
    return types;
  }

  function marRandomLen() {
    const min = mar.minLen, max = mar.maxLen;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function marBuildAnagramRound() {
    const len = marRandomLen();
    const pool = lengthPool(len);
    if (!pool.length) return null;
    const word = pool[Math.floor(Math.random() * pool.length)];
    const key = sortLetters(word);
    const accepted = new Set();
    for (let i = 0; i < pool.length; i++) {
      if (sortLetters(pool[i]) === key) accepted.add(pool[i]);
    }
    return { type: 'anagram', display: key, accepted: accepted, revealWord: word };
  }

  function marBuildRackRound() {
    const size = Math.max(4, Math.min(mar.maxLen, 7));
    const letters = [];
    for (let i = 0; i < size; i++) letters.push(RACK_LETTER_BAG[Math.floor(Math.random() * RACK_LETTER_BAG.length)]);
    const rackCounts = letterCounts(letters.join(''));
    const accepted = new Set();
    for (let L = 2; L <= size; L++) {
      const pool = lengthPool(L);
      for (let i = 0; i < pool.length; i++) {
        if (isSubsetOfCounts(pool[i], rackCounts)) accepted.add(pool[i]);
      }
    }
    if (!accepted.size) return null;
    return { type: 'rack', display: letters.join(''), accepted: accepted, revealWord: Array.from(accepted).sort()[0] };
  }

  function marBuildCardboxRound() {
    const box = loadCardbox();
    if (!box.length) return null;
    const card = box[Math.floor(Math.random() * box.length)];
    const word = card.word;
    return { type: 'cardbox', display: sortLetters(word), accepted: new Set([word]), revealWord: word };
  }

  function marBuildRound() {
    const available = mar.types.slice();
    let guard = 0;
    while (available.length && guard < 6) {
      guard++;
      const pick = available[Math.floor(Math.random() * available.length)];
      let round = null;
      if (pick === 'anagram') round = marBuildAnagramRound();
      else if (pick === 'rack') round = marBuildRackRound();
      else if (pick === 'cardbox') round = marBuildCardboxRound();
      if (round) return round;
      available.splice(available.indexOf(pick), 1);
    }
    return null;
  }

  function marStart() {
    mar.roundSeconds = Math.max(5, Math.min(parseInt(document.getElementById('marRoundSeconds').value, 10) || 12, 60));
    mar.rounds = Math.max(5, Math.min(parseInt(document.getElementById('marRounds').value, 10) || 20, 100));
    mar.minLen = Math.max(3, Math.min(parseInt(document.getElementById('marMinLen').value, 10) || 4, 10));
    mar.maxLen = Math.max(mar.minLen, Math.min(parseInt(document.getElementById('marMaxLen').value, 10) || 7, 10));
    mar.types = marEnabledTypes();
    mar.round = 0;
    mar.correct = 0;
    mar.incorrect = 0;
    mar.skipped = 0;
    mar.score = 0;
    mar.streak = 0;
    mar.bestStreak = 0;
    mar.finished = false;
    mar.startTime = Date.now();

    document.getElementById('marathonPlay').style.display = '';
    marNextRound();
  }

  function marFormatTime(ms) {
    if (ms < 0) ms = 0;
    return (ms / 1000).toFixed(1) + 's';
  }

  function marTickTimer() {
    const remaining = mar.deadline - Date.now();
    const label = document.getElementById('marTimeLeft');
    if (label) label.textContent = marFormatTime(remaining);
    const fill = document.getElementById('marRoundBarFill');
    if (fill) {
      const pct = Math.max(0, Math.min(100, (remaining / (mar.roundSeconds * 1000)) * 100));
      fill.style.width = pct + '%';
      fill.classList.toggle('marathon-bar-urgent', pct < 25);
    }
    if (remaining <= 0 && !mar.finished) {
      mar.skipped++;
      showToast('⏱ หมดเวลา! คำตอบ: ' + mar.current.revealWord);
      marNextRound();
    }
  }

  function marNextRound() {
    if (mar.timerHandle) { clearInterval(mar.timerHandle); mar.timerHandle = null; }
    if (mar.round >= mar.rounds) { marFinish(); return; }

    const round = marBuildRound();
    if (!round) {
      showToast('ไม่พบโจทย์ที่สร้างได้ — จบ Marathon ก่อนกำหนด');
      marFinish();
      return;
    }
    mar.round++;
    mar.current = round;
    mar.deadline = Date.now() + mar.roundSeconds * 1000;
    mar.timerHandle = setInterval(marTickTimer, 100);
    marRenderPlay();
  }

  function marTypeLabel(type) {
    if (type === 'anagram') return '🔀 Anagram';
    if (type === 'rack') return '🁢 Rack';
    return '🗂️ Cardbox';
  }

  function marRenderPlay() {
    const area = document.getElementById('marathonPlay');
    if (mar.finished) { marRenderSummary(area); return; }

    const item = mar.current;
    const progressLabel = 'รอบที่ ' + mar.round + ' / ' + mar.rounds +
      ' · คะแนนรวม ' + mar.score +
      ' · ถูกต่อเนื่อง ' + mar.streak +
      ' · ⏱️ <span id="marTimeLeft">' + marFormatTime(mar.deadline - Date.now()) + '</span>';

    area.innerHTML =
      '<div class="session-progress">' + progressLabel + '</div>' +
      '<div class="session-bar"><div class="session-bar-fill marathon-round-bar" id="marRoundBarFill" style="width:100%"></div></div>' +
      '<div class="session-card">' +
        '<div class="session-prompt-label">' + marTypeLabel(item.type) +
          (item.type === 'anagram' ? ' — เรียงตัวอักษรใหม่ให้เป็นคำศัพท์ใดก็ได้ที่ถูกต้อง' :
           item.type === 'rack' ? ' — หาคำศัพท์ใดก็ได้ที่ประกอบจากตัวอักษรใน Rack นี้' :
           ' — คำจาก Cardbox ของคุณ ลองพิมพ์ให้ถูกต้อง') +
        '</div>' +
        tileRowHTML(item.display, 'big') +
        '<form class="session-answer-form" id="marForm">' +
          '<input type="text" id="marInput" autocomplete="off" placeholder="พิมพ์คำแล้วกด Enter" autofocus>' +
          '<button class="btn btn-primary" type="submit">ส่งคำตอบ</button>' +
        '</form>' +
        '<div class="session-controls">' +
          '<button class="btn btn-outline" id="marSkipBtn">⏭ ข้ามรอบนี้</button>' +
          '<button class="btn btn-danger btn-sm" id="marEndBtn">⏹ จบ Marathon</button>' +
        '</div>' +
      '</div>';

    const form = document.getElementById('marForm');
    const input = document.getElementById('marInput');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const guess = input.value.trim().toUpperCase();
      if (!guess || !mar.current) return;
      if (mar.current.accepted.has(guess)) {
        const gained = wordScore(guess) + Math.floor(mar.streak / 3) * 2; // small streak bonus
        mar.score += gained;
        mar.correct++;
        mar.streak++;
        mar.bestStreak = Math.max(mar.bestStreak, mar.streak);
        showToast('✓ ถูกต้อง! +' + gained + ' คะแนน');
        if (window.Achievements) window.Achievements.record('marathon_correct', { count: 1, streak: mar.streak });
        marNextRound();
      } else {
        mar.incorrect++;
        mar.streak = 0;
        showToast('✗ ไม่ถูกต้อง ลองอีกครั้ง');
        input.value = '';
        input.focus();
      }
    });

    document.getElementById('marSkipBtn').addEventListener('click', function () {
      mar.skipped++;
      mar.streak = 0;
      marNextRound();
    });

    document.getElementById('marEndBtn').addEventListener('click', marFinish);
  }

  function marFinish() {
    mar.finished = true;
    if (mar.timerHandle) { clearInterval(mar.timerHandle); mar.timerHandle = null; }
    if (mar.round >= mar.rounds && mar.round > 0) {
      if (window.Achievements) window.Achievements.record('marathon_complete', { rounds: mar.round, bestStreak: mar.bestStreak });
    }
    marRenderPlay();
  }

  function marRenderSummary(area) {
    const elapsedMs = Date.now() - mar.startTime;
    area.innerHTML =
      '<div class="session-summary">' +
        '<div class="big-stat">' + mar.score + '</div>' +
        '<div class="field-hint" style="margin-bottom:1rem">คะแนนรวม · ตอบถูก ' + mar.correct + ' / ' + mar.round +
          ' รอบ · Streak สูงสุด ' + mar.bestStreak + ' · พลาด ' + mar.incorrect + ' · ข้าม/หมดเวลา ' + mar.skipped +
          ' · ใช้เวลา ' + Math.round(elapsedMs / 1000) + ' วินาที</div>' +
        '<div class="session-controls" style="margin-top:1.2rem">' +
          '<button class="btn btn-primary" id="marPlayAgainBtn">🔁 เล่นอีกรอบ</button>' +
        '</div>' +
      '</div>';

    document.getElementById('marPlayAgainBtn').addEventListener('click', function () {
      document.getElementById('marathonSetup').style.display = '';
      document.getElementById('marathonPlay').style.display = 'none';
    });
  }

  function initMarathonGame() {
    document.getElementById('marStartBtn').addEventListener('click', function () {
      document.getElementById('marathonSetup').style.display = 'none';
      marStart();
    });
  }

  // ---------- Minigame sub-tab toggle ----------

  function initMinigameTabs() {
    const typingBtn = document.getElementById('gameTabTyping');
    const racksBtn = document.getElementById('gameTabRacks');
    const alphaBtn = document.getElementById('gameTabAlpha');
    const marathonBtn = document.getElementById('gameTabMarathon');
    const typingPanel = document.getElementById('typingGamePanel');
    const racksPanel = document.getElementById('racksGamePanel');
    const alphaPanel = document.getElementById('alphaGamePanel');
    const marathonPanel = document.getElementById('marathonGamePanel');
    const allBtns = [typingBtn, racksBtn, alphaBtn, marathonBtn];
    const allPanels = [typingPanel, racksPanel, alphaPanel, marathonPanel];

    function activate(activeBtn, activePanel) {
      allBtns.forEach(function (b) {
        if (b === activeBtn) { b.classList.add('btn-primary'); b.classList.remove('btn-outline'); }
        else { b.classList.add('btn-outline'); b.classList.remove('btn-primary'); }
      });
      allPanels.forEach(function (p) { p.style.display = (p === activePanel) ? '' : 'none'; });
    }

    typingBtn.addEventListener('click', function () { activate(typingBtn, typingPanel); });
    racksBtn.addEventListener('click', function () { activate(racksBtn, racksPanel); });
    alphaBtn.addEventListener('click', function () { activate(alphaBtn, alphaPanel); });
    marathonBtn.addEventListener('click', function () { activate(marathonBtn, marathonPanel); });
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
    applyFontSettings();
    loadCustomWords();
    initTabs();
    applyI18n();
    initSettingsTab();
    initGenerator();
    initQuizTab();
    initCardboxTab();
    initCardboxList();
    initDueTimeControls();
    initImportExport();
    initCardboxImportExport();
    initTypingGame();
    initTgTypedPanel();
    initRacksGame();
    initAlphaGame();
    initMarathonGame();
    initMinigameTabs();
    initDashSuggested();
    initGlobalShortcuts();
    if (window.Achievements) {
      window.Achievements.init();
      window.Achievements.renderTab();
    }
    renderCardboxTab();
    renderDashboard();
  });
})();
