// Study centres for "Uyingizga yaqin o'quv markazi kerakmi?". Career
// metadata lives in src/constants/careerMeta.ts (needed at runtime).

/** Study centres. Only names published by an official source are listed; no
 * address or website is filled in unless that source gives it. regions [] =
 * the source doesn't state a region (shown as "O'zbekiston bo'ylab"). */
export const STUDY_CENTERS: {
  code: string; name: string; subjects: string[]; regions: string[]; source: string; sourceUrl: string;
}[] = (() => {
  const src = "Raqamli ta'limni rivojlantirish markazi: Top-10 IT ta'lim markazlari (2024)";
  const url = "https://talimxabarlari.uz/5422/";
  const it = (code: string, name: string, regions: string[] = []) => ({ code, name, subjects: ["INFORMATICS", "MATH"], regions, source: src, sourceUrl: url });
  return [
    it("MOHIRDEV", "Mohirdev"),
    it("BILIM_TECH", "Bilim tech"),
    it("NAJOT_TALIM", "Najot ta'lim"),
    it("IT_HUB_SAMARKAND", "IT Hub Samarkand"),
    it("SENSORIKA", "Sensorika"),
    it("REALSOFT_ACADEMY", "Realsoft academy"),
    it("IT_PARK_KARAKALPAKSTAN", "IT Park Karakalpakstan"),
    it("DASTURCHILAR_VODIYSI", "Dasturchilar vodiysi"),
    it("IT_ACADEMY", "IT-ACADEMY"),
  ];
})();
