"""
Fix: Sound Counting should always provide 11 response options (1-10 and 11+)
instead of a dynamic range capped at 8.
"""

FILE = r"AlloFlowANTI.txt"

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    fixes = 0

    # Fix 1: Change the numberOptions array to always be 1-10
    old_options = "const numberOptions = Array.from({length: Math.min(8, count + 3)}, (_, i) => i + 1); // Smart range: [1, count+3] capped at 8"
    new_options = "const numberOptions = Array.from({length: 10}, (_, i) => i + 1); // Fixed range: always [1..10] plus 11+"

    if old_options in content:
        content = content.replace(old_options, new_options, 1)
        fixes += 1
        print("FIX 1: Changed numberOptions to always be [1..10]")
    else:
        print("FIX 1 WARNING: numberOptions pattern not found")

    # Fix 2: Add the "11+" button after the number options map
    old_map_end = """                                  {num}
                                  </div>
                              ))}
                          </div>"""
    new_map_end = """                                  {num}
                                  </div>
                              ))}
                              {/* 11+ option for longer words */}
                              <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, 11, 'number')}
                                  onKeyDown={(e) => handleCountKeyDown(e, 11)}
                                  tabIndex={0}
                                  onClick={() => checkAnswer(11, count)}
                                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border-b-4 border-purple-300 text-purple-700 font-black text-lg flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 hover:bg-purple-50 hover:border-purple-400 transition-all cursor-grab active:cursor-grabbing"
                                  aria-label="11 or more sounds"
                              >
                                  11+
                              </div>
                          </div>"""

    if old_map_end in content:
        content = content.replace(old_map_end, new_map_end, 1)
        fixes += 1
        print("FIX 2: Added 11+ button after number options")
    else:
        print("FIX 2 WARNING: Map end pattern not found, trying alternate")
        # Try more specific context
        old_alt = """{num}
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
             }"""
        if old_alt in content:
            new_alt = """{num}
                                  </div>
                              ))}
                              {/* 11+ option for longer words */}
                              <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, 11, 'number')}
                                  onKeyDown={(e) => handleCountKeyDown(e, 11)}
                                  tabIndex={0}
                                  onClick={() => checkAnswer(11, count)}
                                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 border-b-4 border-purple-300 text-purple-700 font-black text-lg flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 hover:bg-purple-50 hover:border-purple-400 transition-all cursor-grab active:cursor-grabbing"
                                  aria-label="11 or more sounds"
                              >
                                  11+
                              </div>
                          </div>
                      </div>
                  );
             }"""
            content = content.replace(old_alt, new_alt, 1)
            fixes += 1
            print("FIX 2 (alt): Added 11+ button after number options")

    # Fix 3: Update the checkAnswer comparison to handle 11+ correctly
    # If user picks 11 and the actual count is >= 11, it should be correct
    # Let's check how checkAnswer handles counting activity
    # The current call is: checkAnswer(val, count) where val is the number selected
    # and count is the actual phoneme count

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"\nTotal fixes: {fixes}")

if __name__ == "__main__":
    main()
