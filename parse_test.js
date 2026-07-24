const parseDate = (val) => {
    if (!val) return new Date(NaN);
    if (typeof val === 'number') {
        // Assume seconds if < 10000000000 (year 2286)
        if (val < 10000000000) return new Date(val * 1000);
        return new Date(val);
    }
    if (typeof val === 'string') {
        // Handle "YYYYMMDDHHMMSS +0800" XMLTV format
        const xmltvMatch = val.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})$/);
        if (xmltvMatch) {
            const [_, y, m, d, h, min, s, tz] = xmltvMatch;
            return new Date(`${y}-${m}-${d}T${h}:${min}:${s}${tz}`);
        }
        return new Date(val);
    }
    return new Date(NaN);
};

console.log(parseDate("20231027080000 +0800"));
console.log(parseDate(1698364800));
console.log(parseDate("2023-10-27 08:00:00"));
