// Star-Rail Symbol Runner Core: rapid letter, letter-sound, digit, subitizing, and alternating-stimulus
// fluency trainer with Incremental Rehearsal adaptive spacing, ASR homophone matching,
// 3D Star-Rail / 2D Flat-Lane canvas rendering, Direct & Hover/Keyboard Lock-On control modes,
// and PowerPoint picture-slide pack builder.
// Zero external dependencies. UMD: window.AlloSymbolRunnerCore and module.exports.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-symbol-runner/0.1.0';

  var MODES = [
    {
      id: 'confusable_letters',
      title: 'Confusable letters (b / d / p / q)',
      short: 'Confusable letters',
      description: 'Focus on mirror and form-confusable letters: b, d, p, q, m, n, u, i, j, l.',
      items: ['b', 'd', 'p', 'q', 'm', 'n', 'u', 'i', 'j', 'l'],
      category: 'letter',
      caseSensitive: false,
    },
    {
      id: 'letters_lower',
      title: 'Lowercase letters (a-z)',
      short: 'Lowercase letters',
      description: 'Rapid naming across all 26 lowercase letters.',
      items: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
      category: 'letter',
      caseSensitive: false,
    },
    {
      id: 'letters_upper',
      title: 'Uppercase letters (A-Z)',
      short: 'Uppercase letters',
      description: 'Rapid naming across all 26 uppercase letters.',
      items: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' '),
      category: 'letter',
      caseSensitive: false,
    },
    {
      id: 'letter_sounds',
      title: 'Letter and digraph sounds',
      short: 'Letter sounds',
      description: 'Name the sound spelled by each letter or digraph (a, b, sh, ch, th).',
      items: [
        { display: 'a', answer: 'a', speak: 'short a /a/' },
        { display: 'b', answer: 'b', speak: '/b/' },
        { display: 'c', answer: 'c', speak: '/k/' },
        { display: 'd', answer: 'd', speak: '/d/' },
        { display: 'e', answer: 'e', speak: 'short e /e/' },
        { display: 'f', answer: 'f', speak: '/f/' },
        { display: 'g', answer: 'g', speak: '/g/' },
        { display: 'h', answer: 'h', speak: '/h/' },
        { display: 'i', answer: 'i', speak: 'short i /i/' },
        { display: 'k', answer: 'k', speak: '/k/' },
        { display: 'l', answer: 'l', speak: '/l/' },
        { display: 'm', answer: 'm', speak: '/m/' },
        { display: 'n', answer: 'n', speak: '/n/' },
        { display: 'o', answer: 'o', speak: 'short o /o/' },
        { display: 'p', answer: 'p', speak: '/p/' },
        { display: 'r', answer: 'r', speak: '/r/' },
        { display: 's', answer: 's', speak: '/s/' },
        { display: 't', answer: 't', speak: '/t/' },
        { display: 'u', answer: 'u', speak: 'short u /u/' },
        { display: 'sh', answer: 'sh', speak: '/sh/' },
        { display: 'ch', answer: 'ch', speak: '/ch/' },
        { display: 'th', answer: 'th', speak: '/th/' },
      ],
      category: 'sound',
      caseSensitive: false,
    },
    {
      id: 'bigrams_rimes',
      title: 'Letter teams and rimes',
      short: 'Letter teams',
      description: 'Automatic recognition of digraphs, blends, and rimes: th, sh, ch, wh, ck, st, tr, at, an, ing.',
      items: ['th', 'sh', 'ch', 'wh', 'ck', 'st', 'tr', 'at', 'an', 'ing'],
      category: 'sound',
      caseSensitive: false,
    },
    {
      id: 'vowel_teams_r',
      title: 'Vowel teams and r-controlled vowels',
      short: 'Vowel teams & r-controlled',
      description: 'Practice common two- and three-letter vowel teams and r-controlled vowel spellings.',
      items: ['ar', 'or', 'er', 'ir', 'ur', 'ee', 'oa', 'ay', 'ow', 'oy', 'oo', 'aw', 'air', 'ear'],
      category: 'sound',
      caseSensitive: false,
    },
    {
      id: 'sight_words',
      title: 'High-frequency sight words',
      short: 'Sight words',
      description: 'Read high-frequency irregular and core sight words smoothly at a glance.',
      items: ['all', 'are', 'away', 'been', 'both', 'busy', 'buy', 'call', 'cold', 'come', 'does', 'done', 'down', 'also'],
      category: 'word',
      caseSensitive: false,
    },
    {
      id: 'sight_words_g1',
      title: 'Grade 1 sight words (after, again, every, from)',
      short: 'Grade 1 sight words',
      description: 'Read essential Grade 1 high-frequency words automatically without sounding out letter by letter.',
      items: ['after', 'again', 'ask', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his'],
      category: 'word',
      caseSensitive: false,
    },
    {
      id: 'sight_words_g2_3',
      title: 'Grades 2-3 sight words (always, because, together)',
      short: 'Grades 2-3 sight words',
      description: 'Build automatic word recognition across high-utility Grade 2 and Grade 3 Dolch words.',
      items: ['always', 'around', 'because', 'before', 'best', 'both', 'carry', 'clean', 'laugh', 'light', 'myself', 'never', 'only', 'together'],
      category: 'word',
      caseSensitive: false,
    },
    {
      id: 'multisyllable_words',
      title: 'Multisyllabic decoding words (planet, habitat, volcano)',
      short: 'Multisyllabic words',
      description: 'Decode two- and three-syllable science and reading words smoothly in a timed stream.',
      items: ['planet', 'magnet', 'rabbit', 'basket', 'sunset', 'picnic', 'napkin', 'velvet', 'habitat', 'volcano', 'continent', 'predator'],
      category: 'word',
      caseSensitive: false,
    },
    {
      id: 'morpheme_chunks',
      title: 'Prefixes and suffixes (un-, re-, -ing, -ment)',
      short: 'Prefixes & suffixes',
      description: 'Spot common prefixes and suffixes instantly to speed multisyllabic decoding.',
      items: ['un', 're', 'pre', 'dis', 'non', 'mis', 'ing', 'ed', 'er', 'est', 'ful', 'less', 'ness', 'ment'],
      category: 'chunk',
      caseSensitive: false,
    },
    {
      id: 'digits_single',
      title: 'Single digits (0-9)',
      short: 'Single digits',
      description: 'Rapid naming for digits 0 through 9.',
      items: '0 1 2 3 4 5 6 7 8 9'.split(' '),
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'digits_teen_decade',
      title: 'Teens and decades (12 / 21, 13 / 30)',
      short: 'Teens and decades',
      description: 'Tell apart place-value reversals and teens vs. decades.',
      items: ['12', '21', '13', '30', '14', '40', '15', '50', '16', '60', '17', '70', '18', '80', '19', '90'],
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'math_make_10',
      title: 'Make-10 partners (6 + ? = 10)',
      short: 'Make-10 partners',
      description: 'Name the missing partner that makes 10 right away without counting on fingers.',
      items: [
        { display: '9 + ? = 10', answer: '1', category: 'number' },
        { display: '1 + ? = 10', answer: '9', category: 'number' },
        { display: '8 + ? = 10', answer: '2', category: 'number' },
        { display: '2 + ? = 10', answer: '8', category: 'number' },
        { display: '7 + ? = 10', answer: '3', category: 'number' },
        { display: '3 + ? = 10', answer: '7', category: 'number' },
        { display: '6 + ? = 10', answer: '4', category: 'number' },
        { display: '4 + ? = 10', answer: '6', category: 'number' },
        { display: '5 + ? = 10', answer: '5', category: 'number' },
        { display: '10 + ? = 10', answer: '0', category: 'number' },
      ],
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'math_doubles',
      title: 'Doubles and near-doubles (6 + 6, 6 + 7)',
      short: 'Doubles & near-doubles',
      description: 'Answer addition doubles and near-doubles sums from memory.',
      items: [
        { display: '2 + 2', answer: '4', category: 'number' },
        { display: '3 + 3', answer: '6', category: 'number' },
        { display: '4 + 4', answer: '8', category: 'number' },
        { display: '5 + 5', answer: '10', category: 'number' },
        { display: '6 + 6', answer: '12', category: 'number' },
        { display: '7 + 7', answer: '14', category: 'number' },
        { display: '8 + 8', answer: '16', category: 'number' },
        { display: '9 + 9', answer: '18', category: 'number' },
        { display: '5 + 6', answer: '11', category: 'number' },
        { display: '6 + 7', answer: '13', category: 'number' },
        { display: '7 + 8', answer: '15', category: 'number' },
        { display: '8 + 9', answer: '17', category: 'number' },
      ],
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'math_mult_2_5_10',
      title: 'Foundational 2s, 5s, and 10s (5 x 4, 10 x 6)',
      short: 'Multiply 2s, 5s & 10s',
      description: 'Name foundational 2s, 5s, and 10s multiplication products right away.',
      items: [
        { display: '2 x 3', answer: '6', category: 'number' },
        { display: '2 x 4', answer: '8', category: 'number' },
        { display: '2 x 6', answer: '12', category: 'number' },
        { display: '2 x 7', answer: '14', category: 'number' },
        { display: '2 x 8', answer: '16', category: 'number' },
        { display: '2 x 9', answer: '18', category: 'number' },
        { display: '5 x 3', answer: '15', category: 'number' },
        { display: '5 x 4', answer: '20', category: 'number' },
        { display: '5 x 6', answer: '30', category: 'number' },
        { display: '5 x 7', answer: '35', category: 'number' },
        { display: '10 x 4', answer: '40', category: 'number' },
        { display: '10 x 8', answer: '80', category: 'number' },
      ],
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'math_squares',
      title: 'Multiplication squares (2 x 2 through 10 x 10)',
      short: 'Multiplication squares',
      description: 'Answer square multiplication facts from 2 x 2 through 10 x 10 from memory.',
      items: [
        { display: '2 x 2', answer: '4', category: 'number' },
        { display: '3 x 3', answer: '9', category: 'number' },
        { display: '4 x 4', answer: '16', category: 'number' },
        { display: '5 x 5', answer: '25', category: 'number' },
        { display: '6 x 6', answer: '36', category: 'number' },
        { display: '7 x 7', answer: '49', category: 'number' },
        { display: '8 x 8', answer: '64', category: 'number' },
        { display: '9 x 9', answer: '81', category: 'number' },
        { display: '10 x 10', answer: '100', category: 'number' },
      ],
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'subitize_dots',
      title: 'Subitizing dots (1-9)',
      short: 'Subitizing dots',
      description: 'Name the quantity of each dot pattern without counting one by one.',
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
        return { display: String(n) + ' dots', answer: String(n), dots: n, category: 'number' };
      }),
      category: 'number',
      caseSensitive: false,
    },
    {
      id: 'ras_switch',
      title: 'Alternating letters and numbers (RAS)',
      short: 'Alternating letters & numbers',
      description: 'Rapid Alternating Stimulus: switch smoothly between letter and number targets.',
      items: ['a', '3', 'b', '7', 'd', '4', 'p', '9', 'q', '2', 'm', '6', 'n', '8', 's', '5'],
      alternating: true,
      caseSensitive: false,
    },
    {
      id: 'ras_triple',
      title: '3-Way Alternating letters, numbers, and colors (RAS)',
      short: '3-Way RAS (letter, number, color)',
      description: 'Rapid Alternating Stimulus across three symbol categories: letters, digits, and color-shape badges.',
      items: [
        'b', '3', { display: 'RED', answer: 'red', category: 'color_stroop', congruent: true, stroopWord: 'RED', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        'd', '7', { display: 'BLUE', answer: 'blue', category: 'color_stroop', congruent: true, stroopWord: 'BLUE', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        'p', '4', { display: 'GREEN', answer: 'green', category: 'color_stroop', congruent: true, stroopWord: 'GREEN', stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        'q', '9', { display: 'GOLD', answer: 'gold', category: 'color_stroop', congruent: true, stroopWord: 'GOLD', stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        'm', '6', { display: 'BLUE', answer: 'red', category: 'color_stroop', congruent: false, stroopWord: 'BLUE', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        'n', '8', { display: 'RED', answer: 'blue', category: 'color_stroop', congruent: false, stroopWord: 'RED', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
      ],
      alternating: 'triple',
      category: 'mixed',
      caseSensitive: false,
    },
    {
      id: 'flanker_letters',
      title: 'Flanker crowd letters (focus middle in d b p q)',
      short: 'Flanker letters',
      description: 'Pick the middle letter while ignoring matching or opposite surrounding letters.',
      items: [
        { display: 'bbbbb', answer: 'b', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'ddbdd', answer: 'b', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'ddddd', answer: 'd', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'bbdbb', answer: 'd', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'ppppp', answer: 'p', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'qqpqq', answer: 'p', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'qqqqq', answer: 'q', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'ppqpp', answer: 'q', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'nnnnn', answer: 'n', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'uunuu', answer: 'n', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'uuuuu', answer: 'u', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'nnunn', answer: 'u', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'mmmmm', answer: 'm', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'wwmww', answer: 'm', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'wwwww', answer: 'w', category: 'flanker', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { display: 'mmwmm', answer: 'w', category: 'flanker', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
      ],
      category: 'flanker',
      caseSensitive: false,
    },
    {
      id: 'quantity_stroop',
      title: 'Quantity Stroop (count dots, ignore numeral)',
      short: 'Quantity Stroop',
      description: 'Name how many dots appear while ignoring a matching or conflicting numeral inside.',
      items: [
        { display: '2', answer: '2', dots: 2, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '5', answer: '2', dots: 2, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
        { display: '3', answer: '3', dots: 3, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '6', answer: '3', dots: 3, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
        { display: '4', answer: '4', dots: 4, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '2', answer: '4', dots: 4, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
        { display: '5', answer: '5', dots: 5, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '3', answer: '5', dots: 5, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
        { display: '6', answer: '6', dots: 6, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '4', answer: '6', dots: 6, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
        { display: '1', answer: '1', dots: 1, category: 'quantity_stroop', congruent: true, promptRule: 'Count dots, ignore digit' },
        { display: '4', answer: '1', dots: 1, category: 'quantity_stroop', congruent: false, promptRule: 'Count dots, ignore digit' },
      ],
      category: 'quantity_stroop',
      caseSensitive: false,
    },
    {
      id: 'number_size_stroop',
      title: 'Number-Size Stroop (greater value vs. size)',
      short: 'Number-size Stroop',
      description: 'Pick the numerically greater digit while ignoring which digit looks physically larger.',
      items: [
        { display: '2 | 8', answer: '8', category: 'size_stroop', congruent: true, sizePair: { left: '2', right: '8', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '2 | 8', answer: '8', category: 'size_stroop', congruent: false, sizePair: { left: '2', right: '8', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '9 | 3', answer: '9', category: 'size_stroop', congruent: true, sizePair: { left: '9', right: '3', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '9 | 3', answer: '9', category: 'size_stroop', congruent: false, sizePair: { left: '9', right: '3', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '4 | 7', answer: '7', category: 'size_stroop', congruent: true, sizePair: { left: '4', right: '7', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '4 | 7', answer: '7', category: 'size_stroop', congruent: false, sizePair: { left: '4', right: '7', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '6 | 1', answer: '6', category: 'size_stroop', congruent: true, sizePair: { left: '6', right: '1', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '6 | 1', answer: '6', category: 'size_stroop', congruent: false, sizePair: { left: '6', right: '1', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '3 | 5', answer: '5', category: 'size_stroop', congruent: true, sizePair: { left: '3', right: '5', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '3 | 5', answer: '5', category: 'size_stroop', congruent: false, sizePair: { left: '3', right: '5', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '7 | 2', answer: '7', category: 'size_stroop', congruent: true, sizePair: { left: '7', right: '2', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { display: '7 | 2', answer: '7', category: 'size_stroop', congruent: false, sizePair: { left: '7', right: '2', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
      ],
      category: 'size_stroop',
      caseSensitive: false,
    },
    {
      id: 'color_word_stroop',
      title: 'Color-Shape Stroop (name ink color & shape badge)',
      short: 'Color-Shape Stroop',
      description: 'Say or tap the ink color shown with its matching shape badge while ignoring the printed word.',
      items: [
        { display: 'RED', answer: 'red', category: 'color_stroop', congruent: true, stroopWord: 'RED', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { display: 'BLUE', answer: 'blue', category: 'color_stroop', congruent: true, stroopWord: 'BLUE', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { display: 'GREEN', answer: 'green', category: 'color_stroop', congruent: true, stroopWord: 'GREEN', stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { display: 'GOLD', answer: 'gold', category: 'color_stroop', congruent: true, stroopWord: 'GOLD', stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { display: 'BLUE', answer: 'red', category: 'color_stroop', congruent: false, stroopWord: 'BLUE', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { display: 'GREEN', answer: 'red', category: 'color_stroop', congruent: false, stroopWord: 'GREEN', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { display: 'GOLD', answer: 'red', category: 'color_stroop', congruent: false, stroopWord: 'GOLD', stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { display: 'RED', answer: 'blue', category: 'color_stroop', congruent: false, stroopWord: 'RED', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { display: 'GREEN', answer: 'blue', category: 'color_stroop', congruent: false, stroopWord: 'GREEN', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { display: 'GOLD', answer: 'blue', category: 'color_stroop', congruent: false, stroopWord: 'GOLD', stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { display: 'RED', answer: 'green', category: 'color_stroop', congruent: false, stroopWord: 'RED', stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { display: 'BLUE', answer: 'green', category: 'color_stroop', congruent: false, stroopWord: 'BLUE', stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { display: 'GOLD', answer: 'green', category: 'color_stroop', congruent: false, stroopWord: 'GOLD', stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { display: 'RED', answer: 'gold', category: 'color_stroop', congruent: false, stroopWord: 'RED', stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { display: 'BLUE', answer: 'gold', category: 'color_stroop', congruent: false, stroopWord: 'BLUE', stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { display: 'GREEN', answer: 'gold', category: 'color_stroop', congruent: false, stroopWord: 'GREEN', stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
      ],
      category: 'color_stroop',
      caseSensitive: false,
    },
    {
      id: 'custom',
      title: 'Own symbol list',
      short: 'Own symbols',
      description: 'Use your own letters, digraphs, or numbers.',
      items: ['b', 'd', 'p', 'q', '12', '21'],
      category: 'letter',
      caseSensitive: false,
    },
  ];

  // Canonical dot layouts in a normalized [-1, 1] x [-1, 1] box (dice + ten-frame patterns for 7-9).
  var DOT_LAYOUTS = {
    1: [[0, 0]],
    2: [[-0.5, -0.5], [0.5, 0.5]],
    3: [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
    4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    5: [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]],
    6: [[-0.5, -0.58], [0.5, -0.58], [-0.5, 0], [0.5, 0], [-0.5, 0.58], [0.5, 0.58]],
    7: [[-0.58, -0.58], [0, -0.58], [0.58, -0.58], [-0.58, 0], [0, 0], [0.58, 0], [0, 0.58]],
    8: [[-0.58, -0.58], [0, -0.58], [0.58, -0.58], [-0.58, 0], [0.58, 0], [-0.58, 0.58], [0, 0.58], [0.58, 0.58]],
    9: [[-0.58, -0.58], [0, -0.58], [0.58, -0.58], [-0.58, 0], [0, 0], [0.58, 0], [-0.58, 0.58], [0, 0.58], [0.58, 0.58]],
  };

  // Speech recognition homophone & spoken-form map for Web Speech API transcripts.
  var SPOKEN_MAP = {
    a: ['a', 'ay', 'eh', 'hey', 'uh', 'ah'],
    b: ['b', 'be', 'bee', 'buh'],
    c: ['c', 'see', 'sea', 'si', 'kuh', 'sss'],
    d: ['d', 'de', 'dee', 'duh'],
    e: ['e', 'ee', 'eh', 'he'],
    f: ['f', 'ef', 'eff', 'fuh'],
    g: ['g', 'gee', 'ji', 'guh', 'juh'],
    h: ['h', 'aitch', 'ache', 'age', 'huh'],
    i: ['i', 'eye', 'aye', 'ih'],
    j: ['j', 'jay', 'juh'],
    k: ['k', 'kay', 'okay', 'kuh'],
    l: ['l', 'el', 'ell', 'al', 'luh'],
    m: ['m', 'em', 'am', 'muh'],
    n: ['n', 'en', 'in', 'an', 'nuh'],
    o: ['o', 'oh', 'owe', 'ah'],
    p: ['p', 'pe', 'pea', 'pee', 'puh'],
    q: ['q', 'cue', 'queue', 'kew', 'quh'],
    r: ['r', 'are', 'our', 'er', 'ruh'],
    s: ['s', 'es', 'ess', 'suh'],
    t: ['t', 'te', 'tea', 'tee', 'tuh'],
    u: ['u', 'you', 'ewe', 'uh'],
    v: ['v', 've', 'vee', 'we', 'vuh'],
    w: ['w', 'double u', 'double you', 'wuh'],
    x: ['x', 'ex', 'eggs', 'ks'],
    y: ['y', 'why', 'wye', 'yuh'],
    z: ['z', 'ze', 'zee', 'zed', 'the', 'zuh'],
    sh: ['sh', 'shh', 'shuh', 's h'],
    ch: ['ch', 'chuh', 'c h', 'che'],
    th: ['th', 'thuh', 'the', 't h'],
    wh: ['wh', 'w h', 'wuh', 'whoa'],
    ck: ['ck', 'c k', 'kuh'],
    st: ['st', 's t', 'stuh'],
    tr: ['tr', 't r', 'truh'],
    at: ['at', 'a t'],
    an: ['an', 'a n', 'ann'],
    ing: ['ing', 'i n g', 'eeng'],
    ar: ['ar', 'are', 'r', 'a r', 'car'],
    or: ['or', 'oar', 'ore', 'o r'],
    er: ['er', 'her', 'err', 'ur', 'e r'],
    ir: ['ir', 'er', 'ur', 'i r'],
    ur: ['ur', 'er', 'u r'],
    ee: ['ee', 'e', 'ea', 'e e'],
    oa: ['oa', 'oh', 'o', 'o a', 'oak'],
    ay: ['ay', 'a', 'hey', 'a y'],
    ow: ['ow', 'ouch', 'oh', 'o w', 'how'],
    oy: ['oy', 'oi', 'boy', 'o y'],
    oo: ['oo', 'ooh', 'u', 'o o', 'boo'],
    aw: ['aw', 'aww', 'ah', 'a w', 'saw'],
    air: ['air', 'are', 'heir', 'a i r'],
    ear: ['ear', 'eer', 'here', 'e a r'],
    0: ['0', 'zero', 'oh', 'naught'],
    1: ['1', 'one', 'won'],
    2: ['2', 'two', 'to', 'too'],
    3: ['3', 'three', 'tree', 'free'],
    4: ['4', 'four', 'for', 'fore'],
    5: ['5', 'five', 'hive'],
    6: ['6', 'six', 'sicks', 'sex'],
    7: ['7', 'seven'],
    8: ['8', 'eight', 'ate'],
    9: ['9', 'nine', 'nein'],
    10: ['10', 'ten'],
    11: ['11', 'eleven'],
    12: ['12', 'twelve'],
    13: ['13', 'thirteen'],
    14: ['14', 'fourteen'],
    15: ['15', 'fifteen'],
    16: ['16', 'sixteen'],
    17: ['17', 'seventeen'],
    18: ['18', 'eighteen'],
    19: ['19', 'nineteen'],
    20: ['20', 'twenty'],
    21: ['21', 'twenty one', 'twenty-one', 'two one'],
    25: ['25', 'twenty five', 'twenty-five'],
    30: ['30', 'thirty'],
    35: ['35', 'thirty five', 'thirty-five'],
    36: ['36', 'thirty six', 'thirty-six'],
    40: ['40', 'forty', 'fourty'],
    49: ['49', 'forty nine', 'forty-nine'],
    50: ['50', 'fifty'],
    60: ['60', 'sixty'],
    64: ['64', 'sixty four', 'sixty-four'],
    70: ['70', 'seventy'],
    80: ['80', 'eighty'],
    81: ['81', 'eighty one', 'eighty-one'],
    90: ['90', 'ninety'],
    100: ['100', 'one hundred', 'a hundred', 'hundred'],
    red: ['red', 'read'],
    blue: ['blue', 'blew'],
    green: ['green'],
    gold: ['gold', 'yellow'],
    are: ['are', 'our', 'r'],
    been: ['been', 'bin', 'bean'],
    buy: ['buy', 'by', 'bye'],
    does: ['does', 'duz'],
    done: ['done', 'dun'],
    un: ['un'],
    re: ['re', 'ree'],
    pre: ['pre', 'pree'],
  };

  var COLOR_SHAPES = {
    red: { shape: '●', hex: '#ef4444' },
    blue: { shape: '▲', hex: '#3b82f6' },
    green: { shape: '■', hex: '#22c55e' },
    gold: { shape: '★', hex: '#facc15' },
  };

  var PHONEME_AUDIO_MAP = {
    a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h',
    i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p',
    q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: '',
    y: 'y', z: 'z',
    sh: 'sh', ch: 'ch', th: 'th', wh: 'wh', ck: 'ck', ng: 'ng', ph: 'ph',
    ee: 'ee', oo: 'oo', oo_short: 'oo_short', ar: 'ar', or: 'or', er: 'er',
    ir: 'ir', ur: 'ur', ay: 'ay', ow: 'ow', oy: 'oy', oa: 'oa', ie: 'ie',
    ue: 'ue', aw: 'aw', air: 'air', ear: 'ear', dh: 'dh', zh: 'zh',
  };

  var AUDIO_MODES = ['auto', 'name', 'sound'];
  var LETTER_NAME_MODES = {
    confusable_letters: true,
    letters_lower: true,
    letters_upper: true,
    flanker_letters: true,
    ras_switch: true,
    ras_triple: true,
  };

  var DIGIT_WORDS = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
    '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
    '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
    '25': 'twenty-five', '30': 'thirty', '35': 'thirty-five', '36': 'thirty-six',
    '40': 'forty', '49': 'forty-nine', '50': 'fifty', '60': 'sixty',
    '64': 'sixty-four', '70': 'seventy', '80': 'eighty', '81': 'eighty-one',
    '90': 'ninety', '100': 'one hundred',
  };

  function resolveSpokenCueText(item, options) {
    if (!item) return '';
    var opts = options && typeof options === 'object' ? options : {};
    var cat = String(item.category || '').toLowerCase();
    var raw = String(item.answer || item.display || '').trim();
    var low = raw.toLowerCase();
    if (!low) return '';
    if (cat === 'color_stroop') return opts.allowStroop === true ? low : '';
    if (cat === 'number' || item.dots > 0 || /^\d{1,2}$/.test(low)) return DIGIT_WORDS[low] || low;
    if (cat === 'word' || cat === 'chunk') return low;
    if (/^(red|blue|green|yellow|purple|orange)$/.test(low)) return low;
    return '';
  }

  function resolvePhonemeAudioUri(item, phonemeAudio, options) {
    if (!item) return '';
    if (typeof item.audioUri === 'string' && /^data:audio\//i.test(item.audioUri)) return item.audioUri;
    var opts = options && typeof options === 'object' ? options : {};
    var letterAudio = opts.letterAudio && typeof opts.letterAudio === 'object' ? opts.letterAudio : null;
    var wordAudio = opts.wordAudio && typeof opts.wordAudio === 'object' ? opts.wordAudio : null;
    var pAudio = phonemeAudio && typeof phonemeAudio === 'object' ? phonemeAudio : null;
    if (!pAudio && !letterAudio && !wordAudio) return '';
    var cat = String(item.category || '').toLowerCase();
    var key = String(item.phonemeKey || item.answer || '').trim().toLowerCase();
    if (!key) return '';
    if (item.dots > 0) return '';
    if (cat === 'word') {
      var wUri = wordAudio && typeof wordAudio[key] === 'string' && /^data:audio\//i.test(wordAudio[key]) ? wordAudio[key] : '';
      return wUri;
    }
    if (cat === 'chunk') {
      var cMapped = Object.prototype.hasOwnProperty.call(PHONEME_AUDIO_MAP, key) ? PHONEME_AUDIO_MAP[key] : key;
      var cUri = pAudio && cMapped ? (pAudio[cMapped] || pAudio[key] || '') : '';
      return typeof cUri === 'string' && /^data:audio\//i.test(cUri) ? cUri : '';
    }
    if (cat && cat !== 'letter' && cat !== 'sound' && !(cat === 'mixed' && /^[a-z]$/.test(key))) return '';
    var audioMode = opts.audioMode === 'name' || opts.audioMode === 'sound' ? opts.audioMode : 'auto';
    var modeId = String(opts.modeId || '').toLowerCase();
    var isSingleLetter = /^[a-z]$/.test(key);
    var letterUri = isSingleLetter && letterAudio && typeof letterAudio[key] === 'string' && /^data:audio\//i.test(letterAudio[key])
      ? letterAudio[key]
      : '';
    if (letterUri && (audioMode === 'name' || (audioMode === 'auto' && LETTER_NAME_MODES[modeId]))) {
      return letterUri;
    }
    var mapped = Object.prototype.hasOwnProperty.call(PHONEME_AUDIO_MAP, key) ? PHONEME_AUDIO_MAP[key] : key;
    var pUri = pAudio && mapped ? (pAudio[mapped] || pAudio[key] || '') : '';
    if (typeof pUri === 'string' && /^data:audio\//i.test(pUri)) return pUri;
    if (!isSingleLetter && /^[a-z]{2,24}$/.test(key) && wordAudio && typeof wordAudio[key] === 'string' && /^data:audio\//i.test(wordAudio[key])) {
      return wordAudio[key];
    }
    if (letterUri && audioMode !== 'sound') return letterUri;
    return '';
  }

  function getDotsForNumber(n) {
    var k = Math.max(1, Math.min(9, Math.round(Number(n) || 1)));
    return (DOT_LAYOUTS[k] || DOT_LAYOUTS[1]).map(function (pt) { return [pt[0], pt[1]]; });
  }

  function fnv1a(value) {
    var h = 2166136261 >>> 0;
    var s = String(value == null ? '' : value);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }

  function makeRng(seed) {
    var s = typeof seed === 'number' && isFinite(seed) && seed !== 0 ? (seed >>> 0) : fnv1a(seed || 'star-rail');
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17; s >>>= 0;
      s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  }

  function getMode(id) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i];
    }
    return MODES[0];
  }

  function normalizeSymbolItem(raw, fallbackCategory, pictureMap) {
    var obj = typeof raw === 'object' && raw !== null ? Object.assign({}, raw) : { display: String(raw == null ? '' : raw), answer: String(raw == null ? '' : raw) };
    var answer = String(obj.answer != null ? obj.answer : obj.display != null ? obj.display : '').trim();
    var display = String(obj.display != null ? obj.display : answer).trim();
    if (!answer) return null;
    var cat = obj.category || (/^[0-9]+$/.test(answer) ? 'number' : (fallbackCategory && fallbackCategory !== 'mixed' ? fallbackCategory : 'letter'));
    var pic = pictureMap && (pictureMap[answer] || pictureMap[answer.toLowerCase()]);
    return {
      display: display,
      answer: answer,
      speak: obj.speak || answer,
      dots: obj.dots > 0 ? Math.min(9, Math.round(Number(obj.dots))) : 0,
      category: cat,
      caseSensitive: obj.caseSensitive === true,
      congruent: typeof obj.congruent === 'boolean' ? obj.congruent : undefined,
      promptRule: obj.promptRule || '',
      prompt: obj.prompt || '',
      flankerCenter: typeof obj.flankerCenter === 'number' ? obj.flankerCenter : undefined,
      sizePair: obj.sizePair ? Object.assign({}, obj.sizePair) : undefined,
      stroopWord: obj.stroopWord || undefined,
      stroopInk: obj.stroopInk || undefined,
      stroopShape: obj.stroopShape || undefined,
      picture: obj.picture || (pic && pic.src) || '',
      pictureAlt: obj.pictureAlt || (pic && pic.alt) || answer,
      pictureCredit: obj.pictureCredit || (pic && pic.credit) || '',
    };
  }

  function parseCustomSymbols(input, pictureMap) {
    var parts = Array.isArray(input)
      ? input
      : String(input == null ? '' : input).split(/[\s,;|\r\n]+/);
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < parts.length; i++) {
      var raw = parts[i];
      var s = typeof raw === 'object' && raw !== null ? String(raw.answer || raw.display || '').trim() : String(raw == null ? '' : raw).trim();
      if (!s || s.length > 8) continue;
      if (!/^[A-Za-z0-9]+$/.test(s)) continue;
      if (seen[s]) continue;
      seen[s] = true;
      var item = normalizeSymbolItem(raw, null, pictureMap);
      if (item) out.push(item);
      if (out.length >= 60) break;
    }
    return out;
  }

  function buildModePool(modeId, customInput, pictureMap) {
    var mode = getMode(modeId);
    if (mode.id === 'custom') {
      var parsed = parseCustomSymbols(customInput, pictureMap);
      if (parsed.length) return parsed;
    }
    return mode.items.map(function (it) {
      return normalizeSymbolItem(it, mode.category, pictureMap);
    }).filter(Boolean);
  }

  function buildChoicesFor(item, pool, rng, maxChoices) {
    var limit = Math.max(4, Math.min(10, maxChoices || 6));
    var chosen = [item.answer];
    var seen = Object.create(null);
    seen[item.answer.toLowerCase()] = true;
    if (item.sizePair) {
      [item.sizePair.left, item.sizePair.right].forEach(function (edge) {
        var ek = String(edge || '').toLowerCase();
        if (ek && !seen[ek] && chosen.length < limit) {
          seen[ek] = true;
          chosen.push(String(edge));
        }
      });
    }
    var sameCat = pool.filter(function (p) { return p.category === item.category; }).map(function (p) { return p.answer; });
    for (var si = sameCat.length - 1; si > 0; si--) {
      var sj = Math.floor(rng() * (si + 1));
      var stmp = sameCat[si]; sameCat[si] = sameCat[sj]; sameCat[sj] = stmp;
    }
    for (var sc = 0; sc < sameCat.length && chosen.length < limit; sc++) {
      var sk = sameCat[sc].toLowerCase();
      if (!seen[sk]) { seen[sk] = true; chosen.push(sameCat[sc]); }
    }
    var stopAfterSame = item.category === 'color_stroop' && chosen.length >= 4;
    var candidates = stopAfterSame ? [] : pool.map(function (p) { return p.answer; });
    for (var i = candidates.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = candidates[i]; candidates[i] = candidates[j]; candidates[j] = tmp;
    }
    for (var k = 0; k < candidates.length && chosen.length < limit; k++) {
      var key = candidates[k].toLowerCase();
      if (!seen[key]) { seen[key] = true; chosen.push(candidates[k]); }
    }
    for (var m = chosen.length - 1; m > 0; m--) {
      var n = Math.floor(rng() * (m + 1));
      var t = chosen[m]; chosen[m] = chosen[n]; chosen[n] = t;
    }
    return chosen;
  }

  // Builds a deterministic or adaptive sequence of symbol cards, with Incremental Rehearsal weaving
  // when focusAnswers (missed or hesitant symbols) and known symbols are both present.
  function createScheduler(options) {
    var opts = options || {};
    var modeId = opts.modeId || 'confusable_letters';
    var mode = getMode(modeId);
    var pool = opts.pool && opts.pool.length ? opts.pool : buildModePool(modeId, opts.customSymbols, opts.pictures);
    if (!pool.length) pool = buildModePool('confusable_letters', null, opts.pictures);
    var rng = opts.seed != null ? makeRng(opts.seed) : (typeof opts.rng === 'function' ? opts.rng : makeRng('star-rail-' + modeId));
    var count = Math.max(4, Math.min(60, Math.round(Number(opts.count) || Math.min(20, Math.max(12, pool.length * 2)))));
    var slowThresholdMs = Math.max(400, Math.min(10000, Number(opts.slowThresholdMs) || 1800));
    var spacingSteps = [1, 2, 4, 8];

    var byKey = Object.create(null);
    pool.forEach(function (it) { byKey[it.answer.toLowerCase()] = it; });

    // Order letters/numbers (and color badges for 3-way RAS) when RAS mode is active.
    function orderedBaseList() {
      if (mode.alternating === 'triple') {
        var tLetters = pool.filter(function (p) { return p.category === 'letter' || (!p.category && /^[A-Za-z]+$/.test(p.answer) && !COLOR_SHAPES[p.answer.toLowerCase()]); });
        var tNumbers = pool.filter(function (p) { return p.category === 'number' || /^[0-9]+$/.test(p.answer); });
        var tColors = pool.filter(function (p) { return p.category === 'color_stroop'; });
        if (tLetters.length && tNumbers.length && tColors.length) {
          var tBuckets = [tLetters, tNumbers, tColors];
          var tOut = [];
          for (var ti = 0; ti < count; ti++) {
            var tb = tBuckets[ti % 3];
            tOut.push({ base: tb[Math.floor(rng() * tb.length)], role: 'practice', study: false });
          }
          return tOut;
        }
      }
      if (mode.alternating) {
        var letters = pool.filter(function (p) { return /^[A-Za-z]+$/.test(p.answer); });
        var numbers = pool.filter(function (p) { return /^[0-9]+$/.test(p.answer); });
        if (letters.length && numbers.length) {
          var out = [];
          for (var i = 0; i < count; i++) {
            var bucket = (i % 2 === 0) ? letters : numbers;
            out.push({ base: bucket[Math.floor(rng() * bucket.length)], role: 'practice', study: false });
          }
          return out;
        }
      }
      var deck = [];
      var focusList = Array.isArray(opts.focusAnswers) ? opts.focusAnswers.map(function (a) { return String(a).toLowerCase(); }) : [];
      var focusSet = Object.create(null);
      focusList.forEach(function (f) { if (byKey[f]) focusSet[f] = true; });
      var knownPool = pool.filter(function (it) { return !focusSet[it.answer.toLowerCase()]; });
      if (!knownPool.length) knownPool = pool;

      if (focusList.length && knownPool.length) {
        // Initial Incremental Rehearsal block for explicitly selected focus symbols.
        var focusIdx = 0;
        while (deck.length < count) {
          var fk = focusList[focusIdx % focusList.length];
          var focusItem = byKey[fk] || pool[0];
          deck.push({ base: focusItem, role: 'new', study: focusIdx < focusList.length });
          var gap = spacingSteps[Math.min(spacingSteps.length - 1, Math.floor(focusIdx / focusList.length))];
          for (var g = 0; g < gap && deck.length < count; g++) {
            var known = knownPool[Math.floor(rng() * knownPool.length)];
            deck.push({ base: known, role: 'known', study: false });
          }
          focusIdx++;
        }
        return deck;
      }

      while (deck.length < count) {
        var copy = pool.slice();
        for (var j = copy.length - 1; j > 0; j--) {
          var k = Math.floor(rng() * (j + 1));
          var tmp = copy[j]; copy[j] = copy[k]; copy[k] = tmp;
        }
        for (var m = 0; m < copy.length && deck.length < count; m++) {
          if (deck.length && deck[deck.length - 1].base.answer === copy[m].answer && copy.length > 1) {
            var alt = copy[(m + 1) % copy.length];
            copy[(m + 1) % copy.length] = copy[m];
            copy[m] = alt;
          }
          deck.push({ base: copy[m], role: 'practice', study: false });
        }
      }
      return deck;
    }

    var rawQueue = orderedBaseList().map(function (entry, idx) {
      var base = entry.base || entry;
      return Object.assign({}, base, {
        id: 'sr-' + (idx + 1) + '-' + base.answer + (entry.role ? '-' + entry.role : ''),
        role: entry.role || 'practice',
        study: !!entry.study,
        lane: Math.floor(rng() * 3),
        choices: buildChoicesFor(base, pool, rng, 6),
      });
    });

    var queue = rawQueue.slice();
    var cursor = 0;
    var history = [];
    var statsBySymbol = Object.create(null);
    var rehearsalLevel = Object.create(null);
    var missMap = Object.create(null);
    var missList = [];

    function recordMiss(item, rawPicked) {
      if (!item) return null;
      var target = String(item.answer || '').trim();
      var picked = String(rawPicked == null ? '' : rawPicked).trim();
      if (!target || !picked || picked.toLowerCase() === target.toLowerCase()) return null;
      var key = target.toLowerCase() + '\t' + picked.toLowerCase();
      if (!missMap[key]) {
        missMap[key] = { target: target, picked: picked, count: 0 };
        missList.push(missMap[key]);
      }
      missMap[key].count++;
      return missMap[key];
    }

    function ensureStat(item) {
      var k = item.answer;
      if (!statsBySymbol[k]) {
        statsBySymbol[k] = {
          answer: k,
          display: item.display,
          trials: 0,
          correct: 0,
          firstTry: 0,
          missed: 0,
          slow: 0,
          rts: [],
        };
      }
      return statsBySymbol[k];
    }

    function current() {
      if (cursor >= queue.length) return null;
      var item = queue[cursor];
      var nextItem = cursor + 1 < queue.length ? queue[cursor + 1] : null;
      return Object.assign({}, item, {
        index: cursor,
        total: queue.length,
        nextPreview: nextItem ? { display: nextItem.display, category: nextItem.category, dots: nextItem.dots, lane: nextItem.lane } : null,
      });
    }

    function weaveRehearsal(baseItem, spacing) {
      var insertAt = Math.min(queue.length, cursor + 1 + spacing);
      // Fill with a known/other item right after current if needed so spacing holds.
      if (queue.length - (cursor + 1) < spacing) {
        var fillers = pool.filter(function (p) { return p.answer.toLowerCase() !== baseItem.answer.toLowerCase(); });
        while (queue.length - (cursor + 1) < spacing && fillers.length) {
          var filler = fillers[Math.floor(rng() * fillers.length)];
          queue.push(Object.assign({}, filler, {
            id: 'sr-ir-known-' + (queue.length + 1) + '-' + filler.answer,
            role: 'known',
            study: false,
            lane: Math.floor(rng() * 3),
            choices: buildChoicesFor(filler, pool, rng, 6),
          }));
        }
        insertAt = Math.min(queue.length, cursor + 1 + spacing);
      }
      var dup = Object.assign({}, baseItem, {
        id: 'sr-ir-' + (queue.length + 1) + '-' + baseItem.answer + '-new',
        role: 'new',
        study: false,
        lane: Math.floor(rng() * 3),
        choices: buildChoicesFor(baseItem, pool, rng, 6),
      });
      queue.splice(insertAt, 0, dup);
    }

    function recordResult(item, outcome) {
      if (!item) return null;
      var o = outcome || {};
      var correct = o.correct !== false;
      var firstTry = o.firstTry !== false && correct;
      var rtMs = Math.max(50, Math.min(30000, Math.round(Number(o.rtMs) || 0)));
      var isSlow = rtMs > slowThresholdMs;
      var stat = ensureStat(item);
      stat.trials++;
      if (correct) stat.correct++;
      else stat.missed++;
      if (firstTry) stat.firstTry++;
      if (isSlow) stat.slow++;
      if (rtMs > 0) stat.rts.push(rtMs);

      history.push({ id: item.id, answer: item.answer, correct: correct, firstTry: firstTry, rtMs: rtMs, slow: isSlow, role: item.role, congruent: typeof item.congruent === 'boolean' ? item.congruent : null });

      // Incremental Rehearsal 1:1 -> 1:2 -> 1:4 -> 1:8 adaptive scheduling when missed or slow.
      var key = item.answer.toLowerCase();
      if (!firstTry || isSlow) {
        var lvl = rehearsalLevel[key] || 0;
        var maxExtra = Math.min(8, count);
        if (lvl < spacingSteps.length && queue.length < count + maxExtra) {
          var spacing = spacingSteps[lvl];
          rehearsalLevel[key] = lvl + 1;
          weaveRehearsal(item, spacing);
        }
      }
      cursor++;
      return current();
    }

    function stats() {
      var allRts = history.map(function (h) { return h.rtMs; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
      var medianMs = allRts.length ? allRts[Math.floor(allRts.length / 2)] : 0;
      var meanMs = allRts.length ? Math.round(allRts.reduce(function (s, n) { return s + n; }, 0) / allRts.length) : 0;
      var firstTryCount = history.filter(function (h) { return h.firstTry; }).length;
      var correctCount = history.filter(function (h) { return h.correct; }).length;
      var perSymbol = Object.keys(statsBySymbol).map(function (k) {
        var st = statsBySymbol[k];
        var avg = st.rts.length ? Math.round(st.rts.reduce(function (s, n) { return s + n; }, 0) / st.rts.length) : 0;
        return Object.assign({}, st, { avgMs: avg });
      });
      var focusSuggestions = perSymbol.filter(function (st) {
        return st.missed > 0 || st.slow > 0 || st.avgMs > slowThresholdMs;
      }).sort(function (a, b) {
        return (b.missed - a.missed) || (b.avgMs - a.avgMs);
      }).map(function (st) { return st.answer; });

      var congRts = history.filter(function (h) { return h.congruent === true && h.rtMs > 0; }).map(function (h) { return h.rtMs; });
      var incongRts = history.filter(function (h) { return h.congruent === false && h.rtMs > 0; }).map(function (h) { return h.rtMs; });
      var congruentMeanMs = congRts.length ? Math.round(congRts.reduce(function (s, n) { return s + n; }, 0) / congRts.length) : 0;
      var incongruentMeanMs = incongRts.length ? Math.round(incongRts.reduce(function (s, n) { return s + n; }, 0) / incongRts.length) : 0;
      var interferenceCostMs = (congRts.length && incongRts.length) ? (incongruentMeanMs - congruentMeanMs) : 0;

      var sortedConfusions = missList.slice().sort(function (a, b) {
        return b.count - a.count;
      }).map(function (c) {
        return { target: c.target, picked: c.picked, count: c.count };
      });

      return {
        total: history.length,
        remaining: Math.max(0, queue.length - cursor),
        correct: correctCount,
        firstTryCorrect: firstTryCount,
        accuracyPct: history.length ? Math.round((correctCount / history.length) * 100) : 0,
        firstTryPct: history.length ? Math.round((firstTryCount / history.length) * 100) : 0,
        medianMs: medianMs,
        meanMs: meanMs,
        congruentMeanMs: congruentMeanMs,
        incongruentMeanMs: incongruentMeanMs,
        interferenceCostMs: interferenceCostMs,
        perSymbol: perSymbol,
        focusSuggestions: focusSuggestions,
        misses: sortedConfusions,
        confusionPairs: sortedConfusions,
        rehearsalQueue: queue.map(function (q) { return { id: q.id, answer: q.answer, display: q.display, role: q.role, lane: q.lane, study: q.study, category: q.category, dots: q.dots, congruent: q.congruent, promptRule: q.promptRule, flankerCenter: q.flankerCenter, sizePair: q.sizePair, stroopWord: q.stroopWord, stroopInk: q.stroopInk, stroopShape: q.stroopShape }; }),
      };
    }

    return {
      current: current,
      recordResult: recordResult,
      recordMiss: recordMiss,
      stats: stats,
      peekQueue: function () { return queue.slice(); },
      isDone: function () { return cursor >= queue.length; },
    };
  }

  function matchSpokenSymbol(transcript, item) {
    if (!item || !transcript) return false;
    var raw = String(transcript).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return false;
    var ans = String(item.answer).toLowerCase().trim();
    var variants = SPOKEN_MAP[ans] ? SPOKEN_MAP[ans].slice() : [ans];
    if (variants.indexOf(ans) < 0) variants.push(ans);
    if (raw === ans) return true;
    var tokens = raw.split(' ');
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (raw === v) return true;
      if (v.indexOf(' ') >= 0 && raw.indexOf(v) >= 0) return true;
      if (tokens.indexOf(v) >= 0) return true;
    }
    return false;
  }

  function matchTypedSymbol(typed, item) {
    if (!item) return 'miss';
    var clean = String(typed == null ? '' : typed).trim();
    var ans = String(item.answer || '').trim();
    if (!clean || !ans) return 'miss';
    if (item.category === 'color_stroop' && clean.length === 1) {
      var lc = clean.toLowerCase();
      var shortcut = { r: 'red', b: 'blue', g: 'green', y: 'gold' }[lc];
      if (shortcut && shortcut === ans.toLowerCase()) return 'match';
      if (ans.toLowerCase().indexOf(lc) === 0) return 'prefix';
      return 'miss';
    }
    if (!item.caseSensitive) {
      clean = clean.toLowerCase();
      ans = ans.toLowerCase();
    }
    if (clean === ans) return 'match';
    if (ans.length > clean.length && ans.indexOf(clean) === 0) return 'prefix';
    return 'miss';
  }

  function buildSymbolSlidesPack(items, title) {
    var list = (Array.isArray(items) ? items : []).map(function (it) {
      var rec = typeof it === 'string' ? { display: it, answer: it } : it;
      var sym = String(rec.answer || rec.display || '').trim();
      if (!sym) return null;
      var defText = rec.dots ? (sym + ' dots pattern')
        : rec.category === 'word' ? ('Sight word: ' + (rec.display || sym))
        : rec.category === 'chunk' ? ('Word part: ' + (rec.display || sym))
        : rec.category === 'sound' ? ('Sound: ' + (rec.speak || sym))
        : rec.category === 'number' ? ('Number ' + sym)
        : ('Letter ' + (rec.display || sym));
      return {
        word: rec.display || sym,
        definition: defText,
        example: rec.example || '',
        image: rec.picture || rec.image || '',
        imageAlt: rec.pictureAlt || rec.imageAlt || sym,
        imageAttribution: rec.pictureCredit || rec.imageAttribution || undefined,
        wordAudio: rec.wordAudio || undefined,
      };
    }).filter(Boolean);
    return {
      title: String(title || 'Symbol Runner Cards').slice(0, 160),
      language: 'en',
      words: list,
      options: { mode: 'vocabulary', includePictures: true, pictureSlides: true },
    };
  }

  function injectRunnerStyles(doc) {
    if (!doc || !doc.head || doc.getElementById('allo-symbol-runner-styles')) return;
    var s = doc.createElement('style');
    s.id = 'allo-symbol-runner-styles';
    s.textContent = [
      '.asr-wrap{display:grid;gap:12px;background:#0f172a;color:#f8fafc;border-radius:14px;padding:14px;border:2px solid #334155}',
      '.asr-wrap.asr-hc{background:#000;color:#ff0;border-color:#ff0}',
      '.asr-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}',
      '.asr-hud{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.asr-pill{padding:4px 10px;border-radius:999px;background:#1e293b;border:1px solid #475569;font-size:13px;font-weight:700}',
      '.asr-hc .asr-pill{background:#000;border-color:#ff0;color:#ff0}',
      '.asr-controls{display:flex;flex-wrap:wrap;gap:6px}',
      '.asr-btn{min-height:40px;padding:6px 12px;border-radius:9px;border:1px solid #64748b;background:#1e293b;color:#f8fafc;font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
      '.asr-btn:hover{border-color:#93c5fd}',
      '.asr-btn[aria-pressed="true"]{background:#312e81;border-color:#818cf8;color:#fff}',
      '.asr-hc .asr-btn{background:#000;color:#ff0;border-color:#ff0}',
      '.asr-hc .asr-btn[aria-pressed="true"]{background:#ff0;color:#000}',
      '.asr-stage{position:relative;display:grid;place-items:center;background:#020617;border-radius:12px;border:1px solid #334155;overflow:hidden}',
      '.asr-canvas{width:100%;max-width:640px;height:auto;display:block;touch-action:manipulation}',
      '.asr-cue-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;padding:8px 10px;background:#1e293b;border-radius:10px}',
      '.asr-hc .asr-cue-bar{background:#000;border:1px solid #ff0}',
      '.asr-cue-img{width:56px;height:56px;object-fit:contain;background:#fff;border-radius:8px;padding:3px;border:1px solid #cbd5e1}',
      '.asr-lock-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}',
      '.asr-lane-btn{min-height:44px;min-width:96px;padding:6px 14px;border-radius:10px;border:2px solid #475569;background:#0f172a;color:#e2e8f0;font-weight:800;cursor:pointer}',
      '.asr-lane-btn[aria-pressed="true"]{border-color:#38bdf8;background:#0c4a6e;color:#fff}',
      '.asr-lane-btn.asr-lane-locked{border-color:#4ade80;background:#14532d;color:#fff}',
      '.asr-keypad{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}',
      '.asr-key{min-width:52px;min-height:48px;padding:6px 12px;border-radius:10px;border:2px solid #64748b;background:#f8fafc;color:#0f172a;font-size:20px;font-weight:900;cursor:pointer}',
      '.asr-key:hover{border-color:#4f46e5;background:#eef2ff}',
      '.asr-hc .asr-key{background:#000;color:#ff0;border-color:#ff0}',
      '.asr-input-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center}',
      '.asr-input{min-height:44px;width:110px;padding:6px 10px;border-radius:10px;border:2px solid #94a3b8;background:#fff;color:#0f172a;font-size:20px;font-weight:800;text-align:center}',
      '.asr-status{min-height:1.5em;margin:0;text-align:center;font-weight:700;font-size:15px}',
      '.asr-summary{padding:14px;border-radius:12px;background:#1e293b;border:1px solid #475569;display:grid;gap:8px}',
      '.asr-summary h3{margin:0;color:#fff;font-size:18px}',
      '.asr-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;background:#f59e0b;color:#1e293b}',
      '.asr-lock-pill{padding:4px 12px;border-radius:999px;font-size:13px;font-weight:800}',
      '.asr-lock-pill[data-locked="true"]{background:#15803d;color:#fff}',
      '.asr-lock-pill[data-locked="false"]{background:#b45309;color:#fff}',
      '.asr-ran-grid{width:100%;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px;padding:12px;box-sizing:border-box}',
      '.asr-ran-grid[hidden]{display:none}',
      '.asr-ran-cell{min-height:46px;border-radius:8px;border:2px solid #334155;background:#0f172a;color:#f8fafc;display:grid;place-items:center;font-weight:800;font-size:18px;padding:4px 2px;text-align:center;line-height:1.1}',
      '.asr-ran-cell[data-active="true"]{border-color:#facc15;background:#1e1b4b;box-shadow:0 0 0 2px #facc15}',
      '.asr-ran-cell[data-done="true"]{border-color:#15803d;background:#052e16;color:#bbf7d0}',
      '.asr-hc .asr-ran-cell{background:#000;color:#ff0;border-color:#ff0}',
      '.asr-hc .asr-ran-cell[data-active="true"]{background:#ff0;color:#000}',
      '.asr-legend{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;font-size:12px;color:#cbd5e1;font-weight:700}',
      '.asr-hc .asr-legend{color:#ff0}',
    ].join('\n');
    doc.head.appendChild(s);
  }

  function playChime(muted) {
    if (muted) return;
    try {
      var Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.19);
      setTimeout(function () { try { ctx.close(); } catch (_) {} }, 300);
    } catch (_) { /* optional sound */ }
  }

  // Interactive 3D Star-Rail / 2D Flat-Lane runner mounted inside a container.
  function mountRunner(container, config) {
    var doc = (container && container.ownerDocument) || root.document;
    var cfg = config || {};
    injectRunnerStyles(doc);

    var prefersReduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var viewMode = cfg.viewMode === 'grid' ? 'grid' : (cfg.viewMode === '2d' || (cfg.viewMode !== '3d' && prefersReduced)) ? '2d' : '3d';
    function viewLabel(m) {
      return m === 'grid' ? 'View: 5x8 RAN Grid' : m === '2d' ? 'View: 2D Lanes' : 'View: 3D Star-Rail';
    }
    var controlMode = cfg.controlMode === 'lockon' ? 'lockon' : 'direct';
    var highContrast = !!cfg.highContrast;
    var soundMuted = !!cfg.muted;
    var voiceEnabled = !!cfg.voiceEnabled;
    var modeId = cfg.modeId || 'confusable_letters';
    var phonemeAudio = cfg.phonemeAudio && typeof cfg.phonemeAudio === 'object' ? Object.assign({}, cfg.phonemeAudio) : {};
    var letterAudio = cfg.letterAudio && typeof cfg.letterAudio === 'object' ? Object.assign({}, cfg.letterAudio) : {};
    var wordAudio = cfg.wordAudio && typeof cfg.wordAudio === 'object' ? Object.assign({}, cfg.wordAudio) : {};
    var audioMode = cfg.audioMode === 'name' || cfg.audioMode === 'sound' ? cfg.audioMode : 'auto';
    var destroyed = false;

    function resolveItemAudio(item) {
      return resolvePhonemeAudioUri(item, phonemeAudio, { letterAudio: letterAudio, wordAudio: wordAudio, audioMode: audioMode, modeId: modeId });
    }

    function pickLocalSpeechVoice() {
      var syn = root.speechSynthesis;
      if (!syn || typeof syn.getVoices !== 'function' || typeof root.SpeechSynthesisUtterance !== 'function') return null;
      var voices;
      try { voices = syn.getVoices(); } catch (_) { voices = null; }
      if (!Array.isArray(voices) || !voices.length) return null;
      var localVoices = voices.filter(function (v) { return v && v.localService === true; });
      if (!localVoices.length) return null;
      var enLocal = localVoices.filter(function (v) { return /^en\b/i.test(String(v.lang || '')); });
      return enLocal[0] || localVoices[0];
    }

    function playAnchorAudio(item, opts) {
      if (soundMuted || destroyed) return false;
      var uri = resolveItemAudio(item);
      if (uri && typeof root.Audio === 'function') {
        try {
          var clip = new root.Audio(uri);
          var res = typeof clip.play === 'function' ? clip.play() : null;
          if (res && typeof res.catch === 'function') res.catch(function () {});
          return true;
        } catch (_) {}
      }
      if (cfg.localSpeechFallback === false) return false;
      var spoken = resolveSpokenCueText(item, opts);
      var voice = spoken ? pickLocalSpeechVoice() : null;
      if (!spoken || !voice) return false;
      try {
        if (typeof root.speechSynthesis.cancel === 'function') root.speechSynthesis.cancel();
        var utt = new root.SpeechSynthesisUtterance(spoken);
        utt.voice = voice;
        utt.lang = voice.lang || 'en-US';
        utt.rate = 0.95;
        root.speechSynthesis.speak(utt);
        return true;
      } catch (_) {
        return false;
      }
    }

    var scheduler = createScheduler({
      modeId: cfg.modeId || 'confusable_letters',
      customSymbols: cfg.customSymbols,
      pictures: cfg.pictures,
      count: cfg.count,
      seed: cfg.seed,
      slowThresholdMs: cfg.slowThresholdMs,
      focusAnswers: cfg.focusAnswers,
    });

    var current = scheduler.current();
    var aimLane = current ? (controlMode === 'lockon' ? (current.lane === 1 ? 0 : 1) : current.lane) : 1;
    var locked = controlMode !== 'lockon' || (current && aimLane === current.lane);
    var streak = 0;
    var cardStartMs = Date.now();
    var firstTryFlag = true;
    var keyBuffer = '';
    var approachProgress = 0.25;
    var rafId = 0;
    var sparkle = 0;
    var recognition = null;
    var lastHitBox = { x: 220, y: 120, w: 200, h: 140 };

    container.replaceChildren();
    var wrap = doc.createElement('section');
    wrap.className = 'asr-wrap' + (highContrast ? ' asr-hc' : '');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'Star-Rail Symbol Runner');

    var toolbar = doc.createElement('div');
    toolbar.className = 'asr-toolbar';
    var hud = doc.createElement('div');
    hud.className = 'asr-hud';
    var progressPill = doc.createElement('span');
    progressPill.className = 'asr-pill';
    var streakPill = doc.createElement('span');
    streakPill.className = 'asr-pill';
    var speedPill = doc.createElement('span');
    speedPill.className = 'asr-pill';
    var lockPill = doc.createElement('span');
    lockPill.className = 'asr-lock-pill';
    hud.appendChild(progressPill);
    hud.appendChild(streakPill);
    hud.appendChild(speedPill);
    hud.appendChild(lockPill);

    var controls = doc.createElement('div');
    controls.className = 'asr-controls';

    function makeToggleBtn(label, pressed, onClick) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'asr-btn';
      b.textContent = label;
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.addEventListener('click', onClick);
      return b;
    }

    var viewBtn = makeToggleBtn(viewLabel(viewMode), viewMode === '3d', function () {
      viewMode = viewMode === '3d' ? '2d' : viewMode === '2d' ? 'grid' : '3d';
      viewBtn.textContent = viewLabel(viewMode);
      viewBtn.setAttribute('aria-pressed', viewMode === '3d' ? 'true' : 'false');
      canvas.hidden = viewMode === 'grid';
      ranGrid.hidden = viewMode !== 'grid';
      updateUi();
      draw();
    });

    var modeBtn = makeToggleBtn(controlMode === 'lockon' ? 'Mode: Aim & Lock-On' : 'Mode: Direct', controlMode === 'lockon', function () {
      controlMode = controlMode === 'lockon' ? 'direct' : 'lockon';
      modeBtn.textContent = controlMode === 'lockon' ? 'Mode: Aim & Lock-On' : 'Mode: Direct';
      modeBtn.setAttribute('aria-pressed', controlMode === 'lockon' ? 'true' : 'false');
      syncLockState();
      updateUi();
      draw();
    });

    var hcBtn = makeToggleBtn('High contrast', highContrast, function () {
      highContrast = !highContrast;
      hcBtn.setAttribute('aria-pressed', highContrast ? 'true' : 'false');
      wrap.className = 'asr-wrap' + (highContrast ? ' asr-hc' : '');
      draw();
    });

    var soundBtn = makeToggleBtn(soundMuted ? 'Sound: Off' : 'Sound: On', !soundMuted, function () {
      soundMuted = !soundMuted;
      soundBtn.textContent = soundMuted ? 'Sound: Off' : 'Sound: On';
      soundBtn.setAttribute('aria-pressed', !soundMuted ? 'true' : 'false');
    });

    controls.appendChild(viewBtn);
    controls.appendChild(modeBtn);
    controls.appendChild(hcBtn);
    controls.appendChild(soundBtn);

    var SpeechRec = cfg.enableVoice !== false ? (root.SpeechRecognition || root.webkitSpeechRecognition) : null;
    var micBtn = null;
    if (SpeechRec) {
      micBtn = makeToggleBtn(voiceEnabled ? 'Mic: Listening' : 'Mic: Off', voiceEnabled, function () {
        if (voiceEnabled) stopVoice();
        else startVoice();
      });
      controls.appendChild(micBtn);
    }

    toolbar.appendChild(hud);
    toolbar.appendChild(controls);
    wrap.appendChild(toolbar);

    var stage = doc.createElement('div');
    stage.className = 'asr-stage';
    var canvas = doc.createElement('canvas');
    canvas.className = 'asr-canvas';
    canvas.width = 640;
    canvas.height = 320;
    canvas.setAttribute('aria-label', 'Symbol corridor display');
    canvas.hidden = viewMode === 'grid';
    var ranGrid = doc.createElement('div');
    ranGrid.className = 'asr-ran-grid';
    ranGrid.setAttribute('role', 'grid');
    ranGrid.setAttribute('aria-label', '5 by 8 serial naming grid');
    ranGrid.hidden = viewMode !== 'grid';
    stage.appendChild(canvas);
    stage.appendChild(ranGrid);
    wrap.appendChild(stage);

    var colorLegend = doc.createElement('div');
    colorLegend.className = 'asr-legend';
    colorLegend.hidden = true;
    colorLegend.textContent = 'WCAG Shape-Color Key: ● Red (R) · ▲ Blue (B) · ■ Green (G) · ★ Gold (Y)';
    wrap.appendChild(colorLegend);

    var cueBar = doc.createElement('div');
    cueBar.className = 'asr-cue-bar';
    var catBadge = doc.createElement('span');
    catBadge.className = 'asr-badge';
    var cueText = doc.createElement('span');
    var cueImg = doc.createElement('img');
    cueImg.className = 'asr-cue-img';
    cueImg.hidden = true;
    cueBar.appendChild(catBadge);
    cueBar.appendChild(cueImg);
    cueBar.appendChild(cueText);
    var hearBtn = doc.createElement('button');
    hearBtn.type = 'button';
    hearBtn.className = 'asr-btn';
    hearBtn.textContent = 'Hear sound';
    hearBtn.setAttribute('data-sr-hear', 'true');
    hearBtn.hidden = true;
    hearBtn.addEventListener('click', function () {
      if (current) playAnchorAudio(current);
    });
    cueBar.appendChild(hearBtn);
    wrap.appendChild(cueBar);

    var lockRow = doc.createElement('div');
    lockRow.className = 'asr-lock-row';
    var laneNames = ['Left lane', 'Center lane', 'Right lane'];
    var laneButtons = [0, 1, 2].map(function (laneIdx) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'asr-lane-btn';
      b.setAttribute('data-sr-lane', String(laneIdx));
      b.textContent = laneNames[laneIdx];
      b.addEventListener('click', function () {
        setAimLane(laneIdx);
      });
      lockRow.appendChild(b);
      return b;
    });
    wrap.appendChild(lockRow);

    var inputRow = doc.createElement('div');
    inputRow.className = 'asr-input-row';
    var typeLabel = doc.createElement('label');
    typeLabel.textContent = 'Say or type symbol';
    var typeInput = doc.createElement('input');
    typeInput.type = 'text';
    typeInput.className = 'asr-input';
    typeInput.maxLength = 10;
    typeInput.setAttribute('aria-label', 'Type symbol name');
    var submitBtn = doc.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'asr-btn';
    submitBtn.textContent = 'Check';
    inputRow.appendChild(typeLabel);
    inputRow.appendChild(typeInput);
    inputRow.appendChild(submitBtn);
    wrap.appendChild(inputRow);

    var keypad = doc.createElement('div');
    keypad.className = 'asr-keypad';
    wrap.appendChild(keypad);

    var status = doc.createElement('p');
    status.className = 'asr-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrap.appendChild(status);

    var summaryBox = doc.createElement('div');
    summaryBox.className = 'asr-summary';
    summaryBox.hidden = true;
    wrap.appendChild(summaryBox);

    container.appendChild(wrap);

    function syncLockState() {
      if (!current) { locked = false; return; }
      locked = controlMode !== 'lockon' || aimLane === current.lane;
    }

    function setAimLane(laneIdx) {
      aimLane = Math.max(0, Math.min(2, Number(laneIdx) || 0));
      syncLockState();
      if (controlMode === 'lockon') {
        status.textContent = locked ? 'Target locked! Say or type the symbol.' : 'Move to ' + laneNames[current.lane] + ' to lock on.';
      }
      updateUi();
      draw();
    }

    function handleAnswerAttempt(raw) {
      if (!current || destroyed) return;
      if (controlMode === 'lockon' && !locked) {
        status.textContent = 'Aim at ' + laneNames[current.lane] + ' first (hover mouse or press Left/Right arrow).';
        updateUi();
        return;
      }
      var res = matchTypedSymbol(raw, current);
      if (res === 'match') {
        var rt = Math.max(80, Date.now() - cardStartMs);
        streak++;
        sparkle = 1;
        playChime(soundMuted);
        var prev = current;
        current = scheduler.recordResult(prev, { correct: true, firstTry: firstTryFlag, rtMs: rt });
        if (typeof cfg.onTrial === 'function') cfg.onTrial({ item: prev, correct: true, firstTry: firstTryFlag, rtMs: rt, stats: scheduler.stats() });
        firstTryFlag = true;
        keyBuffer = '';
        typeInput.value = '';
        approachProgress = 0.25;
        cardStartMs = Date.now();
        if (!current) {
          finishRun();
          return;
        }
        aimLane = controlMode === 'lockon' ? (current.lane === aimLane ? (aimLane + 1) % 3 : aimLane) : current.lane;
        syncLockState();
        status.textContent = 'Got ' + prev.display + ' (' + rt + ' ms).' + (controlMode === 'lockon' ? ' Aim at the next gate.' : '');
        updateUi();
        draw();
        if (current.study) playAnchorAudio(current);
      } else if (res === 'prefix') {
        keyBuffer = String(raw);
      } else {
        firstTryFlag = false;
        streak = 0;
        keyBuffer = '';
        typeInput.value = '';
        scheduler.recordMiss(current, raw);
        playAnchorAudio(current, { allowStroop: true });
        status.textContent = current.category === 'color_stroop'
          ? ('Look closely at the ink color and shape badge: say or tap "' + current.answer + '".')
          : ('Look closely: say or type "' + current.answer + '".');
        updateUi();
      }
    }

    function finishRun() {
      stopVoice();
      if (rafId) { try { root.cancelAnimationFrame(rafId); } catch (_) {} rafId = 0; }
      var st = scheduler.stats();
      status.textContent = 'Round complete. ' + st.firstTryCorrect + ' of ' + st.total + ' fast and accurate, average ' + st.meanMs + ' ms.';
      keypad.replaceChildren();
      lockRow.hidden = true;
      inputRow.hidden = true;
      summaryBox.hidden = false;
      summaryBox.replaceChildren();
      var h3 = doc.createElement('h3');
      h3.textContent = 'Run summary';
      var p1 = doc.createElement('p');
      p1.textContent = 'First-try accuracy: ' + st.firstTryPct + '% (' + st.firstTryCorrect + '/' + st.total + ') · Average time: ' + st.meanMs + ' ms · Median: ' + st.medianMs + ' ms';
      if (st.congruentMeanMs && st.incongruentMeanMs) {
        p1.textContent += ' · Congruent: ' + st.congruentMeanMs + ' ms · Incongruent: ' + st.incongruentMeanMs + ' ms · Interference cost: ' + st.interferenceCostMs + ' ms';
      }
      var p2 = doc.createElement('p');
      p2.textContent = st.focusSuggestions.length
        ? 'Focus symbols to practice next: ' + st.focusSuggestions.join(', ')
        : 'Strong automaticity across all symbols in this run.';
      var restartBtn = doc.createElement('button');
      restartBtn.type = 'button';
      restartBtn.className = 'asr-btn';
      restartBtn.textContent = 'Run again (focus on tricky symbols)';
      restartBtn.addEventListener('click', function () {
        mountRunner(container, Object.assign({}, cfg, { viewMode: viewMode, controlMode: controlMode, highContrast: highContrast, muted: soundMuted, focusAnswers: st.focusSuggestions }));
      });
      summaryBox.appendChild(h3);
      summaryBox.appendChild(p1);
      summaryBox.appendChild(p2);
      if (st.confusionPairs && st.confusionPairs.length) {
        var pConf = doc.createElement('p');
        pConf.className = 'asr-confusions';
        pConf.textContent = 'Common mix-ups: ' + st.confusionPairs.slice(0, 5).map(function (c) {
          return c.target + ' vs ' + c.picked + ' (' + c.count + 'x)';
        }).join(', ');
        summaryBox.appendChild(pConf);
      }
      summaryBox.appendChild(restartBtn);
      if (typeof cfg.onComplete === 'function') cfg.onComplete(st);
      draw();
    }

    function updateUi() {
      var st = scheduler.stats();
      progressPill.textContent = current ? ('Card ' + (current.index + 1) + ' of ' + current.total) : 'Done';
      streakPill.textContent = 'Streak: ' + streak;
      speedPill.textContent = st.meanMs ? ('Avg: ' + st.meanMs + ' ms') : 'Avg: --';
      if (current) {
        lockPill.setAttribute('data-locked', locked ? 'true' : 'false');
        lockPill.textContent = controlMode === 'lockon' ? (locked ? 'LOCKED' : 'AIM TO LOCK ON') : 'DIRECT READY';
        catBadge.textContent = current.category === 'flanker' ? 'FLANKER'
          : current.category === 'quantity_stroop' ? 'QTY STROOP'
          : current.category === 'size_stroop' ? 'SIZE STROOP'
          : current.category === 'color_stroop' ? 'COLOR STROOP'
          : current.dots ? 'SUBITIZE'
          : current.category === 'number' ? 'NUMBER'
          : current.category === 'word' ? 'WORD'
          : current.category === 'chunk' ? 'MORPHEME'
          : current.category === 'sound' ? 'SOUND' : 'LETTER';
        if (current.picture) {
          cueImg.src = current.picture;
          cueImg.alt = current.pictureAlt || current.display;
          cueImg.hidden = false;
        } else {
          cueImg.hidden = true;
          cueImg.removeAttribute('src');
        }
        colorLegend.hidden = current.category !== 'color_stroop';
        cueText.textContent = current.category === 'flanker'
          ? ('Focus on the MIDDLE letter: ' + current.display)
          : current.category === 'quantity_stroop'
            ? ('Count the dots only (ignore printed digit ' + current.display + ')')
            : current.category === 'size_stroop'
              ? ('Pick the GREATER NUMBER value (ignore physical size): ' + (current.sizePair ? (current.sizePair.left + ' vs ' + current.sizePair.right) : current.display))
              : current.category === 'color_stroop'
                ? ('Name ink color & shape badge (ignore printed word ' + (current.stroopWord || current.display) + ')')
                : current.dots
                  ? ('Name the quantity (' + current.dots + ' dots pattern)')
                  : current.category === 'sound'
                    ? ('Say or type sound: ' + (current.speak || current.display))
                    : ('Say or type: ' + current.display);
        var hasSpokenFallback = cfg.localSpeechFallback !== false && !!resolveSpokenCueText(current) && !!pickLocalSpeechVoice();
        hearBtn.hidden = !(resolveItemAudio(current) || hasSpokenFallback);
        lockRow.hidden = controlMode !== 'lockon';
        laneButtons.forEach(function (b, idx) {
          b.setAttribute('aria-pressed', aimLane === idx ? 'true' : 'false');
          b.className = 'asr-lane-btn' + (aimLane === idx && current && current.lane === idx ? ' asr-lane-locked' : '');
        });
        keypad.replaceChildren();
        current.choices.forEach(function (ch) {
          var kb = doc.createElement('button');
          kb.type = 'button';
          kb.className = 'asr-key';
          kb.setAttribute('data-sr-choice', ch);
          var cInfo = current.category === 'color_stroop' ? COLOR_SHAPES[String(ch).toLowerCase()] : null;
          kb.textContent = cInfo ? (cInfo.shape + ' ' + ch) : ch;
          kb.addEventListener('click', function () {
            if (controlMode === 'lockon' && !locked) {
              status.textContent = 'Aim at ' + laneNames[current.lane] + ' first (hover mouse or press Left/Right arrow).';
              return;
            }
            handleAnswerAttempt(ch);
          });
          keypad.appendChild(kb);
        });
      }
      if (viewMode === 'grid') {
        ranGrid.replaceChildren();
        var qList = st.rehearsalQueue || [];
        var curIdx = current ? current.index : qList.length;
        var pageSize = 40;
        var pageStart = Math.floor(Math.min(curIdx, Math.max(0, qList.length - 1)) / pageSize) * pageSize;
        var slice = qList.slice(pageStart, pageStart + pageSize);
        slice.forEach(function (qItem, offset) {
          var absIdx = pageStart + offset;
          var cell = doc.createElement('button');
          cell.type = 'button';
          cell.className = 'asr-ran-cell';
          cell.setAttribute('data-sr-grid-index', String(absIdx));
          cell.setAttribute('data-active', absIdx === curIdx ? 'true' : 'false');
          cell.setAttribute('data-done', absIdx < curIdx ? 'true' : 'false');
          if (qItem.category === 'color_stroop') {
            cell.style.color = qItem.stroopInk || '#f8fafc';
            cell.textContent = (qItem.stroopShape || '') + ' ' + (qItem.stroopWord || qItem.display);
          } else if (qItem.dots > 0 && qItem.category !== 'quantity_stroop') {
            cell.textContent = Array(qItem.dots + 1).join('•');
          } else if (qItem.category === 'quantity_stroop') {
            cell.textContent = Array(qItem.dots + 1).join('•') + ' [' + qItem.display + ']';
          } else if (qItem.sizePair) {
            cell.textContent = qItem.sizePair.left + '|' + qItem.sizePair.right;
          } else {
            cell.textContent = qItem.display;
          }
          cell.addEventListener('click', function () {
            if (absIdx === curIdx && current && controlMode === 'lockon') {
              setAimLane(current.lane);
            }
          });
          ranGrid.appendChild(cell);
        });
      }
      if (micBtn) {
        micBtn.textContent = voiceEnabled ? 'Mic: Listening' : 'Mic: Off';
        micBtn.setAttribute('aria-pressed', voiceEnabled ? 'true' : 'false');
      }
    }

    function startVoice() {
      if (!SpeechRec || recognition) return;
      try {
        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = cfg.lang || 'en-US';
        recognition.onresult = function (event) {
          if (!current || destroyed) return;
          for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0] && event.results[i][0].transcript;
            if (transcript && matchSpokenSymbol(transcript, current)) {
              handleAnswerAttempt(current.answer);
              break;
            }
          }
        };
        recognition.onerror = function () { voiceEnabled = false; recognition = null; updateUi(); };
        recognition.onend = function () { if (voiceEnabled && !destroyed && recognition) { try { recognition.start(); } catch (_) {} } };
        recognition.start();
        voiceEnabled = true;
        updateUi();
      } catch (_) {
        voiceEnabled = false;
        recognition = null;
        updateUi();
      }
    }

    function stopVoice() {
      voiceEnabled = false;
      if (recognition) {
        try { recognition.onend = null; recognition.stop(); } catch (_) {}
        recognition = null;
      }
      updateUi();
    }

    function draw() {
      var ctx;
      try { ctx = canvas.getContext && canvas.getContext('2d'); } catch (_) { ctx = null; }
      if (!ctx) return;
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = highContrast ? '#000000' : '#020617';
      ctx.fillRect(0, 0, W, H);

      var targetLane = current ? current.lane : 1;
      var laneCenters = [W * 0.22, W * 0.5, W * 0.78];

      if (viewMode === '3d') {
        var vx = W * 0.5, vy = H * 0.22;
        // Starfield dots
        ctx.fillStyle = highContrast ? '#ffff00' : 'rgba(148, 163, 184, 0.55)';
        for (var s = 0; s < 18; s++) {
          var sx = ((s * 97 + 41) % W);
          var sy = ((s * 53 + 17) % Math.floor(H * 0.38));
          ctx.fillRect(sx, sy, 2, 2);
        }
        // Perspective rail guide lines
        ctx.strokeStyle = highContrast ? '#ffff00' : '#334155';
        ctx.lineWidth = 2;
        [-0.36, -0.12, 0.12, 0.36].forEach(function (offset) {
          ctx.beginPath();
          ctx.moveTo(vx + offset * 48, vy);
          ctx.lineTo(W * (0.5 + offset * 1.15), H);
          ctx.stroke();
        });
        // Horizon parafoveal preview
        if (current && current.nextPreview) {
          ctx.fillStyle = highContrast ? '#00ffff' : 'rgba(148, 163, 184, 0.85)';
          ctx.font = '700 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('NEXT: ' + (current.nextPreview.dots ? (current.nextPreview.dots + ' dots') : current.nextPreview.display), vx, vy - 10);
        }
        // Active gate projection along lane
        if (current) {
          var t = prefersReduced ? 0.82 : Math.min(1, approachProgress);
          var gx = vx + (laneCenters[targetLane] - vx) * (0.35 + 0.65 * t);
          var gy = vy + (H * 0.66 - vy) * (0.3 + 0.7 * t);
          var bw = 96 + 74 * t, bh = 88 + 56 * t;
          lastHitBox = { x: gx - bw / 2, y: gy - bh / 2, w: bw, h: bh };

          ctx.fillStyle = highContrast ? '#000000' : (locked ? '#1e1b4b' : '#1e293b');
          ctx.strokeStyle = locked ? (highContrast ? '#00ff00' : '#4ade80') : (highContrast ? '#ffff00' : '#f59e0b');
          ctx.lineWidth = locked ? 4 : 3;
          ctx.fillRect(lastHitBox.x, lastHitBox.y, bw, bh);
          ctx.strokeRect(lastHitBox.x, lastHitBox.y, bw, bh);

          drawSymbolInside(ctx, current, gx, gy, bw, bh);
        }
        // Aim reticle
        var rx = laneCenters[aimLane];
        var ry = H * 0.86;
        ctx.strokeStyle = locked ? '#4ade80' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rx, ry, 20, 0, Math.PI * 2);
        ctx.moveTo(rx - 26, ry); ctx.lineTo(rx - 10, ry);
        ctx.moveTo(rx + 10, ry); ctx.lineTo(rx + 26, ry);
        ctx.stroke();
      } else {
        // 2D Flat Lanes mode (calm non-zooming lanes)
        var laneW = W * 0.28;
        [0, 1, 2].forEach(function (i) {
          var lx = laneCenters[i] - laneW / 2;
          ctx.fillStyle = i === aimLane ? (highContrast ? '#111111' : '#0f172a') : '#020617';
          ctx.strokeStyle = i === aimLane ? (locked ? '#4ade80' : '#38bdf8') : '#334155';
          ctx.lineWidth = i === aimLane ? 3 : 1.5;
          ctx.fillRect(lx, 44, laneW, H - 64);
          ctx.strokeRect(lx, 44, laneW, H - 64);
        });
        if (current) {
          var bx = laneCenters[targetLane] - 78, by = 82, bW = 156, bH = 148;
          lastHitBox = { x: bx, y: by, w: bW, h: bH };
          ctx.fillStyle = highContrast ? '#000000' : '#1e1b4b';
          ctx.strokeStyle = locked ? '#4ade80' : '#f59e0b';
          ctx.lineWidth = 4;
          ctx.fillRect(bx, by, bW, bH);
          ctx.strokeRect(bx, by, bW, bH);
          drawSymbolInside(ctx, current, laneCenters[targetLane], by + bH / 2, bW, bH);
        }
      }

      if (sparkle > 0 && !prefersReduced) {
        ctx.fillStyle = 'rgba(74, 222, 128, ' + (sparkle * 0.35).toFixed(2) + ')';
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawSymbolInside(ctx, item, cx, cy, bw, bh) {
      if (item.category === 'quantity_stroop' && item.dots > 0) {
        ctx.save();
        ctx.fillStyle = highContrast ? 'rgba(255, 255, 0, 0.32)' : 'rgba(245, 158, 11, 0.42)';
        ctx.font = '900 72px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.display, cx, cy);
        ctx.restore();
        var qPts = getDotsForNumber(item.dots);
        var qRad = Math.max(7, Math.min(12, bw * 0.085));
        qPts.forEach(function (pt) {
          var dx = cx + pt[0] * (bw * 0.34);
          var dy = cy + pt[1] * (bh * 0.34);
          ctx.beginPath();
          ctx.arc(dx, dy, qRad, 0, Math.PI * 2);
          ctx.fillStyle = highContrast ? '#ffff00' : '#38bdf8';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#020617';
          ctx.stroke();
        });
        return;
      }
      if (item.dots > 0) {
        var pts = getDotsForNumber(item.dots);
        ctx.fillStyle = highContrast ? '#ffff00' : '#ffffff';
        var radius = Math.max(7, Math.min(13, bw * 0.08));
        pts.forEach(function (pt) {
          ctx.beginPath();
          ctx.arc(cx + pt[0] * (bw * 0.34), cy + pt[1] * (bh * 0.34), radius, 0, Math.PI * 2);
          ctx.fill();
        });
        return;
      }
      if (item.category === 'size_stroop' && item.sizePair) {
        var sp = item.sizePair;
        ctx.fillStyle = highContrast ? '#ffff00' : '#e2e8f0';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GREATER VALUE', cx, cy - bh * 0.36);
        ctx.fillStyle = highContrast ? '#ffff00' : '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.font = '900 ' + Math.round(36 * (sp.leftScale || 1)) + 'px system-ui, sans-serif';
        ctx.fillText(sp.left, cx - bw * 0.23, cy + 8);
        ctx.font = '900 ' + Math.round(36 * (sp.rightScale || 1)) + 'px system-ui, sans-serif';
        ctx.fillText(sp.right, cx + bw * 0.23, cy + 8);
        return;
      }
      if (item.category === 'color_stroop') {
        var ink = highContrast ? '#ffff00' : (item.stroopInk || '#ffffff');
        var word = item.stroopWord || item.display;
        var shape = item.stroopShape || '';
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 32px system-ui, sans-serif';
        ctx.fillText(shape, cx, cy - bh * 0.24);
        ctx.font = '900 36px system-ui, sans-serif';
        ctx.fillText(word, cx, cy + bh * 0.14);
        return;
      }
      if (item.category === 'flanker') {
        var text = String(item.display || '');
        var midIdx = item.flankerCenter != null ? item.flankerCenter : Math.floor(text.length / 2);
        var step = Math.min(26, (bw - 24) / Math.max(1, text.length));
        var startX = cx - ((text.length - 1) * step) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 34px system-ui, -apple-system, sans-serif';
        for (var fi = 0; fi < text.length; fi++) {
          var fx = startX + fi * step;
          if (fi === midIdx) {
            ctx.strokeStyle = highContrast ? '#00ff00' : '#facc15';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(fx - 13, cy - 22, 26, 44);
            ctx.fillStyle = highContrast ? '#ffff00' : '#facc15';
          } else {
            ctx.fillStyle = highContrast ? '#ffffff' : '#cbd5e1';
          }
          ctx.fillText(text.charAt(fi), fx, cy);
        }
        return;
      }
      ctx.fillStyle = highContrast ? '#ffff00' : '#ffffff';
      var fontSize = item.display.length > 7 ? 26 : item.display.length > 4 ? 34 : item.display.length > 2 ? 42 : item.display.length > 1 ? 56 : 70;
      ctx.font = '800 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.display, cx, cy);
    }

    function tick() {
      if (destroyed) return;
      if (approachProgress < 1 && !prefersReduced) approachProgress = Math.min(1, approachProgress + 0.015);
      if (sparkle > 0) sparkle = Math.max(0, sparkle - 0.08);
      draw();
      if (typeof root.requestAnimationFrame === 'function') rafId = root.requestAnimationFrame(tick);
    }

    canvas.addEventListener('mousemove', function (e) {
      if (!current || controlMode !== 'lockon') return;
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      var x = rect && rect.width ? ((e.clientX - rect.left) / rect.width) * canvas.width : (e.offsetX != null ? e.offsetX : (e.clientX || 0));
      var y = rect && rect.height ? ((e.clientY - rect.top) / rect.height) * canvas.height : (e.offsetY != null ? e.offsetY : (e.clientY || 0));
      var insideTarget = x >= lastHitBox.x && x <= lastHitBox.x + lastHitBox.w && y >= lastHitBox.y && y <= lastHitBox.y + lastHitBox.h;
      var laneGuess = x < canvas.width * 0.36 ? 0 : x > canvas.width * 0.64 ? 2 : 1;
      if (insideTarget) {
        if (aimLane !== current.lane) setAimLane(current.lane);
      } else if (laneGuess !== aimLane) {
        setAimLane(laneGuess);
      }
    });

    function onKeyDown(e) {
      if (destroyed || !current) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setAimLane(Math.max(0, aimLane - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setAimLane(Math.min(2, aimLane + 1));
        return;
      }
      if (e.target === typeInput) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAnswerAttempt(typeInput.value);
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[A-Za-z0-9]$/.test(e.key)) {
        e.preventDefault();
        keyBuffer += e.key;
        typeInput.value = keyBuffer;
        handleAnswerAttempt(keyBuffer);
      }
    }

    wrap.addEventListener('keydown', onKeyDown);
    typeInput.addEventListener('input', function () {
      var val = typeInput.value.trim();
      if (!val) return;
      var matchState = matchTypedSymbol(val, current);
      if (matchState === 'match' || (val.length >= String(current.answer).length && matchState !== 'prefix')) {
        handleAnswerAttempt(val);
      }
    });
    submitBtn.addEventListener('click', function () {
      handleAnswerAttempt(typeInput.value);
    });

    syncLockState();
    updateUi();
    draw();
    if (current && current.study) playAnchorAudio(current);
    if (!prefersReduced && typeof root.requestAnimationFrame === 'function') {
      rafId = root.requestAnimationFrame(tick);
    }
    if (voiceEnabled) startVoice();

    function destroy() {
      destroyed = true;
      stopVoice();
      if (root.speechSynthesis && typeof root.speechSynthesis.cancel === 'function') {
        try { root.speechSynthesis.cancel(); } catch (_) {}
      }
      if (rafId) { try { root.cancelAnimationFrame(rafId); } catch (_) {} rafId = 0; }
      wrap.removeEventListener('keydown', onKeyDown);
    }

    return {
      destroy: destroy,
      getState: function () {
        return { viewMode: viewMode, controlMode: controlMode, highContrast: highContrast, audioMode: audioMode, aimLane: aimLane, locked: locked, current: current, stats: scheduler.stats() };
      },
      aimLane: setAimLane,
      submit: handleAnswerAttempt,
      playAnchorAudio: playAnchorAudio,
      setPhonemeAudio: function (map) {
        phonemeAudio = map && typeof map === 'object' ? Object.assign({}, map) : {};
        updateUi();
        if (current && current.study) playAnchorAudio(current);
      },
      setLetterAudio: function (map) {
        letterAudio = map && typeof map === 'object' ? Object.assign({}, map) : {};
        updateUi();
        if (current && current.study) playAnchorAudio(current);
      },
      setWordAudio: function (map) {
        wordAudio = map && typeof map === 'object' ? Object.assign({}, map) : {};
        updateUi();
        if (current && current.study) playAnchorAudio(current);
      },
      setAudioMode: function (mode) {
        audioMode = mode === 'name' || mode === 'sound' ? mode : 'auto';
        updateUi();
        if (current && current.study) playAnchorAudio(current);
      },
    };
  }

  function escPrint(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderDotsPrintSvg(dots, watermarkDigit) {
    var pts = getDotsForNumber(dots);
    var wm = watermarkDigit ? '<text x="36" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="44" fill="#cbd5e1">' + escPrint(watermarkDigit) + '</text>' : '';
    var circles = pts.map(function (pt) {
      var x = (36 + pt[0] * 20).toFixed(1);
      var y = (32 + pt[1] * 18).toFixed(1);
      return '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="#0f172a"/>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 64" width="60" height="52" aria-hidden="true">' + wm + circles + '</svg>';
  }

  function safePrintImg(src) {
    var s = String(src == null ? '' : src).trim();
    if (!/^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);/i.test(s)) return '';
    if (/svg\+xml/i.test(s)) {
      var decoded = s;
      var comma = s.indexOf(',');
      if (comma > -1) {
        var body = s.slice(comma + 1);
        if (/;base64/i.test(s.slice(0, comma))) {
          try { decoded = typeof root.atob === 'function' ? root.atob(body) : ''; } catch (_) { return ''; }
        } else {
          try { decoded = decodeURIComponent(body); } catch (_) { decoded = body; }
        }
      }
      if (/<script|<foreignObject|\bon[a-z]+\s*=|javascript:/i.test(decoded)) return '';
    }
    return s;
  }

  function renderPrintPromptHtml(it) {
    if (!it) return '';
    if (it.dots > 0) {
      return renderDotsPrintSvg(it.dots, it.category === 'quantity_stroop' ? it.display : '');
    }
    if (it.category === 'size_stroop' && it.sizePair) {
      var lSz = Math.round(18 * (it.sizePair.leftScale || 1));
      var rSz = Math.round(18 * (it.sizePair.rightScale || 1));
      return '<span style="font-size:' + lSz + 'px">' + escPrint(it.sizePair.left) + '</span> <span style="color:#64748b;font-size:12px">|</span> <span style="font-size:' + rSz + 'px">' + escPrint(it.sizePair.right) + '</span>';
    }
    if (it.category === 'color_stroop') {
      var inkMap = { red: '#b91c1c', blue: '#1d4ed8', green: '#15803d', gold: '#a16207' };
      var ink = inkMap[String(it.answer || '').toLowerCase()] || '#0f172a';
      return '<span style="color:' + ink + '"><span aria-hidden="true">' + escPrint(it.stroopShape || '') + '</span> ' + escPrint(it.stroopWord || it.display) + '</span>';
    }
    if (it.category === 'flanker') {
      var chars = String(it.display || '').split('');
      var mid = it.flankerCenter != null ? it.flankerCenter : Math.floor(chars.length / 2);
      return chars.map(function (ch, ci) {
        return ci === mid ? '<u style="font-weight:900">' + escPrint(ch) + '</u>' : escPrint(ch);
      }).join('');
    }
    return escPrint(it.display);
  }

  function buildPrintableRanSheetHtml(options) {
    var opts = options || {};
    var modeId = opts.modeId || 'confusable_letters';
    var mode = getMode(modeId);
    var title = String(opts.title || ('5x8 Naming Grid - ' + mode.short));
    var sch = createScheduler({
      modeId: mode.id,
      customSymbols: opts.customSymbols,
      pictures: opts.pictures,
      count: 40,
      seed: opts.seed || ('ran-print-' + mode.id),
    });
    var items = sch.peekQueue().slice(0, 40);
    var rowsHtml = [];
    for (var r = 0; r < 5; r++) {
      var cells = [];
      for (var c = 0; c < 8; c++) {
        var idx = r * 8 + c;
        var it = items[idx];
        cells.push('<td class="cell"><span class="idx">' + (idx + 1) + '</span><div class="sym">' + renderPrintPromptHtml(it) + '</div></td>');
      }
      rowsHtml.push('<tr>' + cells.join('') + '</tr>');
    }

    var congCount = items.filter(function (i) { return i && i.congruent === true; }).length;
    var incongCount = items.filter(function (i) { return i && i.congruent === false; }).length;
    var keyItems = items.map(function (it, i) {
      return '<span><b>' + (i + 1) + '.</b> ' + escPrint(it ? it.answer : '') + (it && it.stroopShape ? ' ' + escPrint(it.stroopShape) : '') + '</span>';
    }).join(' ');
    var extraMeta = (congCount || incongCount)
      ? '<p class="meta">Congruent items: ' + congCount + ' | Incongruent items: ' + incongCount + ' | Watch accuracy and latency spikes on incongruent rows.</p>'
      : '';

    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escPrint(title) + '</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;max-width:960px}',
      'h1{font-size:22px;margin:0 0 6px}',
      '.hdr{display:flex;flex-wrap:wrap;gap:18px;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}',
      '.rule{background:#f1f5f9;border-left:4px solid #312e81;padding:8px 12px;margin:0 0 14px;font-size:14px}',
      'table.grid{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:18px}',
      'td.cell{border:2px solid #334155;height:74px;vertical-align:middle;text-align:center;position:relative;padding:4px}',
      '.idx{position:absolute;top:2px;left:4px;font-size:10px;color:#64748b}',
      '.sym{font-size:24px;font-weight:800;line-height:1.1}',
      '.key{border-top:2px dashed #475569;padding-top:12px;margin-top:16px}',
      '.key h2{font-size:15px;margin:0 0 6px}',
      '.key-list{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;line-height:1.5}',
      '.meta{font-size:13px;color:#334155;margin:8px 0}',
      '.partner-check{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;margin-top:8px;color:#1e293b}',
      '.scores{display:flex;flex-wrap:wrap;gap:18px;font-size:14px;margin-top:10px}',
      '@media print{body{margin:10mm} .noprint{display:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<h1>' + escPrint(title) + '</h1>',
      '<div class="hdr"><span>Student: __________________________</span><span>Date: ____________</span><span>Seconds used (max 60 s): ________</span></div>',
      '<p class="rule"><strong>Directions:</strong> Name across each row from left to right as accurately and smoothly as you can. Rule: ' + escPrint(mode.description) + '</p>',
      '<table class="grid" aria-label="5 rows by 8 columns rapid naming sheet">' + rowsHtml.join('') + '</table>',
      '<section class="key">',
      '<h2>Teacher 60-Second Scoring Key</h2>',
      '<div class="key-list">' + keyItems + '</div>',
      extraMeta,
      '<div class="partner-check"><span>Row 1 (1-8): [ ]</span><span>Row 2 (9-16): [ ]</span><span>Row 3 (17-24): [ ]</span><span>Row 4 (25-32): [ ]</span><span>Row 5 (33-40): [ ]</span><span>Self-corrections: ______</span></div>',
      '<div class="scores"><span>Total Named (0-40): ______</span><span>Errors: ______</span><span>Items Correct per 60 s: ______</span></div>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }

  function buildPrintableSymbolCardsHtml(options) {
    var opts = options || {};
    var modeId = opts.modeId || 'confusable_letters';
    var mode = getMode(modeId);
    var title = String(opts.title || ('Symbol Runner Flashcards - ' + mode.short));
    var rawPool = buildModePool(mode.id, opts.customSymbols, opts.pictures);
    var seen = Object.create(null);
    var pool = [];
    for (var i = 0; i < rawPool.length; i++) {
      var item = rawPool[i];
      if (!item) continue;
      var k = String(item.display || '') + '||' + String(item.answer || '');
      if (seen[k]) continue;
      seen[k] = true;
      pool.push(item);
    }
    var cardRows = pool.map(function (it) {
      var pic = safePrintImg(it.picture);
      var picHtml = pic ? '<img class="fc-pic" src="' + escPrint(pic) + '" alt="' + escPrint(it.pictureAlt || it.answer) + '">' : '';
      return '<article class="sr-fc-row">'
        + '<div class="sr-fc-front"><div class="side-tag">Front</div><div class="front-prompt">' + renderPrintPromptHtml(it) + '</div></div>'
        + '<div class="sr-fc-back"><div class="side-tag">Back — Answer</div><div class="back-row">' + picHtml
        + '<div class="back-body"><div class="ans-text">' + escPrint(it.answer) + '</div>'
        + '<div class="rule-text">' + escPrint(it.promptRule || mode.description) + '</div></div></div></div>'
        + '</article>';
    }).join('\n');
    var keyRows = pool.map(function (it, idx) {
      var pic = safePrintImg(it.picture);
      var picInfo = pic ? ('Yes' + (it.pictureCredit ? ' (' + escPrint(it.pictureCredit) + ')' : '')) : 'None';
      return '<tr><td>' + (idx + 1) + '</td><td><strong>' + escPrint(it.display) + '</strong></td><td>' + escPrint(it.answer) + '</td><td>' + picInfo + '</td></tr>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escPrint(title) + ' — Cut-and-Fold Flashcards</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:0 0 8px;color:#1e293b}',
      '.directions{font-size:13px;color:#334155;margin:0 0 14px}',
      '.sr-fc-row{display:grid;grid-template-columns:1fr 1fr;gap:0;border:2px solid #0f172a;margin-bottom:12px;page-break-inside:avoid;break-inside:avoid}',
      '.sr-fc-front,.sr-fc-back{padding:14px;min-height:118px;box-sizing:border-box}',
      '.sr-fc-front{border-right:2px dashed #475569;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}',
      '.side-tag{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:6px}',
      '.front-prompt{font-size:28px;font-weight:800;line-height:1.15}',
      '.back-row{display:flex;gap:12px;align-items:center}',
      '.fc-pic{width:64px;height:64px;object-fit:contain;border:1px solid #cbd5e1;border-radius:6px;background:#fff;flex-shrink:0}',
      '.ans-text{font-size:22px;font-weight:800;color:#1e1b4b;margin-bottom:4px}',
      '.rule-text{font-size:13px;color:#334155;line-height:1.35}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      '@media print{body{margin:10mm} .noprint{display:none} .sr-fc-row{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      '<h1>' + escPrint(title) + ' — Cut-and-Fold Symbol Flashcards</h1>',
      '<p class="directions">Cut across each card row, fold along the vertical dashed line, and tape or glue front to back.</p>',
      cardRows,
      '<section class="teacher-key">',
      '<h2>Teacher Flashcard Summary &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>#</th><th>Prompt</th><th>Answer</th><th>Picture</th></tr></thead><tbody>' + keyRows + '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }

  function buildPrintableCccSheetHtml(options) {
    var opts = options || {};
    var modeId = opts.modeId || 'confusable_letters';
    var mode = getMode(modeId);
    var cleanBangText = function (s) { return String(s == null ? '' : s).replace(/!/g, '.'); };
    var title = cleanBangText(opts.title || ('Cover, Copy, Compare - ' + mode.short));
    var rawPool = buildModePool(mode.id, opts.customSymbols, opts.pictures);
    var seen = Object.create(null);
    var pool = [];
    for (var i = 0; i < rawPool.length; i++) {
      var item = rawPool[i];
      if (!item) continue;
      var k = String(item.display || '') + '||' + String(item.answer || '');
      if (seen[k]) continue;
      seen[k] = true;
      pool.push(item);
      if (pool.length >= 20) break;
    }
    var rowsHtml = pool.map(function (it, idx) {
      var cleanAns = cleanBangText(it.answer || '');
      var pic = safePrintImg(it.picture);
      var picHtml = pic ? '<img class="ccc-pic" src="' + escPrint(pic) + '" alt="' + escPrint(cleanBangText(it.pictureAlt || cleanAns)) + '">' : '';
      var dispText = cleanBangText(it.display || '');
      var promptHtml = it.dots > 0 || it.category === 'size_stroop' || it.category === 'color_stroop' || it.category === 'flanker'
        ? renderPrintPromptHtml(it)
        : escPrint(dispText);
      var modelHtml = dispText && dispText !== cleanAns
        ? (promptHtml + ' &rarr; <strong>' + escPrint(cleanAns) + '</strong>')
        : ('<strong>' + escPrint(cleanAns) + '</strong>');
      return '<tr class="ccc-row">'
        + '<td class="ccc-num">' + (idx + 1) + '</td>'
        + '<td class="ccc-study">' + picHtml + '<span class="ccc-model">' + modelHtml + '</span></td>'
        + '<td class="ccc-write"><div class="write-line"></div></td>'
        + '<td class="ccc-retry"><div class="write-line"></div></td>'
        + '</tr>';
    }).join('\n');
    var keyRows = pool.map(function (it, idx) {
      var pic = safePrintImg(it.picture);
      var picInfo = pic ? ('Yes' + (it.pictureCredit ? ' (' + escPrint(cleanBangText(it.pictureCredit)) + ')' : '')) : 'None';
      return '<tr><td>' + (idx + 1) + '</td><td><strong>' + escPrint(cleanBangText(it.display)) + '</strong></td><td>' + escPrint(cleanBangText(it.answer)) + '</td><td>' + picInfo + '</td></tr>';
    }).join('\n');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escPrint(title) + ' — Cover, Copy, Compare Sheet</title>',
      '<style>',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:20px;max-width:980px}',
      'h1{font-size:20px;margin:0 0 6px}',
      'h2{font-size:15px;margin:0 0 8px;color:#1e293b}',
      '.hdr{display:flex;flex-wrap:wrap;gap:18px;font-size:14px;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px}',
      '.directions{font-size:13px;color:#334155;margin:0 0 12px}',
      '.ccc-table{width:100%;border-collapse:collapse;table-layout:fixed}',
      '.ccc-table th,.ccc-table td{border:2px solid #334155;padding:8px 10px;vertical-align:middle}',
      '.ccc-table th{background:#f1f5f9;font-size:13px;text-align:left}',
      '.ccc-num{width:34px;text-align:center;font-weight:700;color:#475569}',
      '.ccc-study{border-right:2px dashed #475569;font-size:20px;line-height:1.25}',
      '.ccc-pic{width:36px;height:36px;object-fit:contain;vertical-align:middle;margin-right:8px;border:1px solid #cbd5e1;border-radius:4px}',
      '.ccc-model{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.ccc-write,.ccc-retry{height:44px}',
      '.write-line{border-bottom:2px solid #64748b;height:26px;width:100%}',
      '.teacher-key{margin-top:24px;padding-top:14px;border-top:2px solid #0f172a;page-break-before:always;break-before:page}',
      '.key-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}',
      '.key-table th,.key-table td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top}',
      '.key-table th{background:#f1f5f9}',
      '.attr-note{font-size:12px;color:#475569;margin-top:10px}',
      '@media print{body{margin:10mm} .noprint{display:none} .ccc-row{page-break-inside:avoid;break-inside:avoid} .teacher-key{page-break-before:always;break-before:page}}',
      '</style>',
      '</head>',
      '<body>',
      '<h1>' + escPrint(title) + ' — Cover, Copy, Compare Sheet</h1>',
      '<div class="hdr"><span>Student: __________________________</span><span>Date: ____________</span></div>',
      '<p class="directions">1) Look at and say the item aloud. 2) Fold or cover the left column and write from memory in column 2. 3) Uncover to check, then write once more in column 3. ' + escPrint(cleanBangText(mode.description)) + '</p>',
      '<table class="ccc-table" aria-label="Cover, Copy, Compare practice sheet"><thead><tr><th class="ccc-num">#</th><th class="col-study">1. Look &amp; Say (Fold to Cover)</th><th>2. Cover &amp; Write</th><th>3. Check &amp; Write Again</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>',
      '<section class="teacher-key">',
      '<h2>Teacher Cover, Copy, Compare Summary &amp; Attribution Key</h2>',
      '<table class="key-table"><thead><tr><th>#</th><th>Prompt</th><th>Answer</th><th>Picture</th></tr></thead><tbody>' + keyRows + '</tbody></table>',
      '<p class="attr-note">Built-in picture artwork may use Mulberry Symbols or OpenMoji under CC BY-SA 4.0 unless a custom credit is shown above.</p>',
      '</section>',
      '</body>',
      '</html>',
    ].join('\n');
  }

  var api = {
    VERSION: VERSION,
    MODES: MODES,
    DOT_LAYOUTS: DOT_LAYOUTS,
    SPOKEN_MAP: SPOKEN_MAP,
    AUDIO_MODES: AUDIO_MODES,
    PHONEME_AUDIO_MAP: PHONEME_AUDIO_MAP,
    resolveSpokenCueText: resolveSpokenCueText,
    resolvePhonemeAudioUri: resolvePhonemeAudioUri,
    getDotsForNumber: getDotsForNumber,
    getMode: getMode,
    parseCustomSymbols: parseCustomSymbols,
    buildModePool: buildModePool,
    createScheduler: createScheduler,
    matchSpokenSymbol: matchSpokenSymbol,
    matchTypedSymbol: matchTypedSymbol,
    buildSymbolSlidesPack: buildSymbolSlidesPack,
    buildPrintableRanSheetHtml: buildPrintableRanSheetHtml,
    buildPrintableSymbolCardsHtml: buildPrintableSymbolCardsHtml,
    buildPrintableCccSheetHtml: buildPrintableCccSheetHtml,
    mountRunner: mountRunner,
  };

  root.AlloSymbolRunnerCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
