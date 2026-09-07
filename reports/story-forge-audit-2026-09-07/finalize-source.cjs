const fs=require('fs');let s=fs.readFileSync('story_forge_source.jsx','utf8');
const a="if (addToast) addToast(t('toasts.failed_generate_scaffolds'), 'error');\n    }\n    setIsProcessing(false);";
if(!s.includes(a))throw Error('Missing loading anchor');
s=s.replace(a,"if (addToast) addToast(t('toasts.failed_generate_scaffolds'), 'error');\n    } finally {\n      if (requestId === planRequestRef.current) setIsProcessing(false);\n    }");
// Frequency counts use the same authored content; the existing English stop-list is English-only.
s=s.replace("const wordFrequency = useMemo(() => {\n    const fullText = paragraphs.map(p => p.text).join(' ');", "const wordFrequency = useMemo(() => {\n    if (language !== 'en') return [];\n    const fullText = authoredText;");
s=s.replace(".slice(0, 15);\n  }, [paragraphs]);", ".slice(0, 15);\n  }, [authoredText, language]);");
fs.writeFileSync('story_forge_source.jsx',s);
