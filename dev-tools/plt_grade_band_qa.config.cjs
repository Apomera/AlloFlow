'use strict';

const grades59 = require('./plt_5_9_5623_learning_library.config.cjs');
const grades712 = require('./plt_7_12_5624_learning_library.config.cjs');
const earlyChildhood = require('./plt_early_childhood_5621_learning_library.config.cjs');

module.exports = {
  plt_5_9_5623: {
    ...grades59,
    stem: 'plt_5_9_5623',
    displayName: 'PLT Grades 5\u20139 5623',
    languagePattern: /\ba eighth|\ban middle-grades/i,
    foreignBandPatterns: [/Grades\s+7\s*[-\u2010-\u2015]\s*12\s*\(5624\)/i, /Early Childhood\s*\(5621\)/i],
    packForeignBandPatterns: [/\bgrades?\s+7\s*[-\u2010-\u2015]\s*12\b/i, /\b(?:early[- ]childhood|preschool|pre-k)\b/i],
    outOfBandPatterns: grades59.forbiddenPatterns,
    standard: {
      label: 'AlloFlow PLT Grades 5\u20139 5623 source, structure, feedback, case-practice, linkage, and grade-band QA v2',
      limitation: 'Not ETS or CCSSO approval; independent grades 5\u20139 educator, accessibility, legal, and psychometric validation remain pending.',
    },
  },
  plt_7_12_5624: {
    ...grades712,
    stem: 'plt_7_12_5624',
    displayName: 'PLT Grades 7\u201312 5624',
    languagePattern: /\ba eighth|\ba eleventh|\ban secondary/i,
    foreignBandPatterns: [/Grades\s+5\s*[-\u2010-\u2015]\s*9\s*\(5623\)/i, /Early Childhood\s*\(5621\)/i],
    packForeignBandPatterns: [/\bgrades?\s+5\s*[-\u2010-\u2015]\s*9\b/i, /\b(?:early[- ]childhood|preschool|pre-k|middle[- ]grades)\b/i],
    outOfBandPatterns: grades712.forbiddenPatterns,
    standard: {
      label: 'AlloFlow PLT Grades 7\u201312 5624 source, structure, feedback, case-practice, linkage, and grade-band QA v2',
      limitation: 'Not ETS or CCSSO approval; independent grades 7\u201312 educator, accessibility, legal, and psychometric validation remain pending.',
    },
  },
  plt_early_childhood_5621: {
    ...earlyChildhood,
    stem: 'plt_early_childhood_5621',
    displayName: 'PLT Early Childhood 5621',
    languagePattern: null,
    foreignBandPatterns: [/Grades\s+5\s*[-\u2010-\u2015]\s*9\s*\(5623\)/i, /Grades\s+7\s*[-\u2010-\u2015]\s*12\s*\(5624\)/i],
    packForeignBandPatterns: [/\bgrades?\s+5\s*[-\u2010-\u2015]\s*9\b/i, /\bgrades?\s+7\s*[-\u2010-\u2015]\s*12\b/i, /\b(?:middle[- ]grades|secondary (?:setting|teacher|educator|classroom)|adolescent learners?)\b/i],
    outOfBandPatterns: earlyChildhood.forbiddenPatterns,
    standard: {
      label: 'AlloFlow PLT Early Childhood 5621 source, structure, feedback, case-practice, linkage, and grade-band QA v2',
      limitation: 'Not ETS, CCSSO, or NAEYC approval; independent early-childhood educator, family, accessibility, legal, and psychometric validation remain pending.',
    },
  },
};
