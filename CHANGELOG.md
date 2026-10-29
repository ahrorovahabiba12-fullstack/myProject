# Changelog

Loyihadagi barcha muhim o'zgarishlar shu faylda, sana bo'yicha teskari
tartibda (eng yangisi tepada) yoziladi.

## 2026-10-28

- **Olib tashlandi**: Subscription (Premium) butunlay — ota-ona panelidagi
  obuna sahifasi va menyu havolasi, `/api/subscription` va
  `/api/admin/premium-subscribers` endpointlari, `MockPaymentProvider`,
  admin paneldagi "Premium obunachilar" kartochkasi, `PAYMENT_PROVIDER`
  sozlamasi va `Subscription` jadvali (migratsiya
  `20261028180000_remove_subscription`). Premium hech qaysi imkoniyatni
  cheklamas edi; ilova hamma uchun bepul.
- **Production**: `docker-compose.prod.yml` + `Caddyfile` (avtomatik HTTPS,
  bitta domen), majburiy sirlar, `NODE_ENV=production`, production'da demo
  akkountlar seed qilinmaydi, `TRUST_PROXY`, backend konteyneri root emas.

## 2026-09-22

- **Feature**: Superadmin panelida "Foydalanuvchilar" endi alohida, doimiy
  sahifa (`/admin/users`) — chap tomonda doimiy navigatsiya paneli
  (sidebar) qo'shildi ("Boshqaruv paneli" / "Foydalanuvchilar"). Yangi
  sahifada: ism/telefon bo'yicha qidiruv, barcha foydalanuvchilar bitta
  jadvalda (rol ustuni bilan), va **haqiqiy bloklash funksiyasi** —
  admin har qanday foydalanuvchini (o'zidan boshqa) bloklashi mumkin;
  bloklangan foydalanuvchi endi tizimga kira olmaydi (aniq xabar bilan
  rad etiladi), va agar sessiyasi ochiq bo'lsa ham keyingi so'rovda
  chiqarib yuboriladi. Buning uchun `User` jadvaliga `status`
  (ACTIVE/BLOCKED) maydoni qo'shildi. Boshqaruv panelidagi "Jami
  foydalanuvchilar"/"O'quvchilar"/"Ota-onalar" statistika kartochkalari
  endi oyna (modal) o'rniga shu yangi sahifaga o'tkazadi.
- **Fix (muhim)**: `ai_advisor` (asosiy dev) bazasi negadir butunlay
  bo'sh holatda topildi — barcha jadvallar yo'q edi, faqat migratsiya
  tarixi jadvali qolgan edi (sinov bazasi `ai_advisor_test`ga bu
  ta'sir qilmagan). Sababi aniqlanmadi (loyihadan tashqarida sodir
  bo'lgan), lekin barcha migratsiyalar boshidan qayta qo'llanib va
  demo ma'lumotlar qayta urug'lantirilib, baza to'liq tiklandi.
  Eslatma: bu orqali faqat standart demo hisoblar tiklandi — foydalanuvchi
  o'zi ro'yxatdan o'tkazgan haqiqiy hisoblar (masalan sinov uchun
  ro'yxatdan o'tkazilgan hisoblar) tiklanmadi.

## 2026-09-19

- **Fix**: Haqiqiy OpenAI ulanganidan keyin "Kasb yo'li" tavsiyalari doim
  fon jarayonida xatolik berib, sezilmagan holda zaxira (RuleBasedProvider)
  javobiga qaytib turardi — sababi, model `matchScore`ni ba'zan 0-1
  oralig'ida (masalan 0.85) emas, foiz shaklida (masalan 85) qaytarardi,
  bu esa tekshiruvdan (validatsiyadan) o'tolmasdi va BUTUN javob (barcha
  kasblar) rad etilardi. Endi bunday qiymatlar avtomatik to'g'irlanadi
  (100 ga bo'linadi) tekshiruvdan oldin, va so'rov matni ham aniqroq
  qilib yozildi — endi haqiqiy AI javobi muvaffaqiyatli saqlanmoqda.
- **Feature**: Ilova endi haqiqiy OpenAI modeliga (`gpt-5.6-luna`) ulandi —
  avval hech qanday AI kalit sozlanmagani uchun barcha AI funksiyalar
  (AI Maslahatchi chat, Kunlik murabbiy, haftalik reja, kasb/universitet
  tavsiyasi, ota-ona hisoboti) faqat deterministik qoidaviy (RuleBasedProvider)
  mantiq bilan ishlar edi. `.env`ga `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL`
  sozlandi. Shu jarayonda ikkita moslik muammosi tuzatildi: (1) bu model
  `temperature` parametrining standart qiymatidan boshqasini qabul
  qilmaydi — kodda olib tashlandi; (2) OpenAI kaliti sozlanganda test
  to'plami ham xato ravishda **haqiqiy, pullik** OpenAI so'rovlarini
  yubora boshlagan edi (avval faqat NODE_ENV=test tekshiruvi orqali
  himoyalangan, lekin AI_PROVIDER tekshiruvi undan ustun ekan) —
  `vitest.config.ts`da testlar uchun AI_PROVIDER majburan "mock" qilib
  qo'yildi, endi testlar hech qachon internetga chiqmaydi va pul
  sarflamaydi.
- **Fix**: Profildagi "Kasbiy qiziqishlar"ga erkin matn (masalan "programming",
  "dasturlash", "shifokor") kiritilganda, "Kasb yo'li" bo'limida hech qanday
  kasb tavsiyasi chiqmayotgan edi — sababi, tizim bu matnni to'g'ridan-to'g'ri
  ichki kasb kodi (masalan "SOFTWARE_ENGINEER") deb hisoblab, aynan mos
  kelishini kutar edi, garchi foydalanuvchi hech qachon bunday kodni
  yozmasa ham. Endi yozilgan matn (o'zbekcha, ruscha yoki inglizcha) har bir
  kasbning haqiqiy kalit so'zlari bilan solishtirilib, mos keladigan kasb(lar)
  avtomatik topiladi — barcha 51 ta kasb uchun kalit so'zlar ro'yxati
  qo'shildi.
- **Fix**: "Kunlik murabbiy" xabari kun boshida ("hali boshlamadingiz, bugun
  boshlaylik" yoki "kecha tanaffus qildingiz") yozilib, keshlanib qolar edi
  — agar o'quvchi keyinroq o'sha kuni biror narsa bajarsa (masalan test
  topshirsa), xabar hamon eskicha "boshlaylik" deb turaverardi, garchi
  "✓ Bugun bajarildi" belgisi allaqachon chiqqan bo'lsa ham — bu ikkisi
  bir-biriga ochiqchasiga zid ko'rinardi. Endi xabar shu kuni yozilgan
  paytdagi faollik holatini eslab qoladi; agar shu holat o'zgargan bo'lsa
  (o'quvchi endi faol bo'lgan bo'lsa), xabar avtomatik yangilanadi va
  "Ajoyib! Bugun allaqachon birinchi qadamni tashladingiz" kabi to'g'ri
  matn ko'rsatiladi.
- **Fix**: Yangi ro'yxatdan o'tgan (hali birorta ham test topshirmagan)
  o'quvchining "Bugungi vazifalar" rejasida ba'zi kunlar uchun "Umumiy
  takrorlash bo'yicha mashq" degan mavhum yozuv chiqardi — bu mantiqan
  noto'g'ri edi, chunki yangi o'quvchida "takrorlash" uchun hali
  hech narsa yo'q. Sababi: reja tuzuvchi kuchli/kuchsiz fan
  topilmaganda darhol shu umumiy yozuvga o'tib ketardi, garchi
  o'quvchi hali sinalmagan haqiqiy fanlar (Matematika, Kimyo va h.k.)
  mavjud bo'lsa ham. Endi bunday holatda haqiqiy, hali sinalmagan
  fanlar orasidan aylantirib beriladi — "Umumiy takrorlash" faqat
  haqiqatan ham birorta fan topilmaganda (deyarli imkonsiz holat)
  qoladi.
- **Fix**: "Kunlik murabbiy" xabari yangi ro'yxatdan o'tgan (hali birorta
  ham faoliyati bo'lmagan) o'quvchiga ham "Kecha tanaffus qildingiz —
  hech qisi yo'q, bugun qayta boshlaylik" deb yozardi — bu chalkash edi,
  chunki bunday o'quvchi hech qachon "tanaffus" qilmagan, shunchaki hali
  boshlamagan. Endi bunday holatda alohida, to'g'ri "Xush kelibsiz!"
  xabari chiqadi; "tanaffus" xabari faqat haqiqatan ham oldin
  shug'ullangan, lekin kecha shug'ullanmagan o'quvchiga chiqadi.
- **Feature**: "Tavsiya etilgan universitetlar" sahifasida endi universitet
  nomlari bosiladigan havola — bosilganda haqiqiy rasmiy sayti yangi tabda
  ochiladi (tashqi-havola belgisi bilan). 41 ta universitetdan 36 tasi
  uchun rasmiy sayt internetdan qidirib, mavjudligi tasdiqlangan holda
  qo'shildi. Qolgan 5 tasi ataylab havolasiz qoldirildi: 2 tasi (Toshkent
  Davlat Aviatsiya va Texnologiyalar Universiteti, Olmaliq Konchilik-
  Metallurgiya Instituti) boshqa universitetlarga qo'shilib/qayta
  tashkil etilgani uchun yagona to'g'ri sayti yo'q, 2 tasi (Toshkent
  Moliya Instituti, Toshkent Islom Universiteti) boshqa muassasaga
  birlashtirilgan, 1 tasi (Toshkent Pediatriya Tibbiyot Instituti)
  saytida SSL sertifikat nomuvofiqligi borligi aniqlandi (brauzerda
  xavfsizlik ogohlantirishi chiqarishi mumkin). Noto'g'ri yoki xavfli
  havola qo'shishdan ko'ra, havolasiz oddiy matn qoldirish afzal
  ko'rildi.
- **Fix**: Universitet tavsiyasi uchun test bo'yicha "kuchli fan" fallback'i
  faqat rasman "STRONG" darajasidagi fanni hisobga olardi — agar o'quvchining
  eng yaxshi natijasi ham "MEDIUM" yoki "WEAK" darajada bo'lsa (masalan 60%),
  hali ham "Hali yetarlicha ma'lumot yo'q" xabari chiqaverardi, garchi
  o'quvchi test topshirgan bo'lsa ham. Endi profilda sevimli fan
  belgilanmagan bo'lsa, darajasidan qat'i nazar **eng yuqori ball olingan
  fan** asos qilib olinadi — faqat umuman test topshirmagan yangi o'quvchi
  uchungina bu xabar qoladi.
- **Feature**: "Kasb yo'li" (roadmap) sahifasidagi "Vazifalar" va "Resurslar"
  ro'yxatlaridagi ba'zi elementlar endi bosiladigan havola qilindi — masalan
  "Matematika va Informatika fanlaridan doimiy mashq qiling" bosilsa "Test"
  sahifasiga o'tkazadi, "Khan Academy — Matematika kurslari" bosilsa yangi
  tabda khanacademy.org ochiladi. Faqat aniq, ishonchli manzili bo'lgan
  elementlar (Khan Academy, freeCodeCamp, GitHub, Kaggle va h.k. kabi
  taniqli platformalar, hamda ilova ichidagi "Test"/"Universitetlar"
  sahifalari) havola qilindi — "Maktab to'garaklari" kabi yagona aniq
  manzili yo'q elementlar oddiy matn bo'lib qoldi.
- **Fix**: "Progress" sahifasidagi "Haftalik/oylik faollik" grafigi (va shu
  ma'lumotdan foydalanadigan Ota-ona panelidagi faollik grafigi hamda
  Superadmin panelidagi "Bugun faol o'quvchilar" ro'yxati) endi test
  (quiz) orqali qilingan haqiqiy vaqtni ham hisobga oladi. Avval bu
  ma'lumotlar faqat vaqt belgilab bajarilgan (StudySession) darslardan
  olinardi — agar o'quvchi faqat testlar orqali shug'ullansa, grafik
  butunlay "0 daqiqa" ko'rsatardi, garchi "O'qish tahlili" bo'limida
  haqiqiy daqiqalar va sessiyalar soni to'g'ri ko'rsatilsa ham (ikkala
  bo'lim bir xil sahifada bir-biriga zid ma'lumot berardi). Sababi:
  StudySession jadvaliga har bir sessiyaning manbai (`SCHEDULE` yoki
  `QUIZ`) yozib qo'yildi, shu orqali ikki marta hisoblanib ketmasdan
  test vaqtini ham qo'shish imkoni paydo bo'ldi.
- **Improvement**: "Tavsiya etilgan universitetlar" sahifasiga ham "Orqaga
  qaytish" tugmasi qo'shildi (Kasb yo'li sahifasiga qaytaradi) — xuddi
  quyidagi "Kasb yo'li" sahifasiga qo'shilgan tugma kabi.
- **Improvement**: "Kasb yo'li" (bitta kasbning roadmap/qadamlar) sahifasiga
  "Kasblar ro'yxatiga qaytish" tugmasi qo'shildi — avval bu sahifadan
  faqat sidebar orqali chiqib ketish mumkin edi, orqaga qaytish tugmasi
  yo'q edi.

## 2026-09-17

- **Content**: 7, 8, 10 va 11-sinflar uchun ham barcha 8 ta fanda
  (Matematika, Tarix, Fizika, Ingliz tili, Kimyo, Biologiya, Ona tili,
  Informatika) test savollari haqiqiy, sinf dasturiga mos savollarga
  almashtirildi — avval faqat 9-sinfda haqiqiy savollar bor edi, qolgan
  sinflarda hali ham "Variant A/B/C/D" ko'rinishidagi vaqtinchalik
  (placeholder) savollar chiqardi. Endi bazada birorta ham placeholder
  savol qolmadi — jami 5 ta sinf × 52 ta savol = 260 ta haqiqiy savol.

## 2026-09-17 (avvalgi yozuvlar)

- **Fix**: Barcha demo o'quvchi hisoblariga (7, 8, 9, 10, 11-sinf) endi
  viloyat qo'shildi — avval bu maydon faqat sinov qilingan bitta
  hisobda o'rnatilgan, qolganlarida bo'sh edi. Endi seed skripti ham
  yangi hisoblar uchun viloyatni avtomatik belgilaydi (mavjud
  hisoblarning o'z tahrirlarini qayta yozib yubormasdan).
- **Remove**: "Ko'nikmalar" (Skill Map) funksiyasi butunlay olib
  tashlandi (frontend sahifasi va navigatsiya havolasi, backend
  controller/service/repository/route/validator, Prisma'dagi `Skill`
  va `StudentSkill` jadvallari, `StudySession.skillId` ustuni, seed
  ma'lumotlari, testlar, i18n matnlari). Migratsiya orqali bazadan ham
  o'chirildi.
- **Improvement**: Universitet tavsiyasi endi "Profil"da sevimli fan
  tanlanmagan bo'lsa ham ishlaydi — bunday holatda avtomatik ravishda
  o'quvchining **test natijalaridagi eng kuchli (STRONG) fani** asos
  qilib olinadi (bir nechta kuchli fan bo'lsa — eng yuqori ball
  bo'yicha). Faqat sevimli fan ham, kuchli fan ham umuman bo'lmasa
  (masalan, hali birorta test topshirmagan yangi o'quvchi) — o'sha
  holatdagina "hali yetarlicha ma'lumot yo'q" xabari chiqadi.
- **Improvement**: Viloyat bo'yicha tavsiya "afzallik" (birinchi
  ko'rsatish) o'rniga **qat'iy filtrga** o'zgartirildi — foydalanuvchi
  so'roviga ko'ra. Sababi: Toshkentda universitetlar soni juda ko'p
  (41 tadan 15 tasi) bo'lgani uchun "afzallik" rejimi Toshkent
  tanlagan o'quvchi uchun deyarli sezilmas edi (Toshkent universitetlari
  allaqachon tepada edi). Endi o'quvchining viloyati tanlangan bo'lsa,
  **faqat shu viloyatdagi** universitetlar ko'rsatiladi, qolganlari
  butunlay yashiriladi. Agar shu viloyatda mos universitet topilmasa,
  tushuntiruvchi xabar chiqadi ("boshqa viloyat tanlab ko'ring").
- **Feature**: O'quvchining yashash joyi (viloyati) endi universitet
  tavsiyalarida hisobga olinadi. Profilga "Yashash joyi (viloyat)"
  tanlagichi qo'shildi (O'zbekistonning barcha 14 ta hududi). Har bir
  universitet kartochkasida endi viloyati ham ko'rinadi.
- **Content**: Bazaga oldin faqat Toshkent/Samarqand/Buxoro/Farg'onada
  bo'lgan universitetlarga qo'shimcha, qolgan 10 ta viloyat (Andijon,
  Namangan, Navoiy, Qashqadaryo, Surxondaryo, Jizzax, Sirdaryo, Xorazm,
  Qoraqalpog'iston, Toshkent viloyati) uchun ham bittadan yirik
  universitet qo'shildi — endi O'zbekistonning barcha 14 ta hududi
  qamrab olingan (jami 41 ta universitet).

## 2026-09-16

- **Improvement**: "Universitetlar" sahifasi endi barcha universitetlarni
  ko'rsatish/saralash o'rniga faqat o'quvchining **bitta, birinchi
  tanlangan sevimli faniga** mos universitetlarni ko'rsatadi — ro'yxat
  qisqarib, aniqroq bo'ldi. Agar o'quvchi (masalan yangi ro'yxatdan
  o'tgan) hali sevimli fan tanlamagan bo'lsa, universitet ro'yxati
  o'rniga shuni tushuntiruvchi xabar chiqadi.
- **Feature**: Profil sahifasiga "Sevimli fanlar" tanlagichi qo'shildi —
  o'quvchi fanlarni bosib tanlaydi, birinchi tanlagani (raqam bilan
  belgilanadi) universitet tavsiyalari uchun ishlatiladi. Avval bu
  ma'lumotni hech qanday joydan sozlab bo'lmasdi.
- **Fix**: "Universitetlar" sahifasi endi haqiqatan ham o'quvchining
  kuchli/o'rtacha fanlari va qiziqishlariga qarab tavsiya beradi — avval
  bu sahifa shunchaki barcha universitetlarni bazadagi tartibda
  ko'rsatardi, hech qanday moslashtirish yo'q edi (universitetlar soni
  oz bo'lganda bu sezilmasdi, ammo 31 taga yetgach yaqqol bilindi).
  Endi kuchli fanga mos universitetlar tepada, mos "Sizga mos" belgisi
  bilan chiqadi. (Keyinroq sevimli fan tanlagichi bilan almashtirildi —
  yuqoridagi yozuvga qarang.)
- **Content**: Toshkentdagi yana 16 ta yirik universitet qo'shildi
  (TDTU, TDPU, JahonTilU, Kimyo-Texnologiya Instituti, San'at va
  Madaniyat Instituti, Pediatriya Instituti, TIQXMMI, WIUT, TTPU va
  h.k.). Jami: **31 ta universitet** (barchasi Toshkentda), 51 ta kasb.
- **Content**: Kasblar katalogi keng qamrovli qilib to'ldirildi — yana
  33 ta yangi kasb (muhandislik, tibbiyot, moliya, huquq, san'at,
  mehnat sohalari va h.k.) qo'shildi. Jami: **51 ta kasb**, 15 ta
  universitet.
- **Content**: Bazaga yana 8 ta kasb (Veterinar, Psixolog, Buxgalter,
  Dizayner, Tarjimon, Uchuvchi, Stomatolog, Marketing mutaxassisi) va
  6 ta universitet (Stomatologiya instituti, Aviatsiya universiteti,
  Agrar universitet, Buxoro DU, Farg'ona DU, Vebster universiteti)
  qo'shildi — jami 18 ta kasb, 15 ta universitet.
- **Content**: Bazaga yana 6 ta kasb (O'qituvchi, Yurist, Iqtisodchi,
  Arxitektor, Jurnalist, Qurilish muhandisi) va 6 ta universitet
  (O'zMU, TDYU, TDIU, Toshkent Arxitektura-Qurilish Universiteti,
  Jurnalistika universiteti, Samarqand Davlat Universiteti) qo'shildi —
  jami 10 ta kasb, 9 ta universitet.
- **Feature**: Superadmin panelidagi "Fanlar", "Savollar", "Kasblar",
  "Universitetlar" kartochkalari ham bosiladigan qilindi — har biri
  bosilganda tegishli ro'yxat (yoki "Savollar" uchun fanlar bo'yicha
  taqsimot grafigi) oyna orqali ochiladi.
- **Cleanup**: Superadmin panelidagi doim ko'rinib turadigan
  "Foydalanuvchilar" bo'limi olib tashlandi — endi bu ma'lumot faqat
  tegishli statistika kartochkasiga bosilganda oyna orqali ko'rinadi,
  sahifada ikki marta takrorlanmaydi.
- **Feature**: Superadmin panelidagi statistika kartochkalari ("Jami
  foydalanuvchilar", "O'quvchilar", "Ota-onalar", "Premium obunachilar",
  "Bugun faol o'quvchilar") endi bosiladigan — ustiga bosilganda tegishli
  ro'yxat bilan oyna (modal) ochiladi. ("O'rtacha test natijasi"
  kartochkasi tabiiy ro'yxatga ega bo'lmagani uchun bosilmaydigan
  qoldirildi.)
- **Improvement**: Superadmin panelidagi "Foydalanuvchilar" bo'limi endi
  bitta uzun jadval o'rniga rol bo'yicha (O'quvchi / Ota-ona / Admin)
  alohida bo'limlarga bo'lingan, har biri o'ziga mos ustunlar bilan
  (o'quvchida sinf, ota-onada farzandlar soni).
- **Feature**: Superadmin panelida "Foydalanuvchilar" jadvali qo'shildi —
  barcha ro'yxatdan o'tgan foydalanuvchilar (ism, email, rol, sinf/farzand
  soni, ro'yxatdan o'tgan sana) bitta joyda ko'rinadi. Shu bilan birga
  panelga kirish uchun demo admin hisobi qo'shildi: `admin@demo.uz` /
  `Demo12345!`.
- **Improvement**: Ota-ona panelidagi "Test natijalari tarixi" endi
  dastlab faqat 5 tasini ko'rsatadi, "Yana ko'rsatish" tugmasi bosilsa
  hammasi chiqadi — o'quvchi qancha ko'p test ishlasa ham ro'yxat
  cheksiz uzayib ketmaydi.
- **Fix**: tungi rejimda test sahifasida tanlangan javob varianti matni
  ko'rinmay qolish muammosi tuzatildi (yorug' fon + moslashmagan matn
  rangi). Xuddi shu turdagi muammo Dars rejasidagi "davom etmoqda"
  kartochkasida ham tuzatildi.
- **Fix**: test/quiz vaqti endi soniyagacha aniq hisoblanadi va ko'rsatiladi.
  Avval faqat butun daqiqagacha yaxlitlanardi ("0 daqiqa"), va agar fan
  bugungi rejada umuman bo'lmasa, vaqt umuman yozib olinmasdi. Endi test
  o'zining boshlanish-tugash vaqtini kuzatadi va bu har doim to'g'ri
  saqlanadi (`StudySession.seconds` ustuni qo'shildi).
- **Fix**: tungi rejimda Dashboard'dagi "Salom, {ism}!" sarlavhasi
  ko'rinmay qolish muammosi (rang kontrastsizligi) tuzatildi.
- **Fix**: Ota-ona panelidagi "AI hisobot"da "0 daqiqa shug'ullandi" va
  "o'rtacha test natijasi X%" bir-biriga zid ko'rinishi tuzatildi — endi
  faqat test orqali faollik bo'lsa, bu alohida va tushunarli aytiladi.
- **Fix**: AI Maslahatchi (chat) da turli xabarlarga bir xil javob qaytish
  muammosi tuzatildi — inglizcha so'zlar (masalan "programming") endi
  tanib olinadi, va noma'lum mavzular uchun "Salom" xabari qayta-qayta
  takrorlanmaydi.
- **Redesign**: Ochiq (public) bosh sahifa (Landing) qayta dizayn qilindi.
- **Remove**: "AI xotirasi" (AI Memory) funksiyasi butunlay olib
  tashlandi (frontend, backend, Prisma schema/migration).
- **Redesign**: O'quvchi Dashboard'i qayta dizayn qilindi (hero
  illyustratsiya, stat-pill'lar, "Bugungi vazifalar" kartochkasi).
- **Fix**: Progress sahifasidagi "yetarlicha faoliyat qayd etilmagan"
  xabari — faqat vaqtli darslarni emas, test orqali faollikni ham hisobga
  oladigan qilib tuzatildi (Consistency Score va AI tahlilida).
- **Fix**: F5/sahifani yangilashda avtorizatsiyadan chiqib ketish xatosi
  tuzatildi.
- **Feature**: Kimyo, Biologiya, Ona tili, Informatika fanlari uchun
  haqiqiy test savollari qo'shildi; noto'g'ri javob berilgan savollar
  ko'proq, to'g'ri javob berilganlar kamroq qaytarilishi (adaptiv
  tanlash) joriy qilindi.
- **Refactor**: Backend unit testlar mock'lar o'rniga haqiqiy (alohida
  test) PostgreSQL bazasiga ulanadigan qilib qayta yozildi.
- **Improvement**: Ota-ona paneli yaxshilandi (bildirishnoma tuzatish,
  test natijalari tarixi, faollik grafigi).
- **Feature**: Superadmin paneli qo'shildi.
