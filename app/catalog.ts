export type Product = {
  name: { ru: string; ky: string; uz: string; zh: string };
  image: string;
  cost: string;
  retail: { kg: string; uz: string };
  moq: number;
  orders: number;
  kind: string;
};

const productName = (ru: string, uz: string, zh: string) => ({ ru, ky: ru, uz, zh });

export const catalogProducts: Product[] = [
  { name: productName("Защитное стекло для смартфона", "Telefon uchun himoya oynasi", "手机钢化膜"), image: "/products/01-tempered-glass-screen-protectors.jpg", cost: "¥ 0.45", retail: { kg: "120 сом", uz: "17 000 so‘m" }, moq: 500, orders: 2358, kind: "screen-protector" },
  { name: productName("Прозрачный противоударный чехол", "Shaffof zarbaga chidamli g‘ilof", "透明防摔手机壳"), image: "/products/02-clear-shockproof-phone-case.jpg", cost: "¥ 2.80", retail: { kg: "350 сом", uz: "49 000 so‘m" }, moq: 100, orders: 1846, kind: "phone-case" },
  { name: productName("Плетёный кабель быстрой зарядки USB-C", "O‘ralgan USB-C tezkor quvvat kabeli", "编织USB-C快充线"), image: "/products/03-braided-usb-c-fast-charge-cable.jpg", cost: "¥ 5.60", retail: { kg: "550 сом", uz: "75 000 so‘m" }, moq: 100, orders: 1527, kind: "usb-c-cable" },
  { name: productName("Складная настольная подставка", "Buklanadigan stol telefon tagligi", "折叠桌面手机支架"), image: "/products/04-folding-desktop-phone-stand.jpg", cost: "¥ 3.20", retail: { kg: "350 сом", uz: "49 000 so‘m" }, moq: 100, orders: 1326, kind: "phone-stand" },
  { name: productName("Автомобильный держатель на дефлектор", "Avtomobil havo panjarasi telefon ushlagichi", "车载出风口手机支架"), image: "/products/05-car-air-vent-phone-holder.jpg", cost: "¥ 6.80", retail: { kg: "650 сом", uz: "89 000 so‘m" }, moq: 100, orders: 1098, kind: "car-holder" },
  { name: productName("Селфи-палка со штативом", "Tripodli selfi tayoqchasi", "自拍杆三脚架"), image: "/products/06-selfie-stick-tripod.jpg", cost: "¥ 11.50", retail: { kg: "1 200 сом", uz: "165 000 so‘m" }, moq: 50, orders: 987, kind: "selfie-stick" },
  { name: productName("Набор защиты и органайзеров для кабеля", "Kabel himoyasi va tartiblagich to‘plami", "数据线保护整理套装"), image: "/products/07-cable-protector-organizer-set.jpg", cost: "¥ 1.80", retail: { kg: "250 сом", uz: "35 000 so‘m" }, moq: 200, orders: 1642, kind: "cable-organizer" },
  { name: productName("Заколки-крабы и резинки для волос", "Soch qisqichi va rezinka to‘plami", "抓夹发圈组合"), image: "/products/08-hair-claw-and-hair-tie-set.jpg", cost: "¥ 4.20", retail: { kg: "450 сом", uz: "62 000 so‘m" }, moq: 100, orders: 1435, kind: "hair-set" },
  { name: productName("Спонжи и пуховки для макияжа", "Makiyaj gubkasi va puff to‘plami", "美妆蛋粉扑套装"), image: "/products/09-makeup-sponge-and-puff-set.jpg", cost: "¥ 3.80", retail: { kg: "420 сом", uz: "58 000 so‘m" }, moq: 100, orders: 1719, kind: "makeup-sponge" },
  { name: productName("Лента для завивки без нагрева", "Issiqliksiz soch jingalak lentasi", "免热卷发带套装"), image: "/products/10-heatless-curling-ribbon-set.jpg", cost: "¥ 3.50", retail: { kg: "390 сом", uz: "54 000 so‘m" }, moq: 100, orders: 1268, kind: "curling-ribbon" },
  { name: productName("Наклейки и накладные ногти", "Tirnoq stikerlari va sun’iy tirnoqlar", "美甲贴片甲套装"), image: "/products/11-nail-stickers-and-press-on-nails.jpg", cost: "¥ 2.90", retail: { kg: "350 сом", uz: "48 000 so‘m" }, moq: 200, orders: 1883, kind: "nail-set" },
  { name: productName("Магнитные застёжки и броши для платка", "Ro‘mol uchun magnit qisqich va brosh", "围巾磁扣胸针套装"), image: "/products/12-scarf-magnetic-clasps-and-brooches.jpg", cost: "¥ 3.20", retail: { kg: "380 сом", uz: "52 000 so‘m" }, moq: 100, orders: 932, kind: "scarf-clasp" },
  { name: productName("Дорожная шкатулка для украшений", "Sayohat zargarlik qutisi", "旅行首饰盒"), image: "/products/13-travel-jewelry-box-and-roll.jpg", cost: "¥ 12.80", retail: { kg: "1 300 сом", uz: "180 000 so‘m" }, moq: 50, orders: 864, kind: "jewelry-box" },
  { name: productName("Самоклеящиеся крючки без сверления", "Teshmasdan yopishtiriladigan ilgaklar", "免打孔粘钩套装"), image: "/products/14-no-drill-adhesive-hook-set.jpg", cost: "¥ 3.60", retail: { kg: "420 сом", uz: "58 000 so‘m" }, moq: 100, orders: 1496, kind: "adhesive-hooks" },
  { name: productName("Набор ситечек для слива", "Drenaj filtri to‘plami", "下水口过滤网套装"), image: "/products/15-drain-strainer-set.jpg", cost: "¥ 4.80", retail: { kg: "520 сом", uz: "72 000 so‘m" }, moq: 100, orders: 1107, kind: "drain-strainer" },
  { name: productName("Набор вакуумных пакетов", "Vakuum siqish paketlari", "真空压缩袋套装"), image: "/products/16-vacuum-compression-bag-set.jpg", cost: "¥ 15.50", retail: { kg: "1 550 сом", uz: "215 000 so‘m" }, moq: 30, orders: 1254, kind: "vacuum-bags" },
  { name: productName("Разделители и органайзер для белья", "Tortma ajratgich va ichki kiyim tartiblagichi", "抽屉分隔内衣收纳盒"), image: "/products/17-drawer-divider-and-underwear-organizer.jpg", cost: "¥ 9.80", retail: { kg: "980 сом", uz: "136 000 so‘m" }, moq: 50, orders: 876, kind: "drawer-organizer" },
  { name: productName("Чехлы для обуви и дорожные органайзеры", "Poyabzal qopi va sayohat tartiblagichi", "鞋子防尘旅行收纳袋"), image: "/products/18-shoe-dust-bag-and-travel-organizer-set.jpg", cost: "¥ 13.60", retail: { kg: "1 350 сом", uz: "188 000 so‘m" }, moq: 50, orders: 798, kind: "travel-organizer" },
  { name: productName("Силиконовые планки для зазоров", "Rakovina va plita uchun silikon tirqish tasmasi", "水槽灶台缝隙条"), image: "/products/19-silicone-sink-and-stove-gap-strips.jpg", cost: "¥ 5.20", retail: { kg: "590 сом", uz: "82 000 so‘m" }, moq: 100, orders: 1034, kind: "gap-strip" },
  { name: productName("Салфетки из микрофибры для автомобиля", "Avtomobil uchun mikrofiber sochiqlar", "汽车超细纤维毛巾套装"), image: "/products/20-car-microfiber-towel-set.jpg", cost: "¥ 6.30", retail: { kg: "720 сом", uz: "99 000 so‘m" }, moq: 100, orders: 1186, kind: "car-towels" },
  { name: productName("Органайзеры в щель автомобильного сиденья", "Avtomobil o‘rindig‘i oralig‘i organayzeri", "汽车座椅缝隙收纳盒"), image: "/products/21-car-seat-gap-filler-and-storage-boxes.jpg", cost: "¥ 18.50", retail: { kg: "1 850 сом", uz: "255 000 so‘m" }, moq: 30, orders: 694, kind: "seat-organizer" },
  { name: productName("Складной зонт-шторка на лобовое стекло", "Buklanadigan old oyna soyabon soyasi", "折叠式汽车遮阳伞"), image: "/products/22-folding-windshield-sunshade-umbrella.jpg", cost: "¥ 16.80", retail: { kg: "1 680 сом", uz: "235 000 so‘m" }, moq: 30, orders: 905, kind: "sunshade" },
  { name: productName("Зимний чехол на лобовое стекло", "Old oyna uchun qor va muz qopqog‘i", "汽车挡风玻璃防雪罩"), image: "/products/23-windshield-snow-frost-cover.jpg", cost: "¥ 21.50", retail: { kg: "2 100 сом", uz: "295 000 so‘m" }, moq: 30, orders: 642, kind: "frost-cover" },
  { name: productName("Нарукавники и маска от солнца", "UV qo‘l yenglari va yuz niqobi", "防晒冰袖面罩套装"), image: "/products/24-uv-arm-sleeves-and-face-cover.jpg", cost: "¥ 5.90", retail: { kg: "650 сом", uz: "90 000 so‘m" }, moq: 100, orders: 1378, kind: "uv-set" },
  { name: productName("Зимние перчатки для сенсорного экрана", "Sensorli ekran uchun qishki qo‘lqop", "触屏保暖手套"), image: "/products/25-touchscreen-winter-gloves.jpg", cost: "¥ 8.80", retail: { kg: "890 сом", uz: "125 000 so‘m" }, moq: 100, orders: 1594, kind: "winter-gloves" },
  { name: productName("Машинка для удаления катышков USB-C", "USB-C tuk tozalagich", "USB-C充电毛球修剪器"), image: "/products/26-usb-c-lint-remover.jpg", cost: "¥ 17.80", retail: { kg: "1 750 сом", uz: "245 000 so‘m" }, moq: 30, orders: 763, kind: "lint-remover" },
  { name: productName("Мини-запайщик пакетов USB-C", "USB-C mini paket yopishtirgich", "USB-C迷你封口机"), image: "/products/27-usb-c-mini-bag-sealer.jpg", cost: "¥ 9.60", retail: { kg: "980 сом", uz: "136 000 so‘m" }, moq: 50, orders: 1129, kind: "bag-sealer" },
  { name: productName("Ручной настольный вентилятор USB-C", "Qo‘l va stol uchun USB-C ventilyator", "USB-C手持桌面风扇"), image: "/products/28-handheld-tabletop-usb-c-fan.jpg", cost: "¥ 18.50", retail: { kg: "1 850 сом", uz: "255 000 so‘m" }, moq: 30, orders: 821, kind: "usb-fan" },
  { name: productName("Магнитный светильник с датчиком движения", "Harakat sensorli magnit shkaf chirog‘i", "人体感应磁吸柜灯"), image: "/products/29-motion-sensor-magnetic-cabinet-light.jpg", cost: "¥ 15.80", retail: { kg: "1 580 сом", uz: "218 000 so‘m" }, moq: 30, orders: 746, kind: "sensor-light" },
  { name: productName("PTC-сушилка для обуви", "PTC poyabzal quritgichi", "PTC恒温烘鞋器"), image: "/products/30-ptc-shoe-dryer.jpg", cost: "¥ 28.50", retail: { kg: "2 850 сом", uz: "395 000 so‘m" }, moq: 20, orders: 584, kind: "shoe-dryer" },
];

export function getProduct(kind: string) {
  return catalogProducts.find((product) => product.kind === kind);
}
