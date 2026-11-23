import { strToU8, zipSync } from "fflate";

import type { ExportRow } from "./settings.types";

const TYPE_LABELS: Record<string, string> = {
	expense: "saída",
	income: "entrada",
	transfer: "transferência",
	adjustment: "acerto",
};

const HEADER = [
	"Data",
	"Mês do orçamento",
	"Tipo",
	"Valor (MZN)",
	"Conta",
	"Categoria",
	"Subcategoria",
	"Pessoa",
	"Etiquetas",
	"Nota",
];

type Cell = string | number;

const localDay = (date: Date) =>
	new Date(date.getTime() + 2 * 3600_000).toISOString().slice(0, 10);

export function exportTable(rows: ExportRow[]): Cell[][] {
	return [
		HEADER,
		...rows.map((r) => [
			localDay(r.occurredAt),
			r.referenceMonth,
			TYPE_LABELS[r.type] ?? r.type,
			r.amount / 100,
			r.account,
			r.parentCategory ?? r.category ?? "",
			r.parentCategory ? (r.category ?? "") : "",
			r.payee ?? "",
			r.labels.join(", "),
			r.note ?? "",
		]),
	];
}

const csvCell = (value: Cell) => {
	const text = typeof value === "number" ? value.toFixed(2) : value;
	return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(table: Cell[][]) {
	const body = table.map((row) => row.map(csvCell).join(";")).join("\r\n");
	return `﻿${body}\r\n`;
}

const isAllowedXmlChar = (char: string) => {
	const code = char.charCodeAt(0);
	return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
};

const stripControlCharacters = (text: string) =>
	[...text].filter(isAllowedXmlChar).join("");

const xmlEscape = (text: string) =>
	stripControlCharacters(text)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const columnName = (index: number) => {
	let name = "";
	for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
		name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
	return name;
};

const xlsxCell = (value: Cell, ref: string, header: boolean) => {
	if (typeof value === "number")
		return `<c r="${ref}" s="2"><v>${value}</v></c>`;
	const style = header ? ' s="1"' : "";
	return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
};

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const DOC_REL =
	"http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";

export function toXlsx(table: Cell[][]) {
	const rows = table
		.map(
			(row, r) =>
				`<row r="${r + 1}">${row.map((value, c) => xlsxCell(value, `${columnName(c)}${r + 1}`, r === 0)).join("")}</row>`,
		)
		.join("");
	const files: Record<string, string> = {
		"[Content_Types].xml": `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/></Types>`,
		"_rels/.rels": `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${DOC_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
		"xl/workbook.xml": `${XML_HEAD}<workbook xmlns="${MAIN_NS}" xmlns:r="${DOC_REL}"><sheets><sheet name="Transacções" sheetId="1" r:id="rId1"/></sheets></workbook>`,
		"xl/_rels/workbook.xml.rels": `${XML_HEAD}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${DOC_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${DOC_REL}/styles" Target="styles.xml"/></Relationships>`,
		"xl/styles.xml": `${XML_HEAD}<styleSheet xmlns="${MAIN_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
		"xl/worksheets/sheet1.xml": `${XML_HEAD}<worksheet xmlns="${MAIN_NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${rows}</sheetData></worksheet>`,
	};
	return zipSync(
		Object.fromEntries(
			Object.entries(files).map(([name, xml]) => [name, strToU8(xml)]),
		),
	);
}
