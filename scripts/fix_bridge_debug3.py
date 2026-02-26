#!/usr/bin/env python3
"""Add ultra-visible test to bridge panel to diagnose rendering/CSS issue."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Replace the bridge panel overlay with INLINE STYLES to bypass any CSS issues
# The current pattern starts with the gate check and then the panel
old_panel = """        <div className="bridge-send-overlay" onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}>"""

new_panel = """        <div style={{position:'fixed',inset:0,zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)'}} onClick={(e) => { if (e.target === e.currentTarget) setBridgeSendOpen(false); }}>"""

if old_panel in content:
    content = content.replace(old_panel, new_panel, 1)
    changes += 1
    print("1: Replaced overlay with inline styles (z-index:99999)")
else:
    print("1: SKIP - overlay pattern not found")

# Also force inline styles on the panel itself
old_inner = """          <div className="bridge-send-panel">"""
new_inner = """          <div className="bridge-send-panel" style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderRadius:'20px',padding:'28px',maxWidth:'520px',width:'90vw',color:'#e2e8f0',boxShadow:'0 20px 50px rgba(0,0,0,0.4)',border:'3px solid red'}}>"""

if old_inner in content:
    content = content.replace(old_inner, new_inner, 1)  
    changes += 1
    print("2: Added inline styles to panel div with RED border")
else:
    print("2: SKIP - inner panel pattern not found")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
