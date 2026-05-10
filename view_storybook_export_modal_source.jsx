/**
 * AlloFlow — Storybook Export Modal Module
 *
 * Modal for choosing between text-only and image-included storybook export
 * formats for adventure mode.
 *
 * Extracted from AlloFlowANTI.txt lines 21683-21742 (May 2026).
 *
 * Required props:
 *   handleExportStorybook                     — function(includeImages: bool) — kicks export
 *   handleSetShowStorybookExportModalToFalse  — close handler (also fires for backdrop click)
 *   isProcessing                              — bool, disables buttons while exporting
 *   setShowStorybookExportModal               — direct setter used after format chosen
 *   t                                         — translation function
 *
 * Icons (read from window globals): BookOpen, ImageIcon, Type
 */
function StorybookExportModal({
  handleExportStorybook,
  handleSetShowStorybookExportModalToFalse,
  isProcessing,
  setShowStorybookExportModal,
  t,
}) {
  const BookOpen = window.BookOpen || (() => null);
  const ImageIcon = window.ImageIcon || (() => null);
  const Type = window.Type || (() => null);

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleSetShowStorybookExportModalToFalse}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300"
        role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <BookOpen size={24} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">{t('adventure.storybook')}</h3>
            <p className="text-sm text-slate-600">{t('adventure.export_options')}</p>
          </div>
        </div>
        <p className="text-slate-600 mb-6">
          {t('adventure.storybook_export_description')}
        </p>
        <div className="flex flex-col gap-3">
          <button
            aria-label={t('common.toggle_images')}
            onClick={() => {
              setShowStorybookExportModal(false);
              handleExportStorybook(true);
            }}
            disabled={isProcessing} aria-busy={isProcessing}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            data-help-key="export_storybook_images"
          >
            <ImageIcon size={20} />
            {t('adventure.include_images')}
          </button>
          <button
            onClick={() => {
              setShowStorybookExportModal(false);
              handleExportStorybook(false);
            }}
            disabled={isProcessing} aria-busy={isProcessing}
            className="w-full px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            data-help-key="export_storybook_text"
          >
            <Type size={20} />
            {t('adventure.text_only')}
          </button>
          <button
            onClick={handleSetShowStorybookExportModalToFalse}
            className="w-full px-4 py-2 text-slate-600 hover:text-slate-700 text-sm transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
        <p className="text-xs text-slate-600 text-center mt-4">
          {t('adventure.storybook_image_warning')}
        </p>
      </div>
    </div>
  );
}
