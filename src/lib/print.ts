import type { ConsumptionItem, Settings, MealType } from '@/types';
import { formatCurrency, formatNumber, ARABIC_MONTHS } from '@/lib/format';
import { MEAL_LABELS } from '@/types';

function getHeaderHtml(settings: Settings | null): string {
  const s = settings;
  if (!s) return '';
  const logoHtml = s.logo_url
    ? `<img src="${s.logo_url}" style="width: ${s.logo_size}px; height: auto; margin-left: 20px;" />`
    : '';
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: flex; justify-content: center; align-items: flex-start;">
        ${logoHtml}
        <div>
          <div style="font-size: 13px; font-weight: 600;">${s.header_republic}</div>
          <div style="font-size: 12px;">${s.header_ministry}</div>
          <div style="font-size: 12px;">${s.header_directorate}</div>
          <div style="font-size: 12px;">${s.header_unit}</div>
          <div style="font-size: 12px;">${s.header_department}</div>
        </div>
      </div>
      <hr style="margin: 10px 0; border: none; border-top: 2px solid #333;" />
    </div>
  `;
}

function getSignaturesHtml(settings: Settings | null): string {
  if (!settings?.show_signatures) return '';
  return `
    <div style="display: flex; justify-content: space-around; margin-top: 40px; page-break-inside: avoid;">
      <div style="text-align: center;">
        <div style="font-weight: 600; font-size: 12px;">${settings.signature1_label}</div>
        <div style="margin-top: 40px; border-top: 1px solid #333; width: 150px;"></div>
      </div>
      <div style="text-align: center;">
        <div style="font-weight: 600; font-size: 12px;">${settings.signature2_label}</div>
        <div style="margin-top: 40px; border-top: 1px solid #333; width: 150px;"></div>
      </div>
      <div style="text-align: center;">
        <div style="font-weight: 600; font-size: 12px;">${settings.signature3_label}</div>
        <div style="margin-top: 40px; border-top: 1px solid #333; width: 150px;"></div>
      </div>
    </div>
  `;
}

function openPrintWindow(html: string) {
  const existing = document.getElementById('print-frame');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>طباعة</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: 'Cairo', 'Tajawal', Arial, sans-serif;
          direction: rtl;
          padding: 20px;
          color: #1e293b;
        }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; padding: 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: 600; }
        td { padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; }
        tfoot td { font-weight: bold; background: #f8fafc; }
        h1, h2, h3 { text-align: center; }
        .print-page { page-break-after: always; }
        .print-page:last-child { page-break-after: auto; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    }
    setTimeout(() => iframe.remove(), 1000);
  };
}

export function printMeal(
  items: ConsumptionItem[],
  mealType: MealType,
  dayNumber: number,
  month: number,
  year: number,
  peopleCount: number,
  settings: Settings | null
) {
  const total = items.reduce((s, i) => s + Number(i.amount), 0);
  const perPerson = peopleCount > 0 ? total / peopleCount : 0;

  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.material?.name_ar || ''}</td>
        <td>${item.material?.category?.name_ar || ''}</td>
        <td>${item.material?.unit?.name_ar || ''}</td>
        <td style="text-align: center;">${formatNumber(item.quantity, 3)}</td>
        <td style="text-align: center;">${formatCurrency(item.unit_price)}</td>
        <td style="text-align: center;">${formatCurrency(item.amount)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">${settings?.card_title || 'بطاقة استهلاك'}</h2>
    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
      <div>الوجبة: <strong>${MEAL_LABELS[mealType]}</strong></div>
      <div>التاريخ: <strong>${dayNumber}/${month}/${year}</strong></div>
      <div>الوحدة: <strong>${settings?.unit_name || ''}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>رقم</th>
          <th>المادة</th>
          <th>التصنيف</th>
          <th>الوحدة</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>المبلغ</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align: left;">إجمالي ${MEAL_LABELS[mealType]}</td>
          <td style="text-align: center;">${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top: 15px; font-size: 13px;">
      <div>عدد الأشخاص: <strong>${peopleCount}</strong></div>
      <div>قيمة الوجبة للفرد: <strong>${formatCurrency(perPerson)}</strong></div>
    </div>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

function buildMealTableHtml(
  items: ConsumptionItem[],
  meal: MealType,
  count: number
): string {
  const mealItems = items.filter((i) => i.meal_type === meal);
  if (mealItems.length === 0) return '';
  const total = mealItems.reduce((s, i) => s + Number(i.amount), 0);
  const perPerson = count > 0 ? total / count : 0;

  const rows = mealItems
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.material?.name_ar || ''}</td>
        <td>${item.material?.category?.name_ar || ''}</td>
        <td>${item.material?.unit?.name_ar || ''}</td>
        <td style="text-align: center;">${formatNumber(item.quantity, 3)}</td>
        <td style="text-align: center;">${formatCurrency(item.unit_price)}</td>
        <td style="text-align: center;">${formatCurrency(item.amount)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <h3 style="font-size: 14px; margin: 15px 0 10px;">${MEAL_LABELS[meal]}</h3>
    <table>
      <thead>
        <tr>
          <th>رقم</th>
          <th>المادة</th>
          <th>التصنيف</th>
          <th>الوحدة</th>
          <th>الكمية</th>
          <th>سعر الوحدة</th>
          <th>المبلغ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align: left;">إجمالي ${MEAL_LABELS[meal]}</td>
          <td style="text-align: center;">${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top: 10px; font-size: 12px;">
      عدد الأشخاص: <strong>${count}</strong> | قيمة الوجبة للفرد: <strong>${formatCurrency(perPerson)}</strong>
    </div>
  `;
}

function buildDaySummaryHtml(
  items: ConsumptionItem[],
  peopleCounts: Record<MealType, number>
): string {
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];
  let dayTotal = 0;
  let totalPerPerson = 0;

  let bodyRows = '';
  for (const meal of meals) {
    const mealItems = items.filter((i) => i.meal_type === meal);
    const total = mealItems.reduce((s, i) => s + Number(i.amount), 0);
    const count = peopleCounts[meal] || 0;
    const perPerson = count > 0 ? total / count : 0;
    dayTotal += total;
    totalPerPerson += perPerson;
    bodyRows += `
      <tr>
        <td>${MEAL_LABELS[meal]}</td>
        <td style="text-align: center;">${formatCurrency(total)}</td>
        <td style="text-align: center;">${count}</td>
        <td style="text-align: center;">${formatCurrency(perPerson)}</td>
      </tr>
    `;
  }

  return `
    <h3 style="font-size: 14px; margin: 15px 0 10px;">ملخص اليوم</h3>
    <table>
      <thead>
        <tr>
          <th>الوجبة</th>
          <th>المصاريف</th>
          <th>عدد الأشخاص</th>
          <th>قيمة الوجبة للفرد</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
        <tr>
          <td style="font-weight: bold;">المجموع</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(dayTotal)}</td>
          <td style="text-align: center;">—</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalPerPerson)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

export function printDay(
  items: ConsumptionItem[],
  dayNumber: number,
  month: number,
  year: number,
  peopleCounts: Record<MealType, number>,
  settings: Settings | null
) {
  const headerHtml = getHeaderHtml(settings);
  const titleHtml = `
    <h2 style="font-size: 16px; margin: 10px 0;">استهلاك يوم ${dayNumber} / ${ARABIC_MONTHS[month - 1]} / ${year}</h2>
    <div style="font-size: 13px; margin-bottom: 15px;">الوحدة: <strong>${settings?.unit_name || ''}</strong></div>
  `;

  const breakfastHtml = buildMealTableHtml(items, 'breakfast', peopleCounts.breakfast || 0);
  const lunchHtml = buildMealTableHtml(items, 'lunch', peopleCounts.lunch || 0);
  const dinnerHtml = buildMealTableHtml(items, 'dinner', peopleCounts.dinner || 0);
  const summaryHtml = buildDaySummaryHtml(items, peopleCounts);

  // Page 1: breakfast + lunch + summary + signatures
  let html = `
    <div class="print-page">
      ${headerHtml}
      ${titleHtml}
      ${breakfastHtml}
      ${lunchHtml}
      ${summaryHtml}
      ${getSignaturesHtml(settings)}
    </div>
  `;

  // Page 2: dinner + signatures
  if (dinnerHtml) {
    html += `
      <div class="print-page">
        ${headerHtml}
        <h2 style="font-size: 16px; margin: 10px 0;">استهلاك يوم ${dayNumber} / ${ARABIC_MONTHS[month - 1]} / ${year}</h2>
        <div style="font-size: 13px; margin-bottom: 15px;">الوحدة: <strong>${settings?.unit_name || ''}</strong></div>
        ${dinnerHtml}
        ${getSignaturesHtml(settings)}
      </div>
    `;
  }

  openPrintWindow(html);
}

export function printStockCard(
  categories: { name: string; previous: number; purchases: number; consumption: number; remaining: number }[],
  month: number,
  year: number,
  budget: number,
  totalPurchases: number,
  remainingBudget: number,
  settings: Settings | null
) {
  const totalPrev = categories.reduce((s, c) => s + c.previous, 0);
  const totalPurch = categories.reduce((s, c) => s + c.purchases, 0);
  const totalCons = categories.reduce((s, c) => s + c.consumption, 0);
  const totalRem = categories.reduce((s, c) => s + c.remaining, 0);

  const rows = categories
    .map(
      (c) => `
      <tr>
        <td>${c.name}</td>
        <td style="text-align: center;">${formatCurrency(c.previous)}</td>
        <td style="text-align: center;">${formatCurrency(c.purchases)}</td>
        <td style="text-align: center;">${formatCurrency(c.consumption)}</td>
        <td style="text-align: center;">${formatCurrency(c.remaining)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">${settings?.card_title || 'بطاقة متابعة المشتريات واستهلاك مختلف المواد الغذائية'}</h2>
    <div style="text-align: center; font-size: 14px; margin-bottom: 15px;">
      شهر: <strong>${ARABIC_MONTHS[month - 1]} ${year}</strong>
    </div>
    <div style="display: flex; justify-content: space-around; margin-bottom: 15px; font-size: 13px;">
      <div>الميزانية الإجمالية: <strong>${formatCurrency(budget)}</strong></div>
      <div>المشتريات الشهرية: <strong>${formatCurrency(totalPurchases)}</strong></div>
      <div>المتبقي من الميزانية: <strong>${formatCurrency(remainingBudget)}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>المادة / التصنيف</th>
          <th>المبلغ المتبقي من الشهر السابق</th>
          <th>المشتريات خلال الشهر</th>
          <th>الاستهلاك خلال الشهر</th>
          <th>المبلغ المتبقي</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td style="font-weight: bold;">المجموع</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalPrev)}</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalPurch)}</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalCons)}</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalRem)}</td>
        </tr>
      </tfoot>
    </table>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function printInventory(
  materials: any[],
  settings: Settings | null
) {
  const rows = materials
    .map(
      (m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.name_fr}</td>
        <td>${m.name_ar}</td>
        <td>${m.category?.name_ar || ''}</td>
        <td>${m.unit?.name_ar || ''}</td>
        <td style="text-align: center;">${formatCurrency(m.unit_price)}</td>
        <td style="text-align: center;">${formatNumber(m.opening_quantity, 3)}</td>
        <td style="text-align: center;">${formatNumber(m.total_purchases, 3)}</td>
        <td style="text-align: center;">${formatNumber(m.total_consumption, 3)}</td>
        <td style="text-align: center; font-weight: bold;">${formatNumber(m.remaining_quantity, 3)}</td>
        <td style="text-align: center;">${formatCurrency(m.remaining_value)}</td>
      </tr>
    `
    )
    .join('');

  const totalValue = materials.reduce((s, m) => s + m.remaining_value, 0);

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">تقرير المخزون</h2>
    <table>
      <thead>
        <tr>
          <th>رقم</th>
          <th>الاسم بالفرنسية</th>
          <th>الاسم بالعربية</th>
          <th>التصنيف</th>
          <th>الوحدة</th>
          <th>سعر الوحدة</th>
          <th>الكمية الافتتاحية</th>
          <th>المشتريات</th>
          <th>الاستهلاك</th>
          <th>المتبقي</th>
          <th>قيمة المخزون</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="10" style="text-align: left; font-weight: bold;">القيمة الإجمالية</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalValue)}</td>
        </tr>
      </tfoot>
    </table>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function printCategoryConsumption(
  categories: { name: string; dayValues: number[]; total: number }[],
  dayTotals: number[],
  dayPeopleCounts: number[],
  dayPerPerson: number[],
  month: number,
  year: number,
  totalDays: number,
  settings: Settings | null
) {
  const grandTotal = dayTotals.reduce((s, d) => s + d, 0);
  const totalPeople = dayPeopleCounts.reduce((s, d) => s + d, 0);
  const avgPerPerson = totalPeople > 0 ? grandTotal / totalPeople : 0;

  const catHeaders = categories
    .map((cat) => `<th style="text-align: center; min-width: 70px;">${cat.name}</th>`)
    .join('');

  const dayRows = Array.from({ length: totalDays }, (_, i) => i + 1)
    .map((day) => {
      const catCells = categories
        .map((cat) => {
          const v = cat.dayValues[day - 1];
          return `<td style="text-align: center;">${v > 0 ? formatNumber(v, 0) : '—'}</td>`;
        })
        .join('');
      const total = dayTotals[day - 1];
      const people = dayPeopleCounts[day - 1];
      const perPerson = dayPerPerson[day - 1];
      return `
        <tr>
          <td style="font-weight: 600; text-align: center;">${day}</td>
          ${catCells}
          <td style="text-align: center; font-weight: bold;">${total > 0 ? formatNumber(total, 0) : '—'}</td>
          <td style="text-align: center;">${people > 0 ? people : '—'}</td>
          <td style="text-align: center;">${perPerson > 0 ? formatNumber(perPerson, 0) : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">ورقة الاستهلاك الصنفي اليومي</h2>
    <div style="text-align: center; font-size: 14px; margin-bottom: 15px;">
      شهر: <strong>${ARABIC_MONTHS[month - 1]} ${year}</strong>
    </div>
    <table style="font-size: 9px;">
      <thead>
        <tr>
          <th style="min-width: 40px;">اليوم</th>
          ${catHeaders}
          <th style="text-align: center;">مجموع اليوم</th>
          <th style="text-align: center;">عدد الأشخاص</th>
          <th style="text-align: center;">سعر الوجبة للفرد</th>
        </tr>
      </thead>
      <tbody>
        ${dayRows}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9;">
          <td style="font-weight: bold;">الإجمالي</td>
          ${categories.map((cat) => `<td style="text-align: center; font-weight: bold;">${formatNumber(cat.total, 0)}</td>`).join('')}
          <td style="text-align: center; font-weight: bold;">${formatNumber(grandTotal, 0)}</td>
          <td style="text-align: center; font-weight: bold;">${totalPeople}</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(avgPerPerson, 0)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top: 10px; font-size: 11px; color: #64748b;">
      القيم بالدينار الجزائري (دج). عدد الأشخاص = مجموع اليوم / سعر الوجبة للفرد
    </div>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function printMonthlyCategoryConsumption(
  categories: { name: string; monthValues: number[]; total: number }[],
  monthTotals: number[],
  monthPeopleCounts: number[],
  monthPerPerson: number[],
  year: number,
  settings: Settings | null
) {
  const grandTotal = monthTotals.reduce((s, d) => s + d, 0);
  const totalPeople = monthPeopleCounts.reduce((s, d) => s + d, 0);
  const avgPerPerson = totalPeople > 0 ? grandTotal / totalPeople : 0;

  const catHeaders = categories
    .map((cat) => `<th style="text-align: center; min-width: 70px;">${cat.name}</th>`)
    .join('');

  const monthRows = ARABIC_MONTHS.map((m, i) => {
    const monthIdx = i;
    const catCells = categories
      .map((cat) => {
        const v = cat.monthValues[monthIdx];
        return `<td style="text-align: center;">${v > 0 ? formatNumber(v, 0) : '—'}</td>`;
      })
      .join('');
    const total = monthTotals[monthIdx];
    const people = monthPeopleCounts[monthIdx];
    const perPerson = monthPerPerson[monthIdx];
    return `
      <tr>
        <td style="font-weight: 600;">${m}</td>
        ${catCells}
        <td style="text-align: center; font-weight: bold;">${total > 0 ? formatNumber(total, 0) : '—'}</td>
        <td style="text-align: center;">${people > 0 ? people : '—'}</td>
        <td style="text-align: center;">${perPerson > 0 ? formatNumber(perPerson, 0) : '—'}</td>
      </tr>
    `;
  }).join('');

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">ورقة الاستهلاك الشهري الصنفي</h2>
    <div style="text-align: center; font-size: 14px; margin-bottom: 15px;">
      السنة: <strong>${year}</strong>
    </div>
    <table style="font-size: 9px;">
      <thead>
        <tr>
          <th style="min-width: 60px;">الشهر</th>
          ${catHeaders}
          <th style="text-align: center;">مجموع الأصناف</th>
          <th style="text-align: center;">عدد الوجبات</th>
          <th style="text-align: center;">قيمة الوجبة للفرد</th>
        </tr>
      </thead>
      <tbody>
        ${monthRows}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9;">
          <td style="font-weight: bold;">الإجمالي</td>
          ${categories.map((cat) => `<td style="text-align: center; font-weight: bold;">${formatNumber(cat.total, 0)}</td>`).join('')}
          <td style="text-align: center; font-weight: bold;">${formatNumber(grandTotal, 0)}</td>
          <td style="text-align: center; font-weight: bold;">${totalPeople}</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(avgPerPerson, 0)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="margin-top: 10px; font-size: 11px; color: #64748b;">
      القيم بالدينار الجزائري (دج). عدد الوجبات = مجموع الأصناف / قيمة الوجبة للفرد
    </div>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function printReport(
  title: string,
  headers: string[],
  rows: string[][],
  totals: string[] | null,
  settings: Settings | null
) {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join('');
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  const totalsHtml = totals
    ? `<tfoot><tr>${totals.map((c) => `<td style="font-weight: bold;">${c}</td>`).join('')}</tr></tfoot>`
    : '';

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">${title}</h2>
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
      ${totalsHtml}
    </table>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function printMaterialMonthlySheet(
  materialName: string,
  unitName: string,
  rows: { day: number; date: string; reference: string; source: string; input: number; output: number; balance: number; notes: string }[],
  month: number,
  year: number,
  settings: Settings | null
) {
  const bodyRows = rows
    .map(
      (r) => `
      <tr>
        <td style="text-align: center;">${r.day === 0 ? '—' : r.date}</td>
        <td>${r.reference || '—'}</td>
        <td>${r.source || '—'}</td>
        <td style="text-align: center;">${r.input > 0 ? formatNumber(r.input, 3) : '—'}</td>
        <td style="text-align: center;">${r.output > 0 ? formatNumber(r.output, 3) : '—'}</td>
        <td style="text-align: center; font-weight: bold;">${formatNumber(r.balance, 3)}</td>
        <td>${r.notes || '—'}</td>
      </tr>
    `
    )
    .join('');

  const totalInput = rows.reduce((s, r) => s + r.input, 0);
  const totalOutput = rows.reduce((s, r) => s + r.output, 0);
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0;

  const html = `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">ورقة المادة في الشهر</h2>
    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
      <div>المادة: <strong>${materialName}</strong></div>
      <div>الوحدة: <strong>${unitName || '—'}</strong></div>
      <div>الشهر: <strong>${ARABIC_MONTHS[month - 1]} ${year}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align: center; min-width: 80px;">التاريخ</th>
          <th>المرجع</th>
          <th>المورد / المصدر</th>
          <th style="text-align: center;">دخول</th>
          <th style="text-align: center;">خروج</th>
          <th style="text-align: center;">الرصيد</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9;">
          <td colspan="3" style="font-weight: bold; text-align: left;">المجموع</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(totalInput, 3)}</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(totalOutput, 3)}</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(finalBalance, 3)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    ${getSignaturesHtml(settings)}
  `;

  openPrintWindow(html);
}

export function buildMaterialMonthlyConsumptionHtml(
  materialName: string,
  unitName: string,
  rows: { day: number; date: string; reference: string; source: string; quantity: number; amount: number; cumulativeQuantity: number; cumulativeAmount: number }[],
  month: number,
  year: number,
  settings: Settings | null
): string {
  const bodyRows = rows
    .map(
      (r) => `
      <tr>
        <td style="text-align: center;">${r.date}</td>
        <td>${r.reference}</td>
        <td>${r.source}</td>
        <td style="text-align: center;">${r.quantity > 0 ? formatNumber(r.quantity, 3) : '—'}</td>
        <td style="text-align: center;">${r.amount > 0 ? formatCurrency(r.amount) : '—'}</td>
        <td style="text-align: center; font-weight: bold;">${formatNumber(r.cumulativeQuantity, 3)}</td>
        <td style="text-align: center; font-weight: bold;">${formatCurrency(r.cumulativeAmount)}</td>
        <td>${r.quantity > 0 ? 'استهلاك' : '—'}</td>
      </tr>
    `
    )
    .join('');

  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  return `
    ${getHeaderHtml(settings)}
    <h2 style="font-size: 16px; margin: 10px 0;">بطاقة استهلاك مادة على طول الشهر</h2>
    <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px;">
      <div>المادة: <strong>${materialName}</strong></div>
      <div>الوحدة: <strong>${unitName || '—'}</strong></div>
      <div>الشهر: <strong>${ARABIC_MONTHS[month - 1]} ${year}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align: center; min-width: 80px;">التاريخ</th>
          <th>المرجع</th>
          <th>الوجبة / المصدر</th>
          <th style="text-align: center;">كمية الاستهلاك</th>
          <th style="text-align: center;">قيمة الاستهلاك</th>
          <th style="text-align: center;">التراكمي كمية</th>
          <th style="text-align: center;">التراكمي قيمة</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9;">
          <td colspan="3" style="font-weight: bold; text-align: left;">إجمالي الشهر</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(totalQty, 3)}</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalAmount)}</td>
          <td style="text-align: center; font-weight: bold;">${formatNumber(totalQty, 3)}</td>
          <td style="text-align: center; font-weight: bold;">${formatCurrency(totalAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    ${getSignaturesHtml(settings)}
  `;
}

export function printMaterialMonthlyConsumption(
  materialName: string,
  unitName: string,
  rows: { day: number; date: string; reference: string; source: string; quantity: number; amount: number; cumulativeQuantity: number; cumulativeAmount: number }[],
  month: number,
  year: number,
  settings: Settings | null
) {
  const html = buildMaterialMonthlyConsumptionHtml(materialName, unitName, rows, month, year, settings);
  openPrintWindow(html);
}
