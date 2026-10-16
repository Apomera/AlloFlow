[out:json][timeout:60];
(
  way["building"](43.643,-70.285,43.669,-70.245);
  relation["building"]["type"="multipolygon"](43.643,-70.285,43.669,-70.245);
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|living_street)$"](43.643,-70.285,43.669,-70.245);
);
out body geom;
