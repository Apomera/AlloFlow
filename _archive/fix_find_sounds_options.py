import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Block 1: Lines ~8381
old_block_1 = """                        const allPhonemes = [...new Set(phonemes)];
                        const distractors = allPhonemes.filter(p => p !== correctPhoneme).slice(0, 3);
                        while (distractors.length < 3) distractors.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const isoOptions = fisherYatesShuffle([correctPhoneme, ...distractors.slice(0, 3)]);"""

new_block_1 = """                        const allPhonemes = [...new Set(phonemes)];
                        const distractors = allPhonemes.filter(p => p !== correctPhoneme).slice(0, 5);
                        while (distractors.length < 5) distractors.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const isoOptions = fisherYatesShuffle([correctPhoneme, ...distractors.slice(0, 5)]);"""

if old_block_1 in text:
    text = text.replace(old_block_1, new_block_1)
    print("Patched Isolation Block 1 (6 options)")
else:
    print("Could not find Block 1")

# Fix Block 2: Lines ~8476
old_block_2 = """                        const iso_all = [...new Set(iso_phonemes)];
                        const iso_dist = iso_all.filter(p => p !== iso_correct).slice(0, 3);
                        while (iso_dist.length < 3) iso_dist.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const iso_opts = fisherYatesShuffle([iso_correct, ...iso_dist.slice(0, 3)]);"""

new_block_2 = """                        const iso_all = [...new Set(iso_phonemes)];
                        const iso_dist = iso_all.filter(p => p !== iso_correct).slice(0, 5);
                        while (iso_dist.length < 5) iso_dist.push(['b','d','f','g','k','l','m','n','p','r','s','t'][Math.floor(Math.random() * 12)]);
                        const iso_opts = fisherYatesShuffle([iso_correct, ...iso_dist.slice(0, 5)]);"""

if old_block_2 in text:
    text = text.replace(old_block_2, new_block_2)
    print("Patched Isolation Block 2 (6 options)")
else:
    print("Could not find Block 2")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
