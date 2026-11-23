#!/usr/bin/env node
'use strict';

// AP packs do not use the legacy `*_pack.json` pipeline, so the loop above never
// reaches them and their cited sources have to be named here. Five AP foundation
// pilots (Calculus AB, Chemistry, Physics 1, Statistics, U.S. Government) shipped
// without these entries; the Hub now shows a Sources view built from the same
// URLs, so an unnamed source is visible to learners rather than only to QA.
const apCourseSources = (() => {
  const courses = [
    {
      course: 'AP Calculus AB',
      cedUrl: 'https://apcentral.collegeboard.org/media/pdf/ap-calculus-ab-and-bc-course-and-exam-description.pdf',
      cedTitle: 'AP Calculus AB and BC Course and Exam Description',
      cedNote: 'It covers both Calculus AB and Calculus BC, so readers must confirm which units and topics apply to the AB course.',
      courseUrl: 'https://apcentral.collegeboard.org/courses/ap-calculus-ab',
      examUrl: 'https://apcentral.collegeboard.org/courses/ap-calculus-ab/exam',
      examNote: 'including the calculator and no-calculator sections',
      textUrl: 'https://openstax.org/details/books/calculus-volume-1',
      textTitle: 'Calculus Volume 1',
      textOrg: 'OpenStax, Rice University',
      textNote: 'limits, derivatives, and integrals with worked examples',
    },
    {
      course: 'AP Chemistry',
      cedUrl: 'https://apcentral.collegeboard.org/media/pdf/ap-chemistry-course-and-exam-description.pdf',
      cedTitle: 'AP Chemistry Course and Exam Description',
      courseUrl: 'https://apstudents.collegeboard.org/courses/ap-chemistry',
      examUrl: 'https://apcentral.collegeboard.org/courses/ap-chemistry/exam',
      examNote: 'including the published formula sheet and calculator policy',
      textUrl: 'https://openstax.org/details/books/chemistry-2e',
      textTitle: 'Chemistry 2e',
      textOrg: 'OpenStax, Rice University',
      textNote: 'atomic structure, bonding, thermodynamics, kinetics, and equilibrium',
    },
    {
      course: 'AP Physics 1',
      cedUrl: 'https://apcentral.collegeboard.org/media/pdf/ap-physics-1-course-and-exam-description.pdf',
      cedTitle: 'AP Physics 1: Algebra-Based Course and Exam Description',
      courseUrl: 'https://apstudents.collegeboard.org/courses/ap-physics-1-algebra-based',
      examUrl: 'https://apcentral.collegeboard.org/courses/ap-physics-1/exam',
      examNote: 'including the equation sheet and the published exam update',
      textUrl: 'https://openstax.org/details/books/college-physics-2e',
      textTitle: 'College Physics 2e',
      textOrg: 'OpenStax, Rice University',
      textNote: 'algebra-based kinematics, dynamics, energy, momentum, and rotation',
    },
    {
      course: 'AP Statistics',
      cedUrl: 'https://apcentral.collegeboard.org/media/pdf/ap-statistics-course-and-exam-description.pdf?course=852',
      cedTitle: 'AP Statistics Course and Exam Description',
      courseUrl: 'https://apcentral.collegeboard.org/courses/ap-statistics',
      examUrl: 'https://apcentral.collegeboard.org/courses/ap-statistics/exam',
      examNote: 'including the published formula sheet and statistical tables',
      textUrl: 'https://openstax.org/details/books/introductory-statistics-2e',
      textTitle: 'Introductory Statistics 2e',
      textOrg: 'OpenStax, Rice University',
      textNote: 'sampling, distributions, inference, and regression',
    },
    {
      course: 'AP U.S. Government and Politics',
      cedUrl: 'https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description.pdf',
      cedTitle: 'AP U.S. Government and Politics Course and Exam Description',
      courseUrl: 'https://apcentral.collegeboard.org/courses/ap-united-states-government-and-politics',
      examUrl: 'https://apcentral.collegeboard.org/courses/ap-united-states-government-and-politics/exam',
      examNote: 'including the required foundational documents, Supreme Court cases, and four free-response question types',
      textUrl: 'https://openstax.org/details/books/american-government-3e',
      textTitle: 'American Government 3e',
      textOrg: 'OpenStax, Rice University',
      textNote: 'constitutional foundations, institutions, civil liberties, and participation',
    },
  ];
  const entries = {};
  for (const course of courses) {
    entries[course.cedUrl] = {
      title: course.cedTitle,
      organization: 'College Board',
      summary: `This official course and exam description presents the current ${course.course} framework, including its units, topics, learning objectives, course skills or science practices, and the published exam design.${course.cedNote ? ' ' + course.cedNote : ''}`,
      credibility: `College Board owns and administers the ${course.course} program, making this the primary public source for its course framework and exam design. AlloFlow study materials remain independently authored and are not endorsed by College Board.`,
      metadataSource: 'explicit-override',
    };
    entries[course.courseUrl] = {
      title: `${course.course} Course Overview`,
      organization: 'College Board',
      summary: `This official course page gives the current public overview of ${course.course}, including course content, prerequisites, and the public resources available to students and teachers.`,
      credibility: `College Board publishes and maintains this course page, so it is the primary public source for the current ${course.course} description. Course details change between academic years, so readers should confirm the year that applies to them.`,
      metadataSource: 'explicit-override',
    };
    if (course.examUrl) {
      entries[course.examUrl] = {
        title: `${course.course} Exam`,
        organization: 'College Board',
        summary: `This official exam page describes the current ${course.course} exam format, section timing, question types, and scoring proportions${course.examNote ? ', ' + course.examNote : ''}.`,
        credibility: `College Board owns and administers the ${course.course} exam, making this the primary public source for current exam structure and logistics. AlloFlow practice is independently authored and does not reproduce official exam questions.`,
        metadataSource: 'explicit-override',
      };
    }
    entries[course.textUrl] = {
      title: course.textTitle,
      organization: course.textOrg,
      summary: `This peer-reviewed open textbook covers ${course.textNote} and is used as an independent factual cross-check for ${course.course} content rather than as a source of exam questions.`,
      credibility: 'OpenStax textbooks are peer reviewed and openly licensed by Rice University, which makes them a citable secondary source for subject content. They are not published by College Board and do not define the AP framework or exam.',
      metadataSource: 'explicit-override',
    };
  }
  return entries;
})();

// Additional AP exam pages and OpenStax U.S. History chapter/section references
// cited by the AP Biology, AP U.S. Government, and AP U.S. History pilots.
const AP_ADDITIONAL_SOURCES = {
  'https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description-clarifications-effective-fall-2026.pdf': {
    title: 'AP U.S. Government and Politics Course Framework Clarifications, Effective Fall 2026',
    organization: 'College Board',
    summary: 'This official companion document records the clarifications to the AP U.S. Government and Politics course framework that take effect in fall 2026, including changes to the required foundational documents, and should be read alongside the current course and exam description.',
    credibility: 'College Board publishes the AP U.S. Government and Politics framework and its clarifications, making this the primary source for official changes. Readers should confirm they are using the version that applies to their exam year.',
    metadataSource: 'explicit-override',
  },
  'https://apcentral.collegeboard.org/courses/ap-biology/exam': {
    title: 'AP Biology Exam',
    organization: 'College Board',
    summary: 'This official exam page describes the current AP Biology exam format, section timing, question types, scoring proportions, and published equation and formula sheet.',
    credibility: 'College Board owns and administers the AP Biology exam, making this the primary public source for current exam structure and logistics. AlloFlow practice is independently authored and does not reproduce official exam questions.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/2-2-the-arrival-of-the-spanish-and-the-establishment-of-the-colonies': {
    title: 'U.S. History, Chapter 2: Early Globalization and Spanish Colonial Establishment',
    organization: 'OpenStax, Rice University',
    summary: 'This OpenStax U.S. History chapter reference addresses early Atlantic-world encounters, Spanish colonial arrival, and the establishment of European colonies in the Americas for AP U.S. History cross-checking.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/4-3-the-french-and-indian-war': {
    title: 'U.S. History, Chapter 4: Imperial Wars and the French and Indian War',
    organization: 'OpenStax, Rice University',
    summary: 'This OpenStax U.S. History chapter reference examines eighteenth-century imperial competition in North America, Indigenous diplomacy, and the causes and consequences of the French and Indian War.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/7-introduction': {
    title: 'U.S. History, Chapter 7: Creating Republican Governments, 1776–1790',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction frames the transition from revolutionary war to republican governance, covering state constitutions, the Articles of Confederation, debates over democracy, and the Constitutional Convention.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/17-introduction': {
    title: 'U.S. History, Chapter 17: Go West Young Man! Westward Expansion, 1840–1900',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction surveys nineteenth-century western migration, homesteading, mining and ranching economies, federal policy toward Native peoples, and impacts on Chinese immigrants and Hispanic citizens.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/20-introduction': {
    title: 'U.S. History, Chapter 20: Politics in the Gilded Age, 1870–1900',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction frames Gilded Age party politics, patronage and civil-service reform, tariff and monetary debates, Populist agrarian revolt, and social and labor unrest in the late nineteenth century.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/25-introduction': {
    title: 'U.S. History, Chapter 25: Brother, Can You Spare a Dime? The Great Depression, 1929–1932',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction examines the 1929 stock market crash, economic contraction, President Hoover’s policy responses, and the human toll of the early Great Depression.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/26-introduction': {
    title: 'U.S. History, Chapter 26: Franklin Roosevelt and the New Deal, 1932–1941',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction outlines Franklin D. Roosevelt’s election and the First and Second New Deal programs aimed at relief, economic recovery, financial regulation, and social-welfare reform.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
  'https://openstax.org/books/us-history/pages/29-introduction': {
    title: 'U.S. History, Chapter 29: Contesting Futures: America in the 1960s',
    organization: 'OpenStax, Rice University',
    summary: 'This chapter introduction surveys 1960s domestic and foreign-policy transformations, including the Kennedy administration, Lyndon Johnson’s Great Society, civil rights organizing, Vietnam War debates, and social movements.',
    credibility: 'OpenStax is a nonprofit educational initiative at Rice University whose openly licensed textbooks use expert authorship, faculty review, and a documented errata process. It serves as an independent instructional reference rather than an official College Board blueprint.',
    metadataSource: 'explicit-override',
  },
};

module.exports = { AP_REFERENCE_SOURCES: { ...apCourseSources, ...AP_ADDITIONAL_SOURCES } };
