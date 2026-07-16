#!/usr/bin/env node
/**
 * Import curated Project Gutenberg full-text works into the AlloFlow Reading
 * Library. This replaces matching Gutenberg catalog cards when they already
 * exist, or appends new entries to open_catalog.json when they do not.
 *
 * Gutendex is used for metadata and copyright status. Project Gutenberg's
 * plain-text files are used as the text source, with Gutenberg boilerplate
 * stripped and the official source/license URLs preserved in each book.
 *
 * Usage:
 *   node reading_library/import_gutenberg_full_texts.js
 *   node reading_library/import_gutenberg_full_texts.js --ids 23,148,5
 *   node reading_library/import_gutenberg_full_texts.js --dry-run
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const GUTENDEX = 'https://gutendex.com/books/';
const PG_LICENSE = 'https://www.gutenberg.org/policy/license.html';
const UA = 'AlloFlow reading library full-text importer';
const TARGET_WORDS_PER_PAGE = 520;
const MAX_WORDS_PER_PAGE = 760;

// A flat 520-word page turns a 983-word picture book (Peter Rabbit) into a
// 3-page wall of text. Short texts get proportionally shorter pages so they
// read like the booklets they are; novel-length books keep the classic page.
// add_gutenberg_page_images.js --repaginate goes further for illustrated
// books (one page per illustration, clamped to these floors).
function pageTargetsFor(totalWords) {
  if (totalWords < 1200) return { target: 60, max: 100, floor: 30 };
  if (totalWords < 2500) return { target: 120, max: 190, floor: 60 };
  if (totalWords < 10000) return { target: 280, max: 420, floor: 120 };
  return { target: TARGET_WORDS_PER_PAGE, max: MAX_WORDS_PER_PAGE, floor: 140 };
}
const OBSOLETE_GUTENBERG_CARD_IDS = new Set([
  1404, // Duplicate catalog card; curated Federalist full text is #18.
  17405, // Duplicate catalog card; curated Art of War full text is #132.
  57037, // Duplicate catalog card; curated Prince full text is #1232.
  22788, // LibriVox/readme record for The Federalist Papers; full text is #18.
  26590, // Duplicate Vindication of the Rights of Woman card; full text is #3420.
  // 2026-07-16: unillustrated records superseded by illustrated editions of
  // the same complete work (see the matching DEFAULT_IMPORTS entries).
  11,    // Alice in Wonderland — illustrated Rackham edition is #28885.
  16,    // Peter and Wendy — illustrated edition is #26654.
  19,    // The Song of Hiawatha — illustrated edition is #30795.
  45,    // Anne of Green Gables — illustrated edition is #64365.
  55,    // The Wonderful Wizard of Oz — illustrated Denslow edition is #43936.
  146,   // A Little Princess — illustrated edition is #37332.
  289,   // The Wind in the Willows — illustrated edition is #27805.
  514,   // Little Women — illustrated edition is #37106.
  521,   // Robinson Crusoe — illustrated edition is #11239.
  730,   // Oliver Twist — illustrated Cruikshank edition is #46675.
  764,   // Hans Brinker — illustrated edition is #34378.
  1597,  // Andersen's Fairy Tales — illustrated collection is #66688.
  2226,  // Kim — illustrated edition is #35555.
  2781,  // Just So Stories — Kipling's own illustrated edition is #32488.
  4650,  // Candide (fr) — illustrated edition is #59859.
  5097,  // Vingt mille lieues (fr) — Neuville-illustrated edition is #54873.
  800,   // Le Tour du monde (fr) — illustrated edition is #46541.
]);

const DEFAULT_IMPORTS = [
  {
    id: 1,
    subjects: ['United States history', 'Civics', 'Primary sources'],
    description: 'A full in-app public-domain copy of the Declaration of Independence for civics and history study.',
  },
  {
    id: 5,
    subjects: ['United States government', 'Civics', 'Primary sources'],
    description: 'A full in-app public-domain copy of the United States Constitution for civics and history study.',
  },
  {
    id: 147,
    subjects: ['American Revolution', 'Political writing', 'Primary sources'],
    description: 'A full in-app public-domain copy of Thomas Paine\'s Common Sense for older-student history study.',
  },
  {
    id: 23,
    subjects: ['Abolition', 'Memoir', 'United States history'],
    description: 'A full in-app public-domain copy of Frederick Douglass\'s narrative for older-student reading and research.',
  },
  {
    id: 11030,
    subjects: ['Abolition', 'Memoir', 'United States history'],
    description: 'A full in-app public-domain copy of Harriet Jacobs\'s memoir for older-student reading and research.',
  },
  {
    id: 15399,
    subjects: ['Abolition', 'Memoir', 'Atlantic world history'],
    description: 'A full in-app public-domain copy of Olaudah Equiano\'s narrative for older-student reading and research.',
  },
  {
    id: 148,
    subjects: ['Autobiography', 'United States history', 'Civic life'],
    description: 'A full in-app public-domain copy of Benjamin Franklin\'s autobiography for older-student reading and research.',
  },
  {
    id: 205,
    subjects: ['Nature writing', 'Civil disobedience', 'American literature'],
    description: 'A full in-app public-domain copy of Walden and Civil Disobedience for older-student reading and research.',
  },
  {
    id: 408,
    subjects: ['Sociology', 'United States history', 'Essays'],
    description: 'A full in-app public-domain copy of The Souls of Black Folk for older-student reading and research.',
  },
  {
    id: 245,
    subjects: ['Memoir', 'Travel writing', 'United States history'],
    description: 'A full in-app public-domain copy of Life on the Mississippi for older-student reading and research.',
  },
  {
    id: 18,
    subjects: ['United States government', 'Political writing', 'Primary sources'],
    description: 'A full in-app public-domain copy of The Federalist Papers for civics and history study.',
  },
  {
    id: 3420,
    subjects: ['Women\'s rights', 'Philosophy', 'Social history'],
    description: 'A full in-app public-domain copy of A Vindication of the Rights of Woman for older-student reading and research.',
  },
  {
    id: 1232,
    subjects: ['Political philosophy', 'World history', 'Primary sources'],
    description: 'A full in-app public-domain copy of The Prince for older-student political philosophy and history study.',
  },
  {
    id: 132,
    subjects: ['World history', 'Strategy', 'Classical texts'],
    description: 'A full in-app public-domain copy of The Art of War for older-student history and source-text study.',
  },
  {
    id: 26095,
    subjects: ['Ancient history', 'Government', 'Classical texts'],
    description: 'A full in-app public-domain copy of The Athenian Constitution for older-student source-text study.',
  },
  {
    id: 7370,
    subjects: ['Political philosophy', 'Government', 'Primary sources'],
    description: 'A full in-app public-domain copy of Locke\'s Second Treatise of Government for older-student civics study.',
  },
  {
    id: 1497,
    subjects: ['Political philosophy', 'Classical texts', 'World history'],
    description: 'A full in-app public-domain copy of Plato\'s Republic for older-student philosophy and source-text study.',
  },
  {
    id: 1974,
    subjects: ['Literary criticism', 'Classical texts', 'World history'],
    description: 'A full in-app public-domain copy of Aristotle\'s Poetics for older-student humanities study.',
  },
  {
    id: 1674,
    subjects: ['Abolition', 'Memoir', 'United States history'],
    description: 'A full in-app public-domain copy of Sojourner Truth\'s narrative for older-student history and memoir study.',
  },
  {
    id: 2376,
    subjects: ['Memoir', 'Education', 'United States history'],
    description: 'A full in-app public-domain copy of Booker T. Washington\'s Up from Slavery for older-student history study.',
  },
  {
    id: 45631,
    subjects: ['Abolition', 'Memoir', 'United States history'],
    description: 'A full in-app public-domain copy of Twelve Years a Slave for older-student primary-source study.',
  },
  {
    id: 10376,
    subjects: ['Native American history', 'Memoir', 'Essays'],
    description: 'A full in-app public-domain copy of Zitkala-Sa\'s American Indian Stories for older-student history and literature study.',
  },
  {
    id: 2397,
    subjects: ['Disability history', 'Memoir', 'Education'],
    description: 'A full in-app public-domain copy of Helen Keller\'s The Story of My Life for memoir and disability-history study.',
  },
  {
    id: 1228,
    subjects: ['Biology', 'Evolution', 'History of science'],
    description: 'A full in-app public-domain copy of Darwin\'s On the Origin of Species for older-student science and history-of-science study.',
  },
  {
    id: 30155,
    subjects: ['Physics', 'Relativity', 'History of science'],
    description: 'A full in-app public-domain copy of Einstein\'s Relativity for older-student physics and science-history study.',
  },
  {
    id: 201,
    subjects: ['Mathematics', 'Geometry', 'Satire'],
    description: 'A full in-app public-domain copy of Flatland for older-student geometry, perspective, and satire study.',
  },
  {
    id: 815,
    subjects: ['Civics', 'Political science', 'United States history'],
    description: 'A full in-app public-domain copy of Democracy in America, Volume 1, for civics and political-science study.',
  },
  {
    id: 34901,
    subjects: ['Civics', 'Political philosophy', 'Liberty'],
    description: 'A full in-app public-domain copy of On Liberty for older-student civics and philosophy study.',
  },
  {
    id: 84,
    subjects: ['Literature', 'Science ethics', 'Gothic fiction'],
    description: 'A full in-app public-domain copy of Frankenstein for literature and science-ethics study.',
  },
  {
    id: 1342,
    subjects: ['Literature', 'Social class', 'British literature'],
    description: 'A full in-app public-domain copy of Pride and Prejudice for older-student literature study.',
  },
  {
    id: 14977,
    subjects: ['Civil rights', 'United States history', 'Statistics'],
    description: 'A full in-app public-domain copy of Ida B. Wells-Barnett\'s The Red Record for older-student history and data-literacy study.',
  },
  {
    id: 31193,
    subjects: ['Political philosophy', 'World history', 'Primary sources'],
    description: 'A full in-app public-domain copy of Manifesto of the Communist Party for older-student history and political-thought study.',
  },
  {
    id: 5827,
    subjects: ['Philosophy', 'Epistemology', 'Critical thinking'],
    description: 'A full in-app public-domain copy of Bertrand Russell\'s The Problems of Philosophy for older-student philosophy study.',
  },
  {
    id: 2680,
    subjects: ['Philosophy', 'Classical texts', 'Ethics'],
    description: 'A full in-app public-domain copy of Marcus Aurelius\'s Meditations for older-student philosophy and ethics study.',
  },
  {
    id: 1952,
    subjects: ['Literature', 'Women\'s history', 'Mental health'],
    description: 'A full in-app public-domain copy of The Yellow Wallpaper for older-student literature and gender-history study.',
  },
  {
    id: 160,
    subjects: ['Literature', 'Women\'s history', 'American literature'],
    description: 'A full in-app public-domain copy of The Awakening for older-student American literature study.',
  },
  {
    id: 1260,
    subjects: ['Literature', 'British literature', 'Coming of age'],
    description: 'A full in-app public-domain copy of Jane Eyre for older-student literature study.',
  },
  {
    id: 2701,
    subjects: ['Literature', 'Maritime history', 'American literature'],
    description: 'A full in-app public-domain copy of Moby-Dick for older-student literature and historical-context study.',
  },
  {
    id: 1400,
    subjects: ['Literature', 'Social class', 'British literature'],
    description: 'A full in-app public-domain copy of Great Expectations for older-student literature study.',
  },
  {
    id: 35,
    subjects: ['Science fiction', 'Evolution', 'Social criticism'],
    description: 'A full in-app public-domain copy of The Time Machine for older-student science fiction and social-criticism study.',
  },
  {
    id: 36,
    subjects: ['Science fiction', 'Imperialism', 'British literature'],
    description: 'A full in-app public-domain copy of The War of the Worlds for older-student science fiction study.',
  },
  {
    id: 120,
    subjects: ['Literature', 'Adventure', 'British literature'],
    description: 'A full in-app public-domain copy of Treasure Island for upper-elementary and older-student literature study.',
  },
  {
    id: 76,
    subjects: ['Literature', 'United States history', 'American literature'],
    description: 'A full in-app public-domain copy of Adventures of Huckleberry Finn for older-student literature study.',
  },
  {
    id: 345,
    subjects: ['Literature', 'Gothic fiction', 'British literature'],
    description: 'A full in-app public-domain copy of Dracula for older-student literature study.',
  },
  {
    id: 202,
    subjects: ['Abolition', 'Memoir', 'United States history'],
    description: 'A full in-app public-domain copy of Frederick Douglass\'s My Bondage and My Freedom for older-student history and memoir study.',
  },
  {
    id: 57821,
    subjects: ['Abolition', 'Biography', 'United States history'],
    description: 'A full in-app public-domain copy of Scenes in the Life of Harriet Tubman for older-student history and biography study.',
  },
  {
    id: 4367,
    subjects: ['United States history', 'Civil War', 'Memoir'],
    description: 'A full in-app public-domain copy of Personal Memoirs of U. S. Grant for older-student Civil War and memoir study.',
  },
  {
    id: 8419,
    subjects: ['United States history', 'Exploration', 'Primary sources'],
    description: 'A full in-app public-domain copy of The Journals of Lewis and Clark for older-student history and primary-source study.',
  },
  {
    id: 851,
    subjects: ['Colonial America', 'Memoir', 'Primary sources'],
    description: 'A full in-app public-domain copy of Mary Rowlandson\'s captivity narrative for older-student colonial history study.',
  },
  {
    id: 3300,
    subjects: ['Economics', 'Political economy', 'World history'],
    description: 'A full in-app public-domain copy of The Wealth of Nations for older-student economics and history study.',
  },
  {
    id: 3207,
    subjects: ['Political philosophy', 'Government', 'Primary sources'],
    description: 'A full in-app public-domain copy of Leviathan for older-student political philosophy and civics study.',
  },
  {
    id: 1170,
    subjects: ['Classical texts', 'Ancient history', 'Military history'],
    description: 'A full in-app public-domain copy of Xenophon\'s Anabasis for older-student classical history study.',
  },
  {
    id: 2199,
    subjects: ['Classical texts', 'Epic poetry', 'World literature'],
    description: 'A full in-app public-domain copy of The Iliad for older-student literature and classical studies.',
  },
  {
    id: 6400,
    subjects: ['Ancient history', 'Biography', 'Classical texts'],
    description: 'A full in-app public-domain copy of The Lives of the Twelve Caesars for older-student ancient history study.',
  },
  {
    id: 10636,
    subjects: ['World history', 'Travel writing', 'Primary sources'],
    description: 'A full in-app public-domain copy of The Travels of Marco Polo, Volume 1, for older-student world history study.',
  },
  {
    id: 2087,
    subjects: ['Biology', 'History of science', 'Biography'],
    description: 'A full in-app public-domain copy of Life and Letters of Charles Darwin, Volume 1, for older-student science-history study.',
  },
  {
    id: 51356,
    subjects: ['Philosophy', 'Classical studies', 'Literary criticism'],
    description: 'A full in-app public-domain copy of The Birth of Tragedy for older-student philosophy and humanities study.',
  },
  {
    id: 98,
    subjects: ['Literature', 'French Revolution', 'Historical fiction'],
    description: 'A full in-app public-domain copy of A Tale of Two Cities for older-student literature and historical-context study.',
  },
  {
    id: 25344,
    subjects: ['Literature', 'Colonial America', 'American literature'],
    description: 'A full in-app public-domain copy of The Scarlet Letter for older-student American literature study.',
  },
  {
    id: 73,
    subjects: ['Literature', 'Civil War', 'American literature'],
    description: 'A full in-app public-domain copy of The Red Badge of Courage for older-student literature and Civil War context study.',
  },
  {
    id: 64365,
    subjects: ['Literature', 'Coming of age', 'Canadian literature'],
    description: 'A full in-app public-domain copy of Anne of Green Gables for middle-grade and older-student literature study.',
  },
  {
    id: 236,
    subjects: ['Literature', 'Adventure', 'British literature'],
    description: 'A full in-app public-domain copy of The Jungle Book for middle-grade and older-student literature study.',
  },
  {
    id: 421,
    subjects: ['Literature', 'Adventure', 'Scottish history'],
    description: 'A full in-app public-domain copy of Kidnapped for older-student literature and historical-context study.',
  },
  {
    id: 271,
    subjects: ['Literature', 'Animal welfare', 'Historical fiction'],
    description: 'A full in-app public-domain copy of Black Beauty for middle-grade and older-student literature study.',
  },
  {
    id: 174,
    subjects: ['Literature', 'Aestheticism', 'British literature'],
    description: 'A full in-app public-domain copy of The Picture of Dorian Gray for older-student literature study.',
  },
  {
    id: 28885,
    subjects: ['Literature', 'Fantasy', 'British literature'],
    description: 'A full in-app public-domain copy of Alice\'s Adventures in Wonderland for middle-grade and older-student literature study.',
  },
  {
    id: 43936,
    subjects: ['Literature', 'Fantasy', 'American literature'],
    description: 'A full in-app public-domain copy of The Wonderful Wizard of Oz for middle-grade and older-student literature study.',
  },
  {
    id: 1661,
    subjects: ['Literature', 'Mystery', 'British literature'],
    description: 'A full in-app public-domain copy of The Adventures of Sherlock Holmes for older-student mystery and literature study.',
  },
  {
    id: 2554,
    subjects: ['Literature', 'Psychology', 'World literature'],
    description: 'A full in-app public-domain copy of Crime and Punishment for older-student world literature study.',
  },
  {
    id: 28054,
    subjects: ['Literature', 'Ethics', 'World literature'],
    description: 'A full in-app public-domain copy of The Brothers Karamazov for older-student world literature and ethics study.',
  },
  {
    id: 4363,
    subjects: ['Philosophy', 'Ethics', 'European literature'],
    description: 'A full in-app public-domain copy of Beyond Good and Evil for older-student philosophy study.',
  },
  {
    id: 1998,
    subjects: ['Philosophy', 'World literature', 'Ethics'],
    description: 'A full in-app public-domain copy of Thus Spake Zarathustra for older-student philosophy and literature study.',
  },
  {
    id: 880,
    subjects: ['Nature writing', 'Essays', 'American literature'],
    description: 'A full in-app public-domain copy of My Garden Acquaintance for older-student nature writing and essay study.',
  },
  {
    id: 1004,
    subjects: ['Literature', 'Epic poetry', 'World literature'],
    description: 'A full in-app public-domain copy of Divine Comedy, Longfellow\'s Translation, Complete, for older-student world literature study.',
  },
  {
    id: 100,
    subjects: ['Drama', 'Poetry', 'British literature'],
    description: 'A full in-app public-domain copy of The Complete Works of William Shakespeare for older-student drama and literature study.',
  },
  // ---- 2026-07-07 batch: classroom classics for younger/middle readers ----
  // (the original canon skewed civics + upper-grade; these fill Gr 3-8.
  //  IDs verified against gutenberg.org at import time — the importer prints
  //  each fetched title; prune any mismatch and re-run.)
  {
    id: 74,
    subjects: ['Fiction', 'Adventure', 'American literature'],
    description: 'A full in-app public-domain copy of The Adventures of Tom Sawyer for middle-grade reading.',
  },
  {
    id: 26654,
    subjects: ['Fiction', 'Fantasy', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Peter Pan for younger and middle-grade reading.',
  },
  {
    id: 113,
    subjects: ['Fiction', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of The Secret Garden for middle-grade reading.',
  },
  {
    id: 37106,
    subjects: ['Fiction', 'Family', 'American literature'],
    description: 'A full in-app public-domain copy of Little Women for middle-grade reading.',
  },
  {
    id: 2591,
    subjects: ['Fairy tales', 'Folklore', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Grimms\' Fairy Tales for younger and middle-grade reading.',
  },
  {
    id: 21,
    subjects: ['Fables', 'Folklore', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Aesop\'s Fables for younger readers and moral-lesson study.',
  },
  {
    id: 43,
    subjects: ['Fiction', 'Gothic', 'British literature'],
    description: 'A full in-app public-domain copy of The Strange Case of Dr. Jekyll and Mr. Hyde for older-student reading.',
  },
  {
    id: 41,
    subjects: ['Fiction', 'American literature', 'Short stories'],
    description: 'A full in-app public-domain copy of The Legend of Sleepy Hollow for middle-grade reading.',
  },
  {
    id: 27805,
    subjects: ['Fiction', 'Animals', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of The Wind in the Willows for younger and middle-grade reading.',
  },
  {
    id: 902,
    subjects: ['Fairy tales', 'Short stories', 'British literature'],
    description: 'A full in-app public-domain copy of The Happy Prince and Other Tales for middle-grade reading.',
  },
  {
    id: 244,
    subjects: ['Fiction', 'Mystery', 'British literature'],
    description: 'A full in-app public-domain copy of A Study in Scarlet for older-student mystery reading.',
  },
  {
    id: 215,
    subjects: ['Fiction', 'Animals', 'Adventure'],
    description: 'A full in-app public-domain copy of The Call of the Wild for middle-grade adventure reading.',
  },
  {
    id: 46,
    subjects: ['Fiction', 'Holidays', 'British literature'],
    description: 'A full in-app public-domain copy of A Christmas Carol for middle-grade reading.',
  },
  {
    id: 829,
    subjects: ['Fiction', 'Satire', 'Adventure'],
    description: 'A full in-app public-domain copy of Gulliver\'s Travels for older-student reading.',
  },
  {
    id: 12,
    subjects: ['Fiction', 'Fantasy', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Through the Looking-Glass for younger and middle-grade reading.',
  },
  {
    id: 1322,
    subjects: ['Poetry', 'American literature'],
    description: 'A full in-app public-domain copy of Leaves of Grass for older-student poetry study.',
  },
  {
    id: 11239,
    subjects: ['Fiction', 'Adventure', 'Survival'],
    description: 'A full in-app public-domain copy of Robinson Crusoe for older-student adventure reading.',
  },
  {
    id: 103,
    subjects: ['Fiction', 'Adventure', 'Geography'],
    description: 'A full in-app public-domain copy of Around the World in Eighty Days for middle-grade adventure reading.',
  },
  {
    id: 164,
    subjects: ['Fiction', 'Science fiction', 'Ocean'],
    description: 'A full in-app public-domain copy of Twenty Thousand Leagues Under the Seas for middle-grade science-adventure reading.',
  },
  {
    id: 768,
    subjects: ['Fiction', 'Gothic', 'British literature'],
    description: 'A full in-app public-domain copy of Wuthering Heights for older-student literature study.',
  },
  {
    id: 1727,
    subjects: ['Epic poetry', 'Mythology', 'World literature'],
    description: 'A full in-app public-domain copy of The Odyssey (Butler translation) for older-student mythology and literature study.',
  },
  {
    id: 14838,
    subjects: ['Fiction', 'Animals', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of The Tale of Peter Rabbit for early readers.',
  },
  {
    id: 14474,
    subjects: ['Science', 'Chemistry', 'Lectures'],
    description: 'A full in-app public-domain copy of Faraday\'s The Chemical History of a Candle for older-student science reading.',
  },
  {
    id: 32,
    subjects: ['Fiction', 'Utopian literature', 'American literature'],
    description: 'A full in-app public-domain copy of Herland for older-student literature and social-studies discussion.',
  },
  {
    id: 67098,
    subjects: ['Fiction', 'Animals', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Winnie-the-Pooh for early and middle-grade readers.',
  },
  // ---- 2026-07-11 batch: canonical classroom classics still sitting as
  //  Gutenberg catalog-card stubs. IDs verified to have a usable UTF-8 full
  //  text via --dry-run before committing (the importer prints each fetched
  //  title; prune any mismatch/short-text and re-run). Several pair with a
  //  full text we already ship (Anne of Green Gables #45, Little Women #514,
  //  Kidnapped #421) to complete a series.
  {
    id: 46409,
    subjects: ['Fiction', 'Family', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Heidi for middle-grade reading.',
  },
  {
    id: 1450,
    subjects: ['Fiction', 'Optimism', 'Children\'s literature'],
    description: 'A full in-app public-domain copy of Pollyanna for middle-grade reading.',
  },
  {
    id: 47,
    subjects: ['Fiction', 'Coming of age', 'Canadian literature'],
    description: 'A full in-app public-domain copy of Anne of Avonlea for middle-grade and older-student reading.',
  },
  {
    id: 51,
    subjects: ['Fiction', 'Coming of age', 'Canadian literature'],
    description: 'A full in-app public-domain copy of Anne of the Island for middle-grade and older-student reading.',
  },
  {
    id: 544,
    subjects: ['Fiction', 'Family', 'Canadian literature'],
    description: 'A full in-app public-domain copy of Anne\'s House of Dreams for older-student reading.',
  },
  {
    id: 5343,
    subjects: ['Fiction', 'Family', 'Canadian literature'],
    description: 'A full in-app public-domain copy of Rainbow Valley for middle-grade and older-student reading.',
  },
  {
    id: 67979,
    subjects: ['Fiction', 'Coming of age', 'Canadian literature'],
    description: 'A full in-app public-domain copy of The Blue Castle for older-student reading.',
  },
  {
    id: 2788,
    subjects: ['Fiction', 'Family', 'American literature'],
    description: 'A full in-app public-domain copy of Little Men for middle-grade reading.',
  },
  {
    id: 82,
    subjects: ['Fiction', 'Chivalry', 'British literature'],
    description: 'A full in-app public-domain copy of Ivanhoe for older-student literature and medieval-history study.',
  },
  {
    id: 60,
    subjects: ['Fiction', 'French Revolution', 'Adventure'],
    description: 'A full in-app public-domain copy of The Scarlet Pimpernel for older-student adventure and historical-context reading.',
  },
  {
    id: 940,
    subjects: ['Fiction', 'Colonial America', 'Adventure'],
    description: 'A full in-app public-domain copy of The Last of the Mohicans for older-student literature and history study.',
  },
  {
    id: 1184,
    subjects: ['Fiction', 'Adventure', 'French literature'],
    description: 'A full in-app public-domain copy of The Count of Monte Cristo for older-student literature study.',
  },
  {
    id: 1257,
    subjects: ['Fiction', 'Adventure', 'French literature'],
    description: 'A full in-app public-domain copy of The Three Musketeers for older-student literature study.',
  },
  {
    id: 26027,
    subjects: ['Fiction', 'History', 'British literature'],
    description: 'A full in-app public-domain copy of Puck of Pook\'s Hill for middle-grade and older-student reading.',
  },
  {
    id: 589,
    subjects: ['Fiction', 'Adventure', 'Scottish history'],
    description: 'A full in-app public-domain copy of Catriona (the sequel to Kidnapped) for older-student literature study.',
  },
  // ---- 2026-07-11 batch 2 (widen): more K-8 children's/middle-grade, world
  //  literature, mythology, and diverse voices. IDs resolved via gutendex
  //  search then hand-corrected where search returned a partial/wrong edition
  //  (Doctor Dolittle 27168->501, Wonder-Book excerpt 9255->979 full, Oliver
  //  Twist Vol.2 47530->730 complete, Arabian Nights vol 34206->128 one-vol).
  //  Verified by --dry-run (importer prints title + word count).
  { id: 500, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of The Adventures of Pinocchio for early and middle-grade reading.' },
  { id: 501, subjects: ['Fiction', 'Animals', "Children's literature"], description: 'A full in-app public-domain copy of The Story of Doctor Dolittle for early and middle-grade reading.' },
  { id: 37332, subjects: ['Fiction', 'Coming of age', "Children's literature"], description: 'A full in-app public-domain copy of A Little Princess for middle-grade reading.' },
  { id: 1874, subjects: ['Fiction', 'Family', "Children's literature"], description: 'A full in-app public-domain copy of The Railway Children for middle-grade reading.' },
  { id: 17314, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of Five Children and It for middle-grade reading.' },
  { id: 225, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of At the Back of the North Wind for middle-grade reading.' },
  { id: 25564, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of The Water-Babies for middle-grade reading.' },
  { id: 78017, subjects: ['Fiction', 'Adventure', "Children's literature"], description: 'A full in-app public-domain copy of The Swiss Family Robinson for middle-grade adventure reading.' },
  { id: 32488, subjects: ['Fiction', 'Folklore', "Children's literature"], description: 'A full in-app public-domain copy of Just So Stories for early and middle-grade reading.' },
  { id: 503, subjects: ['Fairy tales', 'Folklore', "Children's literature"], description: 'A full in-app public-domain copy of The Blue Fairy Book for younger readers.' },
  { id: 54, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of The Marvelous Land of Oz for middle-grade reading.' },
  { id: 33361, subjects: ['Fiction', 'Fantasy', "Children's literature"], description: 'A full in-app public-domain copy of Ozma of Oz for middle-grade reading.' },
  { id: 1837, subjects: ['Fiction', 'Historical fiction', "Children's literature"], description: 'A full in-app public-domain copy of The Prince and the Pauper for middle-grade reading.' },
  { id: 498, subjects: ['Fiction', 'Family', "Children's literature"], description: 'A full in-app public-domain copy of Rebecca of Sunnybrook Farm for middle-grade reading.' },
  { id: 34378, subjects: ['Fiction', 'Family', "Children's literature"], description: 'A full in-app public-domain copy of Hans Brinker, or The Silver Skates for middle-grade reading.' },
  { id: 10148, subjects: ['Fiction', 'Adventure', 'Legends'], description: 'A full in-app public-domain copy of The Merry Adventures of Robin Hood for middle-grade adventure reading.' },
  { id: 910, subjects: ['Fiction', 'Animals', 'Adventure'], description: 'A full in-app public-domain copy of White Fang for older-student adventure reading.' },
  { id: 35555, subjects: ['Fiction', 'Adventure', 'India'], description: 'A full in-app public-domain copy of Kim for older-student literature and history study.' },
  { id: 1268, subjects: ['Fiction', 'Science fiction', 'Adventure'], description: 'A full in-app public-domain copy of The Mysterious Island for older-student adventure reading.' },
  { id: 5230, subjects: ['Fiction', 'Science fiction', 'British literature'], description: 'A full in-app public-domain copy of The Invisible Man for older-student science-fiction reading.' },
  { id: 159, subjects: ['Fiction', 'Science fiction', 'Science ethics'], description: 'A full in-app public-domain copy of The Island of Doctor Moreau for older-student science-fiction and ethics study.' },
  { id: 1259, subjects: ['Fiction', 'Adventure', 'French literature'], description: 'A full in-app public-domain copy of Twenty Years After (sequel to The Three Musketeers) for older-student reading.' },
  { id: 135, subjects: ['Fiction', 'Social justice', 'French literature'], description: 'A full in-app public-domain copy of Les Miserables for older-student literature and social-history study.' },
  { id: 1399, subjects: ['Fiction', 'Society', 'Russian literature'], description: 'A full in-app public-domain copy of Anna Karenina for older-student world-literature study.' },
  { id: 46675, subjects: ['Fiction', 'Social class', 'British literature'], description: 'A full in-app public-domain copy of Oliver Twist for older-student literature study.' },
  { id: 766, subjects: ['Fiction', 'Coming of age', 'British literature'], description: 'A full in-app public-domain copy of David Copperfield for older-student literature study.' },
  { id: 219, subjects: ['Fiction', 'Imperialism', 'World literature'], description: 'A full in-app public-domain copy of Heart of Darkness for older-student literature and colonial-history study.' },
  { id: 19942, subjects: ['Fiction', 'Satire', 'Philosophy'], description: 'A full in-app public-domain copy of Candide for older-student philosophy and satire study.' },
  { id: 56644, subjects: ['Mythology', 'Classical studies', 'Folklore'], description: 'A full in-app public-domain copy of Bulfinch\'s Mythology (The Age of Fable) for mythology study.' },
  { id: 11582, subjects: ['Mythology', 'Ancient history', 'Folklore'], description: 'A full in-app public-domain copy of Old Greek Stories for middle-grade mythology reading.' },
  { id: 128, subjects: ['Folklore', 'Fairy tales', 'World literature'], description: 'A full in-app public-domain copy of The Arabian Nights\' Entertainments for middle-grade and older-student reading.' },
  { id: 3748, subjects: ['Fiction', 'Science fiction', 'Adventure'], description: 'A full in-app public-domain copy of A Journey to the Centre of the Earth for middle-grade and older-student reading.' },
  { id: 996, subjects: ['Fiction', 'Satire', 'Spanish literature'], description: 'A full in-app public-domain copy of Don Quixote for older-student world-literature study.' },
  { id: 203, subjects: ['Fiction', 'Abolition', 'American literature'], description: 'A full in-app public-domain copy of Uncle Tom\'s Cabin for older-student literature and history study.' },
  { id: 11012, subjects: ['Fiction', 'Civil rights', 'American literature'], description: 'A full in-app public-domain copy of The Autobiography of an Ex-Colored Man for older-student literature and history study.' },
  { id: 944, subjects: ['Science', 'Natural history', 'Exploration'], description: 'A full in-app public-domain copy of The Voyage of the Beagle for older-student science and exploration reading.' },
  // ---- 2026-07-11 batch 3 (curated, not bulk): individual Shakespeare plays
  //  (far more usable per-assignment than the Complete Works blob), non-Western
  //  classics, world folklore, and diverse voices. All titles verified by
  //  --dry-run. Cyrano #1256 dropped (French-language record, importer is
  //  English-only).
  // #47960 looked like an illustrated Romeo and Juliet but is a 77k-word
  // variorum (a bare play is ~26k) — the plain #1513 text stays.
  { id: 1513, subjects: ['Drama', 'Tragedy', 'British literature'], description: 'A full in-app public-domain copy of Romeo and Juliet for older-student drama study.' },
  { id: 1524, subjects: ['Drama', 'Tragedy', 'British literature'], description: 'A full in-app public-domain copy of Hamlet for older-student drama study.' },
  { id: 1533, subjects: ['Drama', 'Tragedy', 'British literature'], description: 'A full in-app public-domain copy of Macbeth for older-student drama study.' },
  { id: 1522, subjects: ['Drama', 'History', 'British literature'], description: 'A full in-app public-domain copy of Julius Caesar for older-student drama and history study.' },
  { id: 1514, subjects: ['Drama', 'Comedy', 'British literature'], description: 'A full in-app public-domain copy of A Midsummer Night\'s Dream for older-student drama study.' },
  { id: 1515, subjects: ['Drama', 'Comedy', 'British literature'], description: 'A full in-app public-domain copy of The Merchant of Venice for older-student drama study.' },
  { id: 2267, subjects: ['Drama', 'Tragedy', 'British literature'], description: 'A full in-app public-domain copy of Othello for older-student drama study.' },
  { id: 216, subjects: ['Philosophy', 'World religions', 'Classical texts'], description: 'A full in-app public-domain copy of the Tao Te Ching for older-student philosophy and world-religions study.' },
  { id: 3330, subjects: ['Philosophy', 'World religions', 'Classical texts'], description: 'A full in-app public-domain copy of The Analects of Confucius for older-student philosophy and world-history study.' },
  { id: 7164, subjects: ['Poetry', 'World religions', 'World literature'], description: 'A full in-app public-domain copy of Tagore\'s Gitanjali for older-student poetry and world-literature study.' },
  { id: 4018, subjects: ['Folklore', 'Fairy tales', 'World literature'], description: 'A full in-app public-domain copy of Japanese Fairy Tales for middle-grade world-folklore reading.' },
  { id: 7128, subjects: ['Folklore', 'Fairy tales', 'World literature'], description: 'A full in-app public-domain copy of Indian Fairy Tales for middle-grade world-folklore reading.' },
  { id: 7439, subjects: ['Folklore', 'Fairy tales', 'British literature'], description: 'A full in-app public-domain copy of English Fairy Tales for middle-grade folklore reading.' },
  { id: 66688, subjects: ['Fairy tales', 'Folklore', "Children's literature"], description: 'A full in-app public-domain copy of Andersen\'s Fairy Tales for younger and middle-grade reading.' },
  { id: 30795, subjects: ['Poetry', 'Native American culture', 'American literature'], description: 'A full in-app public-domain copy of The Song of Hiawatha for older-student poetry study.' },
  { id: 11666, subjects: ['Fiction', 'African American literature', 'Folklore'], description: 'A full in-app public-domain copy of Charles Chesnutt\'s The Conjure Woman for older-student literature and history study.' },
  { id: 2542, subjects: ['Drama', "Women's history", 'World literature'], description: 'A full in-app public-domain copy of Ibsen\'s A Doll\'s House for older-student drama study.' },
  { id: 844, subjects: ['Drama', 'Comedy', 'British literature'], description: 'A full in-app public-domain copy of The Importance of Being Earnest for older-student drama study.' },
  { id: 3825, subjects: ['Drama', 'Social class', 'British literature'], description: 'A full in-app public-domain copy of Shaw\'s Pygmalion for older-student drama study.' },
  // ---- 2026-07-12 batch: complete the multi-volume works whose Volume 1 we
  //  already mirror in full (their Volume 2s were sitting as catalog-card
  //  stubs — the importer replaces a matching card in place).
  { id: 12410, subjects: ['World history', 'Travel writing', 'Primary sources'], description: 'A full in-app public-domain copy of The Travels of Marco Polo, Volume 2, for older-student world history study.' },
  { id: 816, subjects: ['Civics', 'Political science', 'United States history'], description: 'A full in-app public-domain copy of Democracy in America, Volume 2, for civics and political-science study.' },
  { id: 2088, subjects: ['Biology', 'History of science', 'Biography'], description: 'A full in-app public-domain copy of Life and Letters of Charles Darwin, Volume 2, for older-student science-history study.' },
  // ---- 2026-07-12 batch 2: non-English classics (the importer has been
  //  language-aware since the Find-more work, but the catalog had ~0
  //  non-English full texts). Serves heritage/world-language readers —
  //  French and Portuguese in particular match Portland ME's Congolese and
  //  Angolan communities. `level` is hand-assigned (assign_levels.js is
  //  FK/English-only and skips these). IDs text-verified via gutendex
  //  resolver + --dry-run. Skipped as no-plain-text on PG: Don Quijote (es),
  //  Contes de Perrault (fr), Cyrano (fr); skipped as multi-volume: Le comte
  //  de Monte-Cristo (fr, 4 tomes).
  { id: 9980, level: '5', subjects: ['Spanish language', 'Poetry', 'Animals'], description: 'A full in-app public-domain copy of Platero y yo, in the original Spanish, for heritage and world-language readers.' },
  { id: 320, level: '6', subjects: ['Spanish language', 'Fiction', 'Picaresque'], description: 'A full in-app public-domain copy of Lazarillo de Tormes, in the original Spanish, for heritage and world-language readers.' },
  { id: 13951, level: '6', subjects: ['French language', 'Fiction', 'Adventure'], description: 'A full in-app public-domain copy of Les Trois Mousquetaires, in the original French, for heritage and world-language readers.' },
  { id: 54873, level: '6', subjects: ['French language', 'Science fiction', 'Ocean'], description: 'A full in-app public-domain copy of Vingt mille lieues sous les mers, in the original French, for heritage and world-language readers.' },
  { id: 46541, level: '5', subjects: ['French language', 'Fiction', 'Adventure'], description: 'A full in-app public-domain copy of Le Tour du monde en quatre-vingts jours, in the original French, for heritage and world-language readers.' },
  { id: 56327, level: '4', subjects: ['French language', 'Fables', 'Poetry'], description: 'A full in-app public-domain copy of Fables de La Fontaine, in the original French, for heritage and world-language readers.' },
  { id: 59859, level: '6', subjects: ['French language', 'Satire', 'Philosophy'], description: 'A full in-app public-domain copy of Candide, ou l\'optimisme, in the original French, for heritage and world-language readers.' },
  { id: 55752, level: '6', subjects: ['Portuguese language', 'Fiction', 'Brazilian literature'], description: 'A full in-app public-domain copy of Dom Casmurro, in the original Portuguese, for heritage and world-language readers.' },
  { id: 54829, level: '6', subjects: ['Portuguese language', 'Fiction', 'Brazilian literature'], description: 'A full in-app public-domain copy of Memórias Póstumas de Brás Cubas, in the original Portuguese, for heritage and world-language readers.' },
  { id: 22367, level: '6', subjects: ['German language', 'Fiction', 'World literature'], description: 'A full in-app public-domain copy of Die Verwandlung (The Metamorphosis), in the original German, for heritage and world-language readers.' },
  { id: 7500, level: '5', subjects: ['German language', 'Fiction', 'Children\'s literature'], description: 'A full in-app public-domain copy of Heidis Lehr- und Wanderjahre, in the original German, for heritage and world-language readers.' },
];

const dryRun = process.argv.includes('--dry-run');
const idsArg = valueAfter('--ids');
const requestedIds = idsArg
  ? idsArg.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0)
  : DEFAULT_IMPORTS.map((item) => item.id);
const requested = requestedIds.map((id) => DEFAULT_IMPORTS.find((item) => item.id === id) || { id });

function valueAfter(flag) {
  const idx = process.argv.indexOf(flag);
  return idx === -1 ? null : process.argv[idx + 1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function compact(s) {
  return String(s || '')
    .replace(/\s*:\s*\$[a-z]\s*/gi, ': ')
    .replace(/\s+\$[a-z]\s*/gi, ' ')
    .replace(/\s+([:;,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'untitled';
}

function words(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function authorName(person) {
  return compact(person && person.name) || 'Project Gutenberg';
}

function curlBytes(url, accept, attempt) {
  attempt = attempt || 1;
  try {
    return execFileSync('curl', [
      '-sSL',
      '--fail',
      '--max-time',
      '45',
      '-H',
      'User-Agent: ' + UA,
      '-H',
      'Accept: ' + accept,
      url,
    ], { maxBuffer: 96 * 1024 * 1024 });
  } catch (err) {
    if (attempt < 3) return curlBytes(url, accept, attempt + 1);
    throw new Error('Could not fetch ' + url + ': ' + String(err.message || err).slice(0, 180));
  }
}

function curlText(url, accept) {
  return curlBytes(url, accept).toString('utf8');
}

function getJson(url) {
  return JSON.parse(curlText(url, 'application/json'));
}

function choosePlainTextSource(formats, id) {
  const entries = Object.entries(formats || {}).filter(([mime, url]) =>
    /^text\/plain/i.test(mime) &&
    /\.txt($|\?)/i.test(String(url || '')) &&
    !/\.zip($|\?)/i.test(String(url || '')) &&
    !/readme\.txt($|\?)/i.test(String(url || ''))
  );
  const preferred = entries.find(([mime]) => /utf-8/i.test(mime)) ||
    entries.find(([, url]) => /\/files\/\d+\/\d+-0\.txt/i.test(url)) ||
    entries.find(([, url]) => /pg\d+\.txt/i.test(url)) ||
    entries[0];
  // The cache copy is also carried as a fallback: Gutendex sometimes lists a
  // stale files/<id>/<id>.txt URL that 404s while pg<id>.txt serves fine
  // (hit with the illustrated Wizard of Oz #43936).
  const cacheUrl = 'https://www.gutenberg.org/cache/epub/' + id + '/pg' + id + '.txt';
  return preferred
    ? { mime: preferred[0], url: preferred[1], fallbackUrl: cacheUrl }
    : { mime: 'text/plain; charset=utf-8', url: cacheUrl };
}

function fetchPlainText(source) {
  const mime = String(source.mime || '').toLowerCase();
  const url = String(source.url || '');
  // Gutenberg's historical "-8.txt" files are ISO-8859-1 even when a client
  // defaults to UTF-8. Decode bytes deliberately; otherwise accented letters,
  // degree signs, and typographic punctuation become U+FFFD in AlloFlow.
  const charset = /(?:iso-8859-1|latin-1|windows-1252)/i.test(mime) || /-8\.txt(?:$|\?)/i.test(url)
    ? 'windows-1252'
    : 'utf-8';
  try {
    return new TextDecoder(charset).decode(curlBytes(url, 'text/plain'));
  } catch (err) {
    if (!source.fallbackUrl) throw err;
    return new TextDecoder('utf-8').decode(curlBytes(source.fallbackUrl, 'text/plain'));
  }
}

// Plain-text Gutenberg files carry print-era markup that reads badly in the
// app (and worse aloud — TTS speaks every marker): "[Illustration: caption]"
// blocks for engravings that are not mirrored, "_word_" underscores for
// italics, and bracketed transcriber notes. Strip those. Footnote apparatus
// ("[1]" refs and "[Footnote 1: …]" bodies) is left alone on purpose:
// removing the refs would orphan the note text and mangle scholarly editions.
//
// Bracket blocks are stripped on the RAW text (they span hard line wraps);
// underscore emphasis is stripped AFTER paragraphs are joined, because a pair
// like "_two\nwords_" only becomes same-line once the wrap is removed.
function stripBlockArtifacts(text) {
  return String(text || '')
    // Bracketed transcriber notes ([Transcriber's Note: …]); captions/notes
    // may span lines (no ] appears inside in practice).
    .replace(/\[Transcriber'?s? Note:?[^\]]*\]/gi, '')
    // Illustration markers: "[Illustration]" or "[Illustration: caption]".
    // The colon/bracket must follow immediately — prose like Twain's
    // "[Illustrations of it thoughtlessly omitted…]" is quoted content.
    .replace(/\[Illustration(?::[^\]]*)?\]/gi, '');
}

// Underscore emphasis: keep the words, drop the underscores. Guarded so only
// emphasis is touched — NOT underscores used as blank-fills in tables
// ("_ miles from the Point _", inner space-anchored) and NOT ASCII-art
// diagrams (Flatland's figures mix underscores with | / \\). Loops because
// consuming one pair can expose another ("__word__").
function stripEmphasisUnderscores(text) {
  var out = String(text || '');
  for (var pass = 0; pass < 4; pass++) {
    var next = out.replace(/_([^_\n]{1,100}?)_/g, function (match, inner) {
      if (!/^\S(?:[\s\S]*\S)?$/.test(inner)) return match; // blank-fill, not emphasis
      if (/[|\/\\{}<>=+~]/.test(inner)) return match; // diagram/table art
      return inner;
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

// Back-compat composition (also what one-off cleanup passes use per page).
function stripInlineArtifacts(text) {
  return stripEmphasisUnderscores(stripBlockArtifacts(text));
}

// Boxed transcriber notes (+----+ / | … | ASCII frames) survive as their own
// "verse/table" paragraph — drop the whole block when it is one.
function isTranscriberNoteBlock(paragraph) {
  var p = String(paragraph || '');
  if (!/transcriber'?s? note/i.test(p)) return false;
  return /^[+|\[]/.test(p.trim()) || /^\s*[+|]/m.test(p);
}

// Volunteer production credits ("Produced by X and the Online Distributed
// Proofreading Team…") often sit AFTER the *** START marker in older files.
// Only ever applied to the first few front-matter paragraphs, and only to
// short standalone blocks, so book prose can never match positionally.
function isProductionCreditBlock(paragraph) {
  var p = String(paragraph || '').trim();
  if (!p || p.length > 500) return false;
  if (/^(Produced by|E-?text prepared by|Text file produced by|This etext was produced by|Transcribed from .{0,120}by|Scanned by|HTML version by)/i.test(p)) return true;
  return /Distributed Proofreading|pgdp\.net/i.test(p);
}

function stripGutenbergBoilerplate(raw) {
  let text = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const startPatterns = [
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i,
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG E-TEXT[\s\S]*?\*\*\*/i,
  ];
  for (const pattern of startPatterns) {
    const match = pattern.exec(text);
    if (match) {
      text = text.slice(match.index + match[0].length);
      break;
    }
  }
  const endPatterns = [
    /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*$/i,
    /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG E-TEXT[\s\S]*$/i,
    /End of (?:the )?Project Gutenberg[\s\S]*$/i,
  ];
  for (const pattern of endPatterns) text = text.replace(pattern, '');
  return text
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function looksLikeVerseOrTable(lines) {
  if (lines.length < 3) return false;
  const short = lines.filter((line) => line.length <= 58).length;
  const tabular = lines.filter((line) => /\s{3,}|\|/.test(line)).length;
  return short / lines.length > 0.72 || tabular / lines.length > 0.45;
}

function normalizeParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n+/)
    .map((block) => {
      const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) return '';
      if (looksLikeVerseOrTable(lines)) return lines.join('\n');
      return lines.join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter((p) => p && !/^(_|\*|-){3,}$/.test(p) && !isTranscriberNoteBlock(p));
}

function splitLongParagraph(paragraph, targets) {
  const target = (targets && targets.target) || TARGET_WORDS_PER_PAGE;
  const max = (targets && targets.max) || MAX_WORDS_PER_PAGE;
  const count = words(paragraph);
  if (count <= max) return [paragraph];
  // Verse and tables keep intentional line breaks (normalizeParagraphs joins
  // prose to one line); flattening them to sentence chunks would destroy the
  // layout, so they stay whole even when they overflow the page target.
  if (/\n/.test(paragraph)) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) {
    const tokens = paragraph.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < tokens.length; i += target) {
      chunks.push(tokens.slice(i, i + target).join(' '));
    }
    return chunks;
  }
  // Chunks are SLICES of the original paragraph, cut only at junctions where
  // the following sentence begins with whitespace — so closing curly quotes,
  // footnote refs, ellipses, and any characters the sentence regex tiles
  // imperfectly stay glued to their sentence, and the token stream survives
  // byte-for-byte (compact()-rejoining used to turn "etc.;" into "etc. ;",
  // minting a token, and dropped whatever the regex skipped).
  const chunks = [];
  let chunkStart = 0;
  let currentWords = 0;
  for (const match of paragraph.matchAll(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)) {
    const sentenceWords = words(match[0]);
    if (currentWords && match.index > chunkStart && /^\s/.test(match[0]) &&
        currentWords + sentenceWords > target) {
      chunks.push(paragraph.slice(chunkStart, match.index).trim());
      chunkStart = match.index;
      currentWords = 0;
    }
    currentWords += sentenceWords;
  }
  const last = paragraph.slice(chunkStart).trim();
  if (last) chunks.push(last);
  return chunks;
}

function splitIntoReadingPages(paragraphs, targets) {
  const target = (targets && targets.target) || TARGET_WORDS_PER_PAGE;
  const max = (targets && targets.max) || MAX_WORDS_PER_PAGE;
  const pieces = [];
  paragraphs.forEach((p) => splitLongParagraph(p, targets).forEach((part) => pieces.push(part)));
  const pages = [];
  let current = [];
  let currentWords = 0;
  for (const piece of pieces) {
    const pieceWords = words(piece);
    if (current.length && currentWords + pieceWords > target) {
      pages.push(current.join('\n\n'));
      current = [];
      currentWords = 0;
    }
    current.push(piece);
    currentWords += pieceWords;
    if (currentWords >= max) {
      pages.push(current.join('\n\n'));
      current = [];
      currentWords = 0;
    }
  }
  if (current.length) pages.push(current.join('\n\n'));
  return pages;
}

function catalogItemForId(catalog, id) {
  return (catalog.items || []).find((item) => new RegExp('^gutenberg-ebook-' + id + '-').test(item.slug || ''));
}

function pruneObsoleteCatalogCards(catalog) {
  catalog.items = (catalog.items || []).filter((item) => {
    const match = /^gutenberg-ebook-(\d+)-/.exec(item.slug || '');
    return !match || !OBSOLETE_GUTENBERG_CARD_IDS.has(Number(match[1]));
  });
}

// Project Gutenberg publishes in many languages; derive the book's language
// (display name + BCP47 code + text direction) from the Gutendex record rather
// than hardcoding English, so non-English imports land on the right shelf.
const GUTENBERG_LANG_NAMES = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', ru: 'Russian', la: 'Latin', el: 'Greek',
  fi: 'Finnish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', pl: 'Polish',
  hu: 'Hungarian', cs: 'Czech', ca: 'Catalan', eo: 'Esperanto', zh: 'Chinese',
  ja: 'Japanese', ar: 'Arabic', he: 'Hebrew', hi: 'Hindi', tl: 'Tagalog',
  cy: 'Welsh', ga: 'Irish', is: 'Icelandic', ro: 'Romanian', bg: 'Bulgarian',
};
const RTL_LANG_CODES = new Set(['ar', 'he', 'fa', 'ur', 'yi']);
function bookLanguage(metadata) {
  const code = (Array.isArray(metadata.languages) && metadata.languages[0]) || 'en';
  return {
    langCode: code,
    language: GUTENBERG_LANG_NAMES[code] || code.toUpperCase(),
    isRtl: RTL_LANG_CODES.has(code),
  };
}

function makeBook(metadata, textSource, curation, catalogItem) {
  const langInfo = bookLanguage(metadata);
  const title = compact(metadata.title);
  const authors = (metadata.authors || []).map(authorName).filter(Boolean);
  const subjects = (curation.subjects && curation.subjects.length ? curation.subjects : metadata.subjects || [])
    .map(compact)
    .filter(Boolean)
    .slice(0, 8);
  const slug = catalogItem ? catalogItem.slug : 'gutenberg-ebook-' + metadata.id + '-' + slugify(title);
  const textUrl = textSource.url;
  const body = stripBlockArtifacts(stripGutenbergBoilerplate(fetchPlainText(textSource)));
  const paragraphs = normalizeParagraphs(body)
    .map(stripEmphasisUnderscores)
    .filter((p, i) => i >= 6 || !isProductionCreditBlock(p));
  const bodyWords = words(paragraphs.join(' '));
  if (bodyWords < 300) throw new Error('Text for #' + metadata.id + ' was too short after cleaning (' + bodyWords + ' words).');
  const note = [
    'Source note: this public-domain text is available inside AlloFlow for classroom reading.',
    'Use Open original for Project Gutenberg formats and the full Project Gutenberg license.',
    'Teacher note: historical texts can preserve dated language, assumptions, and viewpoints. Preview before assigning.',
  ].join(' ');
  const pages = [note].concat(splitIntoReadingPages(paragraphs, pageTargetsFor(bodyWords))).map((text, idx) => ({
    n: idx + 1,
    img: null,
    text,
  }));
  return {
    schema: 'allo-reading-book@1',
    slug,
    title,
    description: curation.description || 'A full in-app Project Gutenberg public-domain text for older-student reading and research.',
    language: langInfo.language,
    langCode: langInfo.langCode,
    isRtl: langInfo.isRtl,
    // assign_levels.js re-measures ENGLISH texts (FK) after import; for
    // non-English imports it skips, so a curated hand level sticks here.
    level: String(curation.level || '6'),
    orientation: 'portrait',
    sourceId: 'gutenberg',
    contentType: 'public-domain-full-text',
    subjects: subjects.length ? subjects : ['Project Gutenberg', 'Public domain'],
    authors: authors.length ? authors : ['Project Gutenberg'],
    illustrators: [],
    originalAuthors: [],
    publisher: 'Project Gutenberg',
    license: 'Public Domain in the U.S. / Project Gutenberg License',
    licenseUrl: PG_LICENSE,
    source: {
      id: 'gutenberg',
      name: 'Project Gutenberg',
      url: 'https://www.gutenberg.org/ebooks/' + metadata.id,
      textUrl,
    },
    // Gutendex records include a generated cover thumbnail for most books;
    // stored as a plain URL string (StoryWeaver books use {card,large}).
    cover: (metadata.formats && (metadata.formats['image/jpeg'] || metadata.formats['image/png'])) || null,
    audio: null,
    pages,
    stats: {
      pages: pages.length,
      words: pages.reduce((sum, page) => sum + words(page.text), 0),
    },
  };
}

function validateMetadata(metadata) {
  if (!metadata || !metadata.id) throw new Error('Bad metadata response');
  if (metadata.copyright !== false) throw new Error('Skipping #' + metadata.id + ': Gutendex does not mark it public-domain/copyright=false.');
  if (!Array.isArray(metadata.languages) || !metadata.languages.length) {
    throw new Error('Skipping #' + metadata.id + ': no language on the record.');
  }
}

async function main() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  const catalog = readJson(OPEN_CATALOG_PATH);
  catalog.items = catalog.items || [];
  pruneObsoleteCatalogCards(catalog);
  const existingSlugs = new Set(catalog.items.map((item) => item.slug));
  const imported = [];
  const skipped = [];

  for (const curation of requested) {
    try {
      const metadata = getJson(GUTENDEX + curation.id);
      validateMetadata(metadata);
      const textSource = choosePlainTextSource(metadata.formats, metadata.id);
      const existingItem = catalogItemForId(catalog, metadata.id);
      const book = makeBook(metadata, textSource, curation, existingItem);
      const file = existingItem ? existingItem.file : 'books/' + book.slug + '.json';
      if (!existingItem && !existingSlugs.has(book.slug)) {
        catalog.items.push({ slug: book.slug, file });
        existingSlugs.add(book.slug);
      }
      if (!dryRun) writeJson(path.join(ROOT, file), book);
      imported.push({ id: metadata.id, title: book.title, pages: book.stats.pages, words: book.stats.words, file });
      console.log((dryRun ? 'WOULD IMPORT ' : 'IMPORTED ') + '#' + metadata.id + ' ' + book.title + ' (' + book.stats.pages + 'p, ' + book.stats.words + 'w)');
      await sleep(250);
    } catch (err) {
      skipped.push({ id: curation.id, error: err.message });
      console.warn('SKIP #' + curation.id + ': ' + err.message);
      await sleep(250);
    }
  }

  if (!dryRun) writeJson(OPEN_CATALOG_PATH, catalog);
  console.log('\nImported ' + imported.length + ' full-text Gutenberg works.');
  if (skipped.length) console.log('Skipped: ' + JSON.stringify(skipped, null, 2));
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err && err.stack ? err.stack : err);
      process.exit(1);
    });
}

// Shared with maintenance scripts (e.g. one-off cleanup passes) so the
// cleaning rules live in exactly one place.
module.exports = {
  stripInlineArtifacts,
  stripBlockArtifacts,
  stripEmphasisUnderscores,
  isTranscriberNoteBlock,
  isProductionCreditBlock,
  compact,
  words,
  splitIntoReadingPages,
  pageTargetsFor,
};
