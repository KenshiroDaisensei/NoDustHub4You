# NoDustHub - Clean Room Finder for Northern Thailand

เว็บแอปค้นหาห้องปลอดฝุ่น (Clean Room) ใน 8 จังหวัดภาคเหนือของไทย แสดงบนแผนที่พร้อมฟีเจอร์ค้นหาใกล้ฉัน, กรองประเภท, admin page สำหรับจัดการข้อมูล

## เริ่มต้นใช้งาน

```bash
git clone https://github.com/KenshiroDaisensei/NoDustHub4You.git
cd NoDustHub4You
npm install
npm run dev -- -p 3006
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3006**

เท่านี้ก็ใช้งานได้เลย — แผนที่จะแสดงข้อมูลห้องปลอดฝุ่นจากไฟล์ CSV ในเครื่อง

## ถ้าอยากดึงข้อมูลผ่าน Google Sheets

### 1. สร้าง Google Service Account
- ไปที่ [Google Cloud Console](https://console.cloud.google.com)
- สร้างโปรเจกต์ใหม่ (หรือใช้ที่มีอยู่)
- เปิด **Google Sheets API** + **Google Drive API**
- ไปที่ IAM & Admin → Service Accounts → สร้าง Service Account
- สร้าง Key เป็น JSON → จะได้ไฟล์ที่มี `client_email` กับ `private_key`

### 2. ตั้งค่า `.env.local`
- Copy ไฟล์ `.env.local.example` เป็น `.env.local`
- ใส่ค่าจริงแทน `11111`:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=ชื่อ-service-account@ชื่อ-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FILE_ID=ใส่ถ้ามี (ไม่ใส่ก็ได้)
```

### 3. ตั้งค่า Spreadsheet ID
- เปิด Google Sheets → ดู URL: `https://docs.google.com/spreadsheets/d/{ID}/edit`
- Copy **{ID}** ไปใส่ในไฟล์ `src/app/api/drive/route.ts`:
```typescript
const SPREADSHEET_ID = "ใส่ ID ตรงนี้";
```

### 4. ตั้งค่า Google Sheets
- Sheet ต้องมี tab ชื่อ **`cleanrooms`**
- แถวแรกเป็น header: `id,name,province,district,subdistrict,phone,lat,lng,type,typeAdd,service,capacity,evaluationResult,status,resolved_location,detail`
- Share Sheet ให้ service account email มีสิทธิ์ **Viewer** ขึ้นไป

### 5. เปิดปุ่ม Google Sheets ใน UI
- แก้ไฟล์ `src/app/page.tsx` — เปลี่ยนปุ่ม Google Sheets ที่ disabled ให้กดได้

### 6. รีสตาร์ท
```bash
npm run dev -- -p 3006
```

## ถ้าใช้ Claude Code

เปิด Claude Code ในโฟลเดอร์โปรเจกต์แล้วบอกว่า:

**ใช้งานพื้นฐาน:**
> ช่วยรัน dev server ที่ port 3006 ให้หน่อย

**เปลี่ยนไฟล์ CSV:**
> ช่วยเปลี่ยนไฟล์ข้อมูลจาก cleanrooms_002.csv เป็น cleanrooms_001.csv ในไฟล์ src/app/api/drive/route.ts แล้ว restart server ที่ port 3006

**เปิดใช้ Google Sheets:**
> ช่วยเปิดใช้งาน Google Sheets โดย:
> 1. แก้ไฟล์ src/app/api/drive/route.ts ใส่ SPREADSHEET_ID = "xxx"
> 2. สร้างไฟล์ .env.local จาก .env.local.example แล้วใส่ค่า GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx และ GOOGLE_PRIVATE_KEY=xxx
> 3. แก้ปุ่ม Google Sheets ในไฟล์ src/app/page.tsx ให้กดได้ (ลบ disabled ออก)
> 4. restart server ที่ port 3006

**เพิ่มข้อมูล CSV ใหม่:**
> ช่วยเอาไฟล์ cleanrooms_003.csv ที่อยู่ใน public/ มาใช้แทนไฟล์เดิม ในไฟล์ src/app/api/drive/route.ts แล้ว restart server ที่ port 3006

## Tech Stack
- Next.js 14 (App Router), TypeScript
- Leaflet.js + react-leaflet v4 + react-leaflet-cluster
- Google Sheets API (optional data source)
