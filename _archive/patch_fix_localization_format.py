
import os
import re

file_path = "c:\\Users\\cabba\\OneDrive\\Desktop\\UDL-Tool-Updated\\AlloFlowANTI.txt"

def patch_fix_localization_format():
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace the object definitions with string definitions.
    # Pattern: 
    # key: { en: "Value", ... },
    # Replace with:
    # key: "Value",
    
    # Specific keys we added:
    # image_visibility: { en: "Image Visibility", es: "Visibilidad de imagen", fr: "Visibilité de l'image" },
    # "vis.after": { en: "Show After Response (Default)", es: "Mostrar después de responder", fr: "Afficher après réponse" },
    # "vis.never": { en: "Never Show (Pure Phonemic)", es: "Nunca mostrar", fr: "Ne jamais afficher" },
    # "vis.progressive": { en: "Progressive Reveal (On Retry)", es: "Revelación progresiva", fr: "Révélation progressive" },
    # "vis.always": { en: "Always Show", es: "Mostrar siempre", fr: "Toujours afficher" },
    
    # We will just do direct replacement of the lines I injected.
    
    replacements = [
        (
            'image_visibility: { en: "Image Visibility", es: "Visibilidad de imagen", fr: "Visibilité de l\'image" },',
            'image_visibility: "Image Visibility",'
        ),
        (
            '"vis.after": { en: "Show After Response (Default)", es: "Mostrar después de responder", fr: "Afficher après réponse" },',
            '"vis.after": "Show After Response (Default)",'
        ),
        (
            '"vis.never": { en: "Never Show (Pure Phonemic)", es: "Nunca mostrar", fr: "Ne jamais afficher" },',
            '"vis.never": "Never Show (Pure Phonemic)",'
        ),
        (
            '"vis.progressive": { en: "Progressive Reveal (On Retry)", es: "Revelación progresiva", fr: "Révélation progressive" },',
            '"vis.progressive": "Progressive Reveal (On Retry)",'
        ),
        (
            '"vis.always": { en: "Always Show", es: "Mostrar siempre", fr: "Toujours afficher" },',
            '"vis.always": "Always Show",'
        )
    ]

    for search_str, replace_str in replacements:
        if search_str in content:
            content = content.replace(search_str, replace_str)
            print(f"Replaced {replace_str.split(':')[0]}")
        else:
            print(f"Warning: Could not find {search_str[:20]}...")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Localization Format Fix Complete")

if __name__ == "__main__":
    patch_fix_localization_format()
