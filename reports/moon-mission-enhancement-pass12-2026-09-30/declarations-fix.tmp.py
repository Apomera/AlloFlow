from pathlib import Path
p=Path('stem_lab/stem_tool_moonmission.js');s=p.read_bytes()
start=s.index(b'  function mmDepartureProfile(');end=s.index(b'  function mmDepartureSample(',start);block=s[start:end]
block=block.replace(b'var samples=[Object.freeze(mmDepartureRecord(q,0,p))],events=[],cutoff=null,escapeTime=null,reached=false;',b'var samples=[Object.freeze(mmDepartureRecord(q,0,p))],events=[],cutoff=null,escapeTime=null,reached=false;\n    var dt=0,next=null,lo=0,hi=0,mid=0,k=0;')
block=block.replace(b'var dt=',b'dt=').replace(b'    dt=0,next=null,lo=0,hi=0,mid=0,k=0;',b'    var dt=0,next=null,lo=0,hi=0,mid=0,k=0;')
block=block.replace(b',next=mmDepartureStep(q,dt,true),before=',b';next=mmDepartureStep(q,dt,true);var before=').replace(b',next=mmDepartureStep(q,dt,false);',b';next=mmDepartureStep(q,dt,false);')
block=block.replace(b'var lo=0,hi=dt;',b'lo=0;hi=dt;').replace(b'for(var k=0;k<38;k++)',b'for(k=0;k<38;k++)').replace(b'var mid=(lo+hi)/2;',b'mid=(lo+hi)/2;')
s=s[:start]+block+s[end:]
start=s.index(b'  function mmDrawDeparture(');end=s.index(b'  // Atmospheric entry:',start);block=s[start:end];block=block.replace(b'    var z=point(s.x,s.y),len=26+Math.min(20,s.speed/100),vx=s.vx/s.speed,vy=-s.vy/s.speed;',b'    z=point(s.x,s.y);var len=26+Math.min(20,s.speed/100),vx=s.vx/s.speed,vy=-s.vy/s.speed;');s=s[:start]+block+s[end:]
p.write_bytes(s);Path('desktop/web-app/public/stem_lab/stem_tool_moonmission.js').write_bytes(s)
