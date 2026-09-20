# Secant-to-tangent investigation

2026-09-20T03:45:34.760Z

Function: f(x) = x²

Family: quadratic

Parameters: a=1, b=0, c=0

Base point x₀ = 1; f(x₀) = 1

Starting step: 1

Prediction: same

Slopes use the actual represented sample spacing. The centered estimate alone does not establish a derivative.

h = 1; left sample x = 0; right sample x = 2; left slope = 1; right slope = 3; centered estimate = 2

h = 0.1; left sample x = 0.9; right sample x = 1.1; left slope = 1.9; right slope = 2.1; centered estimate = 2

h = 0.01; left sample x = 0.99; right sample x = 1.01; left slope = 1.990000000000001; right slope = 2.009999999999999; centered estimate = 2

h = 0.001; left sample x = 0.999; right sample x = 1.001; left slope = 1.9989999999999712; right slope = 2.0009999999999177; centered estimate = 1.9999999999999445

Analytic derivative comparison: f′(x₀) = 2

Reflection: The left and right slopes approach 2 from opposite sides.

Finite numerical samples cannot prove a limit. Domain boundaries, corners, and roundoff need separate attention.