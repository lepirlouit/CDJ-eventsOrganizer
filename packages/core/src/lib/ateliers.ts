export const GLOBAL_ATELIERS = [
  { id: "scratch",   name: "Scratch",    ageGroup: "7-12" },
  { id: "lego",      name: "Lego WeDo",  ageGroup: "7-10" },
  { id: "microbit",  name: "Micro:bit",  ageGroup: "10-14" },
  { id: "python",    name: "Python",     ageGroup: "12-17" },
  { id: "minecraft", name: "Minecraft",  ageGroup: "8-14" },
  { id: "html",      name: "HTML/CSS",   ageGroup: "10-17" },
  { id: "arduino",   name: "Arduino",    ageGroup: "12-17" },
] as const;

export type GlobalAtelierId = typeof GLOBAL_ATELIERS[number]["id"];
