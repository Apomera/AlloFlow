onClick handler refs: 147 unique names
Handler definitions found: 345 unique names
Missing definitions: 0

Braces: 23699 open, 23707 close, diff=-8

Tier 2 block at line 35192:
PHASE 1 TIER 2: Extracted useCallback Handlers ===
  const handleToggleIsEditing = React.useCallback(() => setIsEditing(prev => !prev), []);
  const handleToggleIsFullscreen = React.useCallback(() => setIsFullscreen(prev => !prev), []);
  const handleToggleIsMapLocked = React.useCallback(() => setIsMapLocked(prev => !prev), []);
  const handleToggleFocusMode = React.useCallback(() => setFocusMode(prev => !prev), []);
  const handleTogglePersonaAutoSend = React.useCallback(() => setPersonaAutoSend(prev => !prev), []);
  const handleToggleShowPersonaHints = React.useCallback(() => setShowPersonaHints(prev => !prev), []);
  const handleToggleShowFlashcardImages = React.useCallback(() => setShowFlashcardImages(prev => !prev), []);
  const handleSetIsMinimizedToFalse = React.useCallback(() => s

New useCallback declarations: 62
  handleAudio
  handleReorderPreloadedWords
  handleUpdatePreloadedWord
  handleDeleteWord
  handleRegenerateWord
  handleRegenerateOption
  handleRegenerateAll
  handleGenerateWordImage
  handleRefineWordImage
  handleMicInput
  handleChipClick
  handleSegDrop
  handleMoveKey
  handleToggleIsEditing
  handleToggleIsFullscreen
  handleToggleIsMapLocked
  handleToggleFocusMode
  handleTogglePersonaAutoSend
  handleToggleShowPersonaHints
  handleToggleShowFlashcardImages
  handleSetIsMinimizedToFalse
  handleOnPlayAudio
  handleSetIsMinimizedToTrue
  handleHandleAudio
  handleSetStepTo4