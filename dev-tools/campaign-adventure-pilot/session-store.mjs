// SEL Hub owns these records in its temporary React state, never browser storage.
export function createSessionStore(records={},onChange=()=>{}){
  const allowed=key=>key==='alloflow-journey-input:v1'||key.startsWith('alloflow-campaign-pilot:v1:self-advocacy:');
  const values=new Map(Object.entries(records&&typeof records==='object'?records:{}).filter(([k,v])=>allowed(k)&&typeof v==='string'));
  return {
    get length(){return values.size;},
    key:index=>[...values.keys()][index]??null,
    getItem:key=>values.get(key)??null,
    setItem(key,value){
      if(!allowed(key)||typeof value!=='string')throw Error('Unrecognized practice record.');
      values.set(key,value);onChange(Object.fromEntries(values));
    }
  };
}
