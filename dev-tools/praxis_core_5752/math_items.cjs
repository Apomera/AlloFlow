'use strict';

const { MATH, CORE_PAGE, CCSS_MATH } = require('./sources.cjs');
const { q } = require('./item_helpers.cjs');
const refs = [MATH, CORE_PAGE, CCSS_MATH];

const numberOperations = [
  q(
    'A supply order contains 18 boxes with 24 markers in each box. How many markers are ordered?',
    'A conference prepares 27 folders for each of 16 sessions. How many folders are prepared?',
    '432',
    ['42', '192', '442'],
    'Multiplication represents equal groups: 18 times 24 and 27 times 16 both equal 432.',
    [
      'Adding the two given numbers instead of multiplying finds their sum (18+24=42) rather than the total across equal groups.',
      'This result undercounts a partial product during two-digit multiplication, omitting part of the tens-by-tens contribution from the total.',
      'A carrying error in the tens place shifts the product up by 10; checking 18 times 20 plus 18 times 4 confirms 360+72=432.',
    ],
  ),
  q(
    'Evaluate 3/4 + 5/8 and express the result in simplest form.',
    'Evaluate 1 7/8 - 1/2 and express the result in simplest form.',
    '1 3/8',
    ['1 1/8', '8/12', '3/8'],
    'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, and 1 7/8 - 4/8 = 1 3/8.',
    [
      'Converting halves or fourths inaccurately into eighths leaves the fractional remainder off by 2/8 from the true value.',
      'Adding or combining numerators and denominators straight across (3+5 over 4+8) violates common-denominator fraction addition rules.',
      'Dropping the whole number 1 during mixed-number conversion leaves only the fractional part 3/8 instead of the full value.',
    ],
  ),
  q(
    'A 12.5-meter roll is cut into pieces 0.5 meter long. How many complete pieces result?',
    'A 7.5-liter container fills bottles holding 0.3 liter each. How many complete bottles can be filled?',
    '25',
    ['6', '15', '250'],
    'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 and 7.5 divided by 0.3 both equal 25.',
    [
      'Multiplying the total by the unit size instead of dividing shrinks the count rather than finding how many smaller units fit.',
      'Misplacing a digit or underestimating the quotient during decimal division yields 15 instead of shifting both decimals cleanly.',
      'Shifting the decimal point one place too far to the right in the dividend inflates the quotient by a factor of 10.',
    ],
  ),
  q(
    'Which value is greatest: -1.2, -1.02, -1.22, or -1.202?',
    'Which value is greatest: -1.20, -1.020, -1.220, or -1.202?',
    '-1.02',
    ['-1.2', '-1.22', '-1.202'],
    'For negative numbers, the value closest to zero is greatest. Writing equal decimal places shows that -1.020 is greater than the other values.',
    [
      'Comparing tenths shows -1.200 lies further below zero than -1.020, making it smaller on the number line.',
      'Treating the largest absolute magnitude (1.22) as greatest reverses the ordering rule for negative numbers; -1.22 is actually least.',
      'Because 2 tenths exceeds 0 tenths, -1.202 sits further left of zero than -1.020 and is therefore a smaller negative number.',
    ],
  ),
  q(
    'What is the prime factorization of 360?',
    'Which expression is the prime factorization of a number equal to 360?',
    '2^3 x 3^2 x 5',
    ['2 x 3 x 60', '2^2 x 3^2 x 10', '3^3 x 5'],
    'Since 360 = 8 x 9 x 5, its prime factorization is 2^3 x 3^2 x 5; the correct expression uses primes only.',
    [
      'Although this product equals 360, the factor 60 is composite rather than prime, so the factorization is incomplete.',
      'Although this product also equals 360, the factor 10 is composite (2 x 5) and must be broken down into primes.',
      'This expression uses only prime bases, but 27 x 5 equals 135 rather than 360 because all factors of 2 are missing.',
    ],
  ),
  q(
    'A temperature rises from -7 degrees to 5 degrees. What is the change?',
    'An account balance changes from -$9 to $3. What is the numerical increase?',
    '12',
    ['-12', '2', '14'],
    'Change equals final minus initial: 5 - (-7) and 3 - (-9) both equal 12.',
    [
      'Reversing initial and final values gives a negative difference (-12), contradicting an upward rise or increase.',
      'Combining the two signed values directly (5 + (-7) or ignoring the sign change across zero) understates the distance moved.',
      'Miscounting across zero by two units overstates the total span between the negative starting point and positive ending point.',
    ],
  ),
  q(
    'Round 48.376 to the nearest tenth.',
    'A measurement of 48.36 centimeters is rounded to the nearest tenth. What is the result?',
    '48.4',
    ['48.3', '48.38', '49.0'],
    'The hundredths digit is at least 5, so the tenths digit increases from 3 to 4 and later digits are removed.',
    [
      'Truncating after the tenths digit ignores that the hundredths digit is 5 or greater and therefore requires rounding upward.',
      'Rounding to two decimal places gives the nearest hundredth rather than the nearest tenth requested in the prompt.',
      'Rounding up to the nearest whole number changes the ones place instead of stopping at the tenths place.',
    ],
  ),
];

const ratiosMeasurement = [
  q(
    'A recipe uses 3 cups of flour for 2 batches. At the same rate, how much flour is needed for 5 batches?',
    'A printer uses 3 liters of ink for 2 production runs. At the same rate, how many liters of ink are used for 5 runs?',
    '7.5',
    ['3.3', '6', '10'],
    'The unit rate is 3/2 = 1.5 per batch; multiplying 1.5 by 5 batches gives 7.5 cups of flour.',
    [
      'Inverting the ratio to 2/3 and multiplying by 5 gives 10/3 (about 3.3), scaling the quantities in the wrong direction.',
      'Adding 3 to the original amount or scaling for 4 batches instead of 5 underestimates the amount needed for 5 batches.',
      'Doubling 5 batches applies a rate of 2 cups per batch instead of the stated 3-to-2 unit rate of 1.5 cups per batch.',
    ],
    {
      variantB: {
        correct: '7.5 liters',
        distractors: ['3.3 liters', '6 liters', '10 liters'],
        rationale: 'The unit rate is 3 divided by 2, or 1.5 liters per run. Multiplying 1.5 liters per run by 5 runs gives 7.5 liters, a continuous quantity that does not require rounding.',
        distractorNotes: [
          'Inverting the rate to 2/3 liter per run and multiplying by 5 runs gives about 3.3 liters instead of preserving the 3-to-2 rate.',
          'Scaling only to 4 production runs (6 liters) or adding 3 liters fails to account for the fifth production run at 1.5 liters each.',
          'Multiplying 5 runs by 2 liters per run ignores the stated ratio of 3 liters per 2 runs and overstates ink usage.',
        ],
      },
    },
  ),
  q(
    'A jacket priced at $80 is discounted 25%. What is the sale price?',
    'A $120 registration fee is discounted 50%. What is the resulting fee?',
    '$60',
    ['$20', '$55', '$75'],
    'The remaining fraction is 75% of $80, or 50% of $120; each calculation gives $60.',
    [
      'This figure equals the 25% discount amount on $80 rather than the final price remaining after subtracting the discount.',
      'Subtracting the percentage number 25 directly from 80 treats a percent discount as a flat $25 dollar reduction.',
      'Taking off only $5 or misapplying the percent factor leaves the price far higher than the stated percentage discount.',
    ],
  ),
  q(
    'A car travels 180 miles in 3 hours at a constant rate. What is the rate?',
    'A machine packages 240 items in 4 hours at a constant rate. What is its hourly rate?',
    '60 per hour',
    ['45 per hour', '120 per hour', '540 per hour'],
    'A constant unit rate is total quantity divided by time: 180/3 and 240/4 both equal 60 per hour.',
    [
      'Dividing by 4 instead of 3 (or underdividing total output by hours) underestimates the true hourly unit rate.',
      'Dividing by half the elapsed time doubles the actual hourly rate instead of dividing by the full number of hours.',
      'Multiplying distance or output by hours combines the two measurements instead of dividing quantity by elapsed time.',
    ],
  ),
  q(
    'Convert 2.4 meters to centimeters.',
    'Convert 0.24 kilometer to meters.',
    '240',
    ['0.024', '24', '2,400'],
    'There are 100 centimeters per meter and 1,000 meters per kilometer, so both conversions produce 240 in the requested unit.',
    [
      'Dividing by the metric conversion factor instead of multiplying moves the decimal point in the wrong direction for a smaller unit.',
      'Multiplying by one power of 10 too few shifts the decimal only one step instead of using the full metric prefix factor.',
      'Multiplying by an extra factor of 10 shifts the decimal too far right and inflates the converted measurement tenfold.',
    ],
  ),
  q(
    'On a map, 1 inch represents 12 miles. Two towns are 3.5 inches apart. What is the actual distance?',
    'A scale drawing uses 1 centimeter for 12 meters. A wall measures 3.5 centimeters. What is the actual length?',
    '42',
    ['15.5', '36', '48'],
    'Multiply the scale value, 12, by the measured length, 3.5, to obtain 42 actual units.',
    [
      'Adding 12 and 3.5 combines a scale rate with a measured length instead of multiplying them proportionally.',
      'Multiplying 12 by 3 drops the fractional 0.5 unit from 3.5 and understates the actual distance by 6 units.',
      'Rounding 3.5 up to 4 and multiplying by 12 overestimates the true scaled distance by half of one scale unit.',
    ],
  ),
  q(
    'A quantity increases from 50 to 65. What is the percent increase?',
    'A membership count increases from 80 to 104. What is the percent increase?',
    '30%',
    ['15%', '23%', '130%'],
    'Percent increase is change divided by original: 15/50 and 24/80 both equal 0.30, or 30 percent.',
    [
      'Reporting the raw numerical increase of 15 directly as a percentage forgets to divide the change by the original value.',
      'Dividing the increase by the new ending value (15/65 or 24/104) uses the wrong base; percent change divides by the original.',
      'Dividing the new value by the original value gives 130% of the starting amount rather than the 30% increase alone.',
    ],
  ),
];

const dataDisplays = [
  q(
    'A table lists 12, 15, 15, 18, and 20. What is the median?',
    'A table lists 9, 12, 15, 18, and 21. What is the median?',
    '15',
    ['12', '16', '18'],
    'With five ordered values, the median is the third value, which is 15 in both sets.',
    [
      'Selecting the second value in the ordered list misses the middle (third) position of a five-number data set.',
      'Calculating the arithmetic mean of the first data set (80/5=16) finds the average rather than the middle ordered value.',
      'Selecting the fourth value in the ordered list sits one position above the true center of the five ordered observations.',
    ],
  ),
  q(
    'The mean of four scores is 18. Three scores are 14, 17, and 21. What is the fourth score?',
    'The mean of five values is 20. Four values are 16, 18, 22, and 24. What is the fifth value?',
    '20',
    ['18', '19', '22'],
    'The required total is mean times count. Subtracting the known values gives 72 - 52 = 20 and 100 - 80 = 20.',
    [
      'Picking the target mean directly ignores that the known scores sum below the average, so the missing score must be higher.',
      'Misadding the known scores by 1 point leaves the missing value 1 point too low to produce the stated mean.',
      'Overestimating the required sum by 2 points pushes the average above the stated mean when all values are combined.',
    ],
  ),
  q(
    'A bar chart uses a vertical axis beginning at 95 rather than 0 to compare values 98 and 100. What is the main interpretation risk?',
    'A graph compares rates of 49% and 51% using an axis from 48% to 52%. What should a reader notice?',
    'The truncated axis can make a small absolute difference look visually dramatic.',
    [
      'Starting the axis above zero forces both displayed bars to appear identical in height.',
      'Narrowing the vertical scale proves that one group caused the difference in the other.',
      'Using a non-zero baseline automatically makes the underlying numerical values inaccurate.',
    ],
    'Narrowing an axis can be legitimate, but it magnifies visual differences, so readers must inspect the scale and absolute values.',
    [
      'A zoomed-in vertical scale exaggerates height ratios between bars rather than flattening them to look identical.',
      'Changing axis scaling alters visual display only and can never establish a causal relationship between two measured variables.',
      'The plotted numbers themselves remain mathematically accurate; the risk is visual exaggeration if readers ignore the scale.',
    ],
  ),
  q(
    'A scatterplot shows points generally rising from left to right. Which description is best?',
    'A scatterplot of study time and practice score trends upward with substantial scatter. Which conclusion is justified?',
    'The variables show a positive association, though the plot alone cannot establish causation.',
    [
      'The variables display an exact negative linear relationship across every plotted observation.',
      'The upward pattern proves that increasing the horizontal variable directly causes higher outcomes.',
      'Because points do not lie on a single straight line, no statistical relationship is present.',
    ],
    'An upward pattern indicates positive association; observational association alone is not proof of a causal mechanism.',
    [
      'Points rising from left to right reflect a positive trend, not a negative one, and visible scatter rules out an exact line.',
      'Observational scatterplots show correlation or association, yet confounding factors prevent proving direct causation from a plot alone.',
      'Real-world empirical associations commonly show substantial scatter around a line while still exhibiting a meaningful upward directional trend.',
    ],
  ),
  q(
    'A survey reports 60% support with a margin of error of plus or minus 4 percentage points. Which interval matches the report?',
    'A poll reports 60% support with a margin of error of plus or minus 4 points. Which interval is represented?',
    '56% to 64%',
    ['60% to 68%', '56% to 60%', '40% to 80%'],
    'Add and subtract four percentage points from the estimate: 60% gives an interval from 56% through 64%.',
    [
      'Adding 8 points above 60% instead of centering plus/minus 4 points shifts the entire confidence interval upward.',
      'Subtracting 4 points without also adding 4 points above 60% produces only the lower half of the symmetric interval.',
      'Treating a 4-point margin of error as 20 percentage points expands the interval five times wider than reported.',
    ],
  ),
  q(
    'A line graph shows sales of 20, 24, 24, and 28 over four quarters. Which statement is accurate?',
    'A line graph shows attendance of 20, 24, 24, and 28 over four sessions. Which statement is accurate?',
    'The measure increased overall, staying flat between the second and third observations.',
    [
      'The measure declined steadily across each successive period from the first through the fourth.',
      'The measure doubled from its opening value of 20 to its final value in the fourth period.',
      'The third observation dropped below the second before recovering in the final time period.',
    ],
    'The sequence increases from 20 to 28 overall and the middle two values are equal.',
    [
      'Moving from 20 to 24 to 28 represents an overall rise of 8 units rather than a steady decline across periods.',
      'Doubling 20 would reach 40, whereas the final value of 28 is a 40% increase rather than a 100% doubling.',
      'Both the second and third observations equal 24, so the line stays level between them instead of dipping downward.',
    ],
  ),
];

const statisticsProbability = [
  q(
    'What is the range of 4, 9, 11, 15, and 18?',
    'What is the range of 22, 27, 29, 33, and 36?',
    '14',
    ['9', '11.4', '22'],
    'Range is maximum minus minimum: 18 - 4 and 36 - 22 both equal 14.',
    [
      'Computing the spread of only the inner portion of the set omits the endpoints needed for the full range.',
      'Calculating the arithmetic mean of the first set (57/5=11.4) reports a measure of center instead of spread.',
      'Adding the maximum and minimum (18+4=22) sums the two extreme values instead of subtracting the minimum from the maximum.',
    ],
  ),
  q(
    'A fair six-sided number cube is rolled once. What is the probability of rolling an even number?',
    'A bag contains 3 red and 3 blue counters. What is the probability of drawing a red counter?',
    '1/2',
    ['1/3', '2/3', '3'],
    'There are three favorable outcomes among six equally likely outcomes, giving 3/6 = 1/2.',
    [
      'This fraction counts only two favorable outcomes out of six (2/6=1/3) instead of all three matching outcomes.',
      'This fraction counts four favorable outcomes out of six (4/6=2/3), overstating the share of matching outcomes.',
      'Reporting the raw count of 3 favorable outcomes ignores dividing by 6 total outcomes; probabilities cannot exceed 1.',
    ],
  ),
  q(
    'Two fair coins are flipped. What is the probability of exactly one head?',
    'A spinner with equal red and blue halves is spun twice. What is the probability of one result of each color?',
    '1/2',
    ['1/4', '3/4', '1'],
    'The four equally likely ordered outcomes include two favorable mixed outcomes, so the probability is 2/4 = 1/2.',
    [
      'Counting HT and TH as a single outcome undercounts the two distinct ordered ways to obtain one of each result.',
      'Including the all-heads or matching-color case computes at least one favorable result (3/4) rather than exactly one.',
      'A probability of 1 implies certainty, ignoring the two same-result outcomes (both heads or both tails).',
    ],
  ),
  q(
    'A data set has one extremely high outlier. Which measure of center is generally less affected?',
    'A set of home prices includes one unusually expensive property. Which center is more resistant to that value?',
    'The median',
    ['The mean', 'The range', 'The maximum'],
    'The median depends on order and is typically resistant to an extreme value, whereas the mean is pulled toward it.',
    [
      'Because the mean sums every observation, one unusually large value pulls the arithmetic average sharply upward.',
      'The range measures total spread (max minus min) rather than center, and it expands directly with a high outlier.',
      'The maximum is a single extreme endpoint rather than a measure of center, and it shifts directly to the outlier.',
    ],
  ),
  q(
    'A study randomly assigns participants to two treatments. What is the main benefit of random assignment?',
    'A classroom experiment uses random assignment to two practice schedules. What does random assignment primarily support?',
    'It helps balance background variables across groups, strengthening causal inference.',
    [
      'It ensures that a convenience volunteer group mirrors the demographics of every national population.',
      'It removes scoring mistakes, instrument error, and participant fatigue from the outcome measurements.',
      'It requires every individual participant to complete both treatments in the exact same sequence.',
    ],
    'Random assignment supports internal validity by reducing systematic preexisting group differences; it does not guarantee population representativeness.',
    [
      'Representing a broader target population depends on random sampling from that population, not random assignment of volunteers.',
      'Measurement accuracy depends on reliable instruments and careful test administration rather than on how participants were assigned to groups.',
      'Having each person complete both conditions describes a crossover or within-subjects design, not basic random assignment.',
    ],
  ),
  q(
    'From 500 records, a researcher randomly samples 50. What fraction of the records is sampled?',
    'From 800 applications, an auditor randomly reviews 80. What fraction is reviewed?',
    '10%',
    ['1%', '20%', '50%'],
    'The sample fraction is 50/500 or 80/800, each equal to 0.10, or 10 percent.',
    [
      'Misplacing the decimal point when converting 0.10 to a percent turns one-tenth into 1% instead of 10%.',
      'Doubling the ratio mistakes 50/500 (one-tenth) for one-fifth, which would require randomly sampling 100 of 500 records.',
      'Treating the numerator 50 directly as 50% ignores dividing the sampled count by the full population of 500 records.',
    ],
  ),
];

const algebraFunctions = [
  q(
    'What value of x satisfies the linear equation 3x + 7 = 25?',
    'Find the solution for x in the linear equation 5x - 12 = 18.',
    'x = 6',
    ['x = 4', 'x = 8', 'x = 10'],
    'Subtract 7 from both sides to get 3x = 18, then divide both sides by 3 to get x = 6. Substitution verifies the solution because 3(6) + 7 = 25.',
    [
      'Dividing 25 - 7 or miscomputing the arithmetic leaves x too small; substituting x=4 fails to satisfy the equation.',
      'Miscomputing the division step by 2 units gives x=8, which produces too large a left-hand value upon substitution.',
      'Adding instead of subtracting the constant term before dividing gives an inflated value that fails substitution.',
    ],
    {
      rationaleB: 'Add 12 to both sides to get 5x = 30, then divide both sides by 5 to get x = 6. Substitution verifies the solution because 5(6) - 12 = 18.',
    },
  ),
  q(
    'Which algebraic expression is equivalent to 4(2x - 3) + 5 after expanding and combining terms?',
    'After distributing and combining like terms, which expression equals 2(4x + 1) - 9?',
    '8x - 7',
    ['8x - 12', '6x - 7', '8x + 7'],
    'Distribute and combine constants: 8x - 12 + 5 and 8x + 2 - 9 both simplify to 8x - 7.',
    [
      'Stopping after distributing 4(2x - 3) = 8x - 12 forgets to combine the trailing constant +5 with -12.',
      'Adding the outer factor and inner coefficient (4+2=6) instead of multiplying them produces the wrong linear coefficient on x.',
      'Combining signed constants inaccurately after distributing flips the sign of the final constant term from -7 to +7.',
    ],
  ),
  q(
    'A subscription plan charges $12 plus $4 per month. Which expression gives the total cost after m months?',
    'A tutoring center collects a $12 registration fee plus $4 for every workshop attended. Which expression gives the cost for v workshops?',
    '12 + 4m',
    ['16m', '12m + 4', '48m'],
    'The fixed charge is the constant 12 and the repeated charge is 4 times the number of months.',
    [
      'Combining 12 and 4 into 16m incorrectly multiplies the one-time $12 fixed fee by the number of months m.',
      'Reversing the fixed fee and monthly rate attaches the variable m to $12 instead of the $4-per-month charge.',
      'Multiplying 12 by 4 to get 48m incorrectly treats an additive fixed fee and monthly rate as factors in a single product.',
    ],
    {
      variantB: {
        correct: '12 + 4v',
        distractors: ['16v', '12v + 4', '48v'],
        rationale: 'The one-time registration fee is the constant 12 and the repeated fee is 4 times the number of workshops v, giving 12 + 4v.',
        distractorNotes: [
          'Combining 12 and 4 into 16v incorrectly charges the one-time $12 registration fee on every single workshop v rather than once.',
          'Swapping the fixed registration fee and per-workshop rate multiplies $12 by v instead of multiplying the $4 per-workshop rate by v.',
          'Multiplying 12 by 4 to form 48v incorrectly treats an additive registration fee and per-workshop rate as a single product.',
        ],
      },
    },
  ),
  q(
    'Given the quadratic function f(x) = 2x^2 - 3, what is the output value of f(3)?',
    'For the quadratic function g(x) = 3x^2 - 5, what output value does g(3) produce?',
    '15',
    ['3', '9', '33'],
    'Substitution gives 2(3^2) - 3 = 18 - 3 = 15, evaluating the exponent before multiplying by 2 and subtracting 3.',
    [
      'Evaluating 2(3) - 3 = 3 forgets to square the input x = 3 before multiplying by the leading coefficient 2.',
      'Squaring 3 to get 9 forgets both multiplying by the leading coefficient 2 and subtracting the constant 3.',
      'Squaring the product (2x)^2 = 36 before subtracting 3 violates order of operations because the exponent applies only to x.',
    ],
    {
      variantB: {
        correct: '22',
        distractors: ['4', '13', '76'],
        rationale: 'Substituting x = 3 into g(x) = 3x^2 - 5 gives 3(9) - 5 = 27 - 5 = 22, applying the exponent before multiplication.',
        distractorNotes: [
          'Computing 3(3) - 5 = 4 forgets to square the input x = 3 before multiplying by 3 and subtracting 5 in g(3).',
          'Adding 3^2 + 3 + 1 or miscomputing 3 times 6 minus 5 confuses squaring the input 3 with doubling it.',
          'Squaring the full product (3x)^2 = 81 before subtracting 5 violates order of operations because the exponent applies only to x.',
        ],
      },
    },
  ),
  q(
    'A line in the coordinate plane passes through (0, 5) and (4, 13). What is its slope?',
    'A straight line passes through the coordinate points (2, 7) and (6, 15). What is its slope?',
    '2',
    ['1/2', '4', '8'],
    'Slope is change in y divided by change in x: (13 - 5)/(4 - 0) and (15 - 7)/(6 - 2) both equal 2.',
    [
      'Dividing run by rise (change in x over change in y) inverts the slope formula and produces the reciprocal 1/2.',
      'Reporting only the horizontal change (delta x = 4) forgets to divide the vertical change of 8 by the run of 4.',
      'Reporting only the vertical change (delta y = 8) omits dividing that rise by the horizontal run of 4.',
    ],
  ),
  q(
    'Which set of values satisfies the linear inequality 2x - 5 > 9?',
    'Determine all real numbers x that make the inequality 3x + 1 > 22 true.',
    'x > 7',
    ['x < 7', 'x > 2', 'x < 14'],
    'Isolating x gives 2x > 14 or 3x > 21, so x must be greater than 7.',
    [
      'Reversing the inequality direction is required only when multiplying or dividing by a negative number, not a positive coefficient.',
      'Subtracting 5 from 9 instead of adding 5 to both sides yields 2x > 4 and produces the incorrect boundary x > 2.',
      'Forgetting to divide by the coefficient of x and flipping the inequality sign leaves an unsolved, reversed bound.',
    ],
  ),
];

const geometry = [
  q(
    'A rectangle has length 9 and width 6. What is its area?',
    'A triangle has base 12 and height 9. What is its area?',
    '54 square units',
    ['30 square units', '45 square units', '108 square units'],
    'Rectangle area is 9 times 6, and triangle area is one-half times 12 times 9; both equal 54 square units.',
    [
      'Computing 2(9+6)=30 finds the perimeter around the rectangle rather than the interior area in square units.',
      'Multiplying with an off-by-one side dimension (9 times 5 = 45) understates the true area of the geometric figure.',
      'Computing base times height (12 times 9 = 108) forgets the factor of 1/2 in the triangle area formula or doubles the rectangle.',
    ],
  ),
  q(
    'A circle has radius 5. What is its circumference in terms of pi?',
    'A circle has diameter 10. What is its circumference in terms of pi?',
    '10pi',
    ['5pi', '20pi', '25pi'],
    'Circumference is 2pi times radius or pi times diameter; both forms give 10pi.',
    [
      'Using pi times radius (5pi) forgets the factor of 2 in C = 2 pi r, giving only half of the full circumference.',
      'Multiplying the diameter 10 by 2 applies C = 2 pi r to the diameter instead of the radius, doubling the true value.',
      'Squaring the radius to obtain 25pi computes the circle\'s area (pi r^2) instead of its circumference.',
    ],
  ),
  q(
    'A right triangle has legs 6 and 8. What is the hypotenuse?',
    'A right triangle has legs sqrt(36) and sqrt(64). What is the hypotenuse?',
    '10',
    ['7', '12', '14'],
    'The Pythagorean theorem gives c squared = 36 + 64 = 100, so the positive length is 10.',
    [
      'Averaging the two legs ((6+8)/2 = 7) cannot yield the hypotenuse, which must be longer than either leg.',
      'Estimating halfway between the longer leg and sum of legs ignores taking the square root of 6^2 + 8^2 = 100.',
      'Adding the two legs directly (6 + 8 = 14) skips squaring each leg and taking the square root of the sum.',
    ],
  ),
  q(
    'Two angles form a linear pair. One angle is 68 degrees. What is the other?',
    'Two supplementary angles include one angle of 68 degrees. What is the other measure?',
    '112 degrees',
    ['22 degrees', '68 degrees', '292 degrees'],
    'Angles in a linear pair are supplementary, so the missing measure is 180 - 68 = 112 degrees.',
    [
      'Subtracting from 90 degrees (90 - 68 = 22) finds the complementary angle instead of the supplementary angle summing to 180.',
      'Setting both angles equal assumes vertical or congruent angles rather than a supplementary pair summing to 180 degrees.',
      'Subtracting from 360 degrees (360 - 68 = 292) uses a full circle rather than the 180-degree straight-angle sum.',
    ],
  ),
  q(
    'A rectangular prism measures 3 by 4 by 7. What is its volume?',
    'A rectangular tank measures 2 by 6 by 7. What is its volume?',
    '84 cubic units',
    ['28 cubic units', '56 cubic units', '168 cubic units'],
    'Volume is the product of length, width, and height: 3 x 4 x 7 and 2 x 6 x 7 both equal 84.',
    [
      'Multiplying only two dimensions (4 x 7 = 28) computes the area of a single face instead of the 3D volume.',
      'Using an incorrect face area or dropping a factor undercounts the product of all three perpendicular dimensions.',
      'Doubling the product of length, width, and height inflates the prism volume to twice its actual capacity.',
    ],
  ),
  q(
    'A scale factor of 3 enlarges a square with side 4. What is the new side length?',
    'Similar triangles have a scale factor of 3. A corresponding side is 4 in the smaller triangle. What is it in the larger triangle?',
    '12',
    ['1', '7', '16'],
    'Corresponding lengths are multiplied by the linear scale factor, so 4 times 3 equals 12.',
    [
      'Subtracting the scale factor from the side length (4 - 3 = 1) shrinks the figure instead of enlarging it proportionally.',
      'Adding the scale factor to the side length (4 + 3 = 7) treats proportional dilation as an additive shift.',
      'Squaring the original side length (4^2 = 16) computes the original square\'s area rather than scaling the linear side by 3.',
    ],
  ),
];

module.exports = [
  { id: 'math-number-operations', chapterId: 'core5752-ch-07', domainId: 'math-number-quantity', domain: 'Mathematics: Number and Quantity', label: 'Number Forms and Operations', references: refs, questions: numberOperations },
  { id: 'math-ratios-percent-measurement', chapterId: 'core5752-ch-08', domainId: 'math-number-quantity', domain: 'Mathematics: Number and Quantity', label: 'Ratios, Percent, Rates, and Measurement', references: refs, questions: ratiosMeasurement },
  { id: 'math-data-displays', chapterId: 'core5752-ch-09', domainId: 'math-data-statistics-probability', domain: 'Mathematics: Data, Statistics, and Probability', label: 'Data Displays and Descriptive Measures', references: refs, questions: dataDisplays },
  { id: 'math-statistics-probability', chapterId: 'core5752-ch-10', domainId: 'math-data-statistics-probability', domain: 'Mathematics: Data, Statistics, and Probability', label: 'Statistics, Sampling, and Probability', references: refs, questions: statisticsProbability },
  { id: 'math-algebra-functions', chapterId: 'core5752-ch-11', domainId: 'math-algebra-geometry', domain: 'Mathematics: Algebra and Geometry', label: 'Algebra, Equations, and Functions', references: refs, questions: algebraFunctions },
  { id: 'math-geometry-measurement', chapterId: 'core5752-ch-12', domainId: 'math-algebra-geometry', domain: 'Mathematics: Algebra and Geometry', label: 'Geometry, Similarity, and Measurement', references: refs, questions: geometry },
];
