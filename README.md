# AUTOCHEST — CHIBI AUTO BATTLER 🎮

**Playable Alpha v0.4 · PNG + GIF Heroes** — เกมออโต้เชสแบบ PvE เล่นบนเบราว์เซอร์ จัดทีม → วางตำแหน่ง → ให้ตัวละครต่อสู้เอง

## PNG / GIF สำหรับตัวละครทุกชนิด (v0.4) 💎

ตัวละคร **ทุกตัว รวมศัตรู/บอส** มี `images.art`, `images.idle`, `images.attack` ที่ใช้ได้ทั้ง `.png` และ `.gif` แบบ **ผสมกันได้อิสระ** เหมาะสำหรับสกิน/ตัวพรีเมียม

- `art`: ภาพอาร์ตบนการ์ดร้านค้าและแผงรายละเอียด (GIF เคลื่อนไหวได้)
- `idle`: ตัวจิบิบนสนาม/ม้านั่ง ตอนยืนและเดิน (GIF เคลื่อนไหวได้)
- `attack`: ตัวจิบิขณะโจมตีหรือใช้สกิล (GIF เคลื่อนไหวได้)
- **PNG** วาดด้วย Canvas ตามเดิม; **GIF** บนกระดานแสดงผ่าน `<img>` overlay ที่ติดตามตำแหน่งตัวละคร (ไม่ใช้ `drawImage` ซึ่งอาจหยุดอยู่เฟรมแรก)
- เมื่อตัวละครโจมตี ระบบสลับไปไฟล์ `attack` แล้วกลับ `idle` หลังช่วงเวลาโจมตี; `visual.attackMs` ปรับเวลาค้าง GIF โจมตีได้ 100–5000 ms (ค่าเริ่มต้นสำหรับ GIF 700 ms)
- แค่เปลี่ยน path ในไฟล์ข้อมูลรายตัวและใส่ GIF ในโฟลเดอร์ภาพ ไม่ต้องแก้ `game.js`
- ไฟล์เดิม `character.png` ยังใช้งานได้ทุกช่องโดยไม่ต้องสร้างภาพเพิ่ม

```javascript
// src/characters/heroes/knight.js
images: {
  art: './assets/heroes/knight/art.gif',
  idle: './assets/heroes/knight/idle.gif',
  attack: './assets/heroes/knight/attack.gif'
},
visual: {scale: 1, walkBob: 6, skillGlow: 1, attackMs: 900}
```

> ใช้ GIF โปร่งใสขนาดเหมาะสม และตั้งลูปสำหรับ `idle`; หาก `attack.gif` ยาวเกิน `attackMs` อาจถูกเปลี่ยนกลับเป็น `idle` ก่อนเล่นครบ

## เริ่มเล่น

1. เปิด `index.html` ใน Chrome หรือ Edge หรือใช้ GitHub Pages
2. ซื้อฮีโร่จากร้านค้า แล้วลากตัวละครจากม้านั่งไปลงสนาม 3 แถวล่าง
3. ลากยูนิตบนสนามเพื่อย้ายตำแหน่ง/สลับ หรือกลับไปม้านั่งสำรอง
4. กดเริ่มต่อสู้ ฮีโร่จะเดิน เลือกเป้าหมาย และใช้สกิลอัตโนมัติ
5. รับเงินรางวัล ซื้อฮีโร่เพิ่ม และรวมตัวเหมือนกัน 3 ตัวเป็น 2 ดาว (รวมต่อเป็น 3 ดาว)

## สิ่งใหม่ใน v0.3 — รื้อตัวละครทั้งชุด

- ฮีโร่ **7 ตัว** เปลี่ยนเป็นฮีโร่ออริจินัลสำหรับเกมของเรา (ชื่อ/งานออกแบบชุดนี้ยังปรับได้)
- ศัตรู **4 แบบ** มีภาพประจำตัวทั้งหมด รวมบอส
- เปลี่ยนภาพตัวกลม/อีโมจิบนสนาม เป็นภาพ **Chibi PNG แบบโปร่งใส** พร้อมไฟล์ต้นฉบับ SVG
- ภาพตัวเดียวกันใช้ได้ทั้งในสนาม ร้านค้า ม้านั่ง แผงรายละเอียด และตอนลาก
- แสดงแอนิเมชันเบื้องต้น `idle / walk / attack / skill` ผ่านการขยับภาพและเอฟเฟกต์ Canvas (ยังไม่ใช่ frame-by-frame sprite sheet)
- แยกข้อมูล **ฮีโร่รายตัว** เป็น `src/characters/heroes/<id>.js` และศัตรูรายตัวเป็น `src/characters/enemies/<id>.js`
- ชื่อ ค่าสเตตัส อาชีพ สกิล และไฟล์ภาพอยู่ในข้อมูลฮีโร่ ไม่ต้องไปแก้ constants ขนาดใหญ่ใน `game.js`
- ระบบสกิลใช้ `effect` ชนิด `slash`, `chain`, `triple`, `shield`, `blink`, `slam` ที่ engine รองรับแล้ว
- รักษาระบบร้านค้า เวฟ ดาว บอส AI ต่อสู้อัตโนมัติ และ drag-and-drop ของ v0.2

## ผังไฟล์

```text
index.html                       หน้าจอเกมและลำดับโหลดสคริปต์
src/styles.css                   UI / character cards
src/game.js                      Auto Chess engine + animation state machine
src/characters.js                Character registry + validation
src/characters/heroes/*.js       ฮีโร่ 7 ตัว (แยกไฟล์)
src/characters/enemies/*.js      ศัตรู 4 ตัว (แยกไฟล์)
assets/heroes/<id>/character.png ไฟล์ภาพที่เกมใช้จริง
assets/heroes/<id>/character.svg ต้นฉบับภาพแก้ไขได้
assets/enemies/<id>/*             ภาพศัตรู
scripts/verify-roster.cjs        ตรวจความถูกต้องของข้อมูลตัวละคร
```

## เพิ่ม/แก้ฮีโร่ในอนาคต

อ่าน [docs/CHARACTER_SYSTEM.md](docs/CHARACTER_SYSTEM.md) — แต่ละตัวละครมี ID, stats, team, skill effect, รูป PNG/SVG และ animation visual settings แยกจากกัน

> **ข้อจำกัด:** ภาพ v0.3 เป็นภาพจิบิต้นแบบที่สร้างใหม่สำหรับโปรเจกต์ ไม่ใช่งาน sprite sheet frame-by-frame, ยังไม่มี multiplayer, การบันทึกเกม และระบบ skill editor ในหน้าเว็บ
