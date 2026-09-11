"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AdminDil = "tr" | "ar";

/** Secim localStorage'da tutulur; panel tek kullanicilik, cerez gerekmiyor. */
const ANAHTAR = "royal_admin_dil";

/**
 * Admin panel metinleri.
 *
 * Musteriye acik sayfalar next-intl kullaniyor; panel [locale] agacinin
 * disinda oldugu icin burada kucuk ve bagimsiz bir sozluk var. Metin
 * eklerken iki dile de yazilmali — eksik anahtar Turkcesine duser.
 */
const SOZLUK = {
  // --- genel ---
  kaydet: ["Kaydet", "حفظ"],
  kaydediliyor: ["Kaydediliyor…", "جارٍ الحفظ…"],
  kaydedilmemisUyari: [
    "Kaydedilmemiş değişiklikleriniz var. Bu sayfadan ayrılmak istiyor musunuz?",
    "لديك تغييرات غير محفوظة. هل تريد مغادرة هذه الصفحة؟",
  ],
  vazgec: ["Vazgeç", "إلغاء"],
  sil: ["Sil", "حذف"],
  geri: ["Geri", "رجوع"],
  cikisYap: ["Çıkış yap", "تسجيل الخروج"],
  yukleniyor: ["Yükleniyor…", "جارٍ التحميل…"],
  icerigeAtla: ["Ana içeriğe geç", "انتقل إلى المحتوى الرئيسي"],
  beklenmeyenHata: [
    "Sayfa yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.",
    "تعذّر تحميل الصفحة. تحقق من اتصالك وحاول مرة أخرى.",
  ],
  tekrarDene: ["Tekrar dene", "حاول مرة أخرى"],
  sayfaBulunamadi: ["Sayfa bulunamadı.", "الصفحة غير موجودة."],
  anaSayfayaDon: ["Admin ana sayfasına dön", "العودة إلى الصفحة الرئيسية للإدارة"],
  veriYuklenemedi: [
    "Bilgiler yüklenemedi. Sayfayı yenileyip tekrar deneyin.",
    "تعذّر تحميل البيانات. حدّث الصفحة وحاول مرة أخرى.",
  ],
  islemBasarisiz: [
    "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
    "تعذّر إكمال العملية. يرجى المحاولة مرة أخرى.",
  ],
  gorselTurGecersiz: [
    "Yalnızca JPG, PNG veya WebP görsel yükleyebilirsiniz.",
    "يمكنك رفع صور JPG أو PNG أو WebP فقط.",
  ],
  gorselBoyutGecersiz: [
    "Görsel en fazla 8 MB olabilir.",
    "يجب ألا يتجاوز حجم الصورة 8 ميغابايت.",
  ],
  gorselIcerikUyusmuyor: [
    "Görselin dosya türü ile içeriği uyuşmuyor.",
    "نوع ملف الصورة لا يطابق محتواه.",
  ],
  gorselYuklemeHatasi: [
    "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.",
    "تعذّر رفع الصورة. يرجى المحاولة مرة أخرى.",
  ],
  gorselIslemHatasi: [
    "Fotoğraf işlenemedi. Lütfen başka bir görsel deneyin.",
    "تعذّرت معالجة الصورة. جرّب صورة أخرى.",
  ],
  ara: ["Ara", "بحث"],
  turkce: ["Türkçe", "التركية"],
  arapca: ["العربية", "العربية"],
  dil: ["Dil", "اللغة"],
  evet: ["Evet", "نعم"],

  // --- giris ---
  girisBaslik: ["Yönetim paneline giriş", "الدخول إلى لوحة التحكم"],
  eposta: ["E-posta", "البريد الإلكتروني"],
  sifre: ["Şifre", "كلمة المرور"],
  girisYap: ["Giriş yap", "تسجيل الدخول"],
  girisYapiliyor: ["Giriş yapılıyor…", "جارٍ الدخول…"],
  adminYetkisiYok: [
    "Bu hesabın admin paneline erişim yetkisi yok.",
    "هذا الحساب غير مخوّل للوصول إلى لوحة الإدارة.",
  ],
  girisHatali: ["E-posta veya şifre hatalı.", "البريد أو كلمة المرور خاطئة."],
  girisHatasi: [
    "Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
    "تعذّر تسجيل الدخول. تحقق من اتصالك وحاول مرة أخرى.",
  ],

  // --- gezinme ---
  navUrunler: ["Ürünler", "المنتجات"],
  navKategori: ["Kategori", "الأقسام"],
  navSiparis: ["Sipariş", "الطلبات"],
  navAyarlar: ["Ayarlar", "الإعدادات"],
  navQr: ["QR", "QR"],

  // --- urunler ---
  urunAra: ["Ürün ara", "ابحث عن منتج"],
  yeniUrun: ["Yeni ürün ekle", "إضافة منتج"],
  urunSayisi: ["ürün", "منتج"],
  tukendi: ["tükendi", "نفذ"],
  topluFiyat: ["Birden fazla ürünün fiyatını güncelle", "تحديث أسعار عدة منتجات"],
  yayindaDegil: ["yayında değil", "غير منشور"],
  masa: ["Masa", "الطاولة"],
  paket: ["Paket", "التوصيل"],
  stokDurumu: ["stok durumu", "حالة المخزون"],
  urunBulunamadi: ["Ürün bulunamadı.", "لم يتم العثور على منتج."],

  // --- urun formu ---
  yeniUrunBaslik: ["Yeni ürün", "منتج جديد"],
  fotografYok: ["Fotoğraf yok", "لا توجد صورة"],
  fotografSec: ["Fotoğraf seç", "اختر صورة"],
  fotografDegistir: ["Fotoğrafı değiştir", "تغيير الصورة"],
  kaldir: ["Kaldır", "إزالة"],
  urunAdi: ["Ürün adı", "اسم المنتج"],
  kisaAciklama: ["Kısa açıklama", "وصف قصير"],
  fiyatlar: ["Fiyatlar", "الأسعار"],
  masaFiyati: ["Masa fiyatı", "سعر الطاولة"],
  paketFiyati: ["Paket fiyatı", "سعر التوصيل"],
  detaylar: ["Detaylar", "التفاصيل"],
  gramajTr: ["Porsiyon / miktar (TR)", "الحصة / الكمية (تركي)"],
  gramajAr: ["Porsiyon / miktar (AR)", "الحصة / الكمية (عربي)"],
  gramajArIpucu: [
    "Boş bırakılırsa Türkçesi kullanılır",
    "إذا تُرك فارغاً يُستخدم النص التركي",
  ],
  kalori: ["Kalori", "السعرات"],
  kategori: ["Kategori", "القسم"],
  sec: ["Seç…", "اختر…"],
  rozet: ["Ürün etiketi", "وسم المنتج"],
  alerjenler: ["Alerjenler", "مسببات الحساسية"],
  sira: ["Menüdeki sıra", "الترتيب في القائمة"],
  slug: ["Bağlantı adı", "اسم الرابط"],
  stokta: ["Stokta", "متوفر"],
  menudeYayinda: ["Menüde yayında", "منشور في القائمة"],
  cikarilabilirler: ["İçinden çıkar / olmasın", "أزل من المكونات"],
  ekstralar: ["Ekstralar", "الإضافات"],
  ucretsiz: ["ücretsiz", "مجاناً"],
  ucretli: ["ücretli", "مدفوع"],
  satirEkle: ["+ Satır ekle", "+ إضافة سطر"],
  yukariTasi: ["Yukarı taşı", "تحريك لأعلى"],
  asagiTasi: ["Aşağı taşı", "تحريك لأسفل"],
  satiriSil: ["Satırı sil", "حذف السطر"],
  urunuSil: ["Ürünü sil", "حذف المنتج"],
  fiyat: ["Fiyat", "السعر"],

  // --- kategori ---
  kategoriler: ["Kategoriler", "الأقسام"],
  yeniKategori: ["+ Yeni kategori", "+ قسم جديد"],
  yeniKategoriBaslik: ["Yeni kategori", "قسم جديد"],
  kategoriAdi: ["Kategori adı", "اسم القسم"],
  kapakYok: ["Kapak fotoğrafı yok", "لا توجد صورة غلاف"],
  kapakSec: ["Kapak seç", "اختر غلافاً"],
  kapakDegistir: ["Kapağı değiştir", "تغيير الغلاف"],
  kategoriYok: [
    "Henüz kategori yok. Yukarıdan ekleyebilirsin.",
    "لا توجد أقسام بعد. يمكنك الإضافة من الأعلى.",
  ],
  kategoriyiSil: ["Kategoriyi sil", "حذف القسم"],
  kategoriKapatUyari: [
    "Kapatınca kategori ve ürünleri menüde görünmez",
    "عند الإغلاق لن يظهر القسم ومنتجاته في القائمة",
  ],

  // --- siparisler ---
  siparisler: ["Siparişler", "الطلبات"],
  siparisYok: ["Henüz sipariş yok.", "لا توجد طلبات بعد."],
  bugun: ["Bugün", "اليوم"],
  son7Gun: ["Son 7 gün", "آخر 7 أيام"],
  siparisAdet: ["sipariş", "طلب"],
  enCokSatan: ["En çok satanlar (7 gün)", "الأكثر مبيعاً (7 أيام)"],
  adet: ["adet", "قطعة"],
  araToplam: ["Ara toplam", "المجموع الفرعي"],
  servis: ["Teslimat", "التوصيل"],
  toplam: ["Toplam", "الإجمالي"],
  durum: ["Durum", "الحالة"],
  durumYeni: ["Yeni", "جديد"],
  durumOnaylandi: ["Onaylandı", "مؤكد"],
  durumHazirlaniyor: ["Hazırlanıyor", "قيد التحضير"],
  durumYolda: ["Yolda", "في الطريق"],
  durumTeslim: ["Teslim", "تم التسليم"],
  durumIptal: ["İptal", "ملغى"],

  // --- ayarlar ---
  ayarlar: ["Ayarlar", "الإعدادات"],
  ayarlarKaydedildi: ["Ayarlar kaydedildi.", "تم حفظ الإعدادات."],
  sosyalUrlGecersiz: [
    "Sosyal medya bağlantısı https:// ile başlamalı ve ilgili platforma ait olmalı.",
    "يجب أن يبدأ رابط التواصل بـ https:// وأن ينتمي إلى المنصة الصحيحة.",
  ],
  kategoriUrunleri: ["Bu kategorideki ürünler", "منتجات هذا القسم"],
  kategoriUrunleriIpucu: [
    "Kutuyu işaretleyerek ürünü bu kategoriye taşıyabilirsin.",
    "حدّد المنتج لنقله إلى هذا القسم.",
  ],
  urunSecimiAra: ["Ürünlerde ara…", "ابحث في المنتجات…"],
  buKategori: ["Bu kategori", "هذا القسم"],
  bilinmeyenKategori: ["Kategori bulunamadı", "قسم غير معروف"],
  cikarilanUrunleriTasi: [
    "çıkarılan ürün için hedef kategori",
    "اختر قسماً لنقل المنتجات المُزالة",
  ],
  cikarilanUrunleriTasiIpucu: [
    "Ürünler kategorisiz kalmasın diye çıkarılanların taşınacağı yeri seç.",
    "اختر وجهة حتى لا تبقى المنتجات بلا قسم.",
  ],
  kategoriSec: ["Hedef kategori seç…", "اختر القسم الهدف…"],
  cikarilanUrunHedefiZorunlu: [
    "Çıkardığın ürünlerin taşınacağı kategoriyi seç.",
    "اختر القسم الذي ستُنقل إليه المنتجات المُزالة.",
  ],
  urunListesiDegisti: [
    "Ürün listesi başka bir yerde değişti. Sayfayı yenileyip tekrar dene.",
    "تغيّرت قائمة المنتجات في مكان آخر. حدّث الصفحة وحاول مجدداً.",
  ],
  kategoriKaydiDegisti: [
    "Kategori başka bir yerde güncellendi. Sayfayı yenileyip tekrar dene.",
    "تم تحديث القسم في مكان آخر. حدّث الصفحة وحاول مجدداً.",
  ],
  kategoriAdiCokUzun: [
    "Kategori adı en fazla 200 karakter olabilir.",
    "يمكن أن يتكون اسم القسم من 200 حرف كحد أقصى.",
  ],
  kategoriAciklamaCokUzun: [
    "Kategori açıklaması en fazla 2000 karakter olabilir.",
    "يمكن أن يتكون وصف القسم من 2000 حرف كحد أقصى.",
  ],
  urunListesiSiniraUlasti: [
    "Ürün listesi 2000 ürün sınırını aşıyor. Bu kategori düzenlemesi için önce ürün sayısını azaltın.",
    "تتجاوز قائمة المنتجات حد 2000 منتج. خفّض عدد المنتجات أولاً لتعديل هذا القسم.",
  ],
  silmedenOnceDegisiklikleriKaydet: [
    "Kaydetmediğin değişiklikler var. Silmeden önce kaydet veya sayfayı yenile.",
    "لديك تغييرات غير محفوظة. احفظها أو حدّث الصفحة قبل الحذف.",
  ],
  kategoriSilinemiyorUrunVar: [
    "Kategoride ürün olduğu için silinemez. Önce ürünleri başka kategoriye taşı.",
    "لا يمكن حذف القسم لأنه يحتوي على منتجات. انقل المنتجات إلى قسم آخر أولاً.",
  ],
  iletisimIkonlari: ["İletişim logoları", "شعارات التواصل"],
  iletisimIkonlariIpucu: [
    "Telefon ve sosyal medya kartlarında görünecek JPG, PNG veya WebP logolarını yükleyin. Boş bırakırsanız hazır simge kullanılır.",
    "ارفع شعارات JPG أو PNG أو WebP التي ستظهر في بطاقات الهاتف والتواصل. عند تركها فارغة يُستخدم الرمز الجاهز.",
  ],
  iletisimIkonuCokUzun: [
    "Her iletişim simgesi en fazla 4 Unicode karakteri olabilir.",
    "يجب ألا يتجاوز كل رمز تواصل 4 محارف Unicode.",
  ],
  telefonIkonu: ["Telefon logosu", "شعار الهاتف"],
  whatsappIkonu: ["WhatsApp logosu", "شعار واتساب"],
  instagramIkonu: ["Instagram logosu", "شعار إنستغرام"],
  tiktokIkonu: ["TikTok logosu", "شعار تيك توك"],
  facebookIkonu: ["Facebook logosu", "شعار فيسبوك"],
  iletisimIkonlariMigrationGerekli: [
    "Diğer ayarlar kaydedildi; iletişim logolarını kaydetmek için Supabase'de 202608280001_contact_logo_urls.sql dosyasını çalıştırın.",
    "تم حفظ الإعدادات الأخرى؛ شغّل ملف 202608280001_contact_logo_urls.sql في Supabase لحفظ شعارات التواصل.",
  ],
  logo: ["Logo", "الشعار"],
  logoYukle: ["Logo yükle", "رفع الشعار"],
  restoran: ["Restoran", "المطعم"],
  adTr: ["Ad (TR)", "الاسم (تركي)"],
  adAr: ["Ad (AR)", "الاسم (عربي)"],
  whatsappNo: ["WhatsApp numarası", "رقم واتساب"],
  telefon: ["Telefon", "الهاتف"],
  adresTr: ["Adres (TR)", "العنوان (تركي)"],
  adresAr: ["Adres (AR)", "العنوان (عربي)"],
  haritaLinki: ["Harita linki", "رابط الخريطة"],
  siparisBaslik: ["Sipariş", "الطلب"],
  servisUcreti: ["Teslimat ücreti", "رسوم التوصيل"],
  minimumSiparis: ["Minimum sipariş", "الحد الأدنى للطلب"],
  siparisAlimiAcik: ["Sipariş alımı açık", "استقبال الطلبات مفعّل"],
  siparisAlimiIpucu: [
    "Kapatınca çalışma saatlerine bakılmaz",
    "عند الإغلاق لا يُنظر إلى ساعات العمل",
  ],
  kapaliMesajiTr: ["Kapalı mesajı (TR)", "رسالة الإغلاق (تركي)"],
  kapaliMesajiAr: ["Kapalı mesajı (AR)", "رسالة الإغلاق (عربي)"],
  anaSayfaMetinleri: ["Ana sayfa metinleri", "نصوص الصفحة الرئيسية"],
  anaSayfaIpucu: [
    "Boş bırakırsan hazır metin kullanılır.",
    "إذا تركته فارغاً يُستخدم النص الجاهز.",
  ],
  heroBaslikTr: ["Büyük başlık (TR)", "العنوان الرئيسي (تركي)"],
  heroBaslikAr: ["Büyük başlık (AR)", "العنوان الرئيسي (عربي)"],
  heroAltTr: ["Alt başlık (TR)", "العنوان الفرعي (تركي)"],
  heroAltAr: ["Alt başlık (AR)", "العنوان الفرعي (عربي)"],
  hakkimizdaBaslikTr: ["Hakkımızda başlığı (TR)", "عنوان من نحن (تركي)"],
  hakkimizdaBaslikAr: ["Hakkımızda başlığı (AR)", "عنوان من نحن (عربي)"],
  hakkimizdaMetinTr: ["Hakkımızda metni (TR)", "نص من نحن (تركي)"],
  hakkimizdaMetinAr: ["Hakkımızda metni (AR)", "نص من نحن (عربي)"],
  calismaSaatleri: ["Çalışma saatleri", "ساعات العمل"],
  acik: ["Açık", "مفتوح"],
  kapali: ["Kapalı", "مغلق"],
  acilis: ["açılış", "الافتتاح"],
  kapanis: ["kapanış", "الإغلاق"],
  geceMesaisiIpucu: [
    "Kapanış saati açılıştan küçükse gece yarısını aşan mesai sayılır (örn. 11:00–02:00).",
    "إذا كان وقت الإغلاق أصغر من الافتتاح يُحتسب دواماً يتجاوز منتصف الليل (مثال 11:00–02:00).",
  ],

  // --- toplu fiyat ---
  topluFiyatBaslik: ["Birden fazla ürünün fiyatını güncelle", "تحديث أسعار عدة منتجات"],
  tumUrunler: ["Tüm ürünler", "كل المنتجات"],
  hangiFiyat: ["Hangi fiyat", "أي سعر"],
  ikisi: ["İkisi", "كلاهما"],
  yontem: ["Yöntem", "الطريقة"],
  yuzde: ["Yüzde (%)", "نسبة (%)"],
  sabitTutar: ["Sabit tutar (₺)", "مبلغ ثابت (₺)"],
  zamOrani: [
    "Zam oranı (indirim için eksi yaz)",
    "نسبة الزيادة (اكتب سالباً للتخفيض)",
  ],
  eklenecekTutar: [
    "Eklenecek tutar (indirim için eksi yaz)",
    "المبلغ المضاف (اكتب سالباً للتخفيض)",
  ],
  onizleme: ["Önizleme", "معاينة"],
  degisecekYok: ["Değişecek ürün yok.", "لا توجد منتجات ستتغير."],
  uygula: ["Uygula", "تطبيق"],
  uygulaniyor: ["Uygulanıyor…", "جارٍ التطبيق…"],

  // --- qr ---
  qrBaslik: ["QR kodu", "رمز QR"],
  qrAdres: ["QR'ın açacağı adres", "الرابط الذي يفتحه رمز QR"],
  qrAdresIpucu: [
    "Yayına aldıktan sonra burayı gerçek alan adıyla değiştir ve QR'ı yeniden indir.",
    "بعد النشر غيّر هذا إلى اسم النطاق الحقيقي وأعد تنزيل الرمز.",
  ],
  pngIndir: ["PNG indir", "تنزيل PNG"],
  a5Baski: ["A5 baskı sayfası aç", "فتح صفحة طباعة A5"],
  qrOlusturmaHatasi: [
    "QR kodu oluşturulamadı. Adresi kontrol edip tekrar deneyin.",
    "تعذّر إنشاء رمز QR. تحقق من الرابط وحاول مرة أخرى.",
  ],
  qrBaskiBaslik: ["Royal Restaurant — Menü QR", "Royal Restaurant — رمز القائمة"],
  qrMenuEtiketi: ["Menü", "القائمة"],

  // --- fotograf kirpma ---
  yakinlastir: ["Yakınlaştır", "تكبير"],
  fotografKirpmaBaslik: ["Fotoğrafı kırp", "قص الصورة"],
  kirpKullan: ["Kırp ve kullan", "قص واستخدم"],
  haziriliyor: ["Hazırlanıyor…", "جارٍ التحضير…"],

  // --- alerjenler ---
  alerjenGluten: ["Gluten", "غلوتين"],
  alerjenSut: ["Süt", "حليب"],
  alerjenYumurta: ["Yumurta", "بيض"],
  alerjenSusam: ["Susam", "سمسم"],
  alerjenFindik: ["Fındık", "بندق"],
  alerjenSoya: ["Soya", "صويا"],
  alerjenHardal: ["Hardal", "خردل"],
  alerjenBalik: ["Balık", "سمك"],

  // --- rozetler ---
  rozetYok: ["Ürün etiketi yok", "بدون وسم للمنتج"],
  rozetCokSatan: ["Önerilen", "مقترح"],
  rozetYeni: ["Yeni", "جديد"],
  rozetAcili: ["Acılı", "حار"],
  rozetSefinOnerisi: ["Şefin önerisi", "اختيار الشيف"],

  // --- dogrulama ve onay ---
  adTrZorunlu: ["Türkçe ad zorunlu.", "الاسم بالتركية إلزامي."],
  adArZorunlu: ["Arapça ad zorunlu.", "الاسم بالعربية إلزامي."],
  kategoriSecilmeli: ["Kategori seçilmeli.", "يجب اختيار قسم."],
  slugZorunlu: ["Bağlantı adı zorunlu.", "اسم الرابط إلزامي."],
  fiyatNegatif: ["Fiyatlar negatif olamaz.", "لا يمكن أن تكون الأسعار سالبة."],
  slugKullanimda: [
    "Bu bağlantı adı başka bir kayıtta kullanılıyor.",
    "اسم الرابط هذا مستخدم في سجل آخر.",
  ],
  silOnay: ["silinecek. Emin misin?", "سيتم حذفه. هل أنت متأكد؟"],
  kategoriSilOnay: [
    "silinecek. Kategori boş olmalı. Emin misin?",
    "سيتم حذف القسم. يجب أن يكون فارغاً. هل أنت متأكد؟",
  ],
  topluFiyatOnay: [
    "ürünün fiyatı değişecek. Bu işlem geri alınamaz. Uygulansın mı?",
    "منتج سيتغير سعره. لا يمكن التراجع. هل نطبّق؟",
  ],
  guncellenemedi: ["güncellenemedi", "تعذّر التحديث"],
  okunamadi: ["okunamadı", "تعذّرت القراءة"],
  siraKaydedilemedi: ["Menü sırası kaydedilemedi", "تعذّر حفظ ترتيب القائمة"],
  kaydedilemedi: ["Kaydedilemedi", "تعذّر الحفظ"],

  // --- fiyat farki uyarisi ---
  fiyatFarkiOnek: ["Paket fiyatı, masa fiyatından", "سعر التوصيل عن سعر الطاولة"],
  fiyatFarkiSonek: ["farklı", "مختلف"],
  kontrolEt: ["kontrol et", "تحقق"],

  // --- kategori uyarilari ---
  kategoriUrunUyari: [
    "Kategori, içinde ürün varken silinemez. Silmek için ürünleri önce başka kategoriye taşı.",
    "لا يمكن حذف القسم ما دامت فيه منتجات. انقل المنتجات إلى قسم آخر أولاً.",
  ],
  buKategoride: ["Bu kategoride", "في هذا القسم"],
  urunVar: ["ürün var.", "منتج."],

  // --- gunler ---
  pazartesi: ["Pazartesi", "الإثنين"],
  sali: ["Salı", "الثلاثاء"],
  carsamba: ["Çarşamba", "الأربعاء"],
  persembe: ["Perşembe", "الخميس"],
  cuma: ["Cuma", "الجمعة"],
  cumartesi: ["Cumartesi", "السبت"],
  pazar: ["Pazar", "الأحد"],

  // --- toplu fiyat sonucu ---
  fiyatGuncellendi: ["ürünün fiyatı güncellendi.", "منتج تم تحديث سعره."],
  degisecekSayisi: ["ürünün fiyatı değişecek.", "منتج سيتغير سعره."],
  urunGuncellenmisti: ["ürün güncellenmişti.", "منتج تم تحديثه."],

  // --- yeni siparis uyarisi ---
  sesiAc: ["Yeni sipariş sesini aç", "تفعيل صوت الطلب الجديد"],
  sesAcik: ["Sipariş sesi açık", "صوت الطلبات مفعّل"],
  sesAciklama: [
    "Bu sayfa açık kaldığı sürece yeni sipariş geldiğinde ses çalar.",
    "طالما بقيت هذه الصفحة مفتوحة سيصدر صوت عند وصول طلب جديد.",
  ],
  masaSiparisi: ["Masa", "طاولة"],
  masaNo: ["Masa", "طاولة"],
  paketSiparisi: ["Paket", "توصيل"],

} as const;

export type MetinAnahtari = keyof typeof SOZLUK;

interface Baglam {
  dil: AdminDil;
  dilDegistir: (d: AdminDil) => void;
  m: (anahtar: MetinAnahtari) => string;
}

const AdminDilBaglami = createContext<Baglam | null>(null);

export function AdminDilSaglayici({ children }: { children: ReactNode }) {
  const [dil, setDil] = useState<AdminDil>("tr");

  // Sunucu ciktisi her zaman Turkce; secim baglandiktan sonra uygulanir
  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(ANAHTAR);
      if (kayitli === "ar" || kayitli === "tr") setDil(kayitli);
    } catch {
      /* gizli sekmede localStorage kapali olabilir */
    }
  }, []);

  const dilDegistir = useCallback((d: AdminDil) => {
    setDil(d);
    try {
      localStorage.setItem(ANAHTAR, d);
    } catch {
      /* yoksay */
    }
    document.documentElement.lang = d;
    document.documentElement.dir = d === "ar" ? "rtl" : "ltr";
  }, []);

  useEffect(() => {
    document.documentElement.lang = dil;
    document.documentElement.dir = dil === "ar" ? "rtl" : "ltr";
  }, [dil]);

  const m = useCallback(
    (anahtar: MetinAnahtari) => {
      const cift = SOZLUK[anahtar];
      if (!cift) return anahtar;
      return dil === "ar" ? cift[1] || cift[0] : cift[0];
    },
    [dil],
  );

  return (
    <AdminDilBaglami.Provider value={{ dil, dilDegistir, m }}>
      {children}
    </AdminDilBaglami.Provider>
  );
}

export function useAdminDil(): Baglam {
  const baglam = useContext(AdminDilBaglami);
  if (!baglam) {
    throw new Error("useAdminDil, AdminDilSaglayici icinde kullanilmali.");
  }
  return baglam;
}
