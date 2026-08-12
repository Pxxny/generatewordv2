/* =========================================================
   CSW24 Word Lab — achievement engine
   Depends on badges.js (CSW24_BADGES, CSW24_BADGES_BY_ID)
   being loaded first.

   Public API (window.Achievements):
     init()                      call once on DOMContentLoaded
     record(eventName, payload)  call from app.js at key actions
     renderTab()                 render the Achievements tab grid
   ========================================================= */

(function (global) {
  'use strict';

  const STATS_KEY = 'csw24_achievement_stats_v1';
  const UNLOCKED_KEY = 'csw24_achievement_unlocked_v1';
  const DAY_MS = 86400000;

  const DEFAULT_STATS = {
    cardboxTotal: 0,
    sessionsCompleted: 0,
    masteredCount: 0,
    hasPerfectSession: false,
    anagramViews: 0,
    typingWins: 0,
    racksCorrectTotal: 0,
    alphaCleared: 0,
    marathonCompleted: 0,
    marathonBestStreak: 0,
    lastActiveDay: null,   // 'YYYY-MM-DD'
    dayStreak: 0
  };

  let stats = null;
  let unlocked = null; // { [badgeId]: unlockedAtMs }

  // ---------- persistence ----------

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveStats() {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }

  function saveUnlocked() {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlocked));
  }

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ---------- lang helper (mirrors app.js settings, read-only) ----------

  function currentLang() {
    try {
      const raw = localStorage.getItem('csw24_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.lang === 'th' || parsed.lang === 'en')) return parsed.lang;
      }
    } catch (e) { /* ignore */ }
    return 'th';
  }

  // ---------- streak handling ----------

  function touchDayStreak() {
    const today = dayKey();
    if (stats.lastActiveDay === today) return;
    if (stats.lastActiveDay) {
      const prev = new Date(stats.lastActiveDay + 'T00:00:00');
      const diffDays = Math.round((new Date(today + 'T00:00:00') - prev) / DAY_MS);
      stats.dayStreak = diffDays === 1 ? stats.dayStreak + 1 : 1;
    } else {
      stats.dayStreak = 1;
    }
    stats.lastActiveDay = today;
  }

  // ---------- core: recompute cardbox-derived stats from source of truth ----------

  function refreshFromCardbox() {
    try {
      const raw = localStorage.getItem('csw24_cardbox_v1');
      const box = raw ? JSON.parse(raw) : [];
      stats.cardboxTotal = box.length;
      stats.masteredCount = box.filter(function (c) { return c.status === 'mastered'; }).length;
    } catch (e) { /* ignore, keep previous values */ }
  }

  // ---------- unlock evaluation ----------

  function evaluateAndUnlock() {
    const newlyUnlocked = [];
    (global.CSW24_BADGES || []).forEach(function (badge) {
      if (unlocked[badge.id]) return;
      let earned = false;
      try { earned = !!badge.check(stats); } catch (e) { earned = false; }
      if (earned) {
        unlocked[badge.id] = Date.now();
        newlyUnlocked.push(badge);
      }
    });
    if (newlyUnlocked.length) {
      saveUnlocked();
      newlyUnlocked.forEach(showBadgeToast);
      if (typeof global.onAchievementsChanged === 'function') {
        try { global.onAchievementsChanged(newlyUnlocked); } catch (e) { /* ignore */ }
      }
    }
    return newlyUnlocked;
  }

  // ---------- event recording (called from app.js) ----------

  function record(eventName, payload) {
    if (!stats) init();
    touchDayStreak();

    switch (eventName) {
      case 'cardbox_add':
        refreshFromCardbox();
        break;
      case 'session_complete':
        stats.sessionsCompleted++;
        refreshFromCardbox();
        if (payload && payload.total >= 5 && payload.incorrect === 0) {
          stats.hasPerfectSession = true;
        }
        break;
      case 'card_reviewed':
        refreshFromCardbox();
        break;
      case 'anagram_view':
        stats.anagramViews++;
        break;
      case 'typing_win':
        stats.typingWins++;
        break;
      case 'racks_correct':
        stats.racksCorrectTotal += (payload && payload.count) || 1;
        break;
      case 'alpha_cleared':
        stats.alphaCleared++;
        break;
      case 'marathon_correct':
        if (payload && typeof payload.streak === 'number') {
          stats.marathonBestStreak = Math.max(stats.marathonBestStreak, payload.streak);
        }
        break;
      case 'marathon_complete':
        stats.marathonCompleted++;
        if (payload && typeof payload.bestStreak === 'number') {
          stats.marathonBestStreak = Math.max(stats.marathonBestStreak, payload.bestStreak);
        }
        break;
      default:
        break;
    }

    saveStats();
    return evaluateAndUnlock();
  }

  // ---------- toast (animated) ----------

  let toastQueue = [];
  let toastShowing = false;

  function showBadgeToast(badge) {
    toastQueue.push(badge);
    if (!toastShowing) drainToastQueue();
  }

  function drainToastQueue() {
    const badge = toastQueue.shift();
    if (!badge) { toastShowing = false; return; }
    toastShowing = true;

    const lang = currentLang();
    let el = document.getElementById('achievementToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'achievementToast';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<div class="ach-toast-icon">' + badge.icon + '</div>' +
      '<div class="ach-toast-body">' +
        '<div class="ach-toast-kicker">' + (lang === 'th' ? 'ปลดล็อกความสำเร็จ!' : 'Achievement unlocked!') + '</div>' +
        '<div class="ach-toast-name">' + badge.name[lang] + '</div>' +
      '</div>';
    el.classList.remove('ach-toast-show');
    // force reflow so the animation restarts for consecutive toasts
    void el.offsetWidth;
    el.classList.add('ach-toast-show');

    setTimeout(function () {
      el.classList.remove('ach-toast-show');
      setTimeout(drainToastQueue, 320);
    }, 2800);
  }

  // ---------- Achievements tab rendering ----------

  function renderTab() {
    const grid = document.getElementById('achievementGrid');
    if (!grid) return;
    const lang = currentLang();
    const badges = global.CSW24_BADGES || [];
    const unlockedCount = badges.filter(function (b) { return !!unlocked[b.id]; }).length;

    const summaryEl = document.getElementById('achievementSummary');
    if (summaryEl) {
      summaryEl.textContent = lang === 'th'
        ? 'ปลดล็อกแล้ว ' + unlockedCount + ' / ' + badges.length + ' เหรียญ'
        : 'Unlocked ' + unlockedCount + ' / ' + badges.length + ' badges';
    }

    grid.innerHTML = badges.map(function (b) {
      const isUnlocked = !!unlocked[b.id];
      const cls = 'badge-card' + (isUnlocked ? ' badge-unlocked' : ' badge-locked');
      const dateStr = isUnlocked
        ? new Date(unlocked[b.id]).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US')
        : '';
      return (
        '<div class="' + cls + '">' +
          '<div class="badge-icon">' + (isUnlocked ? b.icon : '🔒') + '</div>' +
          '<div class="badge-name">' + b.name[lang] + '</div>' +
          '<div class="badge-desc">' + b.desc[lang] + '</div>' +
          (isUnlocked ? '<div class="badge-date">' + dateStr + '</div>' : '') +
        '</div>'
      );
    }).join('');
  }

  // ---------- init ----------

  function init() {
    stats = loadJSON(STATS_KEY, null) || Object.assign({}, DEFAULT_STATS);
    // patch any keys missing from an older save
    Object.keys(DEFAULT_STATS).forEach(function (k) {
      if (!(k in stats)) stats[k] = DEFAULT_STATS[k];
    });
    unlocked = loadJSON(UNLOCKED_KEY, {});
    refreshFromCardbox();
    saveStats();
  }

  global.Achievements = {
    init: init,
    record: record,
    renderTab: renderTab
  };
})(window);
