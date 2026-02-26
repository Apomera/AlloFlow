import re

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for "finishReason: OTHER" which is extremely unique to this specific block
target = "finishReason: OTHER"
idx = content.find(target)
if idx != -1:
    # Find the preceding catch (err) {
    catch_idx = content.rfind("} catch (err) {", 0, idx)
    
    # Find the closing brace of the catch block. 
    # It ends with:
    #                   playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker);
    #               }
    #           }
    #       }
    #   };
    
    end_idx = content.find("};\n  const handleSpeak", catch_idx)
    if end_idx != -1:
        # The block ends just before `}; \n const handleSpeak`
        old_block = content[catch_idx:end_idx]
        
        new_block = "} catch (err) {\n          if (playbackSessionRef.current === sessionId) {\n              warnLog(\"Critical Playback Error, skipping sentence:\", err);\n              playSequence(index + 1, sentences, sessionId, mode, voiceMap, activeSpeaker);\n          }\n      }\n  "
        
        content = content[:catch_idx] + new_block + content[end_idx:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Replaced playSequence catch block successfully!")
    else:
        print("❌ Could not find end of catch block")
else:
    print("❌ Could not find finishReason: OTHER pattern")

