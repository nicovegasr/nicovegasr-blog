export type LabLevel = { title: string; href: string };

// What a lab tells the catalogue about itself; each lab builds its own entry.
export type LabEntry = {
  id: string;
  title: string;
  label: string;
  summary: string;
  caption: string;
  levelCount: string;
  levels: readonly LabLevel[];
};
