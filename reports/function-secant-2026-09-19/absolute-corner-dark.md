# Secant-to-tangent investigation

2026-09-20T03:45:38.433Z

Function: f(x) = |x|

Family: absolute

Parameters: a=1, b=0, c=0

Base point x₀ = 0; f(x₀) = 0

Starting step: 1

Prediction: different

Slopes use the actual represented sample spacing. The centered estimate alone does not establish a derivative.

h = 1; left sample x = -1; right sample x = 1; left slope = -1; right slope = 1; centered estimate = 0

h = 0.1; left sample x = -0.1; right sample x = 0.1; left slope = -1; right slope = 1; centered estimate = 0

h = 0.01; left sample x = -0.01; right sample x = 0.01; left slope = -1; right slope = 1; centered estimate = 0

h = 0.001; left sample x = -0.001; right sample x = 0.001; left slope = -1; right slope = 1; centered estimate = 0

Analytic derivative comparison: No finite derivative value is available from the supported function model. Check the domain, one-sided behavior, and numerical range.

Reflection: A centered estimate of zero hides the corner: the left slopes stay at −1 and the right slopes stay at 1.

Finite numerical samples cannot prove a limit. Domain boundaries, corners, and roundoff need separate attention.