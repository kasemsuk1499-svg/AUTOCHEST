# AUTOCHEST — SAO Character Roster v0.9 ⚔️

Single-player Chibi Auto Battler fan prototype. All characters use one roster for allies, enemies and boss variants.

## Playable roster (7)
- **อาสึนะ (Asuna)** — นักรบ ราคา 3; โจมตีเร็ว / คริ 35%, ใช้รูปที่ผู้เล่นอัปโหลดไว้แล้ว
- **คิริโตะ (Kirito)** — นักรบ ราคา 2; ดาบคู่ โจมตีเร็ว
- **ชิน่อน (Sinon)** — ยิงไกล ราคา 2; สไนเปอร์ คริ
- **ลิซเบธ (Lisbeth)** — ป้องกัน ราคา 1; ค้อนโจมตีเป็นบริเวณ
- **เดธกัน (Death Gun)** — นักรบ ราคา 3; ลอบสังหารว่องไว + คริ
- **ฮีทคลิฟฟ์ (Heathcliff)** — ป้องกัน ราคา 3; ตั้งโล่และความทนทาน
- **ซิลิก้า (Silica)** — เวท ราคา 1; พีน่า / โจมตีเชื่อมต่อหลายเป้าหมาย

สกิลและค่าสเตตัสของทั้ง 6 ตัวใหม่เป็น **ต้นแบบชั่วคราว** สำหรับทดสอบ ไม่ใช่ชุดสกิลสุดท้าย

## Add your own PNG / GIF
โฟลเดอร์ภาพทั้ง 6 ตัวใหม่มี **placeholder PNG รูป ?** ทั้งสามสถานะ เตรียมไว้ให้เล่นได้ก่อนใส่ภาพจริง:

```text
assets/heroes/kirito/{art.png,idle.png,attack.png}
assets/heroes/sinon/{art.png,idle.png,attack.png}
assets/heroes/lisbeth/{art.png,idle.png,attack.png}
assets/heroes/deathgun/{art.png,idle.png,attack.png}
assets/heroes/heathcliff/{art.png,idle.png,attack.png}
assets/heroes/silica/{art.png,idle.png,attack.png}
assets/heroes/asuna/{art.png,idle.png,attack.png}  (real images preserved)
```

อัปโหลดภาพ PNG ชื่อเดิมทับ placeholder ได้ทันที โดยไม่ต้องแก้โค้ด หากใช้ GIF ให้เพิ่มไฟล์ `art.gif`, `idle.gif` หรือ `attack.gif` แล้วแก้ path ในไฟล์ JS รายตัวให้เป็น .gif; ทั้งสามช่องรองรับ PNG/GIF

## Game mechanics
- ซื้อจากร้าน, ลากตัวลงสนาม, รวมฮีโร่เหมือนกัน 3 ตัวเพิ่มดาว, PvE waves, บอสทุก 3 เวฟ
- ศัตรูใช้ภาพและสกิลเดียวกับฮีโร่ เพียงคูณค่าสเตตัสและสเกลโมเดลตามเวฟ
- สารานุกรมค้นหา, กรองสาย/ราคา, เฉพาะฮีโร่ที่มี, แสดง 12 ตัวต่อหน้า
- กดดูสเตตัส/สกิลก่อนซื้อหรือหลังซื้อได้ตลอด ไม่ต้องจ่าย Gold เพื่อเปิดดู
- เริ่มต้นด้วย **ลิซเบธและซิลิก้า** บนสนาม และ **คิริโตะ** สำรอง

## Verify
`node scripts/verify-roster.cjs` และ `node scripts/test-gif-contract.cjs`

```text
index.html
src/game.js
src/characters.js
src/characters/heroes/{asuna,kirito,sinon,lisbeth,deathgun,heathcliff,silica}.js
assets/heroes/<id>/{art.png,idle.png,attack.png}
src/styles.css
docs/CHARACTER_SYSTEM.md
docs/GAME_DESIGN.md
```

Old original characters were removed from active roster and repository files. They can still be restored from Git history if needed.
