const keys = [
  'progress_label', 'progress_not_saved', 'progress_not_saved_exit', 'progress_not_saved_hint',
  'progress_not_saved_short', 'progress_not_saved_title', 'progress_saved', 'progress_saved_at',
  'progress_saved_short', 'progress_saving', 'progress_saving_short',
];
const make = (values) => Object.fromEntries(keys.map((key, index) => [key, values[index]]));

module.exports = {
  chin_falam: make([
    'Hruaitu tour kalnak', 'Kalnak cu hman a si lo', 'Hruaitu Mode cu a khar, asinain hi device in na kalnak a khawl thei lo.', 'Device khawlhnak cu hman a si lo. Khawl sal, zirnak cu project backup ah khawl, asilole Hruaitu Mode cu hman lai.',
    'Khawl lo', 'Kalnak khawl theih a si lo', 'Hruaitu kalnak cu khawl a si. Setup ihsin tikcu hmanah feh sal.', '{time} ah hi device ah khawl a si', 'Khawl a si', 'Kalnak khawl lio…', 'Khawl lio',
  ]),
  chin_hakha: make([
    'Hruaitu tour kalnak', 'Kalnak khawl a si lo', 'Hruaitu Mode cu a khar, tuni device in na kalnak khawl thei a si lo.', 'Device khawlhnak a um lo. Khawl sal, zirnak cu project backup ah ret, asilole Hruaitu Mode cu khar lo.',
    'Khawl lo', 'Kalnak khawl theih a si lo', 'Hruaitu kalnak khawl a si. Setup ihsin tikcu hmanah feh sal.', '{time} ah tuni device ah khawl a si', 'Khawl a si', 'Kalnak khawl lio…', 'Khawl lio',
  ]),
  dari: make([
    'پیشرفت تور راهنمایی‌شده', 'پیشرفت ذخیره نشد', 'حالت راهنمایی‌شده بسته شد، اما این دستگاه نتوانست پیشرفت شما را ذخیره کند.', 'ذخیره‌سازی دستگاه در دسترس نیست. ذخیره را دوباره امتحان کنید، درس را به‌عنوان پشتیبان پروژه نگه دارید یا حالت راهنمایی‌شده را باز بگذارید.',
    'ذخیره نشده', 'پیشرفت ذخیره نشد', 'پیشرفت راهنمایی‌شده ذخیره شد. هر زمان از تنظیمات ادامه دهید.', 'در این دستگاه در {time} ذخیره شد', 'ذخیره شد', 'ذخیرهٔ پیشرفت…', 'در حال ذخیره',
  ]),
  esperanto: make([
    'Progreso de la gvidata rondiro', 'Progreso ne konservita', 'La gvidata reĝimo fermiĝis, sed ĉi tiu aparato ne povis konservi vian progreson.', 'La aparato-stokado ne disponeblas. Provu konservi denove, konservu la lecionon kiel projektan sekurkopion aŭ lasu la gvidatan reĝimon malfermita.',
    'Ne konservita', 'Ne eblis konservi la progreson', 'La gvidata progreso estas konservita. Daŭrigu iam ajn el Agordo.', 'Konservita ĉe ĉi tiu aparato je {time}', 'Konservita', 'Konservante progreson…', 'Konservado',
  ]),
  hmong: make([
    'Kev vam meej ntawm kev ncig qhia', 'Tsis tau khaws kev vam meej', 'Hom Coj Qhia kaw lawm, tiam sis lub cuab yeej no khaws tsis tau koj txoj kev vam meej.', 'Lub cuab yeej khaws cia siv tsis tau. Sim khaws dua, khaws zaj lus qhia ua qhov project backup, los yog cia Hom Coj Qhia qhib.',
    'Tsis tau khaws', 'Khaws tsis tau kev vam meej', 'Khaws tau kev vam meej coj qhia lawm. Rov pib tau txhua lub sijhawm ntawm Kev Teeb Tsa.', 'Khaws rau lub cuab yeej no thaum {time}', 'Khaws lawm', 'กำลัง khaws kev vam meej…', 'กำลัง khaws',
  ]),
  igbo: make([
    'Ọganihu njem nlegharị anya a na-eduzi', 'Echekwaghị ọganihu', 'A mechiri Ọnọdụ Nduzi, mana ngwaọrụ a enweghị ike ichekwa ọganihu gị.', 'Nchekwa ngwaọrụ adịghị. Gbalịa ichekwa ọzọ, debe nkuzi ahụ ka nkwado ọrụ, ma ọ bụ hapụ Ọnọdụ Nduzi ka ọ meghee.',
    'Echekwaghị', 'Enweghị ike ichekwa ọganihu', 'Echekwala ọganihu nduzi. Malite ọzọ mgbe ọ bụla site na Mbido.', 'Echekwara na ngwaọrụ a n’oge {time}', 'Echekwara', 'Na-echekwa ọganihu…', 'Na-echekwa',
  ]),
  karen: make([
    'Htee p’ghaw k’thaw kalnak', 'Kalnak ta bluh meh', 'Htee p’ghaw k’thaw ta khar, ta bluh meh nee device doh hta na kalnak.', 'Device doh htee meh ta htee. Htee meh ta bluh, k’thaw htee meh project backup hta, la Htee p’ghaw k’thaw ta htee meh.',
    'Ta bluh meh', 'Kalnak ta bluh meh', 'Htee p’ghaw k’thaw ta bluh meh. Setup hta naw ta htee meh ta bluh.', 'Nee device hta {time} hta ta bluh', 'Ta bluh', 'Kalnak ta bluh lio…', 'Ta bluh lio',
  ]),
  khmer: make([
    'វឌ្ឍនភាពដំណើរណែនាំ', 'មិនបានរក្សាទុកវឌ្ឍនភាព', 'របៀបណែនាំត្រូវបានបិទ ប៉ុន្តែឧបករណ៍នេះមិនអាចរក្សាទុកវឌ្ឍនភាពរបស់អ្នកបានទេ។', 'ការផ្ទុកក្នុងឧបករណ៍មិនអាចប្រើបាន។ ព្យាយាមរក្សាទុកម្តងទៀត រក្សាមេរៀនជាការបម្រុងទុកគម្រោង ឬទុករបៀបណែនាំឱ្យបើក។',
    'មិនបានរក្សាទុក', 'មិនអាចរក្សាទុកវឌ្ឍនភាពបាន', 'វឌ្ឍនភាពដែលបានណែនាំត្រូវបានរក្សាទុក។ បន្តបានគ្រប់ពេលពីការរៀបចំ។', 'បានរក្សាទុកនៅលើឧបករណ៍នេះនៅ {time}', 'បានរក្សាទុក', 'កំពុងរក្សាទុកវឌ្ឍនភាព…', 'កំពុងរក្សាទុក',
  ]),
  kinyarwanda: make([
    'Amajyambere y’urugendo ruyobowe', 'Amajyambere ntiyabitswe', 'Uburyo buyobowe bwafunzwe, ariko iki gikoresho nticyashoboye kubika amajyambere yawe.', 'Ububiko bw’igikoresho ntibuboneka. Ongera ugerageze kubika, ubike isomo nk’inyongera y’umushinga cyangwa usige uburyo buyobowe bukinguye.',
    'Ntabwo yabitswe', 'Amajyambere ntiyabitswe', 'Amajyambere ayobowe yabitswe. Komeza igihe icyo ari cyo cyose uhereye ku Miterere.', 'Byabitswe kuri iki gikoresho saa {time}', 'Byabitswe', 'Kubika amajyambere…', 'Kubika',
  ]),
  kirundi: make([
    'Iterambere ry’urugendo ruyobowe', 'Iterambere ntiryabitswe', 'Uburyo buyobowe bwarafunzwe, ariko iki gikoresho nticashoboye kubika iterambere ryawe.', 'Ububiko bw’igikoresho ntibuboneka. Subira ugerageze kubika, ubike isomo nk’ububiko bw’umugambi, canke usige uburyo buyobowe buguruye.',
    'Ntiryabitswe', 'Iterambere ntiryashoboye kubikwa', 'Iterambere riyobowe ryarabitswe. Bandanya igihe cose uhereye ku Gutunganya.', 'Vyabitswe kuri iki gikoresho isaha ya {time}', 'Vyabitswe', 'Kubika iterambere…', 'Kubika',
  ]),
  latin: make([
    'Progressus itineris ducti', 'Progressus non servatus', 'Modus ductus clausus est, sed haec machina progressum tuum servare non potuit.', 'Repositio machinae praesto non est. Iterum servare tenta, lectionem ut exemplar incepti conserva, aut modum ductum apertum relinque.',
    'Non servatus', 'Progressus servari non potuit', 'Progressus ductus servatus est. Ex Configuratione quovis tempore perge.', 'In hac machina hora {time} servatus', 'Servatus', 'Progressum servans…', 'Servans',
  ]),
  lingala: make([
    'Bokoli ya mobembo oyo ezali na bokambi', 'Bokoli ebombami te', 'Mode ya Bokambi ekangami, kasi appareil oyo ekoki kobomba bokoli na yo te.', 'Esika ya kobomba ya appareil ezali te. Meká kobomba lisusu, bomba liteya lokola backup ya projet, to tika Mode ya Bokambi efungwami.',
    'Ebombami te', 'Bokoli ekoki kobombama te', 'Bokoli ya bokambi ebombami. Kende lisusu tango nyonso uta na Setup.', 'Ebombami na appareil oyo na {time}', 'Ebombami', 'Ezali kobomba bokoli…', 'Ezali kobomba',
  ]),
  maay_maay: make([
    'Horumarka socdaalka la hagayo', 'Horumarka lama kaydin', 'Habka Hagidda waa la xiray, laakiin qalabkan ma kaydin karin horumarkaaga.', 'Kaydinta qalabku lama heli karo. Mar kale isku day kaydinta, casharka u hay kayd mashruuc, ama Habka Hagidda fur.',
    'Lama kaydin', 'Horumarka lama kaydin karin', 'Horumarka hagidda waa la kaydiyey. Dib uga sii wad Dejinta wakhti kasta.', 'Qalabkan waxaa lagu kaydiyey {time}', 'La kaydiyey', 'Horumarka waa la kaydinayaa…', 'Waa la kaydinayaa',
  ]),
  marshallese: make([
    'Kōtōbar eo ilo ial eo ej kōmman', 'Progress eo ejjab kōjparok', 'Mode eo ej kōmman ej kilōk, ak device in ejjab maroñ kōjparok progress eo am.', 'Jikin kōjparok ilo device eo ejjab bed. Kōṃṃan an kōjparok juon alen, kōjparok katak eo eṃṃan bwe project backup, ak kōjparok Mode eo ej kōmman bwe en bōk.',
    'Ejjañin kōjparok', 'Progress eo ejjab maroñ kōjparok', 'Progress eo ej kōmman ej kōjparok. Kōṃṃan wōt jān Setup ilo jab ien.', 'Kōjparok ilo device in ilo {time}', 'Kōjparok', 'Kōjparok progress…', 'Kōjparok',
  ]),
};
