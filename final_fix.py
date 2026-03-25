import os
import subprocess

def fix_file(target):
    with open(target, 'r', encoding='utf-8') as f:
        orig = f.read()

    # We know the current state in src/stem_lab_module.js is:
    #         })()
    #       )));
    #     };
    #   }
    # })();
    
    # We want to replace it with:
    #         })()
    #       ));
    #     };
    #   }
    # })();
    
    # Wait, the origin could also be the original unbroken state:
    #         })(),
    # 
    # 
    #       ));
    
    # Just to be completely robust, we will find `_pluginFallback`
    # and replace whatever comes after `stemLabTab === 'explore' ... (function _pluginFallback() { ... })`
    
    idx = orig.rfind('_pluginFallback')
    if idx == -1:
        print(f"Skipping {target} - _pluginFallback not found")
        return
        
    start_iife = orig.rfind('(function _pluginFallback', idx - 20)
    end_iife = orig.find('})()', start_iife)
    
    if end_iife != -1:
        # Cut off everything after `})()` and replace with the known good ending
        good_ending = """})()
      ));
    };
  }
})();
"""
        # But wait, maybe the file already has '));' or ')));'
        # Let's just find the last '})()' and replace from there to the end.
        last_brace = orig.rfind('})()')
        if last_brace != -1:
            new_content = orig[:last_brace] + good_ending
            with open(target, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {target}")

files_to_fix = [
    r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\src\stem_lab_module.js',
    r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab\stem_lab_module.js',
    r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\build\stem_lab_module.js',
    r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\public\stem_lab_module.js'
]

for f in files_to_fix:
    if os.path.exists(f):
        fix_file(f)

print("All files patched. Running node -c on src/stem_lab_module.js")
try:
    subprocess.check_output(['node', '-c', files_to_fix[0]], stderr=subprocess.STDOUT)
    print("Verification PASSED!")
except subprocess.CalledProcessError as e:
    print("Verification FAILED:")
    print(e.output.decode('utf-8'))
