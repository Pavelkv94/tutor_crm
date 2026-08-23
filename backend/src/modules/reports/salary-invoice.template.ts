/**
 * Handlebars-шаблон бланка счёта (rachunek). Вёрстка отделена от логики: сборка
 * данных живёт в reports.service, рендер в PDF — в salary-invoice-pdf.util.
 *
 * Экранирование значений делает сам handlebars ({{ }}), поэтому описание
 * дополнительных услуг, которое вводит администратор, безопасно вставлять как есть.
 */
export const SALARY_INVOICE_TEMPLATE = `
<style>
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 0;
		font-family: "DejaVu Serif", "Noto Serif", "Liberation Serif", "Times New Roman", serif;
		font-size: 10.5pt;
		color: #1a1a1a;
	}
	.accent { color: #1f6fb2; }
	.head { display: flex; justify-content: space-between; align-items: flex-start; }
	.head .title { font-weight: bold; font-size: 12.5pt; line-height: 1.45; }
	.head .meta { text-align: right; font-weight: bold; line-height: 1.5; }
	hr.rule { border: none; border-top: 1.5px solid #1f6fb2; margin: 12px 0 18px; }
	.parties { display: flex; gap: 32px; margin-bottom: 20px; }
	.party { width: 50%; line-height: 1.45; }
	.party h2 {
		font-size: 11.5pt;
		font-weight: bold;
		letter-spacing: 0.4px;
		color: #1f6fb2;
		margin: 0 0 10px;
	}
	.party .strong { font-weight: bold; }
	.party .block { margin-top: 8px; }
	table { width: 100%; border-collapse: collapse; }
	th, td { border: 1px solid #9aa5ad; padding: 6px 9px; vertical-align: top; }
	tr { page-break-inside: avoid; }
	thead th {
		background: #2b86ce;
		color: #ffffff;
		font-weight: bold;
		text-align: center;
		line-height: 1.35;
	}
	td.num { text-align: center; width: 40px; }
	td.currency { text-align: center; width: 90px; }
	td.amount { text-align: right; width: 110px; font-weight: bold; white-space: nowrap; }
	td.desc { line-height: 1.45; }
	tr.total td { border-top: 1px solid #9aa5ad; }
	td.total-label { text-align: right; font-weight: bold; border-left: none; border-bottom: none; }
	td.total-label.empty { border: none; }
	td.total-value { text-align: right; font-weight: bold; color: #1f6fb2; white-space: nowrap; }
	.vat { margin: 14px 0 12px; font-style: italic; line-height: 1.45; }
	.payment h2 {
		font-size: 11.5pt;
		font-weight: bold;
		color: #1f6fb2;
		margin: 0 0 8px;
	}
	.payment .row { line-height: 1.5; }
	.signature { margin-top: 20px; page-break-inside: avoid; }
	.signature .line {
		display: inline-block;
		width: 300px;
		border-bottom: 1px solid #1a1a1a;
	}
	.signature .note { margin-top: 8px; font-style: italic; font-size: 9pt; color: #8a8a8a; }
</style>

<div class="head">
	<div class="title">
		RACHUNEK / INVOICE<br />
		СЧЁТ НА ОПЛАТУ
	</div>
	<div class="meta">
		Nr / №: {{invoice_number}}<br />
		Data / Дата: {{invoice_date}}
	</div>
</div>

<hr class="rule" />

<div class="parties">
	<div class="party">
		<h2>WYSTAWCA / ИСПОЛНИТЕЛЬ</h2>
		<div class="strong">Imię Nazwisko Nauczyciela</div>
		<div>Имя Фамилия Учителя</div>
		<div>{{issuer.full_name}}</div>
		<div class="block">Adres / Адрес:</div>
		<div>{{issuer.address}}</div>
		<div class="block">Paszport / Паспорт: {{issuer.passport}}</div>
		<div>Email: {{issuer.email}}</div>
	</div>
	<div class="party">
		<h2>NABYWCA / ЗАКАЗЧИК</h2>
		<div class="strong">{{buyer.name}}</div>
		<div class="block">NIP: {{buyer.nip}}</div>
		<div>Adres / Адрес:</div>
		<div>{{buyer.address}}</div>
		<div class="block">Email: {{buyer.email}}</div>
	</div>
</div>

<table>
	<thead>
		<tr>
			<th style="width: 40px;">Lp.<br />№</th>
			<th>Opis usługi / Описание услуги</th>
			<th style="width: 90px;">Waluta<br />Валюта</th>
			<th style="width: 110px;">Razem<br />Итого</th>
		</tr>
	</thead>
	<tbody>
		{{#each lines}}
		<tr>
			<td class="num">{{index}}</td>
			<td class="desc">
				{{description_pl}}<br />
				{{description_ru}}<br />
				Okres / Период: {{period}}
			</td>
			<td class="currency">{{../currency}}</td>
			<td class="amount">{{amount}}</td>
		</tr>
		{{/each}}
		<tr class="total">
			<td class="total-label empty"></td>
			<td class="total-label empty"></td>
			<td class="total-label">RAZEM<br />/ИТОГО:</td>
			<td class="total-value">{{total}}<br />{{currency}}</td>
		</tr>
	</tbody>
</table>

<div class="vat">
	{{labels.vat_pl}}<br />
	{{labels.vat_ru}}
</div>

<div class="payment">
	<h2>DANE DO PŁATNOŚCI / РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ</h2>
	<div class="row">Odbiorca / Получатель: {{payment.recipient}}</div>
	<div class="row">Bank: {{payment.bank_name}}</div>
	<div class="row">Nr rachunku / № счёта: {{payment.bank_account}}</div>
	<div class="row">Termin płatności / Срок оплаты: {{payment.term}}</div>
</div>

<div class="signature">
	<div>Wystawca / Исполнитель: <span class="line"></span></div>
	<div class="note">{{labels.signature_pl}} / {{labels.signature_ru}}</div>
</div>
`;
