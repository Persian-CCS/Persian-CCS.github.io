// کتابخانه تاریخ و ساعت شمسی - استفاده از زمان محلی
class PersianDateTimeOnline {
    constructor() {
        this.debugMode = false;
        this.useMoment = false;
        this.checkMoment();
    }

    // بررسی وجود moment-jalaali
    checkMoment() {
        if (typeof moment !== 'undefined' && typeof moment.jalali !== 'undefined') {
            this.useMoment = true;
            if (this.debugMode) {
                console.log('Moment-jalaali found, using for Persian date conversion');
            }
        }
    }

    // تبدیل اعداد انگلیسی به فارسی
    toPersianNumbers(num) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, (x) => persianDigits[x]);
    }

    // تبدیل اعداد فارسی به انگلیسی
    toEnglishNumbers(str) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        let result = str;
        for (let i = 0; i < 10; i++) {
            const regex = new RegExp(persianDigits[i], 'g');
            result = result.replace(regex, englishDigits[i]);
        }
        return result;
    }

    // تبدیل میلادی به شمسی (الگوریتم دقیق)
    gregorianToPersian(gy, gm, gd) {
        let g_d_m, jy, jm, jd, gy2, days;
        g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        gy2 = (gm > 2) ? (gy + 1) : gy;
        days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
        jy = -1595 + (33 * Math.floor(days / 12053));
        days %= 12053;
        jy += 4 * Math.floor(days / 1461);
        days %= 1461;
        if (days > 365) {
            jy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
        }
        if (days < 186) {
            jm = 1 + Math.floor(days / 31);
            jd = 1 + (days % 31);
        } else {
            days -= 186;
            jm = 7 + Math.floor(days / 30);
            jd = 1 + (days % 30);
        }
        
        // تنظیم ماه اسفند در سال کبیسه
        if (jm === 12 && jd === 30 && this.isPersianLeapYear(jy)) {
            jd = 30;
        }
        
        return { year: jy, month: jm, day: jd };
    }

    // بررسی سال کبیسه شمسی
    isPersianLeapYear(year) {
        // سال شمسی کبیسه است اگر باقیمانده تقسیم بر 33 برابر با 1، 5، 9، 13، 17، 22، 26، یا 30 باشد
        const remainder = year % 33;
        return [1, 5, 9, 13, 17, 22, 26, 30].includes(remainder);
    }

    // دریافت تاریخ و زمان محلی
    getLocalPersianDateTime(now = null) {
        try {
            if (!now) now = new Date();
            
            const gYear = now.getFullYear();
            const gMonth = now.getMonth() + 1;
            const gDay = now.getDate();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const second = now.getSeconds();
            
            let persianDate;
            
            // استفاده از moment-jalaali اگر موجود باشد
            if (this.useMoment) {
                const m = moment(now);
                const jYear = m.jYear();
                const jMonth = m.jMonth() + 1;
                const jDay = m.jDate();
                
                persianDate = {
                    year: jYear,
                    month: jMonth,
                    day: jDay,
                    hour: hour,
                    minute: minute,
                    second: second
                };
            } else {
                // استفاده از الگوریتم تبدیل
                persianDate = this.gregorianToPersian(gYear, gMonth, gDay);
                persianDate.hour = hour;
                persianDate.minute = minute;
                persianDate.second = second;
            }
            
            // فرمت تاریخ
            const dateStr = `${persianDate.year}/${persianDate.month.toString().padStart(2, '0')}/${persianDate.day.toString().padStart(2, '0')}`;
            
            // فرمت زمان
            const timeStr = `${persianDate.hour.toString().padStart(2, '0')}:${persianDate.minute.toString().padStart(2, '0')}:${persianDate.second.toString().padStart(2, '0')}`;
            
            return {
                date: dateStr,
                time: timeStr,
                year: persianDate.year,
                month: persianDate.month,
                day: persianDate.day,
                hour: persianDate.hour,
                minute: persianDate.minute,
                second: persianDate.second,
                timestamp: now.getTime()
            };
            
        } catch (error) {
            if (this.debugMode) {
                console.error('خطا در دریافت زمان محلی:', error);
            }
            // بازگشت به تاریخ پیش‌فرض
            const now = new Date();
            return {
                date: '1404/08/17',
                time: now.toLocaleTimeString('fa-IR', { hour12: false }),
                year: 1404,
                month: 8,
                day: 17,
                hour: now.getHours(),
                minute: now.getMinutes(),
                second: now.getSeconds(),
                timestamp: now.getTime()
            };
        }
    }

    // دریافت تاریخ و زمان (برای سازگاری با کد قدیمی)
    async getOnlinePersianDateTime() {
        return this.getLocalPersianDateTime();
    }

    // دریافت تاریخ امروز (فقط تاریخ)
    async getTodayPersianDate() {
        const dateTime = this.getLocalPersianDateTime();
        return dateTime.date;
    }

    // دریافت زمان فعلی (فقط زمان)
    async getCurrentPersianTime() {
        const dateTime = this.getLocalPersianDateTime();
        return dateTime.time;
    }

    // فرمت زیبا برای نمایش
    async getFormattedDateTime() {
        const dateTime = this.getLocalPersianDateTime();
        
        const hour = this.toPersianNumbers(dateTime.hour.toString().padStart(2, '0'));
        const minute = this.toPersianNumbers(dateTime.minute.toString().padStart(2, '0'));
        const second = this.toPersianNumbers(dateTime.second.toString().padStart(2, '0'));
        
        return {
            date: this.toPersianNumbers(dateTime.date),
            time: `${hour}:${minute}:${second}`,
            full: `${this.toPersianNumbers(dateTime.date)} - ${hour}:${minute}:${second}`
        };
    }
    
    // دریافت تاریخ و زمان بدون async (برای استفاده در setTimeout)
    getFormattedDateTimeSync() {
        const dateTime = this.getLocalPersianDateTime();
        
        const hour = this.toPersianNumbers(dateTime.hour.toString().padStart(2, '0'));
        const minute = this.toPersianNumbers(dateTime.minute.toString().padStart(2, '0'));
        const second = this.toPersianNumbers(dateTime.second.toString().padStart(2, '0'));
        
        return {
            date: this.toPersianNumbers(dateTime.date),
            time: `${hour}:${minute}:${second}`,
            full: `${this.toPersianNumbers(dateTime.date)} - ${hour}:${minute}:${second}`
        };
    }
}

// ایجاد نمونه جهانی
if (typeof window !== 'undefined') {
    window.PersianDateTimeOnline = PersianDateTimeOnline;
    window.persianDateTimeOnline = new PersianDateTimeOnline();
}