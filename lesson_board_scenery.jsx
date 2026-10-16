import {safeBoardImage} from './lesson_board_support.js';
const React=window.React;

// Scenery belongs to the board's optional artwork, never its routes or rules.
// The vector terrain remains underneath until the supplied image decodes.
function LoadedScenery({src}) {
  const [state,setState]=React.useState('loading');
  if(state==='failed')return null;
  return <div className="lb-tabletop-scenery" data-tabletop-scenery data-loaded={state==='ready'} aria-hidden="true"><img src={src} alt="" decoding="async" referrerPolicy="no-referrer" draggable={false} onLoad={()=>setState('ready')} onError={()=>setState('failed')}/></div>;
}
export function TabletopScenery({support,showImages=true}) {
  const src=showImages&&safeBoardImage(support?.assets?.[support?.art?.tabletop]);
  if(!src)return null;
  return <><style>{`
    .lb .lb-tabletop-scenery{position:absolute;inset:0;pointer-events:none;opacity:0;overflow:hidden;border-radius:inherit}
    .lb .lb-tabletop-scenery img{display:block;width:100%;height:100%;object-fit:cover;max-width:none;user-select:none}
    .lb .lb-tabletop-scenery[data-loaded=true]{opacity:.76}
    .lb .lb-tabletop-scenery[data-loaded=true]~.lb-landscape-terrain{opacity:0}
    .dark .lb .lb-tabletop-scenery[data-loaded=true]{opacity:.66;filter:brightness(.56) saturate(.75)}
    @media(forced-colors:active){.lb .lb-tabletop-scenery{display:none}.lb .lb-tabletop-scenery[data-loaded=true]~.lb-landscape-terrain{opacity:.87}}
  `}</style><LoadedScenery key={src} src={src}/></>;
}
