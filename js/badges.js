/* =========================================================
   CSW24 Word Lab — badge definitions
   Pure data + pure check functions. No DOM, no localStorage.
   Loaded before achievements.js.

   Each badge:
     id       unique string, used as storage key
     icon     emoji shown on the badge + toast
     name     {th, en}
     desc     {th, en} — how to unlock it
     check(stats) -> boolean   stats is the aggregate object
                                 built by achievements.js
   ========================================================= */

(function (global) {
  'use strict';

  const BADGES = [
    {
      id: 'first_word',
      icon: '🌱',
      name: { th: 'ก้าวแรก', en: 'First Step' },
      desc: { th: 'บันทึกคำศัพท์คำแรกลง Cardbox', en: 'Save your first word to Cardbox' },
      check: function (s) { return s.cardboxTotal >= 1; }
    },
    {
      id: 'words_10',
      icon: '📚',
      name: { th: 'นักสะสมคำ', en: 'Word Collector' },
      desc: { th: 'บันทึกคำศัพท์ครบ 10 คำใน Cardbox', en: 'Save 10 words to Cardbox' },
      check: function (s) { return s.cardboxTotal >= 10; }
    },
    {
      id: 'words_50',
      icon: '🗂️',
      name: { th: 'คลังคำใหญ่', en: 'Big Vocabulary' },
      desc: { th: 'บันทึกคำศัพท์ครบ 50 คำใน Cardbox', en: 'Save 50 words to Cardbox' },
      check: function (s) { return s.cardboxTotal >= 50; }
    },
    {
      id: 'words_200',
      icon: '🏛️',
      name: { th: 'ห้องสมุดส่วนตัว', en: 'Personal Library' },
      desc: { th: 'บันทึกคำศัพท์ครบ 200 คำใน Cardbox', en: 'Save 200 words to Cardbox' },
      check: function (s) { return s.cardboxTotal >= 200; }
    },
    {
      id: 'first_session',
      icon: '🎯',
      name: { th: 'เริ่มทบทวน', en: 'First Review' },
      desc: { th: 'ทำ session ทบทวนสำเร็จครั้งแรก', en: 'Complete your first study session' },
      check: function (s) { return s.sessionsCompleted >= 1; }
    },
    {
      id: 'sessions_10',
      icon: '🔁',
      name: { th: 'ขยันทบทวน', en: 'Dedicated Reviewer' },
      desc: { th: 'ทำ session ทบทวนสำเร็จครบ 10 ครั้ง', en: 'Complete 10 study sessions' },
      check: function (s) { return s.sessionsCompleted >= 10; }
    },
    {
      id: 'mastered_1',
      icon: '⭐',
      name: { th: 'เชี่ยวชาญคำแรก', en: 'First Mastery' },
      desc: { th: 'ทำคำศัพท์ให้ถึงสถานะ "เชี่ยวชาญ" คำแรก', en: 'Reach "Mastered" status on your first word' },
      check: function (s) { return s.masteredCount >= 1; }
    },
    {
      id: 'mastered_25',
      icon: '🌟',
      name: { th: 'ปรมาจารย์คำศัพท์', en: 'Word Master' },
      desc: { th: 'ทำคำศัพท์ให้ถึงสถานะ "เชี่ยวชาญ" ครบ 25 คำ', en: 'Reach "Mastered" status on 25 words' },
      check: function (s) { return s.masteredCount >= 25; }
    },
    {
      id: 'perfect_session',
      icon: '💯',
      name: { th: 'สมบูรณ์แบบ', en: 'Perfect Session' },
      desc: { th: 'ทบทวนถูกทั้งหมดในหนึ่ง session (อย่างน้อย 5 คำ)', en: 'Answer every card correctly in one session (5+ cards)' },
      check: function (s) { return s.hasPerfectSession; }
    },
    {
      id: 'anagram_10',
      icon: '🔤',
      name: { th: 'นักไข Anagram', en: 'Anagram Solver' },
      desc: { th: 'เปิดดู Anagram ครบ 10 ครั้ง', en: 'View Anagrams 10 times' },
      check: function (s) { return s.anagramViews >= 10; }
    },
    {
      id: 'typing_win',
      icon: '⌨️',
      name: { th: 'นิ้วไว', en: 'Fast Fingers' },
      desc: { th: 'พิมพ์คำศัพท์ถูกครบชุดในเกม Typing', en: 'Finish a round of the Typing minigame' },
      check: function (s) { return s.typingWins >= 1; }
    },
    {
      id: 'racks_10',
      icon: '🁢',
      name: { th: 'นักไข Rack', en: 'Rack Cracker' },
      desc: { th: 'หาคำถูกใน Random Racks ครบ 10 คำ', en: 'Find 10 correct words in Random Racks' },
      check: function (s) { return s.racksCorrectTotal >= 10; }
    },
    {
      id: 'alpha_clear',
      icon: '🔀',
      name: { th: 'เคลียร์ Alphagram', en: 'Alphagram Clear' },
      desc: { th: 'หาคำครบทุกคำในชุด Alphagram Blitz', en: 'Clear every solution in an Alphagram Blitz set' },
      check: function (s) { return s.alphaCleared >= 1; }
    },
    {
      id: 'marathon_finisher',
      icon: '⚡',
      name: { th: 'นักวิ่งมาราธอน', en: 'Marathon Finisher' },
      desc: { th: 'เล่น Time Attack Marathon จนจบครบทุกรอบเป็นครั้งแรก', en: 'Complete a full Time Attack Marathon session' },
      check: function (s) { return s.marathonCompleted >= 1; }
    },
    {
      id: 'marathon_streak_10',
      icon: '🔥⚡',
      name: { th: 'สายฟ้าต่อเนื่อง', en: 'Lightning Streak' },
      desc: { th: 'ตอบถูกต่อเนื่อง 10 รอบใน Time Attack Marathon', en: 'Reach a 10-answer streak in Time Attack Marathon' },
      check: function (s) { return s.marathonBestStreak >= 10; }
    },
    {
      id: 'streak_3',
      icon: '🔥',
      name: { th: 'ต่อเนื่อง 3 วัน', en: '3-Day Streak' },
      desc: { th: 'เข้ามาทบทวน/เล่นต่อเนื่อง 3 วัน', en: 'Use the app on 3 different days in a row' },
      check: function (s) { return s.dayStreak >= 3; }
    },
    {
      id: 'streak_7',
      icon: '🔥',
      name: { th: 'ต่อเนื่อง 7 วัน', en: '7-Day Streak' },
      desc: { th: 'เข้ามาทบทวน/เล่นต่อเนื่อง 7 วัน', en: 'Use the app on 7 different days in a row' },
      check: function (s) { return s.dayStreak >= 7; }
    }
  ];

  const BADGES_BY_ID = {};
  BADGES.forEach(function (b) { BADGES_BY_ID[b.id] = b; });

  global.CSW24_BADGES = BADGES;
  global.CSW24_BADGES_BY_ID = BADGES_BY_ID;
})(window);
