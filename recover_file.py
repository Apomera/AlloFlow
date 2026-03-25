import sys
import subprocess
import shutil

target = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\public\stem_lab_module.js'

with open(target, 'r', encoding='utf-8') as f:
    text = f.read()

# We know my script replaced `})()` to the end with `})() \n      )); \n    };\n  }\n})();`
# Let's change the last `));` back to `)));`
idx = text.rfind('));')
if idx != -1:
    fixed_text = text[:idx] + ')));' + text[idx+3:]
    
    # Save to stem_lab/stem_lab_module.js
    out_target = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab\stem_lab_module.js'
    with open(out_target, 'w', encoding='utf-8') as f:
        f.write(fixed_text)
        
    print(f"Recovered to {out_target}")
    try:
        subprocess.check_output(['node', '-c', out_target], stderr=subprocess.STDOUT)
        print("RECOVERY SUCCESSFUL! Syntax matches perfectly.")
        shutil.copy(out_target, target) # Sync back
    except subprocess.CalledProcessError as e:
        print("Syntax still fails:", e.output.decode('utf-8')[:200])
else:
    print("Could not find )); in the public file.")
