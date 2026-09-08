# Parking scene refinements

- Moved the score and keyboard instructions out of the canvas into readable HTML, with a car/target legend.
- Reduced unused vertical space in the standard parking scene and added camera tracking so wider maneuvers keep the learner car visible.
- Added traffic direction, a shaded target, sidewalk joints, and labels beside the parked cars. The curb uses a neutral color.
- Front wheels now visibly turn independently. Red brake lamps and white reversing lamps are distinct.
- Reset guidance reflects the already-aligned starting position and reminds learners to observe before reversing.
- Wrong-way parking now gives a specific traffic-direction message before the general positioning check.

Validation: 191 regression tests passed; both parking browser tests passed. An additional browser assertion verifies the learner car is rendered inside the view after backing beyond the initial frame. Desktop, 390px and 320px screenshots are in `parking-coach-*.png`.

The canonical Road Ready module and its active desktop mirror match. Changes are local and have not been committed or deployed.
