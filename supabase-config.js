"use strict";

const SUPABASE_URL = "https://ogrsfqlsmchcoooewpyc.supabase.co";
const SUPABASE_KEY = "sb_publishable_1weJcYlDPXWvEkyVxrmoxg_xBTGFWh0";

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_KEY;

// รหัส PIN เริ่มต้นคือ "1234" (SHA-256)
// หากต้องการเปลี่ยนรหัส PIN สามารถนำรหัสใหม่ 4 หลักไปเข้ารหัส SHA-256 แล้วนำค่ามาใส่ที่นี่ได้
window.SITE_OWNER_PIN_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
