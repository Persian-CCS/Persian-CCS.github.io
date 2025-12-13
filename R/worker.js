// Cloudflare Worker کامل برای سیستم مدیریت درخواست‌ها
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const action = url.searchParams.get('action');

    // لیست actions که نیاز به توکن ندارند
    const publicActions = ['test', 'check-db', 'create-table', 'init-db', 'getPublic', 'login'];

    // بررسی توکن فقط برای actions خصوصی
    if (!publicActions.includes(action)) {
      const token = url.searchParams.get('token');
      const validToken = env.API_TOKEN || "e99a18c428cb38d5f260853678922e03";

      if (!token || token !== validToken) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Unauthorized - توکن معتبر نیست'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    try {
      if (path === '/api') {
        switch (action) {
          case 'test':
            return new Response(JSON.stringify({
              success: true,
              message: 'API کار می‌کند',
              timestamp: new Date().toISOString()
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

          case 'check-db':
            return await checkDatabase(env, corsHeaders);

          case 'create-table':
            return await createTableSimple(env, corsHeaders);

          case 'init-db':
            return await initDatabaseSimple(env, corsHeaders);

          case 'getAll':
            return await getAllRequests(env, corsHeaders);

          case 'getPublic':
            return await getPublicRequests(env, corsHeaders);

          case 'save':
            return await saveRequestSimple(request, env, corsHeaders);

          case 'delete':
            return await deleteRequest(request, env, corsHeaders);

          case 'update':
            return await updateRequest(request, env, corsHeaders);

          case 'stats':
            return await getStats(env, corsHeaders);

          case 'export':
            return await exportRequests(env, corsHeaders);

          case 'backup':
            return await backupRequests(env, corsHeaders);

          case 'login':
            return await handleLogin(request, env, corsHeaders);

          case 'check-password':
            return await checkPasswordFromDB(request, env, corsHeaders);

          default:
            return new Response(JSON.stringify({
              success: false,
              message: 'Action نامعتبر'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
      }

      return new Response(JSON.stringify({
        success: false,
        message: 'مسیر یافت نشد'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('خطا در worker:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'خطای سرور',
        error: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ==================== توابع کمکی ====================

// تابع ایجاد جدول ساده
async function createTableSimple(env, corsHeaders) {
  try {
    await env.ccs_resalat_db.prepare(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        nationalCode TEXT NOT NULL,
        phoneNumber TEXT,
        city TEXT,
        requestDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'درحال جمع آوری مدارک',
        completionDate TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `).run();

    // ایجاد ایندکس‌ها
    await env.ccs_resalat_db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)
    `).run();

    await env.ccs_resalat_db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_requests_city ON requests(city)
    `).run();

    await env.ccs_resalat_db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(createdAt)
    `).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'جدول ایجاد شد'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در ایجاد جدول',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع بررسی دیتابیس
async function checkDatabase(env, corsHeaders) {
  try {
    const test = await env.ccs_resalat_db.prepare('SELECT 1 as test').first();

    const tableCheck = await env.ccs_resalat_db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='requests'"
    ).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'بررسی دیتابیس',
      connected: true,
      tableExists: !!tableCheck,
      testResult: test
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در بررسی دیتابیس',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع راه‌اندازی ساده دیتابیس
async function initDatabaseSimple(env, corsHeaders) {
  try {
    await createTableSimple(env, corsHeaders);

    const testId = `test_${Date.now()}`;
    const now = new Date().toISOString();

    await env.ccs_resalat_db.prepare(`
      INSERT INTO requests (id, firstName, lastName, nationalCode, phoneNumber, city, requestDate, status, completionDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      testId,
      'تست',
      'کاربر',
      '1234567890',
      '09123456789',
      'هشتپر',
      '1404/08/17',
      'درحال جمع آوری مدارک',
      null,
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'دیتابیس راه‌اندازی شد',
      testId: testId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در راه‌اندازی دیتابیس',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع ذخیره درخواست ساده
async function saveRequestSimple(request, env, corsHeaders) {
  try {
    const data = await request.json();

    const id = data.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await env.ccs_resalat_db.prepare(`
      INSERT INTO requests (id, firstName, lastName, nationalCode, phoneNumber, city, requestDate, status, completionDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.firstName || '',
      data.lastName || '',
      data.nationalCode || '',
      data.phoneNumber || '',
      data.city || '',
      data.requestDate || '',
      data.status || 'درحال جمع آوری مدارک',
      data.completionDate || null,
      now,
      now
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'درخواست ذخیره شد',
      id: id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در ذخیره درخواست',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع حذف درخواست
async function deleteRequest(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { id } = data;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'شناسه درخواست الزامی است'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await env.ccs_resalat_db.prepare(
      'DELETE FROM requests WHERE id = ?'
    ).bind(id).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'درخواست حذف شد',
      deleted: result.meta.changes > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در حذف درخواست',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع به‌روزرسانی درخواست
async function updateRequest(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'شناسه درخواست الزامی است'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();

    // بررسی وجود رکورد
    const existing = await env.ccs_resalat_db.prepare(
      'SELECT * FROM requests WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        message: 'درخواست مورد نظر یافت نشد'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ساخت query دینامیک
    const fields = [];
    const values = [];

    // فیلدهای قابل به‌روزرسانی
    const allowedFields = [
      'firstName', 'lastName', 'nationalCode', 'phoneNumber',
      'city', 'requestDate', 'status', 'completionDate'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    fields.push('updatedAt = ?');
    values.push(now);

    if (fields.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const query = `
      UPDATE requests 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    values.push(id);

    const result = await env.ccs_resalat_db.prepare(query)
      .bind(...values)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'درخواست به‌روزرسانی شد',
      updated: result.meta.changes > 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در update:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در به‌روزرسانی درخواست',
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع دریافت همه درخواست‌ها
async function getAllRequests(env, corsHeaders) {
  try {
    const result = await env.ccs_resalat_db.prepare(`
      SELECT * FROM requests ORDER BY createdAt DESC
    `).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در getAll:', error);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع دریافت درخواست‌های عمومی
async function getPublicRequests(env, corsHeaders) {
  try {
    const result = await env.ccs_resalat_db.prepare(`
      SELECT id, firstName, lastName, nationalCode, phoneNumber, 
             city, requestDate, status, completionDate, createdAt
      FROM requests 
      WHERE status != 'حذف شده'
      ORDER BY createdAt DESC
      LIMIT 100
    `).all();

    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در getPublic:', error);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع دریافت آمار
async function getStats(env, corsHeaders) {
  try {
    const total = await env.ccs_resalat_db.prepare(
      "SELECT COUNT(*) as count FROM requests"
    ).first();

    const collecting = await env.ccs_resalat_db.prepare(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'درحال جمع آوری مدارک'"
    ).first();

    const processing = await env.ccs_resalat_db.prepare(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'درحال اجرا'"
    ).first();

    const completed = await env.ccs_resalat_db.prepare(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'انجام شده'"
    ).first();

    return new Response(JSON.stringify({
      success: true,
      stats: {
        total: total?.count || 0,
        collecting: collecting?.count || 0,
        processing: processing?.count || 0,
        completed: completed?.count || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در stats:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در دریافت آمار'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع دریافت خروجی
async function exportRequests(env, corsHeaders) {
  try {
    const result = await env.ccs_resalat_db.prepare(`
      SELECT * FROM requests ORDER BY createdAt DESC
    `).all();

    const csv = convertToCSV(result.results || []);

    return new Response(JSON.stringify({
      success: true,
      csv: csv,
      count: (result.results || []).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در export:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در دریافت خروجی'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع ایجاد بک‌آپ
async function backupRequests(env, corsHeaders) {
  try {
    const result = await env.ccs_resalat_db.prepare(`
      SELECT * FROM requests ORDER BY createdAt DESC
    `).all();

    const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    return new Response(JSON.stringify({
      success: true,
      message: 'بک‌آپ ایجاد شد',
      backupName: backupName,
      data: result.results || [],
      count: (result.results || []).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('خطا در backup:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در ایجاد بک‌آپ'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع احراز هویت
// تابع handleLogin را با این نسخه جایگزین کنید:
async function handleLogin(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { password } = data;
    
    console.log('📝 درخواست بررسی رمز دریافت شد');
    
    // 1. بررسی جدول users
    let tableExists = false;
    try {
      const tableCheck = await env.ccs_resalat_db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).first();
      tableExists = !!tableCheck;
      console.log('📊 آیا جدول users وجود دارد؟', tableExists);
    } catch (err) {
      console.error('❌ خطا در بررسی جدول:', err);
      tableExists = false;
    }
    
    if (tableExists) {
      // 2. دریافت کاربر admin
      const user = await env.ccs_resalat_db.prepare(
        "SELECT * FROM users WHERE username = 'admin'"
      ).first();
      
      console.log('👤 کاربر از دیتابیس:', user);
      
      if (user) {
        const storedPassword = user.password_hash;
        console.log('🔑 رمز ذخیره شده:', storedPassword, 'رمز ورودی:', password);
        
        // 3. مقایسه مستقیم رمز
        if (password === storedPassword) {
          console.log('✅ رمز صحیح است');
          return new Response(JSON.stringify({
            success: true,
            message: 'ورود موفقیت‌آمیز',
            token: env.API_TOKEN || "e99a18c428cb38d5f260853678922e03"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          console.log('❌ رمز اشتباه است');
          return new Response(JSON.stringify({
            success: false,
            message: 'رمز عبور اشتباه است'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    // 4. حالت Fallback
    console.log('🔄 استفاده از حالت fallback');
    
    const validPasswords = ['Aa123456@', 'admin123'];
    
    if (validPasswords.includes(password)) {
      console.log('✅ رمز fallback صحیح است');
      return new Response(JSON.stringify({
        success: true,
        message: 'ورود موفقیت‌آمیز (حالت fallback)',
        token: env.API_TOKEN || "e99a18c428cb38d5f260853678922e03"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('❌ رمز fallback اشتباه است');
      return new Response(JSON.stringify({
        success: false,
        message: 'رمز عبور اشتباه است'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('🚨 خطا در بررسی رمز عبور:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در احراز هویت: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// تابع تبدیل به CSV
function convertToCSV(data) {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [];

  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// در قسمت توابع کمکی، تابع زیر را اضافه کنید:
// تابع checkPasswordFromDB را با این نسخه جایگزین کنید:
async function checkPasswordFromDB(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { password } = data;

    console.log('📝 درخواست بررسی رمز دریافت شد');

    // 1. ابتدا بررسی می‌کنیم جدول users وجود دارد یا نه
    let tableExists = false;
    try {
      const tableCheck = await env.ccs_resalat_db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).first();
      tableExists = !!tableCheck;
      console.log('📊 آیا جدول users وجود دارد؟', tableExists);
    } catch (err) {
      console.error('❌ خطا در بررسی جدول:', err);
      tableExists = false;
    }

    if (tableExists) {
      // 2. کاربر admin را از دیتابیس دریافت می‌کنیم
      const user = await env.ccs_resalat_db.prepare(
        "SELECT * FROM users WHERE username = 'admin'"
      ).first();

      console.log('👤 کاربر از دیتابیس:', user);

      if (user) {
        const storedPassword = user.password_hash;
        console.log('🔑 رمز ذخیره شده:', storedPassword, 'رمز ورودی:', password);

        // 3. مقایسه مستقیم رمز (بدون هش)
        if (password === storedPassword) {
          console.log('✅ رمز صحیح است');
          return new Response(JSON.stringify({
            success: true,
            message: 'ورود موفقیت‌آمیز',
            token: env.API_TOKEN || "e99a18c428cb38d5f260853678922e03"
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          console.log('❌ رمز اشتباه است');
          return new Response(JSON.stringify({
            success: false,
            message: 'رمز عبور اشتباه است'
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        console.log('⚠️ کاربر admin در دیتابیس یافت نشد');
        // ادامه به حالت fallback
      }
    }

    // 4. حالت Fallback: اگر جدول وجود نداشت یا کاربر یافت نشد
    console.log('🔄 استفاده از حالت fallback');

    // لیست رمزهای معتبر
    const validPasswords = ['Aa123456@', 'admin123'];

    if (validPasswords.includes(password)) {
      console.log('✅ رمز fallback صحیح است');
      return new Response(JSON.stringify({
        success: true,
        message: 'ورود موفقیت‌آمیز (حالت fallback)',
        token: env.API_TOKEN || "e99a18c428cb38d5f260853678922e03"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('❌ رمز fallback اشتباه است');
      return new Response(JSON.stringify({
        success: false,
        message: 'رمز عبور اشتباه است'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('🚨 خطا در بررسی رمز عبور:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'خطا در احراز هویت: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

