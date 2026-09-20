# Secant-to-tangent investigation

2026-09-20T03:45:38.047Z

Function: f(x) = x³

Family: cubic

Parameters: a=1, b=0, c=0

Base point x₀ = 0; f(x₀) = 0

Starting step: 1

Prediction: same

Slopes use the actual represented sample spacing. The centered estimate alone does not establish a derivative.

h = 1; left sample x = -1; right sample x = 1; left slope = 1; right slope = 1; centered estimate = 1

h = 0.1; left sample x = -0.1; right sample x = 0.1; left slope = 0.010000000000000002; right slope = 0.010000000000000002; centered estimate = 0.010000000000000002

h = 0.01; left sample x = -0.01; right sample x = 0.01; left slope = 0.00010000000000000002; right slope = 0.00010000000000000002; centered estimate = 0.00010000000000000002

h = 0.001; left sample x = -0.001; right sample x = 0.001; left slope = 0.000001; right slope = 0.000001; centered estimate = 0.000001

Analytic derivative comparison: f′(x₀) = 0

Reflection: Not recorded.

Finite numerical samples cannot prove a limit. Domain boundaries, corners, and roundoff need separate attention.