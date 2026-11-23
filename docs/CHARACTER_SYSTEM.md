# AUTOCHEST — ระบบตัวละคร v0.3

## หลักคิดการรื้อระบบ

- ย้ายข้อมูลทุกตัวละครออกจาก `src/game.js` ลงไฟล์รายตัว แยกกลไกของเกมกับข้อมูลตัวละคร
- แยกภาพโปร่งใสของแต่ละตัวเป็นไฟล์จริง (`character.png`, `character.svg`)
- รักษา ID ทางเทคนิค เช่น `knight` ไว้ให้ระบบ AI, การรวมดาว, animation และสกิลเดิมยังเชื่อมกันได้ ในขณะที่เปลี่ยนชื่อที่แสดงเป็น **อาเรน**
- เวอร์ชันนี้ปรับ **ภาพ, ตัวตน, ชื่อ, การจัดโครงสร้าง และสถานะอนิเมชัน** โดยคงค่าสเตตัสเดิมเป็นฐานชั่วคราวเพื่อไม่ทำสมดุลการต่อสู้เสีย

## ฮีโร่ออริจินัลชุดแรก (ยังเปลี่ยนได้)

| ID | ชื่อ | บทบาท | ค่าจ้าง | สกิล | effect |
|---|---|---|---:|---|---|
| knight | อาเรน | นักรบ | 1 | คมดาบอรุณ | slash |
| mage | ลูนา | เวท | 2 | สายฟ้าจันทรา | chain |
| archer | เรน | ยิงไกล | 1 | สามศรพายุ | triple |
| tank | บรอนน์ | ป้องกัน | 2 | กำแพงเหล็ก | shield |
| assassin | คิระ | นักรบ | 2 | จู่โจมพริบตา | blink |
| thunder | เซรา | เวท | 3 | อัสนีพิพากษา | chain |
| hammer | การ์ด | ป้องกัน | 3 | ทุบสะท้านโลก | slam |

## ศัตรู

`slime`, `crab`, `ghost`, `boss` มีข้อมูลและภาพแยกไฟล์ทั้งหมด

## การแก้ไขตัวละครหนึ่งตัว

1. เปิดไฟล์ `src/characters/heroes/mage.js` (ตัวอย่าง ลูนา)
2. แก้ `name`, `subtitle`, `team`, `cost`, `hp`, `dmg`, `range`, `cool`, `move`, `skill`, `effect`, `triggerEvery` หรือ `visual`
3. เปลี่ยนภาพ `assets/heroes/mage/character.png` โดยให้มีพื้นหลังโปร่งใส ความละเอียดแนะนำ 360 × 420 px (ภาพต้นแบบ SVG อยู่ในโฟลเดอร์เดียวกัน)
4. ถ้าสร้าง ID ใหม่จริง ๆ ให้เพิ่ม `<script defer src="./src/characters/heroes/<id>.js"></script>` ใน `index.html` **ก่อน** `src/game.js`
5. สั่ง `node scripts/verify-roster.cjs` เพื่อตรวจ roster ทุกตัว

## Contract ข้อมูลตัวละคร

```javascript
window.AUTOCHEST_CHARACTERS.registerHero({
  id: 'mage', name: 'ลูนา', subtitle: 'แม่มดจันทรา',
  team: 'เวท', cost: 2,
  hp: 415, dmg: 87, range: 2.95, cool: 1.62, move: 81,
  skill: 'สายฟ้าจันทรา', effect: 'chain', triggerEvery: 3,
  col: '#ba82ff',
  portrait: './assets/heroes/mage/character.png',
  visual: {scale: 1, walkBob: 6, skillGlow: 1}
});
```

- `team` รองรับ `นักรบ`, `เวท`, `ยิงไกล`, `ป้องกัน` ในเวอร์ชันนี้
- `effect` เป็นชนิดสกิลที่ Engine รองรับ **ไม่ใช่ script ที่รันจากข้อมูลผู้เล่น**; การเพิ่มชนิดสกิลต้องเพิ่มตัวประมวลผลใน `src/game.js`
- `triggerEvery`: จำนวนครั้งโจมตีธรรมดาก่อนใช้สกิล
- `visual`: ตัวคูณขนาดภาพกับความสูงการกระเด้งตอนเดิน (อนิเมชันใช้ transforms ไม่ได้แยกภาพทุกเฟรม)
- `portrait`: path ต้องมีไฟล์และโหลดได้
- ฮีโร่ใหม่จะถูกนำเข้าร้านค้าโดยอัตโนมัติ เมื่อเขียนไฟล์และโหลดทะเบียนถูกต้อง

## สิ่งที่จะรื้อต่อใน v0.4

- Animation sprite sheets สำหรับ `idle/walk/attack/skill/hit/death` ที่แยกเฟรมจริง
- กำหนด skill payload หลายขั้น (hit count, target rule, status) เป็นข้อมูล แทนเงื่อนไขแบบตายตัว
- แยก combat engine ไปเป็นโมดูล ลดความยาว `src/game.js`
- หน้า Character Lab สำหรับเพิ่มตัวละครโดยไม่ต้องเขียนโค้ด
