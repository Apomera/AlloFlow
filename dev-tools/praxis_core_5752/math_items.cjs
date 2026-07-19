'use strict';

const { MATH, CORE_PAGE, CCSS_MATH } = require('./sources.cjs');
const { q } = require('./item_helpers.cjs');
const refs = [MATH, CORE_PAGE, CCSS_MATH];

const numberOperations = [
  q('A supply order contains 18 boxes with 24 markers in each box. How many markers are ordered?', 'A conference prepares 27 folders for each of 16 sessions. How many folders are prepared?', '432', ['42', '192', '442'], 'Multiplication represents equal groups: 18 times 24 and 27 times 16 both equal 432.'),
  q('Evaluate 3/4 + 5/8 and express the result in simplest form.', 'Evaluate 1 7/8 - 1/2 and express the result in simplest form.', '1 3/8', ['1 1/8', '8/12', '3/8'], 'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, and 1 7/8 - 4/8 = 1 3/8.'),
  q('A 12.5-meter roll is cut into pieces 0.5 meter long. How many complete pieces result?', 'A 7.5-liter container fills bottles holding 0.3 liter each. How many complete bottles can be filled?', '25', ['6', '15', '250'], 'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 and 7.5 divided by 0.3 both equal 25.'),
  q('Which value is greatest: -1.2, -1.02, -1.22, or -1.202?', 'Which value is greatest: -1.20, -1.020, -1.220, or -1.202?', '-1.02', ['-1.2', '-1.22', '-1.202'], 'For negative numbers, the value closest to zero is greatest. Writing equal decimal places shows that -1.020 is greater than the other values.'),
  q('What is the prime factorization of 360?', 'Which expression is the prime factorization of a number equal to 360?', '2^3 x 3^2 x 5', ['2 x 3 x 60', '2^2 x 3^2 x 10', '3^3 x 5'], 'Since 360 = 8 x 9 x 5, its prime factorization is 2^3 x 3^2 x 5; the correct expression uses primes only.'),
  q('A temperature rises from -7 degrees to 5 degrees. What is the change?', 'An account balance changes from -$9 to $3. What is the numerical increase?', '12', ['-12', '2', '14'], 'Change equals final minus initial: 5 - (-7) and 3 - (-9) both equal 12.'),
  q('Round 48.376 to the nearest tenth.', 'A measurement of 48.36 centimeters is rounded to the nearest tenth. What is the result?', '48.4', ['48.3', '48.38', '49.0'], 'The hundredths digit is at least 5, so the tenths digit increases from 3 to 4 and later digits are removed.'),
];


const ratiosMeasurement = [
  q('A recipe uses 3 cups of flour for 2 batches. At the same rate, how much flour is needed for 5 batches?', 'A printer uses 3 cartridges for 2 production runs. At the same rate, how many cartridges are needed for 5 runs?', '7.5', ['3.3', '6', '10'], 'The unit rate is 3/2 = 1.5 per batch or run; multiplying by 5 gives 7.5.'),
  q('A jacket priced at $80 is discounted 25%. What is the sale price?', 'A $120 registration fee is discounted 50%. What is the resulting fee?', '$60', ['$20', '$55', '$75'], 'The remaining fraction is 75% of $80, or 50% of $120; each calculation gives $60.'),
  q('A car travels 180 miles in 3 hours at a constant rate. What is the rate?', 'A machine packages 240 items in 4 hours at a constant rate. What is its hourly rate?', '60 per hour', ['45 per hour', '120 per hour', '540 per hour'], 'A constant unit rate is total quantity divided by time: 180/3 and 240/4 both equal 60 per hour.'),
  q('Convert 2.4 meters to centimeters.', 'Convert 0.24 kilometer to meters.', '240', ['0.024', '24', '2,400'], 'There are 100 centimeters per meter and 1,000 meters per kilometer, so both conversions produce 240 in the requested unit.'),
  q('On a map, 1 inch represents 12 miles. Two towns are 3.5 inches apart. What is the actual distance?', 'A scale drawing uses 1 centimeter for 12 meters. A wall measures 3.5 centimeters. What is the actual length?', '42', ['15.5', '36', '48'], 'Multiply the scale value, 12, by the measured length, 3.5, to obtain 42 actual units.'),
  q('A quantity increases from 50 to 65. What is the percent increase?', 'A membership count increases from 80 to 104. What is the percent increase?', '30%', ['15%', '23%', '130%'], 'Percent increase is change divided by original: 15/50 and 24/80 both equal 0.30, or 30 percent.'),
];

const dataDisplays = [
  q('A table lists 12, 15, 15, 18, and 20. What is the median?', 'A table lists 9, 12, 15, 18, and 21. What is the median?', '15', ['12', '16', '18'], 'With five ordered values, the median is the third value, which is 15 in both sets.'),
  q('The mean of four scores is 18. Three scores are 14, 17, and 21. What is the fourth score?', 'The mean of five values is 20. Four values are 16, 18, 22, and 24. What is the fifth value?', '20', ['18', '19', '22'], 'The required total is mean times count. Subtracting the known values gives 72 - 52 = 20 and 100 - 80 = 20.'),
  q('A bar chart uses a vertical axis beginning at 95 rather than 0 to compare values 98 and 100. What is the main interpretation risk?', 'A graph compares rates of 49% and 51% using an axis from 48% to 52%. What should a reader notice?', 'The truncated axis can make a small absolute difference look visually large.', ['The graph makes both values equal.', 'The axis proves the difference is causal.', 'A truncated axis always makes data false.'], 'Narrowing an axis can be legitimate, but it magnifies visual differences, so readers must inspect the scale and absolute values.'),
  q('A scatterplot shows points generally rising from left to right. Which description is best?', 'A scatterplot of study time and practice score trends upward with substantial scatter. Which conclusion is justified?', 'The variables show a positive association, but the plot alone does not establish causation.', ['The variables have a perfect negative association.', 'One variable necessarily causes the other.', 'No relationship of any kind is visible.'], 'An upward pattern indicates positive association; observational association alone is not proof of a causal mechanism.'),
  q('A survey reports 60% support with a margin of error of plus or minus 4 percentage points. Which interval matches the report?', 'A poll reports 60% support with a margin of error of plus or minus 4 points. Which interval is represented?', '56% to 64%', ['60% to 68%', '56% to 60%', '40% to 80%'], 'Add and subtract four percentage points from the estimate: 60% gives an interval from 56% through 64%.'),
  q('A line graph shows sales of 20, 24, 24, and 28 over four quarters. Which statement is accurate?', 'A line graph shows attendance of 20, 24, 24, and 28 over four sessions. Which statement is accurate?', 'The measure rose overall, with no change between the second and third observations.', ['The measure fell every period.', 'The measure doubled overall.', 'The third observation was lower than the second.'], 'The sequence increases from 20 to 28 overall and the middle two values are equal.'),
];

const statisticsProbability = [
  q('What is the range of 4, 9, 11, 15, and 18?', 'What is the range of 22, 27, 29, 33, and 36?', '14', ['9', '11.4', '22'], 'Range is maximum minus minimum: 18 - 4 and 36 - 22 both equal 14.'),
  q('A fair six-sided number cube is rolled once. What is the probability of rolling an even number?', 'A bag contains 3 red and 3 blue counters. What is the probability of drawing a red counter?', '1/2', ['1/3', '2/3', '3'], 'There are three favorable outcomes among six equally likely outcomes, giving 3/6 = 1/2.'),
  q('Two fair coins are flipped. What is the probability of exactly one head?', 'A spinner with equal red and blue halves is spun twice. What is the probability of one result of each color?', '1/2', ['1/4', '3/4', '1'], 'The four equally likely ordered outcomes include two favorable mixed outcomes, so the probability is 2/4 = 1/2.'),
  q('A data set has one extremely high outlier. Which measure of center is generally less affected?', 'A set of home prices includes one unusually expensive property. Which center is more resistant to that value?', 'The median', ['The mean', 'The range', 'The maximum'], 'The median depends on order and is typically resistant to an extreme value, whereas the mean is pulled toward it.'),
  q('A study randomly assigns participants to two treatments. What is the main benefit of random assignment?', 'A classroom experiment uses random assignment to two practice schedules. What does random assignment primarily support?', 'It helps balance other variables across groups, strengthening causal comparison.', ['It guarantees the sample represents every population.', 'It eliminates all measurement error.', 'It makes every participant receive both treatments.'], 'Random assignment supports internal validity by reducing systematic preexisting group differences; it does not guarantee population representativeness.'),
  q('From 500 records, a researcher randomly samples 50. What fraction of the records is sampled?', 'From 800 applications, an auditor randomly reviews 80. What fraction is reviewed?', '10%', ['1%', '20%', '50%'], 'The sample fraction is 50/500 or 80/800, each equal to 0.10, or 10 percent.'),
];

const algebraFunctions = [
  {
    ...q(
      'Solve 3x + 7 = 25.',
      'Solve 5x - 12 = 18.',
      'x = 6',
      ['x = 4', 'x = 8', 'x = 10'],
      'Subtract 7 from both sides to get 3x = 18, then divide both sides by 3 to get x = 6. Substitution verifies the solution because 3(6) + 7 = 25.'
    ),
    rationaleB: 'Add 12 to both sides to get 5x = 30, then divide both sides by 5 to get x = 6. Substitution verifies the solution because 5(6) - 12 = 18.',
  },
  q('Simplify 4(2x - 3) + 5.', 'Simplify 2(4x + 1) - 9.', '8x - 7', ['8x - 12', '6x - 7', '8x + 7'], 'Distribute and combine constants: 8x - 12 + 5 and 8x + 2 - 9 both simplify to 8x - 7.'),
  q('A plan charges $12 plus $4 per month. Which expression gives the cost after m months?', 'A service charges $12 plus $4 per visit. Which expression gives the cost after v visits?', '12 + 4m', ['16m', '12m + 4', '48m'], 'The fixed charge is the constant 12 and the repeated charge is 4 times the number of months or visits.'),
  q('If f(x) = 2x^2 - 3, what is f(3)?', 'If g(x) = 3x^2 - 3, what is g(sqrt(6))?', '15', ['3', '9', '33'], 'Substitution gives 2(3^2) - 3 = 18 - 3 = 15; the paired form also gives 3(6) - 3 = 15.'),
  q('A line passes through (0, 5) and (4, 13). What is its slope?', 'A line passes through (2, 7) and (6, 15). What is its slope?', '2', ['1/2', '4', '8'], 'Slope is change in y divided by change in x: (13 - 5)/(4 - 0) and (15 - 7)/(6 - 2) both equal 2.'),
  q('Solve the inequality 2x - 5 > 9.', 'Solve the inequality 3x + 1 > 22.', 'x > 7', ['x < 7', 'x > 2', 'x < 14'], 'Isolating x gives 2x > 14 or 3x > 21, so x must be greater than 7.'),
];

const geometry = [
  q('A rectangle has length 9 and width 6. What is its area?', 'A triangle has base 12 and height 9. What is its area?', '54 square units', ['30 square units', '45 square units', '108 square units'], 'Rectangle area is 9 times 6, and triangle area is one-half times 12 times 9; both equal 54 square units.'),
  q('A circle has radius 5. What is its circumference in terms of pi?', 'A circle has diameter 10. What is its circumference in terms of pi?', '10pi', ['5pi', '20pi', '25pi'], 'Circumference is 2pi times radius or pi times diameter; both forms give 10pi.'),
  q('A right triangle has legs 6 and 8. What is the hypotenuse?', 'A right triangle has legs sqrt(36) and sqrt(64). What is the hypotenuse?', '10', ['7', '12', '14'], 'The Pythagorean theorem gives c squared = 36 + 64 = 100, so the positive length is 10.'),
  q('Two angles form a linear pair. One angle is 68 degrees. What is the other?', 'Two supplementary angles include one angle of 68 degrees. What is the other measure?', '112 degrees', ['22 degrees', '68 degrees', '292 degrees'], 'Angles in a linear pair are supplementary, so the missing measure is 180 - 68 = 112 degrees.'),
  q('A rectangular prism measures 3 by 4 by 7. What is its volume?', 'A rectangular tank measures 2 by 6 by 7. What is its volume?', '84 cubic units', ['28 cubic units', '56 cubic units', '168 cubic units'], 'Volume is the product of length, width, and height: 3 x 4 x 7 and 2 x 6 x 7 both equal 84.'),
  q('A scale factor of 3 enlarges a square with side 4. What is the new side length?', 'Similar triangles have a scale factor of 3. A corresponding side is 4 in the smaller triangle. What is it in the larger triangle?', '12', ['1', '7', '16'], 'Corresponding lengths are multiplied by the linear scale factor, so 4 times 3 equals 12.'),
];

module.exports = [
  { id: 'math-number-operations', chapterId: 'core5752-ch-07', domainId: 'math-number-quantity', domain: 'Mathematics: Number and Quantity', label: 'Number Forms and Operations', references: refs, questions: numberOperations },
  { id: 'math-ratios-percent-measurement', chapterId: 'core5752-ch-08', domainId: 'math-number-quantity', domain: 'Mathematics: Number and Quantity', label: 'Ratios, Percent, Rates, and Measurement', references: refs, questions: ratiosMeasurement },
  { id: 'math-data-displays', chapterId: 'core5752-ch-09', domainId: 'math-data-statistics-probability', domain: 'Mathematics: Data, Statistics, and Probability', label: 'Data Displays and Descriptive Measures', references: refs, questions: dataDisplays },
  { id: 'math-statistics-probability', chapterId: 'core5752-ch-10', domainId: 'math-data-statistics-probability', domain: 'Mathematics: Data, Statistics, and Probability', label: 'Statistics, Sampling, and Probability', references: refs, questions: statisticsProbability },
  { id: 'math-algebra-functions', chapterId: 'core5752-ch-11', domainId: 'math-algebra-geometry', domain: 'Mathematics: Algebra and Geometry', label: 'Algebra, Equations, and Functions', references: refs, questions: algebraFunctions },
  { id: 'math-geometry-measurement', chapterId: 'core5752-ch-12', domainId: 'math-algebra-geometry', domain: 'Mathematics: Algebra and Geometry', label: 'Geometry, Similarity, and Measurement', references: refs, questions: geometry },
];
