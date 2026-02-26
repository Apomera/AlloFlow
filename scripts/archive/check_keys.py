import sys
sys.stdout.reconfigure(encoding='utf-8')
content = open('AlloFlowANTI.txt','r',encoding='utf-8-sig').read()
keys = ['header_settings_theme','header_settings_overlay','header_settings_anim','header_cloud_sync','xp_modal_trigger','ws_gen_ortho_slider']
with open('verify_keys.txt','w',encoding='utf-8') as f:
    for k in keys:
        found = "'" + k + "':" in content
        f.write(f"  {k}: {'FOUND' if found else 'MISSING'}\n")
    f.write("DONE\n")
print("wrote verify_keys.txt")
