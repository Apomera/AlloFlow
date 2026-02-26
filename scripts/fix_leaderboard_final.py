FILE=r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE,'r',encoding='utf-8') as f: c=f.read()
c=c.replace('Timer tracks solve time for leaderboard.','Timer tracks your solve time.')
c=c.replace('Real-time synchronized sessions with leaderboard','Real-time synchronized sessions with score tracking')
with open(FILE,'w',encoding='utf-8') as f: f.write(c)
print('Done — remaining leaderboard count:', c.lower().count('leaderboard'))
