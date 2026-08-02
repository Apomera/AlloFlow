# veraPDF runtime notice

`verapdf-cli.jar` is the veraPDF 1.30.2 command-line validator used by the
remote runner for independent PDF/UA-1 evidence. The upstream distribution
identifies veraPDF as released under the GNU General Public License v3 and the
Mozilla Public License v2 or later. Keep the JAR and this notice together when
building the runner image.

The runner invokes the JAR locally with the built-in `ua1` profile, a bounded
failure display, and a process timeout. It does not use the browser validator
HTML, CheerpJ loader, or public CDN resources.

The validator's result is evidence, not a legal accessibility certificate;
AlloFlow still reports the independent status separately from its own
remediation/delivery verdict.
