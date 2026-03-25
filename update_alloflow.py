"""Update AlloFlowANTI.txt toolModules array to include standalone art and datastudio plugins."""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# The two existing variations in the file (L23350 and L23351)
target1 = "'stem_lab/stem_tool_dna.js', 'stem_lab/stem_tool_math.js', 'stem_lab/stem_tool_science.js', 'stem_lab/stem_tool_creative.js', 'stem_lab/stem_tool_dataplot.js', 'stem_lab/stem_tool_geo.js', 'stem_lab/stem_tool_titration.js', 'stem_lab/stem_tool_volume.js', 'stem_lab/stem_tool_numberline.js', 'stem_lab/stem_tool_areamodel.js', 'stem_lab/stem_tool_fractions.js', 'stem_lab/stem_tool_manipulatives.js', 'stem_lab/stem_tool_money.js', 'stem_lab/stem_tool_coordgrid.js', 'stem_lab/stem_tool_angles.js', 'stem_lab/stem_tool_archstudio.js'"

target2 = "'stem_lab/stem_tool_dna.js', 'stem_lab/stem_tool_math.js', 'stem_lab/stem_tool_science.js', 'stem_lab/stem_tool_coding.js', 'stem_lab/stem_tool_dataplot.js', 'stem_lab/stem_tool_geo.js', 'stem_lab/stem_tool_titration.js', 'stem_lab/stem_tool_volume.js', 'stem_lab/stem_tool_numberline.js', 'stem_lab/stem_tool_areamodel.js', 'stem_lab/stem_tool_fractions.js', 'stem_lab/stem_tool_manipulatives.js', 'stem_lab/stem_tool_money.js', 'stem_lab/stem_tool_coordgrid.js', 'stem_lab/stem_tool_angles.js', 'stem_lab/stem_tool_archstudio.js'"

# The new unified array including creative, art, datastudio, and coding
replacement = "'stem_lab/stem_tool_dna.js', 'stem_lab/stem_tool_math.js', 'stem_lab/stem_tool_science.js', 'stem_lab/stem_tool_creative.js', 'stem_lab/stem_tool_art.js', 'stem_lab/stem_tool_datastudio.js', 'stem_lab/stem_tool_coding.js', 'stem_lab/stem_tool_dataplot.js', 'stem_lab/stem_tool_geo.js', 'stem_lab/stem_tool_titration.js', 'stem_lab/stem_tool_volume.js', 'stem_lab/stem_tool_numberline.js', 'stem_lab/stem_tool_areamodel.js', 'stem_lab/stem_tool_fractions.js', 'stem_lab/stem_tool_manipulatives.js', 'stem_lab/stem_tool_money.js', 'stem_lab/stem_tool_coordgrid.js', 'stem_lab/stem_tool_angles.js', 'stem_lab/stem_tool_archstudio.js'"

line1 = f"      var toolModules = [{target1}];"
line2 = f"      var toolModules = [{target2}];"
newline = f"      var toolModules = [{replacement}];"

# Replace line1 with empty string to remove duplicate
content = content.replace(line1 + '\n', '')
# Replace line2 with the new unified line
content = content.replace(line2, newline)

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated toolModules in AlloFlowANTI.txt")
