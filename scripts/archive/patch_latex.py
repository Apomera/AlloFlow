"""
Patch script: Replace the processMathHTML function in AlloFlowANTI.txt
with a comprehensive version covering 80+ LaTeX symbols, proper backslash
handling, operator functions, structural commands, and environments.
"""
import re

FILE = r"AlloFlowANTI.txt"

# --- The OLD function (exact match) ---
OLD_FUNCTION = r"""const processMathHTML = (text) => {
    if (!text) return '';
    // 1. Strip delimiters ($ or $$)
    let content = text.replace(/^(\$\$|\$)|(\$\$|\$)$/g, '');
    
    // 2. Handle simple text formatting inside math
    content = content.replace(/[\t\r\n]?\b(text|ext|mathrm)\{([^}]+)\}/g, '<span class="font-sans">$2</span>');
    content = content.replace(/()|(newline)/g, '<br/>');

    // 3. Handle Superscripts (e.g., x^2 or x^{10})
    content = content.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    content = content.replace(/\^([0-9a-zA-Z])/g, '<sup>$1</sup>');

    // 4. Handle Subscripts (e.g., H_2 or H_{2O})
    content = content.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    content = content.replace(/_([0-9a-zA-Z])/g, '<sub>$1</sub>');

    // 5. Handle Square Roots (\sqrt{x})
    content = content.replace(/sqrt\{([^}]+)\}/g, '&radic;<span style="text-decoration:overline;">$1</span>');

    // 6. Handle Fractions (existing logic improved)
    content = content.replace(/frac\s*\{([^}]+)\}\s*,?\s*\{([^}]+)\}/g, 
        '<span class="math-fraction inline-flex flex-col text-center align-middle mx-1" style="vertical-align: -0.4em;"><span class="border-b border-current px-1 text-[0.9em]">$1</span><span class="text-[0.9em]">$2</span></span>'
    );

    // 7. Symbol Mapping (Extended)
    const symbolMap = {
        'alpha': '\u03b1', 'beta': '\u03b2', 'gamma': '\u03b3', 'delta': '\u03b4', 'pi': '\u03c0', 'theta': '\u03b8', 
        'infty': '\u221e', 'rightarrow': '\u2192', 'to': '\u2192', 'leftarrow': '\u2190', 'longrightarrow': '\u27f6', 
        'Rightarrow': '\u21d2', 'approx': '\u2248', 'neq': '\u2260', 'leq': '\u2264', 'geq': '\u2265', 
        'times': '\u00d7', 'div': '\u00f7', 'cdot': '\u22c5', 'pm': '\u00b1', 'sum': '\u2211', 'int': '\u222b',
    };
    
    // Replace symbols
    Object.entries(symbolMap).forEach(([latex, unicode]) => {
        // Use a regex to ensure we match the command (preceded by start or non-word char)
        const regex = new RegExp(`(^|[^a-zA-Z])${latex.replace(/\\\\/g, '')}`, 'g');
        content = content.replace(regex, `$1${unicode}`);
    });

    return content;
};"""

# --- The NEW function ---
NEW_FUNCTION = r"""const processMathHTML = (text) => {
    if (!text) return '';
    // 1. Strip delimiters ($$ or $)
    let content = text.replace(/^\$\$/, '').replace(/\$\$$/, '');
    content = content.replace(/^\$/, '').replace(/\$$/, '');

    // 2. Strip \left and \right delimiters (keep the bracket itself)
    content = content.replace(/\\left\s*([(\[{|.])/g, '$1');
    content = content.replace(/\\right\s*([)\]}|.])/g, '$1');

    // 3. Handle \begin{cases}...\end{cases} environments
    content = content.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, body) => {
        const rows = body.split(/\\\\\s*/).filter(r => r.trim());
        const rendered = rows.map(row => {
            const parts = row.split('&').map(p => p.trim());
            return `<span style="display:flex;gap:1em;"><span>${parts[0] || ''}</span>${parts[1] ? `<span>${parts[1]}</span>` : ''}</span>`;
        }).join('');
        return `<span style="display:inline-flex;flex-direction:column;border-left:2px solid currentColor;padding-left:6px;align-items:flex-start;gap:2px;vertical-align:middle;">${rendered}</span>`;
    });

    // 4. Handle \begin{aligned}...\end{aligned} environments
    content = content.replace(/\\begin\{(aligned|align)\}([\s\S]*?)\\end\{\1\}/g, (_, _env, body) => {
        const rows = body.split(/\\\\\s*/).filter(r => r.trim());
        const rendered = rows.map(row => {
            const parts = row.split('&').map(p => p.trim());
            return `<span style="display:flex;gap:4px;justify-content:center;">${parts.map(p => `<span>${p}</span>`).join('')}</span>`;
        }).join('');
        return `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;vertical-align:middle;">${rendered}</span>`;
    });

    // 5. Handle text formatting inside math (\text{}, \mathrm{}, \operatorname{})
    content = content.replace(/\\(?:text|textit|textrm|mathrm|operatorname)\{([^}]+)\}/g, '<span class="font-sans" style="font-style:normal;">$1</span>');
    content = content.replace(/\\(?:textbf|mathbf)\{([^}]+)\}/g, '<span class="font-sans" style="font-weight:bold;font-style:normal;">$1</span>');
    content = content.replace(/\\(?:mathit)\{([^}]+)\}/g, '<span style="font-style:italic;">$1</span>');
    content = content.replace(/\\(?:mathbb)\{([^}]+)\}/g, (_, ch) => {
        const bbMap = { 'R': '\u211d', 'N': '\u2115', 'Z': '\u2124', 'Q': '\u211a', 'C': '\u2102', 'P': '\u2119' };
        return ch.split('').map(c => bbMap[c] || c).join('');
    });
    content = content.replace(/\\(newline|\\)/g, '<br/>');

    // 6. Handle accents & decorations
    content = content.replace(/\\overline\{([^}]+)\}/g, '<span style="text-decoration:overline;">$1</span>');
    content = content.replace(/\\underline\{([^}]+)\}/g, '<span style="text-decoration:underline;">$1</span>');
    content = content.replace(/\\hat\{([^}]+)\}/g, '$1\u0302');
    content = content.replace(/\\bar\{([^}]+)\}/g, '$1\u0304');
    content = content.replace(/\\vec\{([^}]+)\}/g, '$1\u20d7');
    content = content.replace(/\\dot\{([^}]+)\}/g, '$1\u0307');
    content = content.replace(/\\ddot\{([^}]+)\}/g, '$1\u0308');
    content = content.replace(/\\tilde\{([^}]+)\}/g, '$1\u0303');
    content = content.replace(/\\cancel\{([^}]+)\}/g, '<span style="text-decoration:line-through;">$1</span>');
    content = content.replace(/\\boxed\{([^}]+)\}/g, '<span style="border:1px solid currentColor;padding:2px 6px;border-radius:3px;">$1</span>');

    // 7. Handle binomials \binom{n}{k}
    content = content.replace(/\\binom\s*\{([^}]+)\}\s*\{([^}]+)\}/g,
        '<span style="display:inline-flex;align-items:center;vertical-align:middle;"><span style="font-size:1.4em;">(</span><span class="inline-flex flex-col text-center mx-0.5" style="vertical-align:-0.3em;line-height:1.2;"><span style="font-size:0.85em;">$1</span><span style="font-size:0.85em;">$2</span></span><span style="font-size:1.4em;">)</span></span>'
    );

    // 8. Handle Square Roots (\sqrt[n]{x} and \sqrt{x})
    content = content.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '<sup style="font-size:0.65em;vertical-align:super;">$1</sup>&radic;<span style="text-decoration:overline;">$2</span>');
    content = content.replace(/\\sqrt\{([^}]+)\}/g, '&radic;<span style="text-decoration:overline;">$1</span>');

    // 9. Handle Fractions (\frac{a}{b})
    content = content.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, 
        '<span class="math-fraction inline-flex flex-col text-center align-middle mx-1" style="vertical-align:-0.4em;"><span class="border-b border-current px-1 text-[0.9em]">$1</span><span class="text-[0.9em]">$2</span></span>'
    );

    // 10. Handle Superscripts (e.g., x^2 or x^{10})
    content = content.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');
    content = content.replace(/\^([0-9a-zA-Z+\-])/g, '<sup>$1</sup>');

    // 11. Handle Subscripts (e.g., H_2 or H_{2O})
    content = content.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>');
    content = content.replace(/_([0-9a-zA-Z])/g, '<sub>$1</sub>');

    // 12. Operator functions — render upright (not italic)
    content = content.replace(/\\(sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|exp|lim|min|max|sup|inf|det|dim|deg|gcd|lcm|arg|ker|Pr|hom|mod)(?![a-zA-Z])/g, 
        '<span class="font-sans" style="font-style:normal;margin:0 1px;">$1</span>'
    );

    // 13. Comprehensive Symbol Mapping via backslash command replacement
    const symbolMap = {
        // Greek lowercase
        'alpha': '\u03b1', 'beta': '\u03b2', 'gamma': '\u03b3', 'delta': '\u03b4', 'epsilon': '\u03b5', 'varepsilon': '\u03b5',
        'zeta': '\u03b6', 'eta': '\u03b7', 'theta': '\u03b8', 'vartheta': '\u03d1', 'iota': '\u03b9', 'kappa': '\u03ba',
        'lambda': '\u03bb', 'mu': '\u03bc', 'nu': '\u03bd', 'xi': '\u03be', 'omicron': '\u03bf', 'pi': '\u03c0', 'varpi': '\u03d6',
        'rho': '\u03c1', 'varrho': '\u03f1', 'sigma': '\u03c3', 'varsigma': '\u03c2', 'tau': '\u03c4', 'upsilon': '\u03c5',
        'phi': '\u03c6', 'varphi': '\u03d5', 'chi': '\u03c7', 'psi': '\u03c8', 'omega': '\u03c9',
        // Greek uppercase
        'Gamma': '\u0393', 'Delta': '\u0394', 'Theta': '\u0398', 'Lambda': '\u039b', 'Xi': '\u039e', 'Pi': '\u03a0',
        'Sigma': '\u03a3', 'Upsilon': '\u03a5', 'Phi': '\u03a6', 'Psi': '\u03a8', 'Omega': '\u03a9',
        // Arrows
        'rightarrow': '\u2192', 'to': '\u2192', 'leftarrow': '\u2190', 'leftrightarrow': '\u2194',
        'Rightarrow': '\u21d2', 'Leftarrow': '\u21d0', 'Leftrightarrow': '\u21d4',
        'longrightarrow': '\u27f6', 'longleftarrow': '\u27f5', 'longLeftrightarrow': '\u27fa',
        'uparrow': '\u2191', 'downarrow': '\u2193', 'updownarrow': '\u2195',
        'Uparrow': '\u21d1', 'Downarrow': '\u21d3',
        'mapsto': '\u21a6', 'longmapsto': '\u27fc', 'hookrightarrow': '\u21aa', 'hookleftarrow': '\u21a9',
        'nearrow': '\u2197', 'searrow': '\u2198', 'nwarrow': '\u2196', 'swarrow': '\u2199',
        // Relations
        'leq': '\u2264', 'le': '\u2264', 'geq': '\u2265', 'ge': '\u2265', 'neq': '\u2260', 'ne': '\u2260',
        'approx': '\u2248', 'equiv': '\u2261', 'cong': '\u2245', 'sim': '\u223c', 'simeq': '\u2243',
        'propto': '\u221d', 'prec': '\u227a', 'succ': '\u227b', 'preceq': '\u2aaf', 'succeq': '\u2ab0',
        'll': '\u226a', 'gg': '\u226b',
        // Set & Logic
        'in': '\u2208', 'notin': '\u2209', 'ni': '\u220b', 'subset': '\u2282', 'supset': '\u2283',
        'subseteq': '\u2286', 'supseteq': '\u2287', 'cup': '\u222a', 'cap': '\u2229',
        'setminus': '\u2216', 'emptyset': '\u2205', 'varnothing': '\u2205',
        'forall': '\u2200', 'exists': '\u2203', 'nexists': '\u2204',
        'neg': '\u00ac', 'lnot': '\u00ac', 'land': '\u2227', 'lor': '\u2228', 'wedge': '\u2227', 'vee': '\u2228',
        'vdash': '\u22a2', 'dashv': '\u22a3', 'models': '\u22a8',
        // Arithmetic & Operators
        'times': '\u00d7', 'div': '\u00f7', 'cdot': '\u22c5', 'pm': '\u00b1', 'mp': '\u2213',
        'ast': '\u2217', 'star': '\u22c6', 'circ': '\u2218', 'bullet': '\u2022',
        'oplus': '\u2295', 'ominus': '\u2296', 'otimes': '\u2297', 'odot': '\u2299', 'oslash': '\u2298',
        // Big operators
        'sum': '\u2211', 'prod': '\u220f', 'coprod': '\u2210', 'int': '\u222b', 'iint': '\u222c', 'iiint': '\u222d',
        'oint': '\u222e', 'bigcup': '\u22c3', 'bigcap': '\u22c2', 'bigoplus': '\u2a01', 'bigotimes': '\u2a02',
        'bigvee': '\u22c1', 'bigwedge': '\u22c0',
        // Miscellaneous
        'infty': '\u221e', 'partial': '\u2202', 'nabla': '\u2207',
        'angle': '\u2220', 'measuredangle': '\u2221', 'triangle': '\u25b3',
        'perp': '\u22a5', 'parallel': '\u2225', 'nparallel': '\u2226',
        'therefore': '\u2234', 'because': '\u2235',
        'ldots': '\u2026', 'cdots': '\u22ef', 'vdots': '\u22ee', 'ddots': '\u22f1', 'dots': '\u2026',
        'prime': '\u2032', 'degree': '\u00b0',
        'ell': '\u2113', 'wp': '\u2118', 'Re': '\u211c', 'Im': '\u2111', 'aleph': '\u2135', 'hbar': '\u210f',
        // Spacing & misc commands
        'quad': '  ', 'qquad': '    ', 'enspace': ' ',
        'langle': '\u27e8', 'rangle': '\u27e9', 'lceil': '\u2308', 'rceil': '\u2309', 'lfloor': '\u230a', 'rfloor': '\u230b',
        'checkmark': '\u2713', 'dagger': '\u2020', 'ddagger': '\u2021', 'S': '\u00a7',
    };

    // Replace \command with unicode — sorted by length descending to prevent partial matches
    const sortedKeys = Object.keys(symbolMap).sort((a, b) => b.length - a.length);
    sortedKeys.forEach(cmd => {
        const regex = new RegExp(`\\\\${cmd}(?![a-zA-Z])`, 'g');
        content = content.replace(regex, symbolMap[cmd]);
    });

    // 14. Clean up any remaining stray backslashes from unrecognized commands
    content = content.replace(/\\,/g, '<span style="margin-left:3px;"></span>');
    content = content.replace(/\\;/g, '<span style="margin-left:5px;"></span>');
    content = content.replace(/\\!/g, '');
    content = content.replace(/\\ /g, ' ');
    content = content.replace(/\\&/g, '&amp;');

    return content;
};"""

def main():
    with open(FILE, 'r', encoding='utf-8') as f:
        source = f.read()

    if OLD_FUNCTION not in source:
        print("ERROR: Could not find the OLD processMathHTML function.")
        print("Trying a relaxed match...")
        # Try matching just the function signature area
        marker = "const processMathHTML = (text) => {"
        if marker not in source:
            print("FATAL: Cannot find processMathHTML at all.")
            return
        
        # Find start and end
        start = source.index(marker)
        # Find the end: look for "};\n" after the function
        # We need to count braces
        depth = 0
        end = start
        in_string = False
        string_char = None
        i = start
        while i < len(source):
            ch = source[i]
            if in_string:
                if ch == '\\':
                    i += 2
                    continue
                if ch == string_char:
                    in_string = False
            else:
                if ch in ('"', "'", '`'):
                    in_string = True
                    string_char = ch
                elif ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        # Include the trailing semicolon
                        if end < len(source) and source[end] == ';':
                            end += 1
                        break
            i += 1
        
        old_text = source[start:end]
        print(f"Found function from char {start} to {end} ({len(old_text)} chars)")
        print(f"First 100 chars: {old_text[:100]}...")
        print(f"Last 50 chars: ...{old_text[-50:]}")
        
        source = source[:start] + NEW_FUNCTION + source[end:]
    else:
        source = source.replace(OLD_FUNCTION, NEW_FUNCTION, 1)
        print("Exact match found and replaced.")

    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(source)

    print(f"SUCCESS: processMathHTML has been patched in {FILE}")
    
    # Verify
    with open(FILE, 'r', encoding='utf-8') as f:
        verify = f.read()
    
    if "// 13. Comprehensive Symbol Mapping" in verify:
        print("VERIFIED: New function is present in the file.")
    else:
        print("WARNING: Verification failed — new function markers not found.")

    # Count symbols
    count = verify.count("'\\u")
    print(f"Symbol entries detected: ~{count // 2} (unicode pairs)")

if __name__ == "__main__":
    main()
