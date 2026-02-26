"""Fix the syntax error in data stats block"""

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the incorrectly placed stats block and fix it
# The stats block starts with: ,\n            d.points.length >= 2 && React.createElement("div", { className: "mt-2 grid
# It was inserted before a snapshot line but the leading comma might be after a statement not a JSX expression

stats_marker = 'd.points.length >= 2 && React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-2" },'
idx = content.find(stats_marker)

if idx >= 0:
    # Check what's before it - go back to find the comma
    before_100 = content[max(0, idx-100):idx]
    print("Before stats block:", repr(before_100[-50:]))
    
    # The block was inserted with a leading comma and newline
    # Find the comma right before the stats block
    comma_search = content[max(0, idx-20):idx]
    print("Immediate before:", repr(comma_search))
    
    # Check if there's ',\n' right before
    newline_before = content.rfind('\n', max(0, idx-20), idx)
    if newline_before >= 0:
        char_before_newline = content[newline_before-1:newline_before]
        print("Char before newline:", repr(char_before_newline))
        
        # The issue: the stats block was inserted at a line boundary after a statement
        # ending with ;  which means the leading comma is invalid
        # Let's remove the entire stats block and re-insert it properly
        
    # Find the end of the stats block
    stats_end_marker = '.toFixed(2))\n              )\n            )'
    end_idx = content.find(stats_end_marker, idx)
    if end_idx >= 0:
        stats_end = end_idx + len(stats_end_marker)
        # Get the full stats block
        # Look backward from idx to find the leading comma
        lead = content.rfind(',', max(0, idx-10), idx)
        if lead >= 0:
            full_stats = content[lead:stats_end]
            print("\nFull stats block length:", len(full_stats))
            print("First 60 chars:", repr(full_stats[:60]))
            print("Last 40 chars:", repr(full_stats[-40:]))
            
            # Remove it
            content = content[:lead] + content[stats_end:]
            print("\nRemoved stats block. Now reinserting correctly...")
            
            # Now find the Data snapshot button in the dataPlotter section
            # and insert the stats RIGHT BEFORE it as a sibling JSX element
            dp_title_idx = content.find('Data Plotter')
            if dp_title_idx >= 0:
                # Find the snapshot button for data plotter
                snap_idx = content.find('Data snapshot', dp_title_idx)
                if snap_idx < 0:
                    snap_idx = content.find('Snapshot', dp_title_idx)
                
                if snap_idx >= 0:
                    # Go backward to find the React.createElement for the snapshot button
                    snap_elem = content.rfind('React.createElement("button"', max(0, snap_idx - 300), snap_idx)
                    if snap_elem >= 0:
                        # Insert stats block before this button element
                        # First check: is there a comma before the button?
                        pre_comma = content.rfind(',', max(0, snap_elem-5), snap_elem)
                        if pre_comma >= 0 and snap_elem - pre_comma < 5:
                            # There's already a comma, so we just insert after it
                            insert_at = snap_elem
                        else:
                            insert_at = snap_elem
                        
                        stats_jsx = """d.points.length >= 2 && React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-2" },
              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Mean"),
                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (d.points.reduce(function(s,p){return s+p.y},0)/d.points.length).toFixed(2))
              ),
              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Median"),
                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (function(ps){ var s=ps.map(function(p){return p.y}).sort(function(a,b){return a-b}); return s.length%2?s[Math.floor(s.length/2)]:((s[s.length/2-1]+s[s.length/2])/2); })(d.points).toFixed(2))
              ),
              React.createElement("div", { className: "text-center p-1.5 bg-teal-50 rounded-lg border border-teal-200" },
                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Std Dev"),
                React.createElement("p", { className: "text-xs font-bold text-teal-800" }, (function(ps){ var m=ps.reduce(function(s,p){return s+p.y},0)/ps.length; return Math.sqrt(ps.reduce(function(s,p){return s+Math.pow(p.y-m,2)},0)/ps.length); })(d.points).toFixed(2))
              )
            ),
            """
                        content = content[:insert_at] + stats_jsx + content[insert_at:]
                        print("Stats block re-inserted before snapshot button")
                    else:
                        print("Could not find snapshot React.createElement")
                else:
                    print("Snapshot button text not found")
            else:
                print("Data Plotter title not found")
        else:
            print("Leading comma not found")
    else:
        print("Stats end marker not found")
else:
    print("Stats block not found - may not have been inserted")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone!")
