import {safeBoardImage} from './lesson_board_support.js';
import {tr} from './lesson_board_strings.js';
const React=window.React,{useState,useEffect}=React;
export function SupportImage({src,alt='',className='',t}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);if(!safeBoardImage(src))return null;return failed?<span className="lb-image-failed">{tr(t,'support_image_failed','Picture unavailable. The text is still available.')}</span>:<img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={'lb-support-image '+(className||'')} onError={()=>setFailed(true)}/>;}
