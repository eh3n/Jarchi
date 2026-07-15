const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (res.status === 401) { window.location.href = "/login.html"; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t("err_server"));
  return data;
}

// ================= چندزبانه =================
const I18N = {
  fa: {
    _dir: "rtl", _name: "فارسی",
    app: "Jarchi 📣", nav_dashboard: "داشبورد", nav_music: "موزیک", nav_radio: "رادیو",
    nav_schedule: "زنگ‌ها", nav_settings: "تنظیمات", logout: "خروج",
    login: "ورود", login_sub: "برای دسترسی به داشبورد پخش، وارد شوید.",
    username: "نام کاربری", password: "رمز عبور",
    now_playing: "در حال پخش", nothing: "چیزی در حال پخش نیست", live: "پخش زنده",
    radio_playing: "در حال پخش رادیو", unknown_artist: "خواننده نامشخص",
    select_source: "انتخاب پخش", src_radio: "📻 رادیو", src_playlist: "🎵 پلی‌لیست", src_off: "⏹ خاموش",
    volume: "میزان صدا", engine_ok: "موتور صدا: متصل ✓",
    engine_down: "⚠️ موتور صدا در دسترس نیست — از تنظیمات > سیستم آن را ری‌استارت کنید",
    tracks_list: "آهنگ‌ها", stations_list: "ایستگاه‌های رادیو",
    add_music: "افزودن موزیک", upload: "آپلود", delete: "حذف", confirm_del: "حذف شود؟",
    add_station: "افزودن ایستگاه", st_name: "نام ایستگاه", st_url: "آدرس استریم (https://...)",
    check: "بررسی لینک", edit: "ویرایش", save: "ذخیره", cancel: "انصراف", play: "پخش",
    on_air_badge: "در حال پخش", checking: "در حال بررسی...",
    stream_ok: "لینک سالم است ✓", stream_fail: "لینک مشکل دارد ✗",
    hls_warn: "این لینک HLS است و ممکن است پخش نشود؛ لینک مستقیم mp3/aac بهتر است.",
    quality: "کیفیت", empty_list: "لیست خالی است.",
    sch_title: "زمان‌بندی زنگ‌ها", bells_files: "فایل‌های زنگ", upload_bell: "آپلود فایل زنگ",
    sch_name: "نام (مثلاً زنگ ناهار)", sch_time: "ساعت", sch_days: "روزها",
    sch_bell: "فایل زنگ", add_schedule: "افزودن زمان‌بندی", enabled: "فعال", disabled: "غیرفعال",
    test: "تست", days: ["ی","د","س","چ","پ","ج","ش"],
    sip_title: "تنظیمات تلفنی (SIP)", sip_mode: "حالت اتصال",
    mode_a: "A — رجیستر روی سانترال موجود (پیشنهادی)", mode_b: "B — مستقل (تلفن‌ها به این سرور رجیستر می‌شوند)",
    pbx_host: "آدرس سانترال (IP)", extension: "شماره اکستنشن پیج", sip_pass: "پسورد SIP",
    keep_empty: "برای عدم تغییر خالی بگذارید", pass_set: "(تنظیم شده ✓)", pass_unset: "(هنوز تنظیم نشده!)",
    max_page: "حداکثر مدت هر پیج (ثانیه)", apply_sip: "ذخیره و اعمال روی Asterisk",
    check_reg: "بررسی وضعیت رجیستر", audio_title: "خروجی صدا (کارت صدا)",
    audio_dev: "دستگاه متصل به آمپلی‌فایر", save_restart: "ذخیره و ری‌استارت موتور",
    test_sound: "🔊 تست پخش صدا", refresh_dev: "🔄 بروزرسانی لیست",
    tz_title: "منطقه زمانی", system_title: "سیستم", restart_engine: "ری‌استارت موتور صدا",
    reboot: "⚠️ ریبوت سرور", reboot_confirm: "سرور کاملاً ریبوت شود؟ (۱-۲ دقیقه قطعی)",
    rebooting: "در حال ریبوت... حدود ۲ دقیقه صبر کنید.",
    pass_title: "تغییر رمز عبور پنل", cur_pass: "رمز فعلی", new_pass: "رمز جدید (حداقل ۶ کاراکتر)",
    done: "انجام شد ✓", applying: "در حال اعمال...", err_server: "خطا در ارتباط با سرور",
    svc_status: "وضعیت سرویس‌ها", diag: "🔍 عیب‌یابی موتور صدا", shuffle: "پخش درهم", donate_title: "حمایت مالی (Donate)", donate_ph: "آدرس کیف پول (مثلاً TRX/BTC/ETH)", copied: "کپی شد ✓", src_spotify: "🎧 Spotify", azan_title: "اذان خودکار", azan_on: "فعال باشد", fajr: "اذان صبح", dhuhr: "اذان ظهر", maghrib: "اذان مغرب", azan_file: "فایل اذان (از فایل‌های زنگ)", today_times: "اوقات امروز", azan_missing: "کتابخانه اذان نصب نیست — آپدیت v4 را اجرا کنید", src_sched_title: "برنامه خودکار منبع", search_radio: "جستجوی ایستگاه (دیتابیس جهانی)", search_ph: "نام ایستگاه... مثلاً jazz یا BBC", add: "افزودن", page_history: "آخرین پیج‌ها", no_pages: "هنوز پیجی ثبت نشده.", seconds: "ثانیه", caller: "داخلی", t_am: "قبل‌ازظهر (AM)", t_pm: "بعدازظهر (PM)", country: "کشور", city: "شهر", custom_coords: "مختصات دستی", sip_port: "پورت SIP (پیش‌فرض 5060)", backup: "⬇️ دانلود بکاپ تنظیمات", duck_title: "میزان صدای موزیک هنگام پیج (%)", duck_hint: "0 = قطع کامل موزیک هنگام پیج", test_sent: "صدای تست به آمپلی‌فایر فرستاده شد — اگر نشنیدید دستگاه دیگری انتخاب کنید.",
  },
  en: {
    _dir: "ltr", _name: "English",
    app: "Jarchi 📣", nav_dashboard: "Dashboard", nav_music: "Music", nav_radio: "Radio",
    nav_schedule: "Bells", nav_settings: "Settings", logout: "Logout",
    login: "Login", login_sub: "Sign in to access the playback dashboard.",
    username: "Username", password: "Password",
    now_playing: "Now Playing", nothing: "Nothing is playing", live: "LIVE",
    radio_playing: "Playing radio", unknown_artist: "Unknown artist",
    select_source: "Select Source", src_radio: "📻 Radio", src_playlist: "🎵 Playlist", src_off: "⏹ Off",
    volume: "Volume", engine_ok: "Audio engine: connected ✓",
    engine_down: "⚠️ Audio engine unreachable — restart it from Settings > System",
    tracks_list: "Tracks", stations_list: "Radio Stations",
    add_music: "Add Music", upload: "Upload", delete: "Delete", confirm_del: "Delete this item?",
    add_station: "Add Station", st_name: "Station name", st_url: "Stream URL (https://...)",
    check: "Check link", edit: "Edit", save: "Save", cancel: "Cancel", play: "Play",
    on_air_badge: "ON AIR", checking: "Checking...",
    stream_ok: "Stream is healthy ✓", stream_fail: "Stream has a problem ✗",
    hls_warn: "This is an HLS link and may not play; a direct mp3/aac link is better.",
    quality: "Quality", empty_list: "List is empty.",
    sch_title: "Bell Schedule", bells_files: "Bell Files", upload_bell: "Upload bell file",
    sch_name: "Name (e.g. Lunch bell)", sch_time: "Time", sch_days: "Days",
    sch_bell: "Bell file", add_schedule: "Add Schedule", enabled: "Enabled", disabled: "Disabled",
    test: "Test", days: ["Su","Mo","Tu","We","Th","Fr","Sa"],
    sip_title: "Telephony (SIP) Settings", sip_mode: "Connection mode",
    mode_a: "A — Register to existing PBX (recommended)", mode_b: "B — Standalone (phones register to this server)",
    pbx_host: "PBX address (IP)", extension: "Paging extension number", sip_pass: "SIP password",
    keep_empty: "Leave empty to keep unchanged", pass_set: "(set ✓)", pass_unset: "(not set yet!)",
    max_page: "Max page duration (seconds)", apply_sip: "Save & apply to Asterisk",
    check_reg: "Check registration status", audio_title: "Audio Output (Sound Card)",
    audio_dev: "Device connected to amplifier", save_restart: "Save & restart engine",
    test_sound: "🔊 Test sound", refresh_dev: "🔄 Refresh list",
    tz_title: "Timezone", system_title: "System", restart_engine: "Restart audio engine",
    reboot: "⚠️ Reboot server", reboot_confirm: "Fully reboot the server? (1-2 min downtime)",
    rebooting: "Rebooting... wait about 2 minutes.",
    pass_title: "Change Panel Password", cur_pass: "Current password", new_pass: "New password (min 6 chars)",
    done: "Done ✓", applying: "Applying...", err_server: "Server communication error",
    svc_status: "Service status", diag: "🔍 Engine diagnostics", shuffle: "Shuffle", donate_title: "Donate", donate_ph: "Wallet address (e.g. TRX/BTC/ETH)", copied: "Copied ✓", src_spotify: "🎧 Spotify", azan_title: "Automatic Azan", azan_on: "Enabled", fajr: "Fajr", dhuhr: "Dhuhr", maghrib: "Maghrib", azan_file: "Azan file (from bell files)", today_times: "Today's times", azan_missing: "Adhan library missing — run v4 update", src_sched_title: "Automatic Source Schedule", search_radio: "Station search (global database)", search_ph: "Station name... e.g. jazz or BBC", add: "Add", page_history: "Recent Pages", no_pages: "No pages logged yet.", seconds: "sec", caller: "Ext", t_am: "AM", t_pm: "PM", country: "Country", city: "City", custom_coords: "Custom coordinates", sip_port: "SIP port (default 5060)", backup: "⬇️ Download settings backup", duck_title: "Music volume during a page (%)", duck_hint: "0 = fully mute music during pages", test_sent: "Test sound sent to amplifier — if you hear nothing, pick another device.",
  },
  ru: {
    _dir: "ltr", _name: "Русский",
    app: "Jarchi 📣", nav_dashboard: "Панель", nav_music: "Музыка", nav_radio: "Радио",
    nav_schedule: "Звонки", nav_settings: "Настройки", logout: "Выход",
    login: "Вход", login_sub: "Войдите для доступа к панели воспроизведения.",
    username: "Имя пользователя", password: "Пароль",
    now_playing: "Сейчас играет", nothing: "Ничего не воспроизводится", live: "ЭФИР",
    radio_playing: "Играет радио", unknown_artist: "Неизвестный исполнитель",
    select_source: "Выбор источника", src_radio: "📻 Радио", src_playlist: "🎵 Плейлист", src_off: "⏹ Выкл",
    volume: "Громкость", engine_ok: "Аудиодвижок: подключен ✓",
    engine_down: "⚠️ Аудиодвижок недоступен — перезапустите его в Настройки > Система",
    tracks_list: "Треки", stations_list: "Радиостанции",
    add_music: "Добавить музыку", upload: "Загрузить", delete: "Удалить", confirm_del: "Удалить?",
    add_station: "Добавить станцию", st_name: "Название станции", st_url: "URL потока (https://...)",
    check: "Проверить", edit: "Изменить", save: "Сохранить", cancel: "Отмена", play: "Играть",
    on_air_badge: "В ЭФИРЕ", checking: "Проверка...",
    stream_ok: "Поток исправен ✓", stream_fail: "Проблема с потоком ✗",
    hls_warn: "Это HLS-ссылка, может не воспроизводиться; лучше прямая mp3/aac ссылка.",
    quality: "Качество", empty_list: "Список пуст.",
    sch_title: "Расписание звонков", bells_files: "Файлы звонков", upload_bell: "Загрузить файл звонка",
    sch_name: "Название (напр. Обед)", sch_time: "Время", sch_days: "Дни",
    sch_bell: "Файл звонка", add_schedule: "Добавить расписание", enabled: "Вкл", disabled: "Выкл",
    test: "Тест", days: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"],
    sip_title: "Настройки телефонии (SIP)", sip_mode: "Режим подключения",
    mode_a: "A — Регистрация на существующей АТС (рекомендуется)", mode_b: "B — Автономный (телефоны регистрируются на этом сервере)",
    pbx_host: "Адрес АТС (IP)", extension: "Номер пейджингового добавочного", sip_pass: "Пароль SIP",
    keep_empty: "Оставьте пустым, чтобы не менять", pass_set: "(установлен ✓)", pass_unset: "(ещё не установлен!)",
    max_page: "Макс. длительность пейджа (сек)", apply_sip: "Сохранить и применить",
    check_reg: "Проверить регистрацию", audio_title: "Аудиовыход (звуковая карта)",
    audio_dev: "Устройство к усилителю", save_restart: "Сохранить и перезапустить",
    test_sound: "🔊 Тест звука", refresh_dev: "🔄 Обновить список",
    tz_title: "Часовой пояс", system_title: "Система", restart_engine: "Перезапуск аудиодвижка",
    reboot: "⚠️ Перезагрузка сервера", reboot_confirm: "Полностью перезагрузить сервер? (1-2 мин простоя)",
    rebooting: "Перезагрузка... подождите ~2 минуты.",
    pass_title: "Смена пароля панели", cur_pass: "Текущий пароль", new_pass: "Новый пароль (мин. 6 символов)",
    done: "Готово ✓", applying: "Применение...", err_server: "Ошибка связи с сервером",
    svc_status: "Статус служб", diag: "🔍 Диагностика движка", shuffle: "Перемешать", donate_title: "Поддержать", donate_ph: "Адрес кошелька (TRX/BTC/ETH)", copied: "Скопировано ✓", src_spotify: "🎧 Spotify", azan_title: "Автоматический азан", azan_on: "Включено", fajr: "Фаджр", dhuhr: "Зухр", maghrib: "Магриб", azan_file: "Файл азана (из файлов звонков)", today_times: "Время на сегодня", azan_missing: "Библиотека adhan не установлена — запустите обновление v4", src_sched_title: "Автопереключение источника", search_radio: "Поиск станций (мировая база)", search_ph: "Название станции... напр. jazz", add: "Добавить", page_history: "Последние объявления", no_pages: "Записей пока нет.", seconds: "сек", caller: "Доб.", t_am: "AM (до полудня)", t_pm: "PM (после полудня)", country: "Страна", city: "Город", custom_coords: "Свои координаты", sip_port: "SIP-порт (по умолч. 5060)", backup: "⬇️ Скачать резервную копию", duck_title: "Громкость музыки во время объявления (%)", duck_hint: "0 = полностью глушить музыку", test_sent: "Тестовый звук отправлен на усилитель — если не слышно, выберите другое устройство.",
  },
  ar: {
    _dir: "rtl", _name: "العربية",
    app: "Jarchi 📣", nav_dashboard: "الرئيسية", nav_music: "الموسيقى", nav_radio: "الراديو",
    nav_schedule: "الأجراس", nav_settings: "الإعدادات", logout: "خروج",
    login: "تسجيل الدخول", login_sub: "سجّل الدخول للوصول إلى لوحة التشغيل.",
    username: "اسم المستخدم", password: "كلمة المرور",
    now_playing: "قيد التشغيل", nothing: "لا يوجد شيء قيد التشغيل", live: "بث مباشر",
    radio_playing: "الراديو قيد التشغيل", unknown_artist: "فنان غير معروف",
    select_source: "اختيار المصدر", src_radio: "📻 راديو", src_playlist: "🎵 قائمة تشغيل", src_off: "⏹ إيقاف",
    volume: "مستوى الصوت", engine_ok: "محرك الصوت: متصل ✓",
    engine_down: "⚠️ محرك الصوت غير متاح — أعد تشغيله من الإعدادات > النظام",
    tracks_list: "المقاطع", stations_list: "محطات الراديو",
    add_music: "إضافة موسيقى", upload: "رفع", delete: "حذف", confirm_del: "هل تريد الحذف؟",
    add_station: "إضافة محطة", st_name: "اسم المحطة", st_url: "رابط البث (https://...)",
    check: "فحص الرابط", edit: "تعديل", save: "حفظ", cancel: "إلغاء", play: "تشغيل",
    on_air_badge: "على الهواء", checking: "جارٍ الفحص...",
    stream_ok: "الرابط سليم ✓", stream_fail: "الرابط به مشكلة ✗",
    hls_warn: "هذا رابط HLS وقد لا يعمل؛ الأفضل رابط mp3/aac مباشر.",
    quality: "الجودة", empty_list: "القائمة فارغة.",
    sch_title: "جدولة الأجراس", bells_files: "ملفات الأجراس", upload_bell: "رفع ملف جرس",
    sch_name: "الاسم (مثل جرس الغداء)", sch_time: "الوقت", sch_days: "الأيام",
    sch_bell: "ملف الجرس", add_schedule: "إضافة جدولة", enabled: "مفعّل", disabled: "معطّل",
    test: "اختبار", days: ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"],
    sip_title: "إعدادات الهاتف (SIP)", sip_mode: "وضع الاتصال",
    mode_a: "A — التسجيل على المقسم الحالي (موصى به)", mode_b: "B — مستقل (الهواتف تسجل على هذا الخادم)",
    pbx_host: "عنوان المقسم (IP)", extension: "رقم تحويلة النداء", sip_pass: "كلمة مرور SIP",
    keep_empty: "اتركه فارغاً لعدم التغيير", pass_set: "(معيّن ✓)", pass_unset: "(غير معيّن بعد!)",
    max_page: "أقصى مدة للنداء (ثانية)", apply_sip: "حفظ وتطبيق على Asterisk",
    check_reg: "فحص حالة التسجيل", audio_title: "مخرج الصوت (بطاقة الصوت)",
    audio_dev: "الجهاز الموصول بالمضخم", save_restart: "حفظ وإعادة تشغيل المحرك",
    test_sound: "🔊 اختبار الصوت", refresh_dev: "🔄 تحديث القائمة",
    tz_title: "المنطقة الزمنية", system_title: "النظام", restart_engine: "إعادة تشغيل محرك الصوت",
    reboot: "⚠️ إعادة تشغيل الخادم", reboot_confirm: "إعادة تشغيل الخادم بالكامل؟ (توقف ١-٢ دقيقة)",
    rebooting: "جارٍ إعادة التشغيل... انتظر دقيقتين تقريباً.",
    pass_title: "تغيير كلمة مرور اللوحة", cur_pass: "كلمة المرور الحالية", new_pass: "كلمة مرور جديدة (٦ أحرف على الأقل)",
    done: "تم ✓", applying: "جارٍ التطبيق...", err_server: "خطأ في الاتصال بالخادم",
    svc_status: "حالة الخدمات", diag: "🔍 تشخيص محرك الصوت", shuffle: "تشغيل عشوائي", donate_title: "تبرع", donate_ph: "عنوان المحفظة (TRX/BTC/ETH)", copied: "تم النسخ ✓", src_spotify: "🎧 Spotify", azan_title: "الأذان التلقائي", azan_on: "مفعّل", fajr: "الفجر", dhuhr: "الظهر", maghrib: "المغرب", azan_file: "ملف الأذان (من ملفات الأجراس)", today_times: "أوقات اليوم", azan_missing: "مكتبة الأذان غير مثبتة — شغّل تحديث v4", src_sched_title: "جدولة المصدر التلقائية", search_radio: "بحث المحطات (قاعدة عالمية)", search_ph: "اسم المحطة... مثل jazz", add: "إضافة", page_history: "آخر النداءات", no_pages: "لا نداءات مسجلة بعد.", seconds: "ثانية", caller: "تحويلة", t_am: "صباحاً (AM)", t_pm: "مساءً (PM)", country: "الدولة", city: "المدينة", custom_coords: "إحداثيات يدوية", sip_port: "منفذ SIP (افتراضي 5060)", backup: "⬇️ تنزيل نسخة احتياطية", duck_title: "مستوى الموسيقى أثناء النداء (%)", duck_hint: "0 = كتم الموسيقى تماماً", test_sent: "أُرسل صوت الاختبار إلى المضخم — إن لم تسمعه اختر جهازاً آخر.",
  },
  tr: {
    _dir: "ltr", _name: "Türkçe",
    app: "Jarchi 📣", nav_dashboard: "Panel", nav_music: "Müzik", nav_radio: "Radyo",
    nav_schedule: "Ziller", nav_settings: "Ayarlar", logout: "Çıkış",
    login: "Giriş", login_sub: "Oynatma paneline erişmek için giriş yapın.",
    username: "Kullanıcı adı", password: "Şifre",
    now_playing: "Şimdi Çalıyor", nothing: "Hiçbir şey çalmıyor", live: "CANLI",
    radio_playing: "Radyo çalıyor", unknown_artist: "Bilinmeyen sanatçı",
    select_source: "Kaynak Seç", src_radio: "📻 Radyo", src_playlist: "🎵 Çalma listesi", src_off: "⏹ Kapalı",
    volume: "Ses seviyesi", engine_ok: "Ses motoru: bağlı ✓",
    engine_down: "⚠️ Ses motoruna ulaşılamıyor — Ayarlar > Sistem'den yeniden başlatın",
    tracks_list: "Parçalar", stations_list: "Radyo İstasyonları",
    add_music: "Müzik Ekle", upload: "Yükle", delete: "Sil", confirm_del: "Silinsin mi?",
    add_station: "İstasyon Ekle", st_name: "İstasyon adı", st_url: "Yayın URL'si (https://...)",
    check: "Bağlantıyı test et", edit: "Düzenle", save: "Kaydet", cancel: "İptal", play: "Çal",
    on_air_badge: "YAYINDA", checking: "Kontrol ediliyor...",
    stream_ok: "Yayın sağlıklı ✓", stream_fail: "Yayında sorun var ✗",
    hls_warn: "Bu bir HLS bağlantısı, çalmayabilir; doğrudan mp3/aac bağlantısı daha iyidir.",
    quality: "Kalite", empty_list: "Liste boş.",
    sch_title: "Zil Programı", bells_files: "Zil Dosyaları", upload_bell: "Zil dosyası yükle",
    sch_name: "Ad (örn. Öğle zili)", sch_time: "Saat", sch_days: "Günler",
    sch_bell: "Zil dosyası", add_schedule: "Program Ekle", enabled: "Açık", disabled: "Kapalı",
    test: "Test", days: ["Pa","Pt","Sa","Ça","Pe","Cu","Ct"],
    sip_title: "Telefon (SIP) Ayarları", sip_mode: "Bağlantı modu",
    mode_a: "A — Mevcut santrale kayıt (önerilen)", mode_b: "B — Bağımsız (telefonlar bu sunucuya kaydolur)",
    pbx_host: "Santral adresi (IP)", extension: "Anons dahili numarası", sip_pass: "SIP şifresi",
    keep_empty: "Değiştirmemek için boş bırakın", pass_set: "(ayarlı ✓)", pass_unset: "(henüz ayarlı değil!)",
    max_page: "Maks. anons süresi (saniye)", apply_sip: "Kaydet ve Asterisk'e uygula",
    check_reg: "Kayıt durumunu kontrol et", audio_title: "Ses Çıkışı (Ses Kartı)",
    audio_dev: "Amfiye bağlı cihaz", save_restart: "Kaydet ve motoru yeniden başlat",
    test_sound: "🔊 Ses testi", refresh_dev: "🔄 Listeyi yenile",
    tz_title: "Saat dilimi", system_title: "Sistem", restart_engine: "Ses motorunu yeniden başlat",
    reboot: "⚠️ Sunucuyu yeniden başlat", reboot_confirm: "Sunucu tamamen yeniden başlatılsın mı? (1-2 dk kesinti)",
    rebooting: "Yeniden başlatılıyor... ~2 dakika bekleyin.",
    pass_title: "Panel Şifresini Değiştir", cur_pass: "Mevcut şifre", new_pass: "Yeni şifre (en az 6 karakter)",
    done: "Tamamlandı ✓", applying: "Uygulanıyor...", err_server: "Sunucu iletişim hatası",
    svc_status: "Servis durumu", diag: "🔍 Motor tanılama", shuffle: "Karışık çal", donate_title: "Bağış", donate_ph: "Cüzdan adresi (TRX/BTC/ETH)", copied: "Kopyalandı ✓", src_spotify: "🎧 Spotify", azan_title: "Otomatik Ezan", azan_on: "Etkin", fajr: "Sabah", dhuhr: "Öğle", maghrib: "Akşam", azan_file: "Ezan dosyası (zil dosyalarından)", today_times: "Bugünkü vakitler", azan_missing: "Adhan kütüphanesi yok — v4 güncellemesini çalıştırın", src_sched_title: "Otomatik Kaynak Programı", search_radio: "İstasyon ara (küresel veritabanı)", search_ph: "İstasyon adı... örn. jazz", add: "Ekle", page_history: "Son Anonslar", no_pages: "Henüz anons kaydı yok.", seconds: "sn", caller: "Dahili", t_am: "Öğleden önce (AM)", t_pm: "Öğleden sonra (PM)", country: "Ülke", city: "Şehir", custom_coords: "Özel koordinatlar", sip_port: "SIP portu (varsayılan 5060)", backup: "⬇️ Ayar yedeğini indir", duck_title: "Anons sırasında müzik seviyesi (%)", duck_hint: "0 = anonsta müziği tamamen kıs", test_sent: "Test sesi amfiye gönderildi — duymadıysanız başka cihaz seçin.",
  },
};

let LANG = localStorage.getItem("lang") || "fa";
if (!I18N[LANG]) LANG = "fa";

function t(key) {
  return I18N[LANG][key] ?? I18N.fa[key] ?? key;
}

function applyI18n() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = I18N[LANG]._dir;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

function initLangSelect() {
  const sel = $("langSelect");
  if (!sel) return;
  sel.innerHTML = Object.entries(I18N)
    .map(([code, d]) => `<option value="${code}">${d._name}</option>`).join("");
  sel.value = LANG;
  sel.addEventListener("change", () => {
    localStorage.setItem("lang", sel.value);
    location.reload();
  });
}

// ================= تم روز/شب =================
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = $("themeToggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
  localStorage.setItem("theme", theme);
}
function initTheme() {
  applyTheme(localStorage.getItem("theme") || "dark");
  $("themeToggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  });
}

// ================= ناوبری =================
function renderNav(current) {
  const pages = [
    ["dashboard", "nav_dashboard", "/dashboard.html"],
    ["music", "nav_music", "/music.html"],
    ["radio", "nav_radio", "/radio.html"],
    ["schedule", "nav_schedule", "/schedule.html"],
    ["settings", "nav_settings", "/settings.html"],
  ];
  const nav = document.querySelector("nav.mainnav");
  if (!nav) return;
  nav.innerHTML = pages
    .map(([key, i18nKey, href]) =>
      `<a href="${href}" class="${key === current ? "current" : ""}">${t(i18nKey)}</a>`)
    .join("");
}

// ================= ساعت =================
let panelTimezone = "Asia/Tehran";
function startClock() {
  const el = $("clock");
  if (!el) return;
  const locale = LANG === "fa" ? "fa-IR" : LANG === "ar" ? "ar" : LANG === "ru" ? "ru" : LANG === "tr" ? "tr" : "en-GB";
  const tick = () => {
    try {
      el.textContent = new Intl.DateTimeFormat(locale, {
        timeZone: panelTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
      }).format(new Date());
    } catch (_) { el.textContent = new Date().toLocaleTimeString(); }
  };
  tick();
  setInterval(tick, 1000);
}
async function loadTimezone() {
  try {
    const s = await api("/api/status");
    if (s?.timezone) panelTimezone = s.timezone;
  } catch (_) {}
}

function initLogout() {
  $("logoutBtn")?.addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    window.location.href = "/login.html";
  });
}

async function renderFooter() {
  let meta = { app: "Jarchi", author: "Ehsan Abdoli", donate_wallet: "" };
  try { meta = await (await fetch("/meta")).json(); } catch (_) {}
  const el = document.createElement("div");
  el.className = "footer";
  const wallets = Object.entries(meta.wallets || {}).filter(([, v]) => v);
  el.innerHTML =
    `Jarchi 📣 v${meta.version || ""} · Designed &amp; Developed by <b>${meta.author}</b> · © 2026 · MIT License` +
    (wallets.length
      ? `<br><span style="opacity:.8;">☕ ${t("donate_title")}:</span><br>` +
        wallets.map(([coin, addr]) =>
          `<span class="wallet" data-addr="${addr}"><b>${coin}</b> ${addr}</span>`
        ).join("<br>")
      : "");
  document.body.appendChild(el);
  el.querySelectorAll(".wallet").forEach((w) =>
    w.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(w.dataset.addr);
        const orig = w.innerHTML;
        w.textContent = t("copied");
        setTimeout(() => (w.innerHTML = orig), 1200);
      } catch (_) {}
    })
  );
}

async function initCommon(currentPage) {
  initTheme();
  initLangSelect();
  applyI18n();
  renderNav(currentPage);
  initLogout();
  await loadTimezone();
  startClock();
  renderFooter();
}
