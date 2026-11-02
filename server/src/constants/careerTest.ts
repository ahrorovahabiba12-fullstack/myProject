// Holland (RIASEC) interest test for "Kasb tanlash". The statements are
// written for this app (the RIASEC model itself is public domain); they are
// not copied from any other test.

export type Riasec = "R" | "I" | "A" | "S" | "E" | "C";

export const RIASEC_TYPES: Record<Riasec, { uz: string; ru: string; descUz: string; descRu: string; emoji: string }> = {
  R: { uz: "Amaliyotchi", ru: "Практик", emoji: "🔧", descUz: "Qo'l bilan ishlash, texnika, asbob-uskuna va tabiat bilan ishlashni yoqtirasiz.", descRu: "Вам нравится работать руками, с техникой, инструментами и природой." },
  I: { uz: "Tadqiqotchi", ru: "Исследователь", emoji: "🔬", descUz: "Savol berish, tahlil qilish, sabablarini topish va masala yechish sizga yoqadi.", descRu: "Вам нравится задавать вопросы, анализировать, искать причины и решать задачи." },
  A: { uz: "Ijodkor", ru: "Творец", emoji: "🎨", descUz: "Yangi g'oyalar, san'at, so'z, musiqa va dizayn orqali o'zingizni ifodalaysiz.", descRu: "Вы выражаете себя через идеи, искусство, слово, музыку и дизайн." },
  S: { uz: "Yordamchi", ru: "Помощник", emoji: "🤝", descUz: "Odamlarga yordam berish, o'rgatish va g'amxo'rlik qilish sizga quvonch beradi.", descRu: "Вам приносит радость помогать людям, учить и заботиться о них." },
  E: { uz: "Yetakchi", ru: "Лидер", emoji: "🚀", descUz: "Jamoani boshqarish, odamlarni ishontirish va loyihalarni boshlash sizga mos.", descRu: "Вам подходит руководить командой, убеждать людей и запускать проекты." },
  C: { uz: "Tartibli", ru: "Организатор", emoji: "📊", descUz: "Aniqlik, tartib, raqamlar va hujjatlar bilan ishlash sizga yoqadi.", descRu: "Вам нравится точность, порядок, работа с цифрами и документами." },
};

/** 36 statements, 6 per type. Answer scale: 2 = "Ha", 1 = "Ba'zan", 0 = "Yo'q". */
export const CAREER_TEST: { type: Riasec; uz: string; ru: string }[] = [
  { type: "R", uz: "Buzilgan velosiped yoki o'yinchoqni o'zim tuzatishni yoqtiraman.", ru: "Мне нравится самому чинить сломанный велосипед или игрушку." },
  { type: "I", uz: "Nima uchun osmon ko'k ekanini bilishni xohlayman.", ru: "Мне хочется узнать, почему небо голубое." },
  { type: "A", uz: "Bo'sh vaqtimda rasm chizaman yoki biror narsa yasayman.", ru: "В свободное время я рисую или что-нибудь мастерю." },
  { type: "S", uz: "Sinfdoshim mavzuni tushunmasa, unga tushuntirib beraman.", ru: "Если одноклассник не понял тему, я ему объясняю." },
  { type: "E", uz: "Guruh ishida rahbar bo'lishni xohlayman.", ru: "В групповой работе мне хочется быть главным." },
  { type: "C", uz: "Daftarlarim va narsalarim doim tartibli turadi.", ru: "Мои тетради и вещи всегда в порядке." },
  { type: "R", uz: "Bog'da yoki dalada ishlash menga yoqadi.", ru: "Мне нравится работать в саду или в поле." },
  { type: "I", uz: "Qiyin masalani yechmaguncha tinchlanmayman.", ru: "Я не успокоюсь, пока не решу трудную задачу." },
  { type: "A", uz: "Hikoya, she'r yoki blog yozish menga yoqadi.", ru: "Мне нравится писать рассказы, стихи или блог." },
  { type: "S", uz: "Kichik bolalar bilan vaqt o'tkazish menga yoqadi.", ru: "Мне нравится проводить время с маленькими детьми." },
  { type: "E", uz: "Do'stlarimni biror g'oyaga ishontira olaman.", ru: "Я умею убедить друзей в своей идее." },
  { type: "C", uz: "Xarajatlarimni yozib, hisob-kitob qilib boraman.", ru: "Я записываю свои расходы и веду подсчёты." },
  { type: "R", uz: "Asbob-uskunalar (otvyortka, bolg'a) bilan ishlash qiziq.", ru: "Мне интересно работать с инструментами (отвёртка, молоток)." },
  { type: "I", uz: "Tajriba o'tkazib, natijasini kuzatish menga yoqadi.", ru: "Мне нравится ставить опыты и наблюдать результат." },
  { type: "A", uz: "Musiqa chalish yoki qo'shiq aytish menga yoqadi.", ru: "Мне нравится играть музыку или петь." },
  { type: "S", uz: "Kasal yoki xafa odamga yordam bergim keladi.", ru: "Мне хочется помочь больному или расстроенному человеку." },
  { type: "E", uz: "O'z biznesimni ochishni orzu qilaman.", ru: "Я мечтаю открыть свой бизнес." },
  { type: "C", uz: "Jadval to'ldirish va ro'yxat tuzish menga oson.", ru: "Мне легко заполнять таблицы и составлять списки." },
  { type: "R", uz: "Mashina, samolyot yoki robot qanday ishlashi qiziq.", ru: "Мне интересно, как устроены машина, самолёт или робот." },
  { type: "I", uz: "Ilmiy-ommabop kitob va videolarni ko'raman.", ru: "Я смотрю научно-популярные книги и видео." },
  { type: "A", uz: "Kiyim, xona yoki sahifani chiroyli bezashni yoqtiraman.", ru: "Мне нравится красиво оформлять одежду, комнату или страницу." },
  { type: "S", uz: "Odamlar menga muammolarini aytib maslahat so'rashadi.", ru: "Люди делятся со мной проблемами и просят совета." },
  { type: "E", uz: "Tadbir yoki musobaqani tashkil qilish menga yoqadi.", ru: "Мне нравится организовывать мероприятия или соревнования." },
  { type: "C", uz: "Qoidalarga aniq amal qilish men uchun muhim.", ru: "Для меня важно точно следовать правилам." },
  { type: "R", uz: "Sport va jismoniy mehnat menga kuch beradi.", ru: "Спорт и физический труд дают мне силы." },
  { type: "I", uz: "Kompyuterda dastur yoki o'yin qanday yozilganini bilgim keladi.", ru: "Мне хочется знать, как написана программа или игра." },
  { type: "A", uz: "Sahnada chiqish yoki video suratga olish menga yoqadi.", ru: "Мне нравится выступать на сцене или снимать видео." },
  { type: "S", uz: "Ko'ngilli bo'lib, boshqalarga yordam berishga tayyorman.", ru: "Я готов быть волонтёром и помогать другим." },
  { type: "E", uz: "Bahslashib, o'z fikrimni himoya qilishni yoqtiraman.", ru: "Мне нравится спорить и отстаивать своё мнение." },
  { type: "C", uz: "Matndagi xatolarni tez topaman.", ru: "Я быстро нахожу ошибки в тексте." },
  { type: "R", uz: "Hayvonlarni parvarish qilish menga yoqadi.", ru: "Мне нравится ухаживать за животными." },
  { type: "I", uz: "Matematika va mantiqiy jumboqlar menga qiziq.", ru: "Мне интересны математика и логические головоломки." },
  { type: "A", uz: "Boshqalardan farqli, o'zimcha yo'l bilan ishlashni yoqtiraman.", ru: "Мне нравится делать всё по-своему, не как другие." },
  { type: "S", uz: "Jamoada hamma bir-biri bilan kelishib ishlashi men uchun muhim.", ru: "Для меня важно, чтобы в команде все ладили." },
  { type: "E", uz: "Pul topish va uni ko'paytirish yo'llari qiziq.", ru: "Мне интересно, как зарабатывать и приумножать деньги." },
  { type: "C", uz: "Ishni oldindan rejalashtirib, bosqichma-bosqich bajaraman.", ru: "Я заранее планирую работу и выполняю её по шагам." },
];

export const CREATIVE_EXAM = { uz: "Qo'shimcha ijodiy imtihon bor", ru: "Есть дополнительный творческий экзамен" };
export const PHYSICAL_EXAM = { uz: "Qo'shimcha jismoniy tayyorgarlik sinovi bor", ru: "Есть дополнительное испытание по физподготовке" };
