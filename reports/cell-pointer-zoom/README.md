# Pointer-centered microscope zoom

Free observation wheel zoom now preserves the world point under the pointer instead of magnifying around the canvas center. Coordinate conversion uses the rendered canvas bounds and backing-store scale. Existing magnification steps and limits remain in place; camera bounds still apply. Follow mode and Play mode retain their specimen-centered behavior. Horizontal-only wheel events no longer change magnification.

Browser coverage uses a real wheel event over the Nucleus at 320px/2x and 1200px/1x. It verifies the rendered anchor stays fixed while zooming in and out, the selected specimen/structure persist, and the visible magnification updates. Further cases cover zoom limits, horizontal-only events, following, and unchanged play mission evidence. Existing toolbar coverage verifies slider keyboard input, reset and play/pause across four widths.
