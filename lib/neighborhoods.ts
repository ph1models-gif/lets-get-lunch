// Single source of truth for NYC neighborhoods.
// Add new neighborhoods here only. Do NOT redefine NEIGHBORHOODS in other files.
// Use NEIGHBORHOOD_GROUPS for <select> dropdowns (with <optgroup> labels).
// Use NEIGHBORHOODS for flat lists / validation / filters.

export const NEIGHBORHOOD_GROUPS: { borough: string; names: string[] }[] = [
  {
    borough: 'Manhattan',
    names: [
      'Battery Park City', 'Carnegie Hill', 'Chelsea', 'Chinatown',
      'East Harlem', 'East Village', 'Financial District', 'Flatiron',
      'Gramercy Park', 'Greenwich Village', 'Hamilton Heights', 'Harlem',
      "Hell's Kitchen", 'Hudson Yards', 'Inwood', 'Kips Bay',
      'Lenox Hill', 'Little Italy', 'Lower East Side', 'Meatpacking District',
      'Midtown', 'Midtown East', 'Midtown West', 'Morningside Heights',
      'Murray Hill', 'NoHo', 'Nolita', 'NoMad',
      'SoHo', 'Sugar Hill', 'Sutton Place', 'Tribeca',
      'Turtle Bay', 'Two Bridges', 'Union Square', 'Upper East Side',
      'Upper West Side', 'Washington Heights', 'West Village', 'Yorkville',
    ],
  },
  {
    borough: 'Brooklyn',
    names: [
      'Bay Ridge', 'Bed-Stuy', 'Boerum Hill', 'Brooklyn Heights',
      'Bushwick', 'Carroll Gardens', 'Clinton Hill', 'Cobble Hill',
      'Crown Heights', 'Downtown Brooklyn', 'Dumbo', 'Flatbush',
      'Fort Greene', 'Gowanus', 'Greenpoint', 'Park Slope',
      'Prospect Heights', 'Prospect Lefferts Gardens', 'Red Hook',
      'Sunset Park', 'Williamsburg', 'Windsor Terrace',
    ],
  },
  {
    borough: 'Queens',
    names: [
      'Astoria', 'Corona', 'Elmhurst', 'Flushing', 'Forest Hills',
      'Jackson Heights', 'Long Island City', 'Rego Park', 'Ridgewood',
      'Sunnyside', 'Woodside',
    ],
  },
  {
    borough: 'Bronx',
    names: ['Fordham', 'Mott Haven', 'Riverdale'],
  },
  {
    borough: 'Staten Island',
    names: ['St. George', 'Stapleton'],
  },
];

// Flat list — useful for validation, search, filtering
export const NEIGHBORHOODS: string[] = NEIGHBORHOOD_GROUPS.flatMap(g => g.names);
