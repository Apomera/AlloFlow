# Shared controller navigation follow-up

The shared input service now offers controller navigation of visible STEM controls. Press the right stick (R3) to enter or leave navigation. D-pad up/down moves focus, left/right adjusts selects and numeric/range inputs, A activates buttons or checkboxes and expands sections, and B returns. The Controls settings panel accepts these inputs automatically while activity controls are suspended.

Navigation stays inside the current tool or settings panel, skips disabled/hidden controls and collapsed content, and includes inactive tabs. A cyan outline identifies the selected control. Activity inputs are released on entry; native Road Ready input remains suspended while navigating. Returning requires neutral controller input. Keyboard movement is blocked during navigation, and Escape returns locally. A custom activity binding on R3 takes precedence over the navigation shortcut.

Neutral detection now uses the configured stick deadzone, so tolerated drift does not prevent a controller from becoming ready.

Validation includes the actual Ratio Lab interface (switching tabs and opening exploration), real React settings changes and persistence, existing Road Ready browser controls tests, and isolated runtime tests for focus boundaries, held buttons, custom R3 bindings, disconnects, native input ownership and deadzones. The browser run passed all five tests. `ratio-controller-navigation.png` shows the verified navigation state.

This extends shared UI navigation; it does not add native analog physics to every STEM tool. Text entry still uses a keyboard. Physical controller hardware has not been tested. Changes remain local and undeployed.
