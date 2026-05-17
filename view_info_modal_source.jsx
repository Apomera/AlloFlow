/**
 * AlloFlow — Info Modal Module
 *
 * Two-tab modal: "About" (UDL approach, AlloFlow acronym, links, wizard reset,
 * Ko-fi support button) and "Features" (categorized feature catalog with
 * icon-mapped tiles).
 *
 * Extracted from AlloFlowANTI.txt lines 21436-21610 (May 2026) — the largest
 * single block in the modal sweep.
 *
 * Required props:
 *   handleSetInfoModalTabToAbout    — switch tabs
 *   handleSetInfoModalTabToFeatures — switch tabs
 *   handleSetShowInfoModalToFalse   — close handler
 *   infoModalTab                    — 'about' | 'features'
 *   safeRemoveItem                  — localStorage helper (for wizard reset)
 *   setShowInfoModal                — direct setter (used in wizard-reset flow)
 *   setShowWizard                   — opens the onboarding wizard
 *   t                               — translation function
 *
 * Icons (read from window globals): a long list — see body. All accessed
 * via `window.X` so the module stays decoupled from imports.
 */
function InfoModal({
  handleSetInfoModalTabToAbout,
  handleSetInfoModalTabToFeatures,
  handleSetShowInfoModalToFalse,
  infoModalTab,
  safeRemoveItem,
  setShowInfoModal,
  setShowWizard,
  t,
}) {
  // Pull every icon used in the modal from window globals. Each falls back
  // to a no-op renderer so a missing global doesn't blow up the modal.
  const noop = () => null;
  const Layers = window.Layers || noop;
  const X = window.X || noop;
  const BookOpen = window.BookOpen || noop;
  const CheckSquare = window.CheckSquare || noop;
  const Heart = window.Heart || noop;
  const ArrowRight = window.ArrowRight || noop;
  const RefreshCw = window.RefreshCw || noop;
  const Sparkles = window.Sparkles || noop;
  const Users = window.Users || noop;
  // Feature-tab icon map
  const Search = window.Search || noop;
  const Globe = window.Globe || noop;
  const Layout = window.Layout || noop;
  const ImageIcon = window.ImageIcon || noop;
  const Quote = window.Quote || noop;
  const Lightbulb = window.Lightbulb || noop;
  const MapIcon = window.MapIcon || noop;
  const ShieldCheck = window.ShieldCheck || noop;
  const ListOrdered = window.ListOrdered || noop;
  const Filter = window.Filter || noop;
  const Calculator = window.Calculator || noop;
  const ClipboardList = window.ClipboardList || noop;
  const Terminal = window.Terminal || noop;
  const History = window.History || noop;
  const Wifi = window.Wifi || noop;
  const Cloud = window.Cloud || noop;
  const Mic = window.Mic || noop;
  const Download = window.Download || noop;
  const Clock = window.Clock || noop;
  const Gamepad2 = window.Gamepad2 || noop;
  const Ear = window.Ear || noop;
  const FileQuestion = window.FileQuestion || noop;
  const MessageCircleQuestion = window.MessageCircleQuestion || noop;

  return (
    <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleSetShowInfoModalToFalse}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="bg-indigo-700 p-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2"><Layers size={20}/> {t('about.title')}</h3>
          <button onClick={handleSetShowInfoModalToFalse} className="p-2 rounded-full hover:bg-indigo-600 focus:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" aria-label={t('common.close')}><X size={20}/></button>
        </div>
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={handleSetInfoModalTabToAbout}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${infoModalTab === 'about' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
          >
            {t('about.tab_about')}
          </button>
          <button
            onClick={handleSetInfoModalTabToFeatures}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${infoModalTab === 'features' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-700'}`}
          >
            {t('about.tab_features')}
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {infoModalTab === 'about' ? (
            <div className="space-y-4 text-slate-700">
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-2">{t('about.approach_header')}</h4>
                <ul className="text-sm space-y-2 ml-2 list-none">
                  <li className="flex gap-2">
                    <span className="font-bold text-indigo-700 w-16 shrink-0">{t('about.allo_acronym_label')}</span>
                    <span>{t('about.allo_acronym_def')}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-indigo-700 w-16 shrink-0">{t('about.flow_acronym_label')}</span>
                    <span>{t('about.flow_acronym_def')}</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-1">{t('about.what_is_udl')}</h4>
                <p className="text-sm leading-relaxed"><strong>{t('about.udl_definition')}</strong></p>
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-1">{t('about.how_help_header')}</h4>
                <p className="text-sm leading-relaxed mb-2">{t('about.how_help_desc')}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="bg-green-100 p-1 rounded text-green-700 mt-0.5"><BookOpen size={12}/></div>
                    <span><strong>{t('about.rep_title')}</strong> {t('about.rep_desc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-teal-100 p-1 rounded text-teal-700 mt-0.5"><CheckSquare size={12}/></div>
                    <span><strong>{t('about.action_title')}</strong> {t('about.action_desc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-yellow-100 p-1 rounded text-yellow-700 mt-0.5"><Heart size={12}/></div>
                    <span><strong>{t('about.engage_title')}</strong> {t('about.engage_desc')}</span>
                  </li>
                </ul>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-400 text-xs text-slate-600 italic text-center space-y-2">
                <p>{t('about.ai_guide_tip')}</p>
                <div className="border-t border-slate-200 pt-2">
                  <a href="https://udlguidelines.cast.org/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center justify-center gap-1 transition-colors">
                    {t('about.cast_link_text')} <ArrowRight size={10}/>
                  </a>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <button
                    aria-label={t('common.refresh')}
                    onClick={() => {
                      safeRemoveItem('allo_wizard_completed');
                      setShowWizard(true);
                      setShowInfoModal(false);
                    }}
                    className="text-slate-600 hover:text-indigo-600 font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                  >
                    <RefreshCw size={10} /> {t('about.reset_wizard')}
                  </button>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2">
                  <a
                    href="https://Ko-fi.com/aaronpomeranz207"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-pink-500 font-bold transition-colors flex items-center justify-center gap-2 mx-auto group"
                  >
                    {t('about.support_kofi')}
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pink-700 group-hover:text-pink-500 transition-colors" aria-hidden="true">
                      <style>
                        {`
                        @keyframes rise {
                            0% { transform: translateY(0); opacity: 0; }
                            10% { opacity: 0.8; }
                            50% { opacity: 0.8; }
                            100% { transform: translateY(-5px); opacity: 0; }
                        }
                        .steam-1 { animation: rise 1.5s infinite linear; transform-origin: center; }
                        .steam-2 { animation: rise 1.5s infinite linear 0.5s; transform-origin: center; }
                        .steam-3 { animation: rise 1.5s infinite linear 0.25s; transform-origin: center; }
                        `}
                      </style>
                      <path fillRule="evenodd" clipRule="evenodd" d="M3 5H11V10C11 11.6569 9.65685 13 8 13H6C4.34315 13 3 11.6569 3 10V5ZM12 6H13C13.5523 6 14 6.44772 14 7V9C14 9.55228 13.5523 10 13 10H12V6ZM2 4H12V5H13C14.6569 5 16 6.34315 16 8V9C16 10.6569 14.6569 12 13 12H11.8284C11.4117 13.7329 9.86961 15 8 15H6C4.13039 15 2.58827 13.7329 2.17157 12H2V4Z" fill="currentColor"/>
                      <rect className="steam-1" x="5" y="2" width="1" height="2" fill="currentColor" rx="0.5"/>
                      <rect className="steam-2" x="7.5" y="3" width="1" height="2" fill="currentColor" rx="0.5"/>
                      <rect className="steam-3" x="10" y="2" width="1" height="2" fill="currentColor" rx="0.5"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {['creation', 'activities', 'assessment', 'platform'].map(catKey => {
                const featuresList = t('about.features_list', { returnObjects: true });
                const allItems = featuresList?.items || [];
                const categoryItems = allItems.filter(i => i.category === catKey);
                const categoryTitle = featuresList?.categories?.[catKey] || catKey;
                if (categoryItems.length === 0) return null;
                const colorMap = {
                  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                  teal: 'bg-teal-50 border-teal-200 text-teal-700',
                  purple: 'bg-purple-50 border-purple-200 text-purple-700',
                  orange: 'bg-orange-50 border-orange-200 text-orange-700',
                  pink: 'bg-pink-50 border-pink-200 text-pink-700',
                  blue: 'bg-blue-50 border-blue-200 text-blue-700',
                  green: 'bg-green-50 border-green-200 text-green-700',
                  rose: 'bg-rose-50 border-rose-200 text-rose-700',
                  cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
                  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                  fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700',
                  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                  amber: 'bg-amber-50 border-amber-200 text-amber-700',
                  violet: 'bg-violet-50 border-violet-200 text-violet-700',
                  slate: 'bg-slate-50 border-slate-200 text-slate-700',
                };
                return (
                  <div key={catKey}>
                    <h4 className="font-black text-slate-600 uppercase tracking-widest text-xs mb-3 border-b border-slate-200 pb-1">
                      {categoryTitle}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {categoryItems.map((feature, idx) => {
                        const IconComponent = {
                          'Search': Search, 'BookOpen': BookOpen, 'Globe': Globe, 'CheckSquare': CheckSquare,
                          'Layout': Layout, 'ImageIcon': ImageIcon, 'Quote': Quote, 'Lightbulb': Lightbulb,
                          'MapIcon': MapIcon, 'ShieldCheck': ShieldCheck, 'ListOrdered': ListOrdered,
                          'Filter': Filter, 'Calculator': Calculator, 'ClipboardList': ClipboardList,
                          'Terminal': Terminal, 'History': History, 'Wifi': Wifi, 'Cloud': Cloud,
                          'Mic': Mic, 'Download': Download, 'Clock': Clock,
                          'Gamepad2': Gamepad2, 'Ear': Ear, 'FileQuestion': FileQuestion,
                          'MessageCircleQuestion': MessageCircleQuestion, 'Users': Users
                        }[feature.icon] || Sparkles;
                        const colorClass = colorMap[feature.color || 'slate'];
                        return (
                          <div key={idx} className={`p-3 rounded-lg border hover:shadow-md transition-all ${colorClass}`}>
                            <h5 className="font-bold flex items-center gap-2 mb-1 text-sm">
                              <IconComponent size={16}/> {feature.title}
                            </h5>
                            <p className="text-xs opacity-90 leading-snug">{feature.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="bg-indigo-50 p-3 rounded border border-indigo-100 text-xs text-indigo-800 mt-2">
                <strong>{t('tips.pro_tip_label')}</strong> Use the <span className="font-bold"><Users size={12} className="inline"/> {t('profiles.title')}</span> feature to save settings (Grade, Language, Interests) for different groups.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
